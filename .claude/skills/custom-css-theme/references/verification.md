# Verifying a theme locally

## The setup

- EventSystem runs locally on `http://localhost:8081` (IntelliJ/Tomcat). Its gitignored `src/main/resources/config/local.properties` must point at the emulator:
  `system.customcss.baseurl=http://localhost:5055/custom-css/staging` and `system.customjs.baseurl=http://localhost:5055/custom-js/staging` (restart Tomcat after changing).
- The Firebase Hosting emulator serves this repo: `pnpm serve:hosting` (port 5055). It reads files live, but `firebase.json` (rewrites, headers) only at start. If starting it fails with "port taken", the user's instance is already running — use it.
- Missing `styles.css`/`script.js` are rewritten to empty files (200), so a wrong path fails silently: always check `[...document.querySelectorAll('link[href*="/custom-css/"]')].map(l => l.href)` in the page.
- Playwright: `playwright-core` installed in `~/.cache/pz-verify` (not inside this repo's pnpm `node_modules`), launched with `chromium.launch({ channel: 'chrome', headless: true })` to use the system Chrome. Desktop `1280×900`; mobile `390×844` with `deviceScaleFactor: 2`.
- sharp (images) is available through the repo: `NODE_PATH=/path/to/assets/node_modules node script.js`. fontTools for fonts: `python3 -c "from fontTools.ttLib import TTFont; f = TTFont('X.woff'); f.flavor = 'woff2'; f.save('x.woff2')"`.

## Getting your stylesheet onto a page

1. **The event exists locally** (`curl -s -o /dev/null -w '%{http_code}' http://localhost:8081/ticket/event/<id>` → 200 and the page has shows): just open it; `head.jsp` links your files.
2. **It does not exist** (typical for a customer's new event): open another organizer's event that has the flow you need (locally `event/7035` → show `/ticket/show/248894` has an unnumbered show with a cart, addons and insurance) and swap your stylesheet in over the network. Never copy your files under that organizer.

   Rewrite every request under the host organizer's folders (`custom-css` and `custom-js`) to the customer's folders. The page keeps requesting the host URLs in `head.jsp` order (organizer stylesheet, event stylesheet, organizer script, event script), so the customer's files arrive in the same order, and because the browser still believes it loaded the host URLs, relative asset references resolve under the host organizer's folder, which the same route rewrites too. The two relative forms are fixed by the file's level: an organizer-level `styles.css`/`script.js` uses `assets/…` (`url('assets/x.jpg')`, `new URL('assets/x.mp4', document.currentScript.src)`), an event-level file under `events/<id>/` uses `../../assets/…`. Never write `../../assets/…` in an organizer-level file: from there it resolves to `…/eventsystem/assets/…`, outside every organizer folder, so the route does not rewrite it and the file 404s (in production too). A customer file that does not exist comes back as the empty stylesheet/script through the hosting rewrites, so a theme without an organizer file or without scripts needs no special case.

   ```js
   const HOST_ORG = '<hostOrg>'
   const HOST_EVENT = '<hostEvent>'
   const MY_ORG = '<yourOrg>'
   const MY_EVENT = '<yourEvent>'
   await page.route(new RegExp(`/custom-(css|js)/staging/eventsystem/organizers/${HOST_ORG}/`), (route) => {
     const url = route.request().url().replace(`/organizers/${HOST_ORG}/`, `/organizers/${MY_ORG}/`).replace(`/events/${HOST_EVENT}/`, `/events/${MY_EVENT}/`)
     return route.continue({ url })
   })
   ```

   To compare with dagny's default instead, fulfil the same route with an empty body (`route.fulfill({ status: 200, contentType: 'text/css', body: '' })` for stylesheets, `application/javascript` for scripts). Confirm what was served with `page.on('response', …)` on `custom-css`/`custom-js` URLs.

3. **Quick look without the flow**: append a `<link>` to `document.body` (a stylesheet appended to `<head>` with `addStyleTag` ends up before dagny's late sheets and loses).
4. **A state you cannot reach locally** (not-released category, sold-out banner): inject the markup dagny would render (copy it from the JSP) and screenshot. Example: `container.insertAdjacentHTML('beforeend', '<div class="available-at"><i class="material-icons">schedule</i>Släpps <span>2027-06-24 19:00</span></div>')`.

## Reaching the views

- Cookie banner: click the "Acceptera alla" text if present.
- Unnumbered show inline: click `.show-listing-show` → ticket cards expand (or the page navigates to `/ticket/show/<id>`).
- Add tickets: `.amount-blob.plus:visible`; the floating `#basket` (pill) or `#basket-cart-go-to-payment` opens the payment modal.
- Payment modal: `#material-modal section#booking .payment-list`. Locally the order creation takes ~10 s (Klarna); `waitForSelector(..., { timeout: 40000 })`. The `#basket-overlay` circle covers the page meanwhile.
- Insurance "no": click `#material-modal .insurance-detail-container .no label`, then `waitForFunction(() => document.querySelector('#material-modal .insurance-detail-container .no [type=radio]:checked'))` — dagny hides the radio and shows a spinner while it saves.
- "Läs mer" on the premium/addon card: click `#material-modal .read-more-button:visible`, wait for `#premium-ticket-modal .premium-ticket-modal-inner:not(.display-none)`.
- Insurance terms modal (`#insurance-terms-modal`): click `#material-modal a.cancellation-insurance-info:visible` (the VILLKOR link), wait for `#insurance-terms-modal.open`. To see its last paragraph scroll `.scroller` (`el.scrollTop = el.scrollHeight`), not the modal element.
- Organizer terms modal (`#terms-modal`, "Villkor & integritetspolicy"): click `#material-modal a.terms-info:visible`, wait for `#terms-modal.open`. The link sits in the GDPR consent banner (`klarna/gdprDetail.jsp`), which dagny renders only for organizers with consent collection switched on; the local demo organizer has it off, so open the modal directly instead: `page.evaluate(() => jQuery('#terms-modal').modal('open'))` (jQuery is global on dagny pages). Its body is the organizer's own terms HTML, so check headings, paragraphs and links in it.
- Simple-addon read-more modal (`#read-more-about-simple-addon-modal`): dagny has no UI trigger for it today (`openReadMoreAboutSimpleAddonModal()` in `paymentPageKlarna.js` has no callers), so open it directly the same way to check that the shared modal rules apply.
- Customer-data modal (`#customer-data-modal`): opens only when Klarna reports customer data that needs completing. The element is not in the checkout DOM locally (`document.querySelector('#customer-data-modal')` is null on the demo flow), so it cannot be opened there; it shares the four-id rules with the modals above and needs no separate check unless it is present.
- Expanded order details: click `#material-modal .tickets-detail-container .detail.expandable`, wait until `.tickets-detail-container .expandable-detail` no longer has `display: none`.
- Comparing with dagny's default: run the same flow with the theme routed to an empty body. Several "bugs" (the payment list jump, the modal under the title row on phones, the beige-on-white modal text) exist without any theme; they are still worth fixing in the theme, and knowing that changes how you report them.
- Waitlist modal: click a sold-out show on an event with waitlist → `.nortic-modal.waitlist-modal`.
- Numbered shows navigate to a seat map page; the cart flow above is easier for checkout checks.

## What to measure, not just look at

- Fonts: `document.fonts.check('700 20px <Family>')`, `getComputedStyle(el).fontFamily`; `[...document.fonts].filter(f => f.status === 'loaded')`.
- Overlap: compare `getBoundingClientRect()` of the two elements (e.g. header `h2` vs `p`).
- Jank ("hoppar in"): from the click, take screenshots in a tight loop with timestamps and read `PerformanceObserver` entries for `layout-shift` and `longtask` registered via `page.addInitScript`; run with and without the theme (route the theme to an empty body) to know whether the theme caused it.
- Contrast (WCAG): run for every text colour against every surface it sits on; 4.5:1 for text, 3:1 for large text and UI.

  ```python
  def lum(h):
      r, g, b = [int(h[i:i+2], 16) / 255 for i in (0, 2, 4)]
      f = lambda c: c / 12.92 if c <= 0.03928 else ((c + 0.055) / 1.055) ** 2.4
      return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b)
  def contrast(a, b):
      la, lb = sorted((lum(a), lum(b)), reverse=True)
      return (la + 0.05) / (lb + 0.05)
  ```

- Emulator headers for fonts: `curl -sI http://localhost:5055/custom-css/staging/eventsystem/organizers/<org>/assets/<font>.woff2` must show `Access-Control-Allow-Origin: *`.

## When the user sends a screen recording

There is no ffmpeg on the Macs; extract frames with a small Swift script using `AVAssetImageGenerator` (8 fps is plenty), then compute per-frame pixel differences with sharp to find the moment things change, and build a contact sheet of the frames around it. Files on the Desktop are unreadable from the terminal (macOS privacy); ask for a copy inside the repo's `tmp/` folder.

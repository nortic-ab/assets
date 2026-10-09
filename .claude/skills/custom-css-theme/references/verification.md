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

3. **The local EventSystem is down (500 everywhere) or the event is an unpublished draft** (`/ticket/event/<id>` on prod redirects to the organizer page; only the logged-in organizer sees "Detta är ett utkast"): use a public prod event with the same flow as host and swap the stylesheet in the browser. Parken Zoo `https://www.nortic.se/ticket/event/86043` has a calendar, a description, unnumbered cards and the `#basket` pill. Route every `nortic-assets.web.app/custom-(css|js)/` request: fulfil the host's event stylesheet from your file on disk, the host's organizer stylesheet and scripts with empty bodies, and `…/organizers/<host>/assets/*` from your organizer's `assets/` folder. Nothing on disk outside your organizer changes. A reusable helper is `~/.cache/pz-verify/so-lib.js` (`open(browser, { width, theme })`).

   ```js
   await page.route(/nortic-assets\.web\.app\/custom-(css|js)\//, (route) => {
     const u = new URL(route.request().url())
     if (/custom-js\//.test(u.pathname))
       return route.fulfill({ status: 200, contentType: 'application/javascript', body: '' })
     const rel = (u.pathname.match(/organizers\/\d+\/(.*)$/) || [])[1] || ''
     if (/^events\/\d+\/styles\.css$/.test(rel))
       return route.fulfill({ status: 200, contentType: 'text/css', body: fs.readFileSync(MY_EVENT_CSS, 'utf8') })
     if (rel === 'styles.css')
       return route.fulfill({ status: 200, contentType: 'text/css', body: '' })
     if (rel.startsWith('assets/'))
       return route.fulfill({ status: 200, path: path.join(MY_ORG_DIR, rel) })
     return route.continue()
   })
   ```

   Stop before the checkout on a host you do not own: adding to the cart there creates a real order on another customer's event. Clicking + on a card is client-side and fine. Say in the hand-over that the checkout was checked by the user, not by you.

   **The event is public on prod** (Parken Zoo 86041, Grand Stade 85791): test on the event itself, with the same routing pointed at your own organizer and event (`~/.cache/pz-verify/pz-lib.js`: `open(browser, { width, org, event, theme, url })` serves `styles.css`, `script.js` and `assets/*` from this repo, and `dump(page, selector)` prints the rendered DOM with boxes). Clicking a show row navigates to `/ticket/show/<id>`, which opens the ticket cards directly. The same rule applies as for a host: no checkout, because it creates an order on the customer's real event.

4. **Components the host does not have** (basket-cart buttons, "Din order" overview): copy their markup from the JSP (`priceBlobBasketCart.jsp`, `basketCartOverview.jsp` + `basketCartOverviewContent.jsp` + `klarna/ticketAndAddonsDetailBasketCart.jsp`) into a wrapper with an id of its own, add it with `insertAdjacentHTML`, and screenshot it. The page already holds hidden originals with the same ids, so scope every query and locator to your wrapper (`#so-test #basket-cart`, `#cart-overview-modal.open`).
5. **Quick look without the flow**: append a `<link>` to `document.body` (a stylesheet appended to `<head>` with `addStyleTag` ends up before dagny's late sheets and loses).
6. **A state you cannot reach locally** (not-released category, sold-out banner): inject the markup dagny would render (copy it from the JSP) and screenshot. Example: `container.insertAdjacentHTML('beforeend', '<div class="available-at"><i class="material-icons">schedule</i>Släpps <span>2027-06-24 19:00</span></div>')`.
7. **Checkout parts without a checkout** (insurance row, addon cards such as Kivra, the Kivra modals): the theme's selectors need dagny's nesting, so build it around the copied JSP markup and append it to the event page: `<section id="booking" class="payment-page klarna"><div class="booking-contents"><div class="payment-list" style="position:static;transform:none;left:auto;width:auto"><div id="details"><div id="details-list">…insuranceDetail markup…</div></div><div id="addons"><div class="list-box"><div class="row">…kivraAddonDetail markup…</div></div></div></div></div></section>`. Render one insurance row with "yes" checked and one with "no", and measure what matters (row colours, the computed colour of `span.fake-label`, name/price text boxes not overlapping via `Range.getBoundingClientRect()`). Campaign categories (`.generated-by-campaign-code`) are injected the same way into `.show-category-scoll-wrapper`, from the template in `eventPage.js`.

## When the user previews on the live page (Chrome Local Overrides)

The user can watch a prod theme on the real, possibly draft, event page before it is deployed: DevTools → Sources → Overrides, with the event folder as the overrides root. Chrome then serves `events/<id>/nortic-assets.web.app/longurls/styles.css-<hash>.css` in place of the prod stylesheet. Relative `url('../../assets/…')` still resolves to the prod asset URL, which 404s until the assets are deployed, and a `file://` path is blocked on an https page. So after every change to `styles.css`, rebuild the override with the images inlined:

```js
// build-override.js — test only, never commit the output
const fs = require('node:fs')
const path = require('node:path')
const dir = '<repo>/assets/hosting/custom-css/prod/eventsystem/organizers/<org>/events/<event>'
const types = { '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.png': 'image/png', '.woff2': 'font/woff2' }
const css = fs.readFileSync(`${dir}/styles.css`, 'utf8').replace(/url\('\.\.\/\.\.\/assets\/([^']+)'\)/g, (m, f) =>
  `url('data:${types[path.extname(f)]};base64,${fs.readFileSync(path.join(dir, '../../assets', f)).toString('base64')}')`)
fs.writeFileSync(`${dir}/nortic-assets.web.app/longurls/<override-file-name>.css`, css)
```

The regex expects single quotes, which is what the repo's eslint formatting produces. Self-hosted fonts are inlined the same way (three Futura weights put Grand Stade's override at ~165 kB, which Chrome handles fine). A theme without assets (Parken Zoo 86041) can simply `cp styles.css` into the override. The user then reviews by screenshot, one detail at a time; each round is: fix, lint, rebuild the override, check the detail in Playwright on the host page, and report what you measured.

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
- Alignment: log `[left, top, right, bottom]` for the blocks that should line up (title block, description, calendar, listing) at 390, 1000 and 1600 px; a 2 px drift is invisible in a screenshot and obvious to the customer.
- Icon centring: the gaps between an `i.material-icons` and its button on all four sides should be equal.
- Page overflow: `document.documentElement.scrollWidth > innerWidth`, and list the elements whose `getBoundingClientRect().right > innerWidth` (the footer at 320 px is the usual culprit).
- Jank ("hoppar in"): from the click, take screenshots in a tight loop with timestamps and read `PerformanceObserver` entries for `layout-shift` and `longtask` registered via `page.addInitScript`; run with and without the theme (route the theme to an empty body) to know whether the theme caused it.
- Clicks the way a person makes them: Playwright's `click()` moves, presses and releases in one go and misses bugs where an element moves on hover (dagny's 5 px `hintDown` on "Läs mer" lost real clicks). Point first, wait, then press and release, at several offsets from the top edge, and check the state after each:

  ```js
  const box = await link.boundingBox()
  for (const dy of [1, 3, 6, 10, 20]) {
    await page.mouse.move(box.x + 20, box.y - 40) // leave first, so :hover starts again
    await page.waitForTimeout(1200)
    await page.mouse.move(box.x + 20, box.y + dy, { steps: 4 })
    await page.waitForTimeout(280)
    await page.mouse.down()
    await page.waitForTimeout(90)
    await page.mouse.up()
    await page.waitForTimeout(1300) // then read the state (e.g. .event-information.minimized)
  }
  ```

- Toggles and animations ("hoppar", "studsar"): sample the height every 25 ms while the click runs (`setInterval` in `page.evaluate`, collapsed to distinct values) and toggle twice. A jump shows as a value below the resting height or a sudden step; run it without the theme as well.
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

There is no ffmpeg on the Macs; extract frames with a small Swift script using `AVAssetImageGenerator` (4–8 fps is plenty; `swift frames.swift <mov> <outdir> <fps>` with `appliesPreferredTrackTransform` and zero time tolerance), then compute per-frame pixel differences with sharp to find the moment things change, and look at the frames on both sides of each change. Videos on the Desktop are unreadable from the terminal (macOS privacy); ask for a copy inside the repo's `tmp/` folder. Screenshots on the Desktop can be opened directly with the Read tool.

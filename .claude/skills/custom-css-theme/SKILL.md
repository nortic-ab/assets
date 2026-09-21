---
name: custom-css-theme
description: Build, adjust or debug a per-organizer or per-event CSS theme (and companion JS) for EventSystem's dagny customer pages, hosted from this repo under assets/hosting/custom-css and custom-js. Use this whenever someone asks for a theme, design, skin, look, colours, fonts or a "custom css"/"styles.css" for an organizer or event (Swedish: tema, design, utseende, färger, font, "css för org X event Y", "skapa en fin design för …"), wants a seasonal or brand theme (Halloween, jul, midsommar, sponsor) on a dagny event page, or reports a visual problem on an event page, calendar, show listing, ticket cards, checkout/betalsidan, insurance, basket/varukorg, waitlist or other modal — even when they only give an organizer id and an event id.
---

# Custom CSS themes for dagny (EventSystem)

You are styling a page you do not own. dagny is EventSystem's customer theme: a Materialize-based, id-heavy stylesheet with JSP templates and jQuery that inject markup at runtime. Your stylesheet is linked last in `<head>` (organizer file, then event file), so at equal specificity you win — and everything else about the page stays as it is. The goal is a page that looks like the organizer's brand while the purchase flow stays exactly as easy as before.

Two finished themes are the reference implementations. Read the one closest to your brief before writing anything:

- Light brand theme: `assets/hosting/custom-css/staging/eventsystem/organizers/3162/events/84219/styles.css` (Midsommarfesten: self-hosted brand font, folk ribbon, hero gradient node, every dagny quirk below already handled).
- Dark seasonal theme: `assets/hosting/custom-css/staging/eventsystem/organizers/4937/events/86043/styles.css` plus `custom-js/.../4937/events/86043/script.js` (Parken Zoo Halloween: display font from Google Fonts, animated calendar, background videos from a script).

## Before you write CSS

1. Pin down organizer id, event id (or organizer-wide), environment (`staging` first, `prod` when approved) and the brand input: colours, logo, fonts, patterns, the organizer's own website. Ask only for what you cannot look up.
2. Open the dagny source in the EventSystem repo (usually `~/IdeaProjects/eventsystem`). You will copy selectors from it verbatim:
   - `src/webapp/styles/dagny/dagny.css` (the theme; mobile rules live in `@media (max-width: 600px)` blocks near the end)
   - `src/webapp/WEB-INF/templates/fragments/customer/dagny/` (`head.jsp`, `topSection.jsp`, `showCalendar.jsp`) and `src/webapp/WEB-INF/templates/pages/customer/order/dagny/` (`paymentPageKlarna.jsp`, `unnumberedShowCategoryPage.jsp`)
   - `src/webapp/scripts/nortic/dagny/` (`eventPage.js`, `paymentPageKlarna.js`, `basketCartHandler.js`, `event.js`) — markup and classes that only exist after JS runs
3. Check whether the event exists in the local EventSystem (`curl -s http://localhost:8081/ticket/event/<id>`). If it does not, you will verify by swapping your stylesheet into another event's page over the network (see `references/verification.md`) — never by copying files under another organizer.
4. Look at the organizer's website in a browser (Playwright screenshot) to see how they actually use their fonts and colours: weights, uppercase, spacing.

## Where files go

```
assets/hosting/custom-css/<staging|prod>/eventsystem/organizers/<organizerId>/
├── styles.css                 organizer-wide (every dagny page for the organizer)
├── assets/                    ALL images and fonts for the organizer and its events
└── events/<eventId>/styles.css
assets/hosting/custom-js/<staging|prod>/eventsystem/organizers/<organizerId>/
├── script.js
├── assets/                    videos and images used by scripts
└── events/<eventId>/script.js
```

- Reference assets relatively: `url('assets/x.webp')` from the organizer file, `url('../../assets/x.webp')` from an event file. URLs resolve against the stylesheet URL.
- The organizer file is linked on every dagny page of the organizer (organizer page, event and show pages, travel pages). When a rule should hit only some of them, scope it by the page hooks on `<body>`: event and show pages have `body#st-container.event-page[data-eventid]`, the organizer page has `body[data-organizerid]` without `data-eventid`, travel pages `body.bg-light`. So `body:not([data-eventid]) #background-container { … }` paints the organizer page only, and an event theme under `events/<id>/` still overrides for its event. Prefer this over a separate per-page file; it needs no EventSystem change.
- Never create or edit anything under another organizer's folder, not even "temporarily for a preview". Doing so once overwrote a committed theme for a real customer. Preview by network interception instead.
- `prod/` is a byte-identical copy of `staging/` made when the customer has approved. Change staging first, then `cp`, then `diff -r` the two folders.
- Replacing an image or font: give it a new file name. Assets are cached for a day; stylesheets for five minutes.
- Keep every new raster asset small: run it through sharp (`NODE_PATH=$PWD/node_modules node -e "..."`, JPEG quality 85 with mozjpeg, WebP quality 85, resize to the largest size the layout can show). Optimise SVGs with svgo and crop the `viewBox` to the drawing. Convert brand fonts to woff2 with fontTools and ship only the weights you use.
- Brand fonts are usually licensed. Take them from the organizer's own site only when they self-host them there, and say in the hand-over that the licence should cover the ticket page.
- Work on a feature branch. Commit and push only when asked, with `type(custom-css): Sentence-case subject` (commitlint). Lint with `pnpm exec eslint --fix <file>`; the pre-commit hook runs the same.

## How to write the stylesheet

Start from the section skeleton below (the reference themes follow it), with a header comment naming the organizer, event and brand sources, and CSS custom properties with a short prefix (`--mf-`, `--pz-`) for the palette and fonts.

```
@import (Google Fonts, if any — must be the first rule in the file)
@font-face (self-hosted fonts, font-display: swap)
:root custom properties
1. Ground        body, .st-content, a, footer.page-footer
2. Hero          div#main-ribbon (+ ::before for a logo), h1, .event-info chips, #background-container, section#top::before
3. Buttons       .btn, .btn-large, .theme-background-color, .theme-secondary-background-color, .theme-color, *-override
4. Calendar      .filter-calender-base #calendar-wrapper > div, .calendar-header, .days li.selectable(.bookable|.selected)::before
5. Show listing  section#active-events #show-listing, .show-listing-month, .show-listing-show, .dateball, .sold-out-box
6. Ticket cards  .unnumbered-show-container .show-category, .amount-blob.(plus|minus|amount|disabled), a.btn.open-addons
7. Checkout      .modal__bg, .modal__content, section#booking.payment-page.klarna, .payment-list, headers, .list-box rows,
                 #details .detail-container, insurance, addons cards, #klarna-box, inputs, checkboxes, radios, terms
7b. Small modals .nortic-modal (waitlist, campaign code, access code), .nortic-modal-overlay
8. Basket        div#basket, div#basket-cart, div#basket-cart-go-to-payment, div#addons-basket, div#add-to-basket-cart
9. Mobile        @media (max-width: 600px) — dagny's own breakpoint, also used by its JS
```

Rules that come from experience, with the reason behind each:

- **Copy dagny's selectors verbatim.** They are long (`section#booking.payment-page.klarna .booking-contents .payment-list #details #details-list .insurance-detail-container`). Since your file loads last, matching the specificity is enough; shorter "clean" selectors silently lose.
- **`!important` only against inline styles and JS-set colours.** The known ones: `section#booking.payment-page.klarna` (`style="background-color: #303d9b"`), `button#addon-modal-go-back`, `a.btn.open-addons`, `.sold-out-box` (gets `.theme-background-color` from JS), `.basket-color` (dagny uses `!important` itself), `#background-container` (inline background image from the image API, plus inline `filter`/`transform` from `fadeBanner()`), and dagny's `!important` colour on `div#main-ribbon .event-info`.
- **State classes lag; key on real state.** dagny toggles `.selected`/`.not-selected` on the insurance row after an AJAX round trip. Style `.selection-row:has(.yes [type='radio']:checked)` and `:has(.no [type='radio']:checked)` instead, and keep dagny's own classes as fallbacks in the same rule.
- **Text contrast is at least 4.5:1, with opaque colours.** A "muted" colour made with alpha lands on white, paper and mist alike and fails on the darker ones. Compute the ratio (script in `references/verification.md`) against every background the colour sits on. Disabled controls are exempt.
- **One bold element, everything else quiet.** A hero gradient node, a ribbon, a lantern-board calendar — pick one. Ticket cards, checkout rows and forms stay high-contrast and calm; that is where people type card details.
- **Motion is optional.** Anything animated gets a `@media (prefers-reduced-motion: reduce)` off switch; decorative pseudo-elements get `pointer-events: none` and no `z-index` above what they must cover.
- **The event has no image?** dagny falls back to its blue stock photo through the image API. Neutralise `section#top #background-container` (`background-image: none !important; filter: none !important`) and paint the hero with `section#top::before` (`position: absolute; inset: -80px 0 0 0; z-index: 2`) — the negative top covers the strip above `<main>` where the header icons sit.
- **Fonts.** Google Fonts via `@import` on line one, `display=swap`. Self-hosted fonts as woff2 in the organizer's `assets/` with `@font-face { font-display: swap }`; `firebase.json` already sends `Access-Control-Allow-Origin: *` for font files, which cross-origin fonts require. Verify with `document.fonts.check('700 20px <Family>')`. A display face changes widths: re-check every heading that shares a row with something else (the payment section headers do).
- **Klarna's checkout is an iframe you cannot style.** It is white; give `#klarna-box.list-box.list-box-background` a white background even in dark themes, otherwise a coloured frame shows around it.

### Ship these in every theme

Some dagny defects show in every theme, whatever the palette, and customers report them as "our" bugs. Put the fixes in each new stylesheet from the start; all of them are in the Midsommarfesten and Parken Zoo files, copy from there.

- **The payment list "jumps in".** Its `slideInUp` entrance loses dagny's centring transform and snaps half a screen to the left when it finishes. Override `animation-name` with a keyframe that keeps `translate3d(-50%, …)` (desktop only). This is the one customers notice first; never skip it.
- `div#basket` is 170 px wide and hides three-digit prices: 224 px plus a centred `.price-container`.
- The "Släpps <date>" chip on a category with a later release date lies over the amount blobs: hide them with `:has(> .available-at)`.
- The payment section headers are fixed 50/50 columns: size them by content and let the right-hand text wrap below.
- The hero info chips can draw a grey scrollbar: hide it on `div#main-ribbon .slider-wrapper`.
- The small "Läs mer" and terms modals (`#premium-ticket-modal`, `#insurance-terms-modal`, `#terms-modal`, `#read-more-about-simple-addon-modal`) keep dagny's blue shell, grey close square and inline-black links unless you theme them; next to a themed checkout they look broken.
- The `h3` group headings ("Biljetter", "Tillval") inside the expanded order details and Klarna's `img.payment-icon` take no colour from the theme: set them explicitly.

`references/dagny-quirks.md` lists every dagny and Materialize behaviour that has bitten a theme so far, with the selector and the fix. Read it once per theme; most of the fixes belong in every new stylesheet.

## Verify before you hand over

Follow `references/verification.md` for the mechanics (local EventSystem + Firebase emulator, Playwright with system Chrome, network swap for events that do not exist locally, how to reach the payment modal). Look at each of these, desktop 1280 px and mobile 390 px:

1. Hero: logo, title, info chips (no stray scrollbar under them), background layer.
2. Calendar: bookable, half-sold, selected and non-selectable days; month navigation.
3. Show listing: month rows, a show row with date ball, a sold-out show, a not-yet-released show if the event has one.
4. Ticket cards: +/− blobs, disabled minus, a category with a later release date (the chip covers the blobs), addons button.
5. Basket pill / cart button with a three-digit price ("200 SEK") and the hover state.
6. Payment modal: the slide-in (no jump), section headers with their right-hand text, order rows and the expanded "Din order" details (group headings, divider), insurance yes and no, addon cards including the "premium" one and its "Läs mer" modal (desktop and phone), Klarna box and icon, terms checkbox, input focus colours.
7. The four Materialize modals that share dagny's terms-modal rules, each opened and scrolled to its end: `#insurance-terms-modal` (VILLKOR link; check the links in the last paragraph), `#terms-modal` ("Villkor & integritetspolicy"; the organizer's own HTML), `#read-more-about-simple-addon-modal` and `#customer-data-modal` (no local trigger; open them directly, see `references/verification.md`).
8. Small modals: waitlist and campaign code.
9. `document.fonts` reports your fonts loaded; no console errors; both `<link href*="/custom-css/">` tags present.

Report in the user's language: what changed, what you verified and how, what you could not verify locally, and anything the customer must confirm (font licence, colours you had to choose).

## How to invoke this skill

Type `/custom-css-theme` or just describe the job, for example:

- "Skapa ett tema för org 3162, event 84219, brandfärger #598353 och #E2E7E2, logga och band bifogas"
- "Gör ett Halloween-tema för Parken Zoo (org 4937, event 86043), bara CSS"
- "Betalsidan hoppar in konstigt på event 84219, kan vi ha orsakat det?"
- "Fix cart button size for organizers/4937/events/86043/styles.css so the price is visible"
- "Byt rubrikfont till Sloke från midsommarfesten.se för org 3162"

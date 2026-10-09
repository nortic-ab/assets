---
name: custom-css-theme
description: Build, adjust or debug a per-organizer or per-event CSS theme (and companion JS) for EventSystem's dagny customer pages, hosted from this repo under assets/hosting/custom-css and custom-js. Use this whenever someone asks for a theme, design, skin, look, colours, fonts or a "custom css"/"styles.css" for an organizer or event (Swedish: tema, design, utseende, färger, font, "css för org X event Y", "skapa en fin design för …"), wants a seasonal or brand theme (Halloween, jul, midsommar, sponsor) on a dagny event page, or reports a visual problem on an event page, calendar, show listing, ticket cards, checkout/betalsidan, insurance, basket/varukorg, waitlist or other modal — even when they only give an organizer id and an event id.
---

# Custom CSS themes for dagny (EventSystem)

You are styling a page you do not own. dagny is EventSystem's customer theme: a Materialize-based, id-heavy stylesheet with JSP templates and jQuery that inject markup at runtime. Your stylesheet is linked last in `<head>` (organizer file, then event file), so at equal specificity you win — and everything else about the page stays as it is. The goal is a page that looks like the organizer's brand while the purchase flow stays exactly as easy as before.

Six finished themes are the reference implementations. Read the one closest to your brief before writing anything:

- Light brand theme: `assets/hosting/custom-css/staging/eventsystem/organizers/3162/events/84219/styles.css` (Midsommarfesten: self-hosted brand font, folk ribbon, hero gradient node, every dagny quirk below already handled).
- Dark seasonal theme: `assets/hosting/custom-css/staging/eventsystem/organizers/4937/events/86043/styles.css` plus `custom-js/.../4937/events/86043/script.js` (Parken Zoo Halloween: display font from Google Fonts, animated calendar, background videos from a script).
- Dark theme from a design spec, most complete: `assets/hosting/custom-css/prod/eventsystem/organizers/4987/events/87018/styles.css` (Billy Elliot: poster hero with scrim, show rows as a CSS grid, sticky month headings, supply dots as a meter, square steppers, the numbered-seat arena page and the standalone addons page). Prod only.
- Light theme from a design spec: `assets/hosting/custom-css/prod/eventsystem/organizers/4988/events/87069/styles.css` (Sofiero: photo row, a title block and the calendar sharing one top edge through a grid across dagny's sections, square calendar days, basket-cart buttons, the "Din order" overview modal, a footer that works on phones, two Google fonts). Prod only.
- Light theme without a calendar, from a design spec: `assets/hosting/custom-css/prod/eventsystem/organizers/4937/events/86041/styles.css` (Parken Zoo Säsongskort: `section#top` as a grid with `#main-ribbon` flattened, the event photo as a photo row with a scalloped edge, the description on paper below it, the single show as a product card, ticket categories as list rows with round steppers). Prod only.
- Brand-book theme with self-hosted brand fonts: `assets/hosting/custom-css/prod/eventsystem/organizers/3952/events/85791/styles.css` (Hotel Grand Stade: `#main-ribbon` kept whole as a letterhead panel beside the framed event poster, patterns drawn in CSS, ticket categories as hotel key tags with a sold-out stamp and a "few left" tag, Kivra card and modals, a low-contrast brand palette made readable). Prod only.

When the brief is a design PDF ("CSS-förbättringar för design", `sofiero.pdf`), render its pages to PNG (`pdftoppm -r 72 -png`, crop long pages with sharp) and read the handoff table: it lists colours, type scale, grid columns, states and radii. Treat it as the spec, and say where dagny's markup forces a deviation.

When the brief is a brand package (a folder with a brand book PDF, logos, fonts and patterns, as for Hotel Grand Stade): extract the brand book's text with `pdftotext -layout` (colour codes, type roles, tone) and look at its pages as contact sheets (`pdftoppm -r 40`, tiled with sharp), then read the organizer's website for how they really use it. Pick a concept from the brand rather than only its colours: Grand Stade calls itself a hotel, so the ticket categories (Single Room, Junior Suite …) became key tags.

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
- `prod/` is a byte-identical copy of `staging/` made when the customer has approved. Change staging first, then `cp`, then `diff -r` the two folders. Exception: when the user says the theme lives in prod only (Billy Elliot 4987, Sofiero 4988), work in `prod/` directly and create no staging copy.
- The user often previews a prod theme on the live page before anything is deployed, through Chrome DevTools Local Overrides: a file such as `events/<id>/nortic-assets.web.app/longurls/styles.css-<hash>.css` next to your stylesheet. Look for it (`find … -path '*nortic-assets.web.app*'`) when you start and after each round; the user creates it, often with an older copy of your file. Keep it in step with `styles.css` after every change, inline the images and fonts as data URIs (the assets are not deployed yet, and Chrome refuses `file://` URLs on an https page), and never commit it. The build script is in `references/verification.md`. Overrides for `script.js` work the same way, so a theme that needs a companion script also needs an override for the script before the user can see the fix.
- Replacing an image or font: give it a new file name. Assets are cached for a day; stylesheets for five minutes.
- Keep every new raster asset small: run it through sharp (`NODE_PATH=$PWD/node_modules node -e "..."`, JPEG quality 85 with mozjpeg, WebP quality 85, resize to the largest size the layout can show). Optimise SVGs with svgo and crop the `viewBox` to the drawing. Convert brand fonts to woff2 with fontTools and ship only the weights you use.
- Brand fonts are usually licensed. Take them from the organizer's own site only when they self-host them there, and say in the hand-over that the licence should cover the ticket page.
- Read each brand font file's name table before converting it (`TTFont(f)['name'].getDebugName(4)`, `['OS/2'].usWidthClass`): file names lie. Grand Stade's "Futura Bold font.ttf" is Futura Bold _Condensed_ BT and "Futura Light font.ttf" is Light Condensed. Give the self-hosted family its own name (`'HGS Futura'`) so a Futura installed on the visitor's Mac does not take over, and check that åäö are in the cmap.
- Work on a feature branch. Commit and push only when asked, with `type(custom-css): Sentence-case subject` (commitlint). Lint with `pnpm exec eslint --fix <file>`; the pre-commit hook runs the same. Do not run standalone `prettier --write`: its defaults (double quotes, other wrapping) differ from the repo's eslint `format/prettier` rule, and eslint then fails on every line it touched.
- Stage only the theme's own files by path (`styles.css`, the new assets). Leave the Local Overrides folder, `.DS_Store` and anything under other organizers out of the commit.

## How to write the stylesheet

Start from the section skeleton below (the reference themes follow it), with a header comment naming the organizer, event and brand sources, and CSS custom properties with a short prefix (`--mf-`, `--pz-`) for the palette and fonts.

```
@import (Google Fonts, if any — must be the first rule in the file)
@font-face (self-hosted fonts, font-display: swap)
:root custom properties
1. Ground        body, .st-content, a, footer.page-footer
2. Hero          div#main-ribbon (+ ::before for a logo), h1, .event-info chips, #background-container, section#top::before
3. Buttons       .btn, .btn-large, .theme-background-color, .theme-secondary-background-color, .theme-color, *-override
4. Calendar      .filter-calender-base #calendar-wrapper > div, .calendar-header, .days li.selectable(.bookable|.selected)::before,
                 #flex-info-wrapper (the event description, moved there by JS)
4b. Layout grid  optional: main as a grid with dagny's wrappers set to display: contents (title block + calendar aligned)
5. Show listing  section#active-events #show-listing, .show-listing-month, .show-listing-show, .dateball, .sold-out-box
6. Ticket cards  .unnumbered-show-container .show-category, .amount-blob.(plus|minus|amount|disabled), a.btn.open-addons,
                 .category-slider a.addons-slider (phone carousel arrows), div#add-to-basket-cart
7. Checkout      .modal__bg, .modal__content, section#booking.payment-page.klarna, .payment-list, headers, .list-box rows,
                 #details .detail-container, insurance, addons cards, #klarna-box, inputs, checkboxes, radios, terms
7b. Small modals .nortic-modal (waitlist, campaign code, access code), .nortic-modal-overlay
8. Basket        div#basket, div#basket-cart, div#basket-cart-go-to-payment, div#addons-basket (pill and cart buttons)
8a. Cart overview #cart-overview-modal ("Din order"), .modal-overlay
8b. Arena page   #material-modal.arena-page: section list, category modal, #loading-overlay (numbered seats only)
8c. Addons page  #standalone-addon-container (its own <style> loads after the theme)
9. Mobile        @media (max-width: 600px) — dagny's own breakpoint, also used by its JS; footer.page-footer lives here too
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
- **Never set `font-family` on a selector that matches `i.material-icons`.** The icons are ligatures of the Material Icons font; any other family prints their names as text ("shopping_cart", "payment"). This slipped into Billy Elliot and Sofiero through selector lists that mixed labels and icons in the basket-cart buttons. Put label fonts on the text elements only.
- **Materialize utility classes carry `!important`.** `.white`, `.no-padding` and friends win over your selector however long it is; `a.btn-floating.white.addons-slider` stays white unless its background has `!important` too. When a colour "does not take", look for a utility class in the markup before raising specificity.
- **A theme that sets `display` must keep `.display-none` winning.** dagny hides rows, month headings and buttons by adding `.display-none`; a themed `display: grid`/`block` on the same element shows them again. Repeat dagny's hiding for every element you give a display (`… .show-listing-show.display-none { display: none !important }`).
- **Keep space between content and row edges.** A row marker drawn as `box-shadow: inset 4px 0 0` eats into the padding; give the side the marker sits on 20+ px so the date number and the chevron button do not touch the edges.
- **Several fonts: decide the split up front.** Sofiero uses Poppins for headings (hero title, month headings, calendar month, checkout and modal headings, "Din order") and Bitter for everything else, including labels, buttons, dates and prices. Keep a `--xx-display` and a `--xx-font` variable and switch per rule, not per element type. A display face with a single weight (DM Serif Display is 400 only) must get `font-weight: 400` on every rule that uses it, or dagny's `.bold` produces a synthetic bold.
- **A low-contrast brand palette stays the brand, the text moves.** Grand Stade's red on pink is 2.3:1, too low even for large text. Keep the brand pairs for surfaces, patterns, logos and very large type, put running text on a paper or white panel, and add a darker "ink" variant of the brand colour for small coloured text and for white text on coloured buttons (`#C40202` instead of `#F60303`: 5.7–6.3:1). Say in the hand-over which colours were darkened and why.
- **Draw patterns in CSS rather than shipping rasters.** Harlequin diamonds are `conic-gradient(from 45deg, a 25%, b 0 50%, a 0 75%, b 0)` at a square `background-size`; stripes are `repeating-linear-gradient(90deg, a 0 24px, b 24px 48px)`; a scalloped edge is `radial-gradient(15px 22px at 50% 0, c 96%, transparent 100%) repeat-x 0 0 / 30px 22px` on a pseudo-element. They scale, recolour with the variables and cost no requests.
- **Leave dagny's "Läs mer" height alone.** `event.js` collapses the event description to a hard-coded 100 px (`var minimizedDescriptionHeight = 100`) and animates to that number. A theme that shows more text in the collapsed state makes "Dölj" fold to 100 px and jump back, and the next "Läs mer" start from the wrong height. The user preferred dagny's 100 px over a companion script that rewrites the variable. Restyle the button, not the height (see the read-more entry in `references/dagny-quirks.md`: the hover bounce has to go too).
- **Not every bug on a themed page is the theme's.** Reproduce with the theme routed to an empty body before fixing. After the checkout is closed, dagny empties the basket pill but leaves the chosen amounts and its order tracker, so the next "+" books the old ticket again; that is an EventSystem bug (`event.js` `modal:close` never calls `resetShow()`), with or without a theme. Report it with the evidence instead of hiding it in CSS.

### Ship these in every theme

Some dagny defects show in every theme, whatever the palette, and customers report them as "our" bugs. Put the fixes in each new stylesheet from the start; all of them are in the Midsommarfesten and Parken Zoo files, copy from there.

- **The payment list "jumps in".** Its `slideInUp` entrance loses dagny's centring transform and snaps half a screen to the left when it finishes. Override `animation-name` with a keyframe that keeps `translate3d(-50%, …)` (desktop only). This is the one customers notice first; never skip it.
- `div#basket` is 170 px wide and hides three-digit prices: 224 px plus a centred `.price-container`.
- The "Släpps <date>" chip on a category with a later release date lies over the amount blobs: hide them with `:has(> .available-at)`.
- The payment section headers are fixed 50/50 columns: size them by content and let the right-hand text wrap below.
- The hero info chips can draw a grey scrollbar: hide it on `div#main-ribbon .slider-wrapper`.
- The small "Läs mer" and terms modals (`#premium-ticket-modal`, `#insurance-terms-modal`, `#terms-modal`, `#read-more-about-simple-addon-modal`) keep dagny's blue shell, grey close square and inline-black links unless you theme them; next to a themed checkout they look broken.
- The `h3` group headings ("Biljetter", "Tillval") inside the expanded order details and Klarna's `img.payment-icon` take no colour from the theme: set them explicitly.
- `.display-none` must keep winning over every `display` the theme sets (see above).
- On organizers with the basket cart, the "Din order" overview (`#cart-overview-modal`) keeps dagny's blue `#303d9b` counters and grey, rounded rows, and the phone carousel arrows over the ticket cards are white on white. Theme both.
- `.nortic-modal .input-field.big-ass-input-field` is 110 % wide with `margin-left: -5%` inside an `overflow: auto` modal: a horizontal scrollbar in the access-code and campaign-code modals. Set `width: 100%; margin-left: 0`.
- The footer is 80 px high with links that must not wrap; a wider face pushes "Tillgänglighetsredogörelse" off the right edge on phones. Let it wrap below 600 px (logo on its own line, no divider, no fixed height).
- The "Läs mer" link under the event description: once restyled as a low text link, dagny's 5 px hover bounce (`hintDown`/`hintUp`) moves it from under the pointer and the first click is lost. `animation: none` on both of dagny's hover selectors, a 40 px hit area (`padding-top` with an equal negative `margin-top`), no `.waves-ripple`.
- `div#main-ribbon p` is white with a text shadow and 18 px: a description on a light surface needs its own `p` rule, not just a colour on `.event-information`.
- Addon cards put the name in a `col s7` and the price in a `col s5` (Kivra: "Din biljett i Kivra" / "9 SEK"): a wide or uppercase face runs the name into the price. Let the name wrap and keep the price on one line.
- On events with Kivra, the Kivra modals (`.kivra-overlay`, `.kivra-dialog`) are dagny blue with `!important`: theme them with `!important` (details in `references/dagny-quirks.md`).
- The insurance "yes" row is white text and white radios on dagny's green. A light "yes" colour needs dark text and dark radios as well, through the same `:has()`/`.selected` pair as the background.

`references/dagny-quirks.md` lists every dagny and Materialize behaviour that has bitten a theme so far, with the selector and the fix. Read it once per theme; most of the fixes belong in every new stylesheet.

## Verify before you hand over

Follow `references/verification.md` for the mechanics (local EventSystem + Firebase emulator, Playwright with system Chrome, network swap for events that do not exist locally, a public prod page as host when the local EventSystem is down or the event is an unpublished draft, how to reach the payment modal). Look at each of these, desktop 1280 px and mobile 390 px (and 320 px for the footer):

1. Hero: logo, title, info chips (no stray scrollbar under them), background layer. If blocks are meant to line up (title block and calendar), measure their `getBoundingClientRect()` instead of judging a screenshot.
2. Calendar: bookable, half-sold, selected and non-selectable days; month navigation, with the arrow icons centred in their buttons and a disabled arrow.
3. Show listing: month rows, a show row with date ball, a sold-out show, a not-yet-released show if the event has one.
4. Ticket cards: +/− blobs, disabled minus, a category with a later release date (the chip covers the blobs), a sold-out category and a "Fåtal kvar!" one (long names next to the stamp), the "LÄS MER" info modal, a campaign category ("Kampanj" badge), addons button, the carousel arrows on a phone.
5. Basket pill / cart buttons with a three-digit price ("200 SEK") and the hover state; on basket-cart organizers the "Varukorg" and "Till kassan" buttons (icons rendered, count chip readable) and the "Din order" overview.
6. Payment modal: the slide-in (no jump), section headers with their right-hand text, order rows and the expanded "Din order" details (group headings, divider), insurance yes and no, addon cards including the "premium" one and its "Läs mer" modal (desktop and phone), Klarna box and icon, terms checkbox, input focus colours.
7. The four Materialize modals that share dagny's terms-modal rules, each opened and scrolled to its end: `#insurance-terms-modal` (VILLKOR link; check the links in the last paragraph), `#terms-modal` ("Villkor & integritetspolicy"; the organizer's own HTML), `#read-more-about-simple-addon-modal` and `#customer-data-modal` (no local trigger; open them directly, see `references/verification.md`).
8. Small modals: waitlist and campaign code.
9. `document.fonts` reports your fonts loaded; no console errors; both `<link href*="/custom-css/">` tags present; no horizontal page scroll (`document.documentElement.scrollWidth > innerWidth`) at 320, 390 and 1280 px.
10. The footer at 320 and 390 px: nothing past the right edge.
11. "Läs mer" / "Dölj" under the description: clicked like a person would (point, wait, press, release; see `references/verification.md`) near the top edge of the link, and toggled twice with the height traced, so a lost first click or a jump shows up as numbers.

When the page is live and public, test on the real event (route your files in) rather than a host. Never go through the checkout of a real event to look at it: adding to the basket and opening the payment page creates an order. Render the checkout parts from dagny's JSP markup inside the right nesting instead (`references/verification.md`), and say in the hand-over that the live checkout was not opened.

Report in the user's language: what changed, what you verified and how, what you could not verify locally, and anything the customer must confirm (font licence, colours you had to choose).

## How to invoke this skill

Type `/custom-css-theme` or just describe the job, for example:

- "Skapa ett tema för org 3162, event 84219, brandfärger #598353 och #E2E7E2, logga och band bifogas"
- "Gör ett Halloween-tema för Parken Zoo (org 4937, event 86043), bara CSS"
- "Betalsidan hoppar in konstigt på event 84219, kan vi ha orsakat det?"
- "Fix cart button size for organizers/4937/events/86043/styles.css so the price is visible"
- "Byt rubrikfont till Sloke från midsommarfesten.se för org 3162"

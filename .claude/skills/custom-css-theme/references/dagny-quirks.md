# dagny and Materialize behaviours that bite themes

Each entry: where it shows, why it happens, the fix that is known to work (all fixes live in
`organizers/3162/events/84219/styles.css` unless noted). Selectors are dagny's own; copy them exactly.

## Page hooks on `<body>`

- `eventPage.jsp` (event and show pages): `<body id="st-container" class="event-page" data-eventid="…" data-organizerid="…">`; `travelEventPage.jsp` has the same id, class and `data-eventid`.
- `organizerPage.jsp`: `<body data-organizerid="…">` — no `data-eventid`, no class; the page is also the only one with `#organizer-calendar` in the markup.
- `travelPage.jsp`: `<body class="bg-light" data-organizerid="…">`.
- Use them to scope organizer-level rules: `body:not([data-eventid]) …` for "not on an event or show page", `body.event-page …` for the opposite. Attribute selectors and `:not()` work everywhere, so prefer them over `:has()` for this.

## Hero (`section#top`, `div#main-ribbon`)

- **Blue stock photo behind everything.** `#background-container` is `position: fixed` with an inline `background-image` from the image API (the event's image, or dagny's fallback), and `fadeBanner()` in `eventPage.js` writes inline `filter`/`transform` while scrolling. Fix: `section#top #background-container { background-color: <surface>; background-image: none !important; filter: none !important }` and paint the hero with `section#top::before { content: ''; position: absolute; inset: -80px 0 0 0; z-index: 2; pointer-events: none; background: <gradient> }`. Keep the fixed layer when the event has a real photo you want.
- **Huge empty space above the title.** dagny reserves 35–75 % of the width as `padding-top` on `div#main-ribbon` to show the photo. Set a fixed `padding-top` (110 px desktop, 84 px mobile worked) when the photo is gone.
- **Logo above the title.** `div#main-ribbon::before { content: ''; display: block; width: min(460px, 78vw); aspect-ratio: <w> / <h>; background: url(...) no-repeat left center / contain }`.
- **Info chips.** `div#main-ribbon .event-info` has `color: white !important` (match it with your own `!important`), `text-transform: uppercase`, and `> i.material-icons { margin-right: 18px }`. A mono label face makes the 18 px plus the space look detached; 6 px reads right.
- **Grey scrollbar under the chips.** The chips sit in `#event-info-slider-wrapper.slider-wrapper` (`overflow-x: auto`); on small screens dagny gives it negative margins, and any overflow draws a classic scrollbar. `div#main-ribbon .slider-wrapper { scrollbar-width: none }` + `::-webkit-scrollbar { display: none }` keeps it scrollable and hides the bar.

## Calendar (`.filter-calender-base`)

- Days are `li` with a `::before` disc: `.days li.selectable::before`, `.selectable.bookable::before`, `.bookable.half-sold::before`, `.calendar .days li.selectable.selected::before`, hover variants `.selectable:not(.selected):hover::before` and `li:not(.selectable):hover::before`. Colour those, not the `li`.
- The card is `#calendar-wrapper > div`; give it `position: relative` if you add a decorative `::before` (ribbon) and push `.wrapper .calendar-header` down with `padding-top` to make room.

## Show listing (`section#active-events #show-listing`)

- Month rows are `.show-listing-month` with `.month-name`; the calendar also toggles a hidden `.show-listing-month.fake-month` ("Välj datum i kalender…") from JS. To drop month headings use `.show-listing-month:not(.fake-month) { display: none }` and give the element above (e.g. a ribbon `::before`) a bottom margin for the spacing the row provided.
- `.sold-out-box` gets `.theme-background-color` from JS: use `!important` for its background and colour.
- Not-released and not-bookable shows get `opacity: 0.3` on their date ball, arrow and texts from dagny; leave that alone.

## Ticket cards (unnumbered shows, `.unnumbered-show-container`)

- Category cards: `.show-category-row .show-category-container .show-category`, and the same with `:has(div.available-at)` for categories with a later release date (dagny paints those lighter).
- **Ring behind the "Släpps <date>" chip.** `div.available-at` is absolutely positioned over the `.amount-blob-container`; dagny relies on the blobs being white on white. Any border or tint on `.amount-blob.amount` or `.amount-blob.disabled` peeks out. Fix: `.booking-contents .amount-blob-container:has(> .available-at) .amount-blob { visibility: hidden }` (keeps the layout height).
- `.amount-blob.disabled` has an `!important` grey in dagny; override with `!important`.
- `a.btn.open-addons` has an inline black background: `!important`.

## Buttons and theme classes

- `.theme-background-color`, `.theme-secondary-background-color`, `.theme-color`, `.theme-secondary-color` come from the organizer's stored theme colours and are applied to buttons, blobs and chips; `.theme-background-color-override` / `.theme-text-color-override` are used with `!important` by dagny (supply blobs, JS modals) — override them with `!important` too.
- `div#add-to-basket-cart .btn` is hard-coded orange (`#ffb53e`); `div#basket-cart:hover` and `div#basket-cart-go-to-payment:hover` are hard-coded `#5966a9`. Restyle default and hover together.
- `#extend-time-button` is orange as well.

## Floating basket (`div#basket`, `div#basket-cart`, `div#addons-basket`)

- `div#basket` is a fixed 170 px pill whose `.price-container` is 60 px wide at `right: 45px`; a price like "200 SEK" collides with the arrow circle. Fix: `div#basket { width: 224px }` and `div#basket .price-container { left: 58px; right: 58px; width: auto; justify-content: center; text-align: center; white-space: nowrap }`.
- `div#basket-overlay` is the circle that scales up (`transform: scale(5)`) to cover the page while the order is created — locally that takes ~10 s, so its colour matters. Give it the theme's darkest colour.

## Payment modal (`#material-modal`, `section#booking.payment-page.klarna`)

- The section has `style="background-color: #303d9b"`: `!important` on `background-color` (and `background-image` if the organizer file sets one).
- **Payment list jumps half a screen when it opens.** dagny centres `.payment-list` with `left: 50%; transform: translate(-50%, 0)`; the entrance animation `slideInUp` (animate.css, applied by `animateIn()` in `event.js`) replaces that transform for 0.3 s, so the list slides in with its left edge at the middle and snaps left afterwards. Visible in every theme, camouflaged only when list and overlay share a colour, and the first thing customers report — ship the fix in every theme. Fix (desktop only — below 600 px dagny skips the animation and centres with margins):

  ```css
  @media (min-width: 601px) {
    section#booking .booking-contents .payment-list.animated.slideInUp {
      animation-name: mf-payment-list-slide-in;
    }
  }
  @keyframes mf-payment-list-slide-in {
    from {
      transform: translate3d(-50%, 100%, 0);
      visibility: visible;
    }
    to {
      transform: translate3d(-50%, 0, 0);
    }
  }
  ```

- **Section header text overlapping.** `header.payment-section-header` is a Materialize `.row.valign-wrapper` (flex) with two fixed `col s6` columns; a wide heading face runs under the right-hand text ("Säkra betalningar"). Fix: `header { flex-wrap: wrap; gap: 4px 16px }`, `> .col.s6 { width: auto; flex: 0 1 auto; min-width: 0; margin-left: 0 }`, `> .col.s6:last-child { margin-left: auto }`. The `margin-left: 0` matters: Materialize gives every `.col` `margin-left: auto`, which in a flex row pushes the heading to the right.
- **Insurance row colours.** dagny: `.selection-row.selected` green `#50a752`, `.not-selected` red `#d04844`, and it also sets `background-color` on `.insurance-detail-container.selected .expandable-detail` (needs `!important` to neutralise). Classes update after the AJAX round trip; the radios update immediately, so key on `.selection-row:has(.yes [type='radio']:checked)` / `:has(.no [type='radio']:checked)` and list dagny's classes alongside. Customers expect "no" to stay red.
- `.premium-ticket-detail-container::after` is a decorative overlay at 35 % opacity that clutters on light themes: `display: none`.
- The Klarna iframe is white; keep `#klarna-box.list-box.list-box-background` white.
- Form fields: dagny's focus rules are a 13-selector list (`.input-field input[type='text']:focus:not([readonly])` …); copy the whole list for the border and shadow colour. Checkboxes: `input[type='checkbox'].filled-in:checked:not([disabled]) + label:after`; radios: `[type='radio'].with-gap:checked + label:before/:after`.
- `button#addon-modal-go-back` has an inline blue background: `!important`.
- Icons in the payment list (`i.material-icons`) and the payment icons (`img.payment-icon`, PNG) are dark; recolour PNG icons with a `filter` chain if the theme is dark.

- **Expanded order details.** "Din order" expands `#ticket-summary.expandable-detail` (markup in `klarna/ticketsAndAddonsDetail.jsp` and `ticketAndAddonsDetailBasketCart.jsp`) with `h3` group headings ("Biljetter", "Tillval") and an `hr`. Neither takes the theme's text colour, so on a dark surface they are near-invisible. Colour `… #details #details-list .expandable-detail h3` and the `hr` (`border-top-color`) explicitly.
- **Klarna's K.** `img.payment-icon[alt='Klarna']` is a blue PNG (`/images/dagny/icons/klarna.png`). On a dark row use `filter: brightness(0) invert(1)`; dagny keeps it at 50 % opacity until the row is expanded, which is fine.
- **"Läs mer" modal on the premium/addon card** (`#premium-ticket-modal .premium-ticket-modal-inner`, markup in `klarna/premiumTicketModal.jsp`, shares every rule with `#addon-modals .addon-modal`). dagny paints the shell `#3644aa` and the `.description-info` card white, and the card's text inherits `.payment-list`'s colour, so a light theme text vanishes on it. Set the shell (surface, `border`, `box-shadow`, radius), `.description-info { background-color: #fff; color: <dark> }` with its `#short-event-description > h1` and `#long-description p`, and raise `.obfuscator` above dagny's 0.4 when the page behind is dark, otherwise the modal barely separates. On phones dagny stretches the modal to full height and the checkout's `header.booking-header` (title + close cross) draws over its header — a dagny default; hide that header while the modal is open: `section#booking.payment-page:has(#premium-ticket-modal .premium-ticket-modal-inner:not(.display-none)) header.booking-header { visibility: hidden }` inside `@media (max-width: 600px)`.
- **Terms modals** (`#insurance-terms-modal`, `#terms-modal`, `#read-more-about-simple-addon-modal`, `#customer-data-modal`: Materialize `.modal` with `.close-modal` and `.scroller > .modal-content`). dagny gives them `width: 90%; max-width: 350px; height: 50%; overflow-y: scroll` (a classic scrollbar is always drawn), a grey `#e9e9e9` close square, `.modal h1` at 13 px and `padding: 75px 45px 50px 50px`. The insurance terms text nests `<p>` inside `<ul>`, and its last link carries inline `color: black` (needs `!important`). Restyle with dagny's four-id selector list: surface, border and shadow on `section#booking .modal`, a wider `max-width` on desktop, a thin themed scrollbar (`scrollbar-width`/`scrollbar-color` plus `::-webkit-scrollbar*`), a round transparent `.close-modal` with the accent icon, `h1` at 20 px, `p`/`li` at 15 px with `line-height: 1.55`, `li::marker` in the accent.

## Small JS modals (`.nortic-modal`: waitlist, campaign code, access code)

- Built in `eventPage.js`; painted blue through `.nortic-blue-background` and `.big-ass-input-field div.flat-button`, with an `.nortic-modal-overlay`. Style `.nortic-modal`, its `h3`, `p`, `.close-button i`, the `.input-field.big-ass-input-field` and the button (`.disabled` state too).

## Modal shell (`material-design-modal.js`)

- `.modal__bg` (has `transition: opacity 0.3s`), `.modal__content`, `.modal__dialog.large-size` (`left/top: 50%; transform: translate(-50%, -50%)`). Colour `.modal__bg` and `.modal__content`; do not touch `.modal__dialog`'s transform.

## Materialize reminders

- `.row .col { margin-left: auto }` — harmless with floats, decisive inside any flex container you create.
- `.no-padding { padding: 0 !important }` — you cannot add padding to those columns; use `gap` or margins on the flex parent instead.
- `.valign-wrapper` is `display: flex; align-items: center`.
- dagny's mobile breakpoint is `max-width: 600px` in CSS and `matchMedia('(max-width: 600px)')` in JS; use the same number.

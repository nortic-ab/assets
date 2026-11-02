# dagny playground

Static copies of dagny's ticket pages (EventSystem's customer theme) with mock data, for building and
checking the organizer and event themes in `custom-css` and `custom-js` without opening real events.
It is for local testing only: `firebase.json` ignores `playground/**`, so it is never deployed.

```sh
pnpm playground        # http://localhost:5178/playground/
pnpm playground:sync   # copy dagny's current stylesheets from prod into vendor/dagny
```

In the playground, pick the environment, an organizer and an event (or type any event id), a page and
a width. The page is shown with that theme linked the way `head.jsp` links it: dagny's stylesheets,
then the organizer's `styles.css`, then the event's, and their `script.js` with `defer`. The URL hash
keeps the choice, so a view can be bookmarked. **Jämför med dagny** shows the same page without the
theme next to it. The buttons under the bar open the page's popups, toasts and overlays. The frame
reloads whenever a theme or a playground file is saved.

Each page can also be opened on its own:
`/playground/pages/event-calendar.html?env=prod&org=4994&event=87118` (add `theme=0` or `js=0` to
leave the CSS or the scripts out).

## Pages

| Page                     | What it covers                                                                                                                                                |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `organizer`              | Organizer page with event cards (`#popular-events`), tags, long names, "Läs mer"                                                                              |
| `organizer-calendar`     | Organizer page with calendar (`organizer.useCalendar`): filter chips, calendar, show rows                                                                     |
| `organizer-confirmation` | The order confirmation after payment: confirmed (with the post-sale offer, download and Wallet buttons, optionally the hotel offer) and the three error boxes |
| `event-calendar`         | Event with calendar, every show row state and every ticket category state (below)                                                                             |
| `event-list`             | Event without calendar: the description in the hero, months, sold out with "Endast tillval"                                                                   |
| `event-dateless`         | Shows without a date: "Löpande föreställningar", the "Inga föreställningar" chip                                                                              |
| `event-addon-content`    | "Endast tillval" (`#addon-content-container`) in the opened row                                                                                               |
| `event-basket-cart`      | Organizer basket cart: Varukorg / Till kassan, Lägg till i varukorg, "Din order"                                                                              |
| `event-arena`            | Numbered seats: the arena page (`#material-modal.arena-page`), sections and categories                                                                        |
| `checkout`               | Checkout: Kivra, SMS and premium addons, the order, insurance, gift card, Klarna box                                                                          |
| `checkout-addon-step`    | The addon step before payment (`#standalone-addon-container`)                                                                                                 |

Show rows (`event-calendar`): bookable with supply dots, few left, sold out with waitlist and "Endast
tillval", released later with an access code, numbered, not bookable with a status, external seller,
booking closed, plain-text supply, a long name, an organizer message (age limit) on opening.

Ticket categories: normal, selected (amount > 0), few left, sold out, released later, free, campaign
category, a long name, a long description with "Läs mer", the campaign box, "Köp endast tillval".

Popups, toasts and overlays (buttons in the playground): organizer message (info and warning),
category "Läs mer", campaign code, access code, waitlist, share, basket cart warnings, Materialize
toasts (plain, error, warning, info), the transition and the loading screen before the checkout,
"Lägger till i varukorg", the checkout's terms and insurance modals, premium ticket "Läs mer", the
insurance reminder, Kivra's four dialogs and the e-mail warning.

Not here: the seat map on numbered shows (drawn by dagny's JS), Klarna's own checkout (an iframe
that cannot be styled; a white placeholder stands in; the same for Klarna's confirmation) and the
travel pages (`body.bg-light`).

## How it is built

- `vendor/dagny/` is dagny's CSS as prod serves it (`VERSION` says which), copied by
  `sync-dagny.ts`. Fonts and images stay on cloud.nortic.se.
- `pages/*.html` are the pages, in dagny's markup with mock data. The markup comes from the JSP
  templates (`showCalendar.jsp`, `unnumberedShowCategoryPage.jsp`, `paymentPageKlarna.jsp`,
  `popupAddonModals.jsp`, `addonContent.jsp`, `organizerCalendarShows.jsp` …) and from dagny's
  rendered pages after its JS has run, so the long selectors in the themes match as on
  tickets.nortic.se. Keep it verbatim, including dagny's odd class names and inline styles.
- `partials/*.html` hold what every page shares (head, header, overlays, basket buttons, footer).
  A page includes one with `<!-- #include name -->`; `serve.ts` expands it.
- `runtime/page.js` links the theme, puts the chosen ids on `<body>`, and does the small part of
  dagny's behaviour the pages need: opening a show row, the steppers and the basket pill, and the
  popups, toasts and overlays, built with the same markup as dagny's JS.
- `media/` holds the mock images.

## Adding a page or a state

1. Find the markup in EventSystem (`src/webapp/WEB-INF/templates/…`, and `src/webapp/scripts/nortic/dagny/`
   for what JS adds), or copy it from a rendered page in the browser.
2. Write the page in `pages/` with mock data (no customer names, images or ids), using the partials.
3. List it in `PAGES` in `shell.js`. Buttons for its popups go in its
   `<script type="application/json" id="pg-actions">` (`modal:<name>`, `materialize:#id`,
   `show:selector`, `toast:<class>:<text>`, `variant:<name>`, `loading-payment`, `basket-overlay`,
   `close`). Alternative states of one element set (like the confirmation's error boxes) carry
   `data-pg-variant="name other"`; `variant:name` shows those and hides the rest.
4. When dagny's markup changes, update the page or the partial, and run `pnpm playground:sync` for
   its CSS.

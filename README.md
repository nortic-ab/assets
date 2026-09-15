# Assets Repository

This repository serves as a centralized location for storing static assets, primarily image files, intended for use in emails and other platforms. By hosting these assets on GitHub, we leverage GitHub's infrastructure to serve our images reliably.

---

## Repository Structure

- **`assets/`**: Contains the source image files.
- **`generated/`**: Contains processed or optimized versions of the images.
- **`assets/hosting/`**: Per-organizer and per-event stylesheets and scripts for EventSystem, deployed to Firebase Hosting (see below).

---

## Prerequisites

- **Node.js** (version 18 or higher)
- **pnpm** (version 7 or higher)

---

## Installation

1. Clone the repository:

   ```bash
   git clone https://github.com/nortic-ab/assets.git
   cd assets
   ```

2. Install dependencies:
   ```bash
   pnpm install
   ```

---

## Usage

To process and optimize the images, run:

```bash
pnpm run build
```

This command will process the source images in the assets/ directory and output the optimized versions to the generated/ directory.

---

## Accessing Assets via GitHub's Raw URLs

To use the images in emails or other platforms, you can link directly to the raw files hosted in this repository. Here's how:

1. Navigate to the desired image in the repository:

   For example, if you have an image located at /generated/logotypes/logo-slogan-large-blue.svg_300.png, its URL would be:

   ```
   https://cdn.jsdelivr.net/gh/nortic-ab/assets/generated/logotypes/logo-slogan-large-blue.svg_300.png
   ```

   You can use this URL to embed the image directly in emails or other platforms.

---

## Custom CSS and JS for EventSystem (Firebase Hosting)

The directory `assets/hosting/` is deployed to Firebase Hosting (project `nortic-assets`) and served at `https://nortic-assets.web.app/`.

Unlike the rest of this repository, these files are **not** meant to be consumed via jsDelivr (jsDelivr caches branch URLs for up to 7 days). They exist so that EventSystem can load per-organizer and per-event stylesheets and scripts without hardcoding special cases in JSP templates.

### Folder structure and URL pattern

Files map 1:1 to URLs; the `assets/hosting/` prefix is stripped. The first segment is the type (`custom-css` or `custom-js`), the second the environment (`prod` or `staging`, mirroring `assets/gatekeeper/`):

```
assets/hosting/
├── custom-css/
│   ├── empty.css
│   └── <env>/eventsystem/organizers/<organizerId>/
│       ├── styles.css
│       ├── assets/                     ← all images and fonts for the organizer and its events
│       └── events/<eventId>/styles.css
└── custom-js/
    ├── empty.js
    └── <env>/eventsystem/organizers/<organizerId>/
        ├── script.js
        ├── assets/                     ← videos, images etc. used by the scripts
        └── events/<eventId>/script.js
```

- `https://nortic-assets.web.app/custom-css/<env>/eventsystem/organizers/<organizerId>/styles.css`
- `https://nortic-assets.web.app/custom-css/<env>/eventsystem/organizers/<organizerId>/events/<eventId>/styles.css`
- `https://nortic-assets.web.app/custom-js/<env>/eventsystem/organizers/<organizerId>/script.js`
- `https://nortic-assets.web.app/custom-js/<env>/eventsystem/organizers/<organizerId>/events/<eventId>/script.js`

Put images and fonts in the organizer's `assets/` folder only, never under `events/`. Reference them with relative URLs: `url('assets/background.png')` from the organizer stylesheet and `url('../../assets/background.png')` from an event stylesheet. Relative URLs resolve against the stylesheet URL.

### Missing files return an empty file

Requests for a `styles.css` or `script.js` at one of the paths above that do not match a file are rewritten to `/custom-css/empty.css` or `/custom-js/empty.js` (see `rewrites` in `firebase.json`), so EventSystem always gets a `200`. Static files take priority over rewrites, so an existing file is never shadowed. Any other missing path (typos, missing images) returns 404.

### Adding CSS or JS for an organizer or event

1. Create `assets/hosting/custom-css/staging/eventsystem/organizers/<organizerId>/styles.css` (or `events/<eventId>/styles.css` under the organizer), and/or the matching `script.js` under `custom-js/`.
2. Put any images in the organizer's `assets/` folder and reference them relatively (`../../assets/` from an event stylesheet).
3. Open a PR. On merge to `main`, `.github/workflows/deploy-hosting.yaml` deploys to Firebase Hosting (no build step).
4. Verify in staging EventSystem, then add the same files under `prod/`.

Example (`custom-css/prod/eventsystem/organizers/4937/styles.css`):

```css
.payment-page.klarna {
  background-image: url('assets/parken-zoo.jpg');
}
```

The organizer stylesheet and script are linked before the event ones, so event rules override organizer rules of equal specificity and event scripts run after the organizer script.

### Rules for custom scripts

Scripts run with full access to the page, including the payment page that embeds the Klarna checkout. Keep them small and defensive:

- Wrap everything in an IIFE with `'use strict'`; do not create globals.
- Feature-detect. `window.jQuery` is usually present on dagny pages but must not be assumed.
- The script runs on every dagny page for the organizer (event page, organizer page, travel pages), not only on the payment page. The payment modal is injected later via AJAX, so use delegated event handlers or a `MutationObserver` on `#material-modal` instead of querying the DOM once.
- Never read or modify customer or payment form fields, never load external scripts, never use `eval`, `new Function` or `document.write`.
- Make the script idempotent: it may run again when the modal content is reloaded.
- Files a script needs (videos, images) go in `custom-js/<env>/eventsystem/organizers/<organizerId>/assets/`. Resolve their URLs from the script's own URL with `document.currentScript`; a plain relative string like `'assets/video.mp4'` would resolve against the EventSystem page instead. Read `document.currentScript` synchronously at the top of the script, it is `null` inside callbacks.

Example (`custom-js/<env>/eventsystem/organizers/<organizerId>/script.js`):

```js
(function () {
  'use strict'
  document.documentElement.dataset.norticCustomJs = 'organizer-538'
})()
```

Example of referencing a file in the organizer's `assets/` folder. From an event script (`organizers/<organizerId>/events/<eventId>/script.js`) the same file is `'../../assets/background.mp4'`:

```js
(function () {
  'use strict'
  const scriptUrl = document.currentScript && document.currentScript.src
  if (!scriptUrl)
    return
  const video = document.createElement('video')
  video.src = new URL('assets/background.mp4', scriptUrl).href
  video.autoplay = true
  video.muted = true
  video.loop = true
  video.playsInline = true
  document.body.appendChild(video)
})()
```

### Caching and headers

- Stylesheets and scripts: `Cache-Control: public, max-age=300, s-maxage=31536000`. Browsers re-check after 5 minutes; the CDN keeps files until the next deploy (every deploy purges the CDN).
- Scripts also get `X-Content-Type-Options: nosniff` and `Access-Control-Allow-Origin: *`, so `<script crossorigin="anonymous">` reports real errors instead of "Script error.".
- Images and fonts: `max-age=86400`. When replacing an image, give it a new file name and update the CSS so browsers do not keep showing the old one.
- Fonts get `Access-Control-Allow-Origin: *` (required for cross-origin `@font-face`).

### Testing locally

```bash
pnpm serve:hosting
# then, in another terminal
curl -si http://localhost:5055/custom-css/prod/eventsystem/organizers/4937/styles.css
curl -si http://localhost:5055/custom-css/prod/eventsystem/organizers/9999/styles.css
curl -si http://localhost:5055/custom-js/staging/eventsystem/organizers/538/events/84917/script.js
```

Restart the emulator after changing `firebase.json`; rewrites and headers are only read at startup. File changes under `assets/hosting/` are served immediately.

To test against a locally running EventSystem, add these to EventSystem's gitignored `src/main/resources/config/local.properties` and restart Tomcat:

```properties
system.customcss.baseurl=http://localhost:5055/custom-css/staging
system.customjs.baseurl=http://localhost:5055/custom-js/staging
```

JSP changes in EventSystem reach Tomcat only after "Update resources" in IntelliJ. Files are served with `max-age=300`, so keep "Disable cache" enabled in DevTools while iterating.

### EventSystem

EventSystem links the files from `fragments/customer/dagny/head.jsp`, after the theme stylesheets. Keep the organizer tag before the event tag. `customCssBaseUrl` and `customJsBaseUrl` come from the properties `system.customcss.baseurl` and `system.customjs.baseurl`: `https://nortic-assets.web.app/custom-css/prod` and `https://nortic-assets.web.app/custom-js/prod` in `live.properties`, the `staging` folders otherwise. An empty `system.customjs.baseurl` disables custom scripts for that environment.

```jsp
<c:if test="${not empty customCssBaseUrl and not empty organizer}">
    <link rel="stylesheet" href="${customCssBaseUrl}/eventsystem/organizers/${organizer.id}/styles.css">
</c:if>
<c:if test="${not empty customCssBaseUrl and not empty organizer and not empty event}">
    <link rel="stylesheet" href="${customCssBaseUrl}/eventsystem/organizers/${organizer.id}/events/${event.id}/styles.css">
</c:if>
<c:if test="${not empty customJsBaseUrl and not empty organizer}">
    <script src="${customJsBaseUrl}/eventsystem/organizers/${organizer.id}/script.js" defer crossorigin="anonymous"></script>
</c:if>
<c:if test="${not empty customJsBaseUrl and not empty organizer and not empty event}">
    <script src="${customJsBaseUrl}/eventsystem/organizers/${organizer.id}/events/${event.id}/script.js" defer crossorigin="anonymous"></script>
</c:if>
```

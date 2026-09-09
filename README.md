# Assets Repository

This repository serves as a centralized location for storing static assets, primarily image files, intended for use in emails and other platforms. By hosting these assets on GitHub, we leverage GitHub's infrastructure to serve our images reliably.

---

## Repository Structure

- **`assets/`**: Contains the source image files.
- **`generated/`**: Contains processed or optimized versions of the images.
- **`assets/custom-css/`**: Per-organizer and per-event stylesheets for EventSystem, deployed to Firebase Hosting (see below).

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

## Custom CSS for EventSystem (Firebase Hosting)

The directory `assets/custom-css/` is deployed to Firebase Hosting (project `nortic-assets`) and served at `https://nortic-assets.web.app/`.

Unlike the rest of this repository, these files are **not** meant to be consumed via jsDelivr (jsDelivr caches branch URLs for up to 7 days). They exist so that EventSystem can load per-organizer and per-event stylesheets without hardcoding special cases in JSP templates.

### URL pattern

Files map 1:1 to URLs; the `assets/custom-css/` prefix is stripped. The first path segment is the environment (`prod` or `staging`), mirroring `assets/gatekeeper/`:

- `assets/custom-css/<env>/eventsystem/organizers/<organizerId>/styles.css` → `https://nortic-assets.web.app/<env>/eventsystem/organizers/<organizerId>/styles.css`
- `assets/custom-css/<env>/eventsystem/organizers/<organizerId>/events/<eventId>/styles.css` → `https://nortic-assets.web.app/<env>/eventsystem/organizers/<organizerId>/events/<eventId>/styles.css`

Put images and fonts in the organizer's `assets/` folder only, never under `events/`. Reference them with relative URLs: `url('assets/background.png')` from the organizer stylesheet and `url('../../assets/background.png')` from an event stylesheet. Relative URLs resolve against the stylesheet URL.

### Missing stylesheets return an empty stylesheet

Requests for `/<env>/eventsystem/organizers/<id>/styles.css` or `/<env>/eventsystem/organizers/<id>/events/<id>/styles.css` that do not match a file are rewritten to `/empty.css` (see `rewrites` in `firebase.json`), so EventSystem always gets `200 text/css`. Static files take priority over rewrites, so an existing stylesheet is never shadowed. Any other missing path (typos, missing images) returns 404.

### Adding CSS for an organizer or event

1. Create `assets/custom-css/staging/eventsystem/organizers/<organizerId>/styles.css` (or `organizers/<organizerId>/events/<eventId>/styles.css` for a single event).
2. Put any images in the organizer's `assets/` folder and reference them relatively (`../../assets/` from an event stylesheet).
3. Open a PR. On merge to `main`, `.github/workflows/deploy-custom-css.yaml` deploys to Firebase Hosting (no build step).
4. Verify in staging EventSystem, then add the same files under `assets/custom-css/prod/`.

Example (`organizers/4937/styles.css`):

```css
.payment-page.klarna {
  background-image: url('assets/parken-zoo.jpg');
}
```

The organizer stylesheet is linked before the event stylesheet, so an event stylesheet overrides organizer rules of equal specificity.

### Caching

- Stylesheets: `Cache-Control: public, max-age=300, s-maxage=31536000`. Browsers re-check after 5 minutes; the CDN keeps files until the next deploy (every deploy purges the CDN).
- Images and fonts: `max-age=86400`. When replacing an image, give it a new file name and update the CSS so browsers do not keep showing the old one.
- Fonts get `Access-Control-Allow-Origin: *` (required for cross-origin `@font-face`).

### Testing locally

```bash
pnpm serve:custom-css
# then, in another terminal
curl -si http://localhost:5055/prod/eventsystem/organizers/4937/styles.css
curl -si http://localhost:5055/prod/eventsystem/organizers/9999/styles.css
```

To test against a locally running EventSystem, point it at the emulator by adding
`system.customcss.baseurl=http://localhost:5055/staging` to EventSystem's gitignored
`src/main/resources/config/local.properties` and restart Tomcat. Stylesheets are served
with `max-age=300`, so keep "Disable cache" enabled in DevTools while iterating.

### EventSystem

EventSystem links the stylesheets from `fragments/customer/dagny/head.jsp`, after the theme stylesheets. Keep the organizer link before the event link. `customCssBaseUrl` comes from the property `system.customcss.baseurl`: `https://nortic-assets.web.app/prod` in `live.properties`, `https://nortic-assets.web.app/staging` otherwise.

```jsp
<link rel="stylesheet" href="${customCssBaseUrl}/eventsystem/organizers/${organizer.id}/styles.css">
<link rel="stylesheet" href="${customCssBaseUrl}/eventsystem/organizers/${organizer.id}/events/${event.id}/styles.css">
```

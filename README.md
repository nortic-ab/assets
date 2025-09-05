# Assets Repository

This repository serves as a centralized location for storing static assets, primarily image files, intended for use in emails and other platforms. By hosting these assets on GitHub, we leverage GitHub's infrastructure to serve our images reliably.

---

## Repository Structure

- **`assets/`**: Contains the source image files.
- **`generated/`**: Contains processed or optimized versions of the images.

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

# Image Frame Generator

Pure HTML/CSS/JavaScript web app that lets you upload an image, preview it with decorative frames, and download the framed result.

## Features

- Upload any local image file (JPG, PNG, etc.).
- Always preview and export in a square format for mobile-friendly posts.
- Keep reusable PNG overlays inside the `frames/` directory and register them in `frames/frames.js`; they populate the workspace dropdown automatically.
- Adjust the on-screen image with zoom, drag, and dedicated horizontal/vertical sliders.
- Download the combined image + frame as a PNG (or the base image alone if no overlay is selected/ready).

## Usage

1. Open `index.html` in a modern browser.
2. Click **Upload an image** and choose a file.
3. Place any PNG frame overlays inside `frames/` and define them inside `frames/frames.js` (see that file for examples).
4. Choose a workspace frame from the dropdown (disabled if no frames are registered or a file is missing).
5. Tweak the zoom slider, drag the image, or use the left/right and up/down sliders for precise mobile-friendly positioning.
6. Click **Download Framed Image** to export a square PNG, or **Reset** to start over.

## Adding Frames

1. Drop your transparent PNG into the `frames/` folder (e.g. `frames/rose-gold.png`). Square overlays work best.
2. Edit `frames/frames.js` and append an entry to `window.FRAME_MANIFEST`:

```js
window.FRAME_MANIFEST = [
  {
    id: "rose-gold",
    name: "Rose Gold Overlay",
    description: "PNG overlay exported at 2000x2500",
    file: "frames/rose-gold.png",
  },
];
```

3. Reload the page; the new frame appears in the dropdown automatically.

## Development

This is a static project—no build step or dependencies. If you prefer local hosting, run any static file server and open the same `index.html` file.

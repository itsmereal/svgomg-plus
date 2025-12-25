# SVGOMG Plus

An enhanced fork of [SVGOMG](https://github.com/jakearchibald/svgomg) — the missing GUI for [SVGO](https://github.com/svg/svgo). Optimize multiple SVG files at once, resize and scale with precision, remove whitespace around content, and prevent ID conflicts when embedding SVGs. All with real-time preview and one-click ZIP download.

**[Try it live](https://svgomg.wolfdevs.com/)**

## What's New in SVGOMG Plus

### Bulk Processing
Process multiple SVG files at once with the same optimization settings:
- **Batch optimization** - Select or drag & drop multiple SVG files
- **Live previews** - See thumbnails of all your SVGs in grid or list view
- **Real-time updates** - Previews update as you adjust settings
- **File selection** - Select/deselect individual files for processing
- **File management** - Delete files from the batch before or after processing
- **ZIP download** - Download all optimized files as a single ZIP archive
- **Progress tracking** - Overall progress bar during processing
- **Size summary** - See total bytes saved across all files

### Transform Features
Powerful transform options in a dedicated section:

#### Resize & Scale
- **Max Width** - Set a maximum width constraint (maintains aspect ratio)
- **Max Height** - Set a maximum height constraint (maintains aspect ratio)
- **Scale %** - Scale the SVG by a percentage (1-200%)

#### Whitespace Removal
- **Remove whitespace around content** - Automatically trims empty space around SVG content by recalculating the viewBox to fit the bounding box of all visible elements

### Prefix IDs
- **Prevent ID conflicts** - Enable "Prefix IDs" in settings to add unique prefixes to all IDs and class names in your SVGs
- **Safe for embedding** - Prevents conflicts when multiple SVGs with common IDs (like `#a`, `#b`, `#c`) are used on the same page

## Core Features

- All original SVGOMG optimization features powered by [SVGO](https://github.com/svg/svgo)
- Real-time preview of optimized SVG
- Gzip size comparison
- Download optimized SVG
- Copy optimized markup
- Works offline (PWA)

---

## Changelog

### Latest Updates
- **Prefix IDs** - Added unique random prefix generation for IDs to prevent conflicts
- **File Selection** - Added checkboxes to select/deselect files in bulk mode
- **File Deletion** - Delete individual files or selected files from batch
- **Improved Drag & Drop** - Fixed overlay behavior in bulk mode

### Previous Updates
- Bulk processing with ZIP download
- Transform section with resize, scale, and whitespace removal
- Grid and list view for bulk previews

*More updates coming soon! Check the [issues page](https://github.com/itsmereal/svgomg-plus/issues) for planned features.*

---

## Running Locally

Install dependencies:

```sh
npm install
```

Build the project:

```sh
npm run build
```

Run dev server:

```sh
npm run dev
```

Or start the production build:

```sh
npm start
```

## Contributing

[Check out the issues](https://github.com/itsmereal/svgomg-plus/issues) to see what's planned, or suggest ideas of your own!

## Credits

This project is a fork of [SVGOMG](https://github.com/jakearchibald/svgomg) by [Jake Archibald](https://github.com/jakearchibald). Huge thanks for creating the original amazing tool!

## License

MIT

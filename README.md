# SVGOMG Plus

An enhanced fork of [SVGOMG](https://github.com/jakearchibald/svgomg) with additional transform, resize, and bulk processing features.

**[Try it live](https://svgomg.wolfdevs.com/)**

## What's New in SVGOMG Plus

### Bulk Processing
Process multiple SVG files at once with the same optimization settings:
- **Batch optimization** - Select or drag & drop multiple SVG files
- **Live previews** - See thumbnails of all your SVGs in grid or list view
- **Real-time updates** - Previews update as you adjust settings
- **ZIP download** - Download all optimized files as a single ZIP archive
- **Progress tracking** - Overall progress bar during processing
- **Size summary** - See total bytes saved across all files

### Transform Features
This fork adds a **Transform** section with powerful features:

#### Resize & Scale
- **Max Width** - Set a maximum width constraint (maintains aspect ratio)
- **Max Height** - Set a maximum height constraint (maintains aspect ratio)
- **Scale %** - Scale the SVG by a percentage (1-200%)

#### Whitespace Removal
- **Remove whitespace around content** - Automatically trims empty space around SVG content by recalculating the viewBox to fit the bounding box of all visible elements

## Features

- All original SVGOMG optimization features powered by [SVGO](https://github.com/svg/svgo)
- Real-time preview of optimized SVG
- Gzip size comparison
- Download optimized SVG
- Copy optimized markup
- Works offline (PWA)

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

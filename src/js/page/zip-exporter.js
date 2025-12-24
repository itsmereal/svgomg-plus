import JSZip from 'jszip';

/**
 * Creates a ZIP file from an array of files and triggers download
 * @param {Array<{filename: string, data: string}>} files - Array of file objects
 * @param {string} zipName - Name for the ZIP file (default: 'svgomg-optimized.zip')
 */
export async function createAndDownloadZip(
  files,
  zipName = 'svgomg-optimized.zip',
) {
  const zip = new JSZip();

  // Handle duplicate filenames by appending numbers
  const usedNames = new Map();

  for (const file of files) {
    let filename = file.filename;

    // Check for duplicate filenames
    if (usedNames.has(filename)) {
      const count = usedNames.get(filename) + 1;
      usedNames.set(filename, count);

      // Insert number before .svg extension
      const dotIndex = filename.lastIndexOf('.');
      filename =
        dotIndex > 0
          ? `${filename.slice(0, dotIndex)}-${count}${filename.slice(dotIndex)}`
          : `${filename}-${count}`;
    } else {
      usedNames.set(filename, 0);
    }

    zip.file(filename, file.data);
  }

  const blob = await zip.generateAsync({
    type: 'blob',
    compression: 'DEFLATE',
    compressionOptions: { level: 9 },
  });

  downloadBlob(blob, zipName);
}

/**
 * Triggers a download of a Blob as a file
 * @param {Blob} blob - The blob to download
 * @param {string} filename - The filename for the download
 */
function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();

  // Clean up the URL after a short delay
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

import { createNanoEvents } from 'nanoevents';
import { readFileAsText } from './utils.js';

/**
 * Handles bulk processing of multiple SVG files
 */
export default class BulkProcessor {
  constructor(svgo) {
    this._svgo = svgo;
    this.emitter = createNanoEvents();
    this._aborted = false;
  }

  /**
   * Process multiple SVG files with the given settings
   * @param {FileList|File[]} files - Array of File objects
   * @param {Object} settings - SVGO settings to apply
   * @returns {Promise<{results: Array, errors: Array}>}
   */
  async processFiles(files, settings) {
    this._aborted = false;
    const results = [];
    const errors = [];
    const total = files.length;

    for (let i = 0; i < total; i++) {
      if (this._aborted) {
        break;
      }

      const file = files[i];

      try {
        // eslint-disable-next-line no-await-in-loop
        const text = await readFileAsText(file);

        // Validate it's actually an SVG
        if (!text.includes('</svg>')) {
          throw new Error('Not a valid SVG file');
        }

        // eslint-disable-next-line no-await-in-loop
        const optimized = await this._svgo.process(text, settings, file.name);

        results.push({
          filename: file.name,
          data: optimized.text,
          originalSize: text.length,
          optimizedSize: optimized.text.length,
        });
      } catch (error) {
        errors.push({
          filename: file.name,
          error: error.message,
        });
      }

      // Emit progress (0 to 1)
      this.emitter.emit('progress', {
        current: i + 1,
        total,
        percent: (i + 1) / total,
      });
    }

    this.emitter.emit('complete', { results, errors });

    return { results, errors };
  }

  /**
   * Abort the current processing operation
   */
  abort() {
    this._aborted = true;
    this._svgo.abort();
  }
}

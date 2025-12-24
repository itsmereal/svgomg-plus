import { createNanoEvents } from 'nanoevents';
import { domReady, transitionFromClass, transitionToClass } from '../utils.js';
import Spinner from './spinner.js';

export default class BulkMenu {
  constructor() {
    this.emitter = createNanoEvents();
    this._files = [];
    this._results = null;
    this._spinner = new Spinner();

    domReady.then(() => {
      this.container = document.querySelector('.bulk-menu');
      this._fileInput = this.container.querySelector('.bulk-file-input');
      this._selectBtn = this.container.querySelector('.bulk-select-btn');
      this._fileInfo = this.container.querySelector('.bulk-file-info');
      this._clearBtn = this.container.querySelector('.bulk-clear-btn');
      this._processBtn = this.container.querySelector('.bulk-process-btn');
      this._progressContainer = this.container.querySelector('.bulk-progress');
      this._progressFill = this.container.querySelector('.bulk-progress-fill');
      this._progressText = this.container.querySelector('.bulk-progress-text');
      this._downloadBtn = this.container.querySelector('.bulk-download-btn');
      this._errorInfo = this.container.querySelector('.bulk-error-info');

      // Event listeners
      this._selectBtn.addEventListener('click', () => this._onSelectClick());
      this._fileInput.addEventListener('change', () => this._onFilesSelected());
      this._clearBtn.addEventListener('click', () => this._onClearClick());
      this._processBtn.addEventListener('click', () => this._onProcessClick());
      this._downloadBtn.addEventListener('click', () =>
        this._onDownloadClick(),
      );

      this._updateUI();
    });
  }

  show() {
    this.container.classList.remove('hidden');
    transitionFromClass(this.container, 'hidden');
  }

  hide() {
    transitionToClass(this.container, 'hidden');
  }

  setFiles(files) {
    this._files = [...files];
    this._results = null;
    this._updateUI();
  }

  updateProgress(percent, current, total) {
    this._progressFill.style.width = `${percent * 100}%`;
    this._progressText.textContent = `Processing ${current} of ${total}...`;
  }

  setComplete(results, errors) {
    this._results = results;
    this._spinner.hide();
    this._updateUI();

    if (errors.length > 0) {
      this._errorInfo.textContent = `${errors.length} file${
        errors.length > 1 ? 's' : ''
      } failed`;
      this._errorInfo.classList.remove('hidden');
    }
  }

  reset() {
    this._files = [];
    this._results = null;
    this._progressFill.style.width = '0%';
    this._progressText.textContent = '';
    this._errorInfo.classList.add('hidden');
    this._spinner.hide();
    this._updateUI();
  }

  _onSelectClick() {
    this._fileInput.click();
  }

  _onFilesSelected() {
    const files = this._fileInput.files;
    if (files.length === 0) return;

    // Filter only .svg files
    const svgFiles = [...files].filter(
      (f) =>
        f.name.toLowerCase().endsWith('.svg') || f.type === 'image/svg+xml',
    );

    if (svgFiles.length === 0) {
      this.emitter.emit('error', { error: new Error('No SVG files selected') });
      return;
    }

    this._files = svgFiles;
    this._results = null;
    this._updateUI();

    // Emit event for bulk output display
    this.emitter.emit('filesSelected', { files: svgFiles });
  }

  _onClearClick() {
    this.reset();
    this._fileInput.value = '';
    this.emitter.emit('filesSelected', { files: [] });
  }

  _onProcessClick() {
    if (this._files.length === 0) return;

    this._progressContainer.classList.remove('hidden');
    this._processBtn.classList.add('hidden');
    this._processBtn.append(this._spinner.container);
    this._spinner.show();

    this.emitter.emit('processBulk', { files: this._files });
  }

  _onDownloadClick() {
    if (!this._results || this._results.length === 0) return;
    this.emitter.emit('downloadZip', { results: this._results });
  }

  _updateUI() {
    const hasFiles = this._files.length > 0;
    const hasResults = this._results && this._results.length > 0;

    // File info
    if (hasFiles) {
      this._fileInfo.textContent = `${this._files.length} SVG file${
        this._files.length > 1 ? 's' : ''
      } selected`;
      this._fileInfo.classList.remove('hidden');
    } else {
      this._fileInfo.classList.add('hidden');
    }

    // Clear button
    if (hasFiles || hasResults) {
      this._clearBtn.classList.remove('hidden');
    } else {
      this._clearBtn.classList.add('hidden');
    }

    // Process button
    if (hasFiles && !hasResults) {
      this._processBtn.classList.remove('hidden');
      this._progressContainer.classList.add('hidden');
    } else {
      this._processBtn.classList.add('hidden');
    }

    // Download button
    if (hasResults) {
      this._downloadBtn.classList.remove('hidden');
      this._progressContainer.classList.add('hidden');
    } else {
      this._downloadBtn.classList.add('hidden');
    }

    // Error info
    if (!hasResults) {
      this._errorInfo.classList.add('hidden');
    }
  }
}

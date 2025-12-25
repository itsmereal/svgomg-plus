import { createNanoEvents } from 'nanoevents';
import { strToEl } from '../utils.js';
import Spinner from './spinner.js';

export default class BulkOutput {
  constructor() {
    this.emitter = createNanoEvents();
    this._files = [];
    this._selectedFiles = new Set(); // Track selected file names
    this._fileData = new Map(); // Store file contents for previews
    this._results = null;
    this._spinner = new Spinner();
    this._processing = false;
    this._viewMode = 'grid'; // 'grid' or 'list'
    this._svgo = null;
    this._currentSettings = null;

    // Create container synchronously so it's available for appending
    // prettier-ignore
    this.container = strToEl(
      '<div class="bulk-output hidden">' +
        '<div class="bulk-drop-zone">' +
          '<input type="file" class="bulk-file-input" accept=".svg,image/svg+xml" multiple>' +
          '<div class="bulk-drop-content">' +
            '<svg class="bulk-drop-icon" viewBox="0 0 24 24"><path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96zM14 13v4h-4v-4H7l5-5 5 5h-3z"/></svg>' +
            '<p class="bulk-drop-text">Drop SVG files here</p>' +
            '<p class="bulk-drop-subtext">or</p>' +
            '<button class="bulk-select-btn">Select SVG Files</button>' +
          '</div>' +
        '</div>' +
        '<div class="bulk-output-header hidden">' +
          '<div class="bulk-header-left">' +
            '<h2 class="bulk-output-title">Bulk Processing</h2>' +
            '<span class="bulk-output-count"></span>' +
          '</div>' +
          '<div class="bulk-header-right">' +
            '<div class="bulk-selection-controls">' +
              '<button class="bulk-select-all-btn" title="Select all">' +
                '<svg viewBox="0 0 24 24"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-9 14l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>' +
              '</button>' +
              '<button class="bulk-select-none-btn" title="Select none">' +
                '<svg viewBox="0 0 24 24"><path d="M19 5v14H5V5h14m0-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2z"/></svg>' +
              '</button>' +
              '<button class="bulk-delete-selected-btn" title="Delete selected">' +
                '<svg viewBox="0 0 24 24"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>' +
              '</button>' +
            '</div>' +
            '<div class="bulk-view-toggle">' +
              '<button class="bulk-view-btn grid-view active" title="Grid view">' +
                '<svg viewBox="0 0 24 24"><path d="M3 3h8v8H3V3zm0 10h8v8H3v-8zm10-10h8v8h-8V3zm0 10h8v8h-8v-8z"/></svg>' +
              '</button>' +
              '<button class="bulk-view-btn list-view" title="List view">' +
                '<svg viewBox="0 0 24 24"><path d="M3 13h2v-2H3v2zm0 4h2v-2H3v2zm0-8h2V7H3v2zm4 4h14v-2H7v2zm0 4h14v-2H7v2zM7 7v2h14V7H7z"/></svg>' +
              '</button>' +
            '</div>' +
          '</div>' +
        '</div>' +
        '<div class="bulk-file-list grid-view"></div>' +
        '<div class="bulk-actions hidden">' +
          '<button class="bulk-process-btn">Process Selected</button>' +
          '<button class="bulk-clear-btn">Clear All</button>' +
        '</div>' +
        '<div class="bulk-progress hidden">' +
          '<div class="bulk-progress-bar">' +
            '<div class="bulk-progress-fill"></div>' +
          '</div>' +
          '<span class="bulk-progress-text"></span>' +
        '</div>' +
        '<div class="bulk-summary hidden"></div>' +
        '<div class="bulk-download-actions hidden">' +
          '<button class="bulk-download-btn">Download ZIP</button>' +
          '<button class="bulk-clear-btn">Process More</button>' +
        '</div>' +
      '</div>'
    );

    // Query elements synchronously since container is now created synchronously
    this._dropZone = this.container.querySelector('.bulk-drop-zone');
    this._fileInput = this.container.querySelector('.bulk-file-input');
    this._selectBtn = this.container.querySelector('.bulk-select-btn');
    this._header = this.container.querySelector('.bulk-output-header');
    this._title = this.container.querySelector('.bulk-output-title');
    this._count = this.container.querySelector('.bulk-output-count');
    this._fileList = this.container.querySelector('.bulk-file-list');
    this._actions = this.container.querySelector('.bulk-actions');
    this._processBtn = this.container.querySelector('.bulk-process-btn');
    this._clearBtns = this.container.querySelectorAll('.bulk-clear-btn');
    this._progress = this.container.querySelector('.bulk-progress');
    this._progressFill = this.container.querySelector('.bulk-progress-fill');
    this._progressText = this.container.querySelector('.bulk-progress-text');
    this._summary = this.container.querySelector('.bulk-summary');
    this._downloadActions = this.container.querySelector(
      '.bulk-download-actions',
    );
    this._downloadBtn = this.container.querySelector('.bulk-download-btn');
    this._gridViewBtn = this.container.querySelector('.grid-view');
    this._listViewBtn = this.container.querySelector('.list-view');
    this._selectAllBtn = this.container.querySelector('.bulk-select-all-btn');
    this._selectNoneBtn = this.container.querySelector('.bulk-select-none-btn');
    this._deleteSelectedBtn = this.container.querySelector(
      '.bulk-delete-selected-btn',
    );

    // Event listeners
    this._selectBtn.addEventListener('click', () => this._fileInput.click());
    this._fileInput.addEventListener('change', () => this._onFilesSelected());
    this._processBtn.addEventListener('click', () => this._onProcessClick());
    this._downloadBtn.addEventListener('click', () => this._onDownloadClick());
    for (const btn of this._clearBtns)
      btn.addEventListener('click', () => this._onClearClick());

    // View toggle
    this._gridViewBtn.addEventListener('click', () =>
      this._setViewMode('grid'),
    );
    this._listViewBtn.addEventListener('click', () =>
      this._setViewMode('list'),
    );

    // Selection controls
    this._selectAllBtn.addEventListener('click', () => this._selectAll());
    this._selectNoneBtn.addEventListener('click', () => this._selectNone());
    this._deleteSelectedBtn.addEventListener('click', () =>
      this._deleteSelected(),
    );

    // File list click handler for checkboxes
    this._fileList.addEventListener('click', (e) =>
      this._onFileListClick(e),
    );

    // Drag and drop
    this._dropZone.addEventListener('dragover', (e) => this._onDragOver(e));
    this._dropZone.addEventListener('dragleave', (e) => this._onDragLeave(e));
    this._dropZone.addEventListener('drop', (e) => this._onDrop(e));

    // Also allow dropping on the whole container when files are already selected
    this.container.addEventListener('dragover', (e) => this._onDragOver(e));
    this.container.addEventListener('dragleave', (e) => this._onDragLeave(e));
    this.container.addEventListener('drop', (e) => this._onDrop(e));
  }

  setSvgo(svgo) {
    this._svgo = svgo;
  }

  _setViewMode(mode) {
    this._viewMode = mode;
    this._fileList.classList.remove('grid-view', 'list-view');
    this._fileList.classList.add(`${mode}-view`);

    this._gridViewBtn.classList.toggle('active', mode === 'grid');
    this._listViewBtn.classList.toggle('active', mode === 'list');
  }

  _onDragOver(e) {
    e.preventDefault();
    this._dropZone.classList.add('drag-over');
  }

  _onDragLeave(e) {
    e.preventDefault();
    this._dropZone.classList.remove('drag-over');
  }

  _onDrop(e) {
    e.preventDefault();
    // Don't stopPropagation - let the event bubble to FileDrop to hide the overlay
    this._dropZone.classList.remove('drag-over');

    const files = e.dataTransfer.files;
    if (files.length === 0) return;

    // Mark event as handled by bulk so FileDrop won't also process it
    e._bulkHandled = true;

    const svgFiles = [...files].filter(
      (f) =>
        f.name.toLowerCase().endsWith('.svg') || f.type === 'image/svg+xml',
    );

    if (svgFiles.length === 0) {
      this.emitter.emit('error', { error: new Error('No SVG files dropped') });
      return;
    }

    this._files = svgFiles;
    this._results = null;
    this._loadFilesAndRender();
    this.emitter.emit('filesSelected', { files: svgFiles });
  }

  _onFilesSelected() {
    const files = this._fileInput.files;
    if (files.length === 0) return;

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
    this._loadFilesAndRender();
    this.emitter.emit('filesSelected', { files: svgFiles });
  }

  async _loadFilesAndRender() {
    this._fileData.clear();
    // Select all files by default
    this._selectedFiles = new Set(this._files.map((f) => f.name));

    // Load all file contents for preview
    const loadPromises = this._files.map(async (file) => {
      try {
        const text = await this._readFileAsText(file);
        this._fileData.set(file.name, {
          original: text,
          optimized: null,
        });
      } catch {
        // Skip files that can't be read
      }
    });

    await Promise.all(loadPromises);
    this._render();
  }

  _readFileAsText(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(reader.error);
      reader.readAsText(file);
    });
  }

  _onProcessClick() {
    const selectedFiles = this._files.filter((f) =>
      this._selectedFiles.has(f.name),
    );
    if (selectedFiles.length === 0 || this._processing) return;

    this._processing = true;
    this._actions.classList.add('hidden');
    this._progress.classList.remove('hidden');
    this._processBtn.append(this._spinner.container);
    this._spinner.show();

    this.emitter.emit('processBulk', { files: selectedFiles });
  }

  _onDownloadClick() {
    if (!this._results || this._results.results.length === 0) return;
    this.emitter.emit('downloadZip', { results: this._results.results });
  }

  _onClearClick() {
    this.reset();
    this._fileInput.value = '';
  }

  show() {
    this.container.classList.remove('hidden');
  }

  hide() {
    this.container.classList.add('hidden');
  }

  setFiles(files) {
    this._files = [...files];
    this._results = null;
    this._loadFilesAndRender();
  }

  updateProgress(percent, current, total) {
    this._progressFill.style.width = `${percent * 100}%`;
    this._progressText.textContent = `Processing ${current} of ${total}...`;
  }

  async updatePreviews(settings) {
    if (!this._svgo || this._files.length === 0) return;

    this._currentSettings = settings;

    // Update previews for each file with current settings
    for (const file of this._files) {
      const data = this._fileData.get(file.name);
      if (!data) continue;

      try {
        // eslint-disable-next-line no-await-in-loop
        const optimized = await this._svgo.process(data.original, settings);
        data.optimized = optimized.text;

        // Update the preview in the DOM
        const item = this._fileList.querySelector(
          `[data-filename="${CSS.escape(file.name)}"]`,
        );
        if (item) {
          const preview = item.querySelector('.bulk-file-preview');
          if (preview) {
            preview.innerHTML = data.optimized;
          }

          // Update size info
          const sizeEl = item.querySelector('.bulk-file-size');
          if (sizeEl) {
            const reduction = Math.round(
              (1 - data.optimized.length / data.original.length) * 100,
            );
            sizeEl.textContent = `${this._formatSize(
              data.original.length,
            )} → ${this._formatSize(data.optimized.length)} (-${reduction}%)`;
            sizeEl.classList.add('optimized');
          }
        }
      } catch {
        // Skip files that fail to optimize
      }
    }
  }

  setResults(results, errors) {
    this._results = { results, errors };
    this._processing = false;
    this._spinner.hide();
    this._renderResults();
  }

  reset() {
    this._files = [];
    this._selectedFiles.clear();
    this._fileData.clear();
    this._results = null;
    this._processing = false;
    this._currentSettings = null;
    this._spinner.hide();
    this._fileList.innerHTML = '';
    this._summary.classList.add('hidden');
    this._count.textContent = '';
    this._header.classList.add('hidden');
    this._actions.classList.add('hidden');
    this._progress.classList.add('hidden');
    this._downloadActions.classList.add('hidden');
    this._dropZone.classList.remove('hidden');
    this._progressFill.style.width = '0%';
    this._progressText.textContent = '';
  }

  _render() {
    this._fileList.innerHTML = '';
    this._summary.classList.add('hidden');
    this._progress.classList.add('hidden');
    this._downloadActions.classList.add('hidden');

    if (this._files.length === 0) {
      this._count.textContent = '';
      this._header.classList.add('hidden');
      this._actions.classList.add('hidden');
      this._dropZone.classList.remove('hidden');
      return;
    }

    // Show file list UI
    this._dropZone.classList.add('hidden');
    this._header.classList.remove('hidden');
    this._actions.classList.remove('hidden');

    this._updateCount();

    for (const file of this._files) {
      const data = this._fileData.get(file.name);
      const svgContent = data ? data.original : '';
      const isSelected = this._selectedFiles.has(file.name);

      const item = strToEl(
        '<div class="bulk-file-item' +
          (isSelected ? ' selected' : '') +
          '" data-filename="' +
          this._escapeHtml(file.name) +
          '">' +
          '<button class="bulk-file-checkbox" type="button" title="Toggle selection">' +
          '<svg viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>' +
          '</button>' +
          '<div class="bulk-file-preview">' +
          svgContent +
          '</div>' +
          '<div class="bulk-file-info">' +
          '<span class="bulk-file-name">' +
          this._escapeHtml(file.name) +
          '</span>' +
          '<span class="bulk-file-size">' +
          this._formatSize(file.size) +
          '</span>' +
          '</div>' +
          '<button class="bulk-file-delete" type="button" title="Remove file">' +
          '<svg viewBox="0 0 24 24"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>' +
          '</button>' +
          '<span class="bulk-file-status pending"></span>' +
          '</div>',
      );
      this._fileList.append(item);
    }
  }

  _updateCount() {
    const selected = this._selectedFiles.size;
    const total = this._files.length;
    this._count.textContent = `${selected}/${total} selected`;
    this._processBtn.textContent =
      selected === total ? 'Process All' : `Process ${selected} Selected`;
  }

  _onFileListClick(e) {
    const checkbox = e.target.closest('.bulk-file-checkbox');
    const deleteBtn = e.target.closest('.bulk-file-delete');
    const item = e.target.closest('.bulk-file-item');

    if (!item) return;

    const filename = item.dataset.filename;

    if (checkbox) {
      this._toggleFileSelection(filename);
    } else if (deleteBtn) {
      this._deleteFile(filename);
    }
  }

  _toggleFileSelection(filename) {
    if (this._selectedFiles.has(filename)) {
      this._selectedFiles.delete(filename);
    } else {
      this._selectedFiles.add(filename);
    }
    this._updateFileItemSelection(filename);
    this._updateCount();
  }

  _updateFileItemSelection(filename) {
    const item = this._fileList.querySelector(
      `[data-filename="${CSS.escape(filename)}"]`,
    );
    if (item) {
      item.classList.toggle('selected', this._selectedFiles.has(filename));
    }
  }

  _selectAll() {
    for (const file of this._files) {
      this._selectedFiles.add(file.name);
    }
    this._updateAllSelections();
    this._updateCount();
  }

  _selectNone() {
    this._selectedFiles.clear();
    this._updateAllSelections();
    this._updateCount();
  }

  _updateAllSelections() {
    const items = this._fileList.querySelectorAll('.bulk-file-item');
    for (const item of items) {
      const filename = item.dataset.filename;
      item.classList.toggle('selected', this._selectedFiles.has(filename));
    }
  }

  _deleteFile(filename) {
    this._files = this._files.filter((f) => f.name !== filename);
    this._selectedFiles.delete(filename);
    this._fileData.delete(filename);

    // Also remove from results if it exists
    if (this._results) {
      this._results.results = this._results.results.filter(
        (r) => r.filename !== filename,
      );
      this._results.errors = this._results.errors.filter(
        (e) => e.filename !== filename,
      );
    }

    const item = this._fileList.querySelector(
      `[data-filename="${CSS.escape(filename)}"]`,
    );
    if (item) {
      item.remove();
    }

    if (this._files.length === 0) {
      this.reset();
    } else {
      this._updateCount();
      this._updateSummaryAfterDelete();
    }
  }

  _deleteSelected() {
    const toDelete = [...this._selectedFiles];
    for (const filename of toDelete) {
      this._deleteFile(filename);
    }
  }

  _updateSummaryAfterDelete() {
    if (!this._results) return;

    const { results, errors } = this._results;

    // If no results left, hide download actions and summary
    if (results.length === 0 && errors.length === 0) {
      this._results = null;
      this._summary.classList.add('hidden');
      this._downloadActions.classList.add('hidden');
      this._actions.classList.remove('hidden');
      return;
    }

    // Update summary with remaining results
    if (results.length > 0) {
      const totalOriginal = results.reduce((sum, r) => sum + r.originalSize, 0);
      const totalOptimized = results.reduce(
        (sum, r) => sum + r.optimizedSize,
        0,
      );
      const totalReduction =
        totalOriginal > 0
          ? Math.round((1 - totalOptimized / totalOriginal) * 100)
          : 0;

      this._summary.innerHTML =
        '<div class="bulk-summary-row">' +
        '<span>Files optimized:</span>' +
        '<strong>' +
        results.length +
        '</strong>' +
        '</div>' +
        (errors.length > 0
          ? '<div class="bulk-summary-row error"><span>Failed:</span><strong>' +
            errors.length +
            '</strong></div>'
          : '') +
        '<div class="bulk-summary-row">' +
        '<span>Total size:</span>' +
        '<strong>' +
        this._formatSize(totalOriginal) +
        ' → ' +
        this._formatSize(totalOptimized) +
        '</strong>' +
        '</div>' +
        '<div class="bulk-summary-row highlight">' +
        '<span>Saved:</span>' +
        '<strong>' +
        this._formatSize(totalOriginal - totalOptimized) +
        ' (' +
        totalReduction +
        '%)</strong>' +
        '</div>';
    }
  }

  _renderResults() {
    if (!this._results) return;

    const { results, errors } = this._results;

    // Hide progress, show download actions
    this._progress.classList.add('hidden');
    this._actions.classList.add('hidden');
    if (results.length > 0) {
      this._downloadActions.classList.remove('hidden');
    }

    // Update file items with results
    for (const result of results) {
      const item = this._fileList.querySelector(
        `[data-filename="${CSS.escape(result.filename)}"]`,
      );
      if (!item) continue;

      const statusEl = item.querySelector('.bulk-file-status');
      const sizeEl = item.querySelector('.bulk-file-size');
      const preview = item.querySelector('.bulk-file-preview');

      statusEl.classList.remove('pending');
      statusEl.classList.add('success');
      statusEl.innerHTML =
        '<svg viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>';

      // Update preview with optimized SVG
      if (preview) {
        preview.innerHTML = result.data;
      }

      // Show size reduction
      const reduction = Math.round(
        (1 - result.optimizedSize / result.originalSize) * 100,
      );
      sizeEl.textContent = `${this._formatSize(
        result.originalSize,
      )} → ${this._formatSize(result.optimizedSize)} (-${reduction}%)`;
      sizeEl.classList.add('optimized');
    }

    // Update error items
    for (const error of errors) {
      const item = this._fileList.querySelector(
        `[data-filename="${CSS.escape(error.filename)}"]`,
      );
      if (!item) continue;

      const statusEl = item.querySelector('.bulk-file-status');
      const sizeEl = item.querySelector('.bulk-file-size');

      statusEl.classList.remove('pending');
      statusEl.classList.add('error');
      statusEl.innerHTML =
        '<svg viewBox="0 0 24 24"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>';
      sizeEl.textContent = error.error;
      sizeEl.classList.add('error-text');
    }

    // Show summary
    const totalOriginal = results.reduce((sum, r) => sum + r.originalSize, 0);
    const totalOptimized = results.reduce((sum, r) => sum + r.optimizedSize, 0);
    const totalReduction =
      totalOriginal > 0
        ? Math.round((1 - totalOptimized / totalOriginal) * 100)
        : 0;

    this._summary.innerHTML = `
      <div class="bulk-summary-row">
        <span>Files optimized:</span>
        <strong>${results.length}</strong>
      </div>
      ${
        errors.length > 0
          ? `<div class="bulk-summary-row error"><span>Failed:</span><strong>${errors.length}</strong></div>`
          : ''
      }
      <div class="bulk-summary-row">
        <span>Total size:</span>
        <strong>${this._formatSize(totalOriginal)} → ${this._formatSize(
      totalOptimized,
    )}</strong>
      </div>
      <div class="bulk-summary-row highlight">
        <span>Saved:</span>
        <strong>${this._formatSize(
          totalOriginal - totalOptimized,
        )} (${totalReduction}%)</strong>
      </div>
    `;
    this._summary.classList.remove('hidden');
  }

  _formatSize(bytes) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  }

  _escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }
}

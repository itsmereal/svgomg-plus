import { idbKeyval as storage } from '../utils/storage.js';
import Svgo from './svgo.js';
import { domReady } from './utils.js';
import Output from './ui/output.js';
import DownloadButton from './ui/download-button.js';
import CopyButton from './ui/copy-button.js';
import BgFillButton from './ui/bg-fill-button.js';
import Results from './ui/results.js';
import Settings from './ui/settings.js';
import MainMenu from './ui/main-menu.js';
import Toasts from './ui/toasts.js';
import FileDrop from './ui/file-drop.js';
import Preloader from './ui/preloader.js';
import Changelog from './ui/changelog.js';
import ResultsContainer from './ui/results-container.js';
import ViewToggler from './ui/view-toggler.js';
import ResultsCache from './results-cache.js';
import MainUi from './ui/main-ui.js';
import BulkMenu from './ui/bulk-menu.js';
import BulkOutput from './ui/bulk-output.js';
import BulkProcessor from './bulk-processor.js';
import { createAndDownloadZip } from './zip-exporter.js';

const svgo = new Svgo();

export default class MainController {
  constructor() {
    // ui components
    this._mainUi = null;
    this._outputUi = new Output();
    this._downloadButtonUi = new DownloadButton();
    this._copyButtonUi = new CopyButton();
    this._resultsUi = new Results();
    this._settingsUi = new Settings();
    this._mainMenuUi = new MainMenu();
    this._toastsUi = new Toasts();
    this._bulkMenuUi = new BulkMenu();
    this._bulkOutputUi = new BulkOutput();
    this._bulkOutputUi.setSvgo(svgo);
    this._bulkProcessor = new BulkProcessor(svgo);

    const bgFillUi = new BgFillButton();
    const dropUi = new FileDrop();
    const preloaderUi = new Preloader();
    const changelogUi = new Changelog(self.version);
    // _resultsContainerUi is unused
    this._resultsContainerUi = new ResultsContainer(this._resultsUi);
    const viewTogglerUi = new ViewToggler();

    // ui events
    this._settingsUi.emitter.on('change', () => this._onSettingsChange());
    this._settingsUi.emitter.on('reset', (oldSettings) =>
      this._onSettingsReset(oldSettings),
    );
    this._mainMenuUi.emitter.on('svgDataLoad', (event) =>
      this._onInputChange(event),
    );
    dropUi.emitter.on('svgDataLoad', (event) => this._onInputChange(event));
    this._mainMenuUi.emitter.on('error', ({ error }) =>
      this._handleError(error),
    );
    this._mainMenuUi.emitter.on('modeChange', (event) =>
      this._onModeChange(event),
    );
    // Bulk output events (main bulk UI in canvas area)
    this._bulkOutputUi.emitter.on('processBulk', (event) =>
      this._onBulkProcess(event),
    );
    this._bulkOutputUi.emitter.on('downloadZip', (event) =>
      this._onDownloadZip(event),
    );
    this._bulkOutputUi.emitter.on('error', ({ error }) =>
      this._handleError(error),
    );
    this._bulkOutputUi.emitter.on('filesSelected', (event) =>
      this._onBulkFilesSelected(event),
    );
    this._bulkProcessor.emitter.on('progress', (event) =>
      this._onBulkProgress(event),
    );
    viewTogglerUi.emitter.on('change', (event) =>
      this._outputUi.set(event.value),
    );
    window.addEventListener('keydown', (event) => this._onGlobalKeyDown(event));
    window.addEventListener('paste', (event) => this._onGlobalPaste(event));
    window.addEventListener('copy', (event) => this._onGlobalCopy(event));

    // state
    this._inputItem = null;
    this._cache = new ResultsCache(10);
    this._latestCompressJobId = 0;
    this._userHasInteracted = false;
    this._reloading = false;

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('sw.js', { scope: './' })
        .then((registration) => {
          registration.addEventListener('updatefound', () =>
            this._onUpdateFound(registration),
          );
        });
    }

    // tell the user about the latest update
    storage.get('last-seen-version').then((lastSeenVersion) => {
      if (lastSeenVersion) changelogUi.showLogFrom(lastSeenVersion);
      storage.set('last-seen-version', self.version);
    });

    domReady.then(() => {
      const container = document.querySelector('.app-output');
      const actionContainer = container.querySelector(
        '.action-button-container',
      );
      const minorActionContainer = container.querySelector(
        '.minor-action-container',
      );
      const toolbarElement = container.querySelector('.toolbar');
      const outputElement = container.querySelector('.output');
      const menuExtraElement = container.querySelector('.menu-extra');

      // elements for intro anim
      this._mainUi = new MainUi(
        toolbarElement,
        actionContainer,
        this._outputUi.container,
        this._settingsUi.container,
      );

      minorActionContainer.append(
        bgFillUi.container,
        this._copyButtonUi.container,
      );
      actionContainer.append(this._downloadButtonUi.container);
      outputElement.append(
        this._outputUi.container,
        this._bulkOutputUi.container,
      );
      container.append(this._toastsUi.container, dropUi.container);
      menuExtraElement.append(changelogUi.container);

      // load previous settings
      this._loadSettings();

      // someone managed to hit the preloader, aww
      if (preloaderUi.activated) {
        this._toastsUi.show('Ready now!', { duration: 3000 });
      }

      // for testing
      // eslint-disable-next-line no-constant-condition
      if (false) {
        (async () => {
          const data = await fetch('test-svgs/car-lite.svg').then((response) =>
            response.text(),
          );
          this._onInputChange({ data, filename: 'car-lite.svg' });
        })();
      }
    });
  }

  _onGlobalKeyDown(event) {
    if (event.key === 'o' && (event.ctrlKey || event.metaKey)) {
      event.preventDefault();
      this._mainMenuUi.showFilePicker();
    }

    if (event.key === 'Escape') this._mainMenuUi.hide();
  }

  _onGlobalPaste(event) {
    const value = event.clipboardData.getData('text');
    if (!value.includes('</svg>')) {
      this._toastsUi.show('Pasted value not an SVG', { duration: 2000 });
    } else {
      this._mainMenuUi.setPasteInput(value);
      event.preventDefault();
    }
  }

  _onGlobalCopy(event) {
    const selection = window.getSelection();
    if (!selection.isCollapsed) return;

    this._toastsUi.show(
      this._copyButtonUi.copyText() ? 'Copy successful' : 'Nothing to copy',
      { duration: 2000 },
    );

    event.preventDefault();
  }

  _onUpdateFound(registration) {
    const newWorker = registration.installing;

    registration.installing.addEventListener('statechange', async () => {
      if (this._reloading) return;

      // the very first activation!
      // tell the user stuff works offline
      if (
        newWorker.state === 'activated' &&
        !navigator.serviceWorker.controller
      ) {
        this._toastsUi.show('Ready to work offline', { duration: 5000 });
        return;
      }

      if (
        newWorker.state === 'activated' &&
        navigator.serviceWorker.controller
      ) {
        // if the user hasn't interacted yet, do a sneaky reload
        if (!this._userHasInteracted) {
          this._reloading = true;
          location.reload();
          return;
        }

        // otherwise, show the user an alert
        const toast = this._toastsUi.show('Update available', {
          buttons: ['reload', 'dismiss'],
        });
        const answer = await toast.answer;

        if (answer === 'reload') {
          this._reloading = true;
          location.reload();
        }
      }
    });
  }

  _onSettingsChange() {
    const settings = this._settingsUi.getSettings();
    this._saveSettings(settings);

    // In bulk mode, update previews instead of compressing single file
    if (this._bulkMode) {
      this._bulkOutputUi.updatePreviews(settings);
      return;
    }

    // Only compress if we have an input file
    if (this._inputItem) {
      this._compressSvg(settings);
    }
  }

  async _onSettingsReset(oldSettings) {
    const toast = this._toastsUi.show('Settings reset', {
      buttons: ['undo', 'dismiss'],
      duration: 5000,
    });
    const answer = await toast.answer;

    if (answer === 'undo') {
      this._settingsUi.setSettings(oldSettings);
      this._onSettingsChange();
    }
  }

  async _onInputChange({ data, filename }) {
    const settings = this._settingsUi.getSettings();
    this._userHasInteracted = true;

    try {
      this._inputItem = await svgo.wrapOriginal(data);
      this._inputFilename = filename;
    } catch (error) {
      this._mainMenuUi.stopSpinner();
      this._handleError(new Error(`Load failed: ${error.message}`));
      return;
    }

    this._cache.purge();

    this._compressSvg(settings);
    this._outputUi.reset();
    this._mainUi.activate();
    this._mainMenuUi.allowHide = true;
    this._mainMenuUi.hide();
  }

  _handleError(error) {
    this._toastsUi.show(error.message, { isError: true });
    console.error(error);
  }

  async _loadSettings() {
    const settings = await storage.get('settings');
    if (settings) this._settingsUi.setSettings(settings);
  }

  _saveSettings(settings) {
    // doesn't make sense to retain the "show original" option
    const { original, ...settingsToKeep } = settings;
    storage.set('settings', settingsToKeep);
  }

  async _compressSvg(settings) {
    const thisJobId = (this._latestCompressJobId = Math.random());

    await svgo.abort();

    if (thisJobId !== this._latestCompressJobId) {
      // while we've been waiting, there's been a newer call
      // to _compressSvg, we don't need to do anything
      return;
    }

    if (settings.original) {
      this._updateForFile(this._inputItem, {
        compress: settings.gzip,
      });
      return;
    }

    const cacheMatch = this._cache.match(settings.fingerprint);

    if (cacheMatch) {
      this._updateForFile(cacheMatch, {
        compareToFile: this._inputItem,
        compress: settings.gzip,
      });
      return;
    }

    this._downloadButtonUi.working();

    try {
      const resultFile = await svgo.process(this._inputItem.text, settings);

      this._updateForFile(resultFile, {
        compareToFile: this._inputItem,
        compress: settings.gzip,
      });

      this._cache.add(settings.fingerprint, resultFile);
    } catch (error) {
      if (error.name === 'AbortError') return;
      error.message = `Minifying error: ${error.message}`;
      this._handleError(error);
    } finally {
      this._downloadButtonUi.done();
    }
  }

  async _updateForFile(svgFile, { compareToFile, compress }) {
    this._outputUi.update(svgFile);
    this._downloadButtonUi.setDownload(this._inputFilename, svgFile);
    this._copyButtonUi.setCopyText(svgFile.text);

    this._resultsUi.update({
      comparisonSize: compareToFile && (await compareToFile.size({ compress })),
      size: await svgFile.size({ compress }),
    });
  }

  _onModeChange({ mode }) {
    this._userHasInteracted = true;
    this._bulkMode = mode === 'bulk';

    // Get elements to show/hide based on mode
    const actionButtonContainer = document.querySelector(
      '.action-button-container',
    );
    const outputSwitcher = document.querySelector('.output-switcher');
    const viewToggler = document.querySelector('.view-toggler');

    if (this._bulkMode) {
      // Show bulk UI elements
      this._bulkOutputUi.show();
      this._outputUi.container.classList.add('hidden');

      // Hide single-file UI elements (floating buttons, results, output switcher, view toggler)
      if (actionButtonContainer) {
        actionButtonContainer.classList.add('bulk-hidden');
      }

      if (outputSwitcher) {
        outputSwitcher.classList.add('bulk-hidden');
      }

      if (viewToggler) {
        viewToggler.classList.add('bulk-hidden');
      }

      // Activate main UI elements (settings, toolbar, etc.)
      this._mainUi.activate();

      // Ensure settings panel is visible (force show even if activate already ran)
      const toolbar = document.querySelector('.toolbar');
      const settings = this._settingsUi.container;
      toolbar.classList.add('transition', 'active');
      settings.classList.add('transition', 'active');

      // Close the menu
      this._mainMenuUi.allowHide = true;
      this._mainMenuUi.hide();
    } else {
      this._bulkMenuUi.hide();
      this._bulkMenuUi.reset();
      this._bulkOutputUi.hide();
      this._bulkOutputUi.reset();
      this._outputUi.container.classList.remove('hidden');

      // Show single-file UI elements
      if (actionButtonContainer) {
        actionButtonContainer.classList.remove('bulk-hidden');
      }

      if (outputSwitcher) {
        outputSwitcher.classList.remove('bulk-hidden');
      }

      if (viewToggler) {
        viewToggler.classList.remove('bulk-hidden');
      }
    }
  }

  _onBulkFilesSelected({ files }) {
    this._bulkOutputUi.setFiles(files);
  }

  async _onBulkProcess({ files }) {
    this._userHasInteracted = true;
    const settings = this._settingsUi.getSettings();

    try {
      const { results, errors } = await this._bulkProcessor.processFiles(
        files,
        settings,
      );

      this._bulkOutputUi.setResults(results, errors);

      if (errors.length > 0) {
        this._toastsUi.show(
          `${errors.length} file${
            errors.length > 1 ? 's' : ''
          } failed to process`,
          { duration: 3000 },
        );
      }

      if (results.length > 0) {
        this._toastsUi.show(
          `${results.length} file${results.length > 1 ? 's' : ''} optimized`,
          { duration: 2000 },
        );
      }
    } catch (error) {
      this._handleError(error);
      this._bulkOutputUi.reset();
    }
  }

  _onBulkProgress({ percent, current, total }) {
    this._bulkOutputUi.updateProgress(percent, current, total);
  }

  async _onDownloadZip({ results }) {
    try {
      await createAndDownloadZip(results);
      this._toastsUi.show('ZIP downloaded', { duration: 2000 });
    } catch (error) {
      this._handleError(new Error(`Failed to create ZIP: ${error.message}`));
    }
  }
}

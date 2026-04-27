import { BaseModal } from './modal-base.js';
import { buttonHtml } from './ui/button.js';
import { i18n } from '../managers/i18n-manager.js';
import { OptionsModal } from './options-modal.js';

/**
 * Sample top-level menu modal. Demonstrates BaseModal usage and how to open
 * a sub-modal without leaking listeners.
 *
 * Options:
 *   - showResume: render a Resume button when a game is in progress.
 *   - onStart / onResume / onClose / onExit
 */
export class MenuModal extends BaseModal {
  /** @type {OptionsModal | null} */
  #options = null;

  get title() {
    return i18n.t('menu.title');
  }

  renderBody() {
    const buttons = [];
    if (this.options.showResume) {
      buttons.push(buttonHtml({ action: 'resume', label: i18n.t('menu.resume') }));
    } else {
      buttons.push(buttonHtml({ action: 'start', label: i18n.t('menu.start') }));
    }
    buttons.push(
      buttonHtml({ action: 'options', label: i18n.t('menu.options'), variant: 'secondary' }),
    );
    if (this.options.onExit) {
      buttons.push(buttonHtml({ action: 'exit', label: i18n.t('menu.exit'), variant: 'ghost' }));
    }
    return `<div class="gt-stack">${buttons.join('')}</div>`;
  }

  onAction(action) {
    switch (action) {
      case 'resume':
        this.options.onResume?.();
        this.close();
        break;
      case 'start':
        this.options.onStart?.();
        this.close();
        break;
      case 'options':
        this.#openOptions();
        break;
      case 'exit':
        this.options.onExit?.();
        break;
    }
  }

  #openOptions() {
    if (this.#options) return;
    this.#options = new OptionsModal(this.scene, {
      onClose: () => {
        this.#options = null;
      },
    });
    this.#options.open();
    /* If the parent modal is destroyed while options is open, kill it too. */
    this.bag.add(() => this.#options?.destroy());
  }
}

import { BaseModal } from "./modal-base.js";
import { toggleRowHtml } from "./ui/toggle-row.js";
import { buttonHtml } from "./ui/button.js";
import { i18n } from "../managers/i18n-manager.js";
import { optionsManager } from "../managers/options-manager.js";
import { saveManager } from "../managers/save-manager.js";

/**
 * Sample options modal — music / sound / animSkip toggles, locale cycle,
 * and a "reset all data" action. Subscribes to optionsManager so external
 * changes refresh the UI.
 */
export class OptionsModal extends BaseModal {
  get title() {
    return i18n.t("options.title");
  }

  onMount() {
    this.bag.add(optionsManager.onChange(() => this.refresh()));
  }

  renderBody() {
    const rows = [
      toggleRowHtml({
        action: "toggle-music",
        label: i18n.t("options.music"),
        checked: optionsManager.musicEnabled,
      }),
      toggleRowHtml({
        action: "toggle-sound",
        label: i18n.t("options.sound"),
        checked: optionsManager.soundEnabled,
      }),
      toggleRowHtml({
        action: "toggle-anim-skip",
        label: i18n.t("options.anim_skip"),
        checked: optionsManager.animSkipEnabled,
      }),
      `<div class="gt-row gt-clickable" data-action="cycle-locale">
         <span class="gt-row-label">${i18n.t("options.language")}</span>
         <span class="gt-row-value">${i18n.locale.toUpperCase()}</span>
       </div>`,
    ];
    const actions = [
      buttonHtml({
        action: "reset-data",
        label: i18n.t("options.reset_data"),
        variant: "danger",
      }),
      buttonHtml({
        action: "close",
        label: i18n.t("menu.close"),
        variant: "ghost",
      }),
    ];
    return `<div class="gt-stack">${rows.join("")}</div><div class="gt-modal-footer">${actions.join("")}</div>`;
  }

  onAction(action) {
    switch (action) {
      case "toggle-music":
        optionsManager.set("music", !optionsManager.musicEnabled);
        break;
      case "toggle-sound":
        optionsManager.set("sound", !optionsManager.soundEnabled);
        break;
      case "toggle-anim-skip":
        optionsManager.set("animSkip", !optionsManager.animSkipEnabled);
        break;
      case "cycle-locale": {
        const locales = i18n.availableLocales;
        const next =
          locales[(locales.indexOf(i18n.locale) + 1) % locales.length];
        i18n.setLocale(next);
        break;
      }
      case "reset-data":
        if (window.confirm(i18n.t("options.reset_data_confirm"))) {
          saveManager.resetAll();
        }
        break;
    }
  }
}

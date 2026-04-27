import { en } from "../locales/en.js";
import { fr } from "../locales/fr.js";
import { STORAGE_KEYS, DEFAULT_LOCALE } from "../configs/constants.js";
import { EventEmitter } from "../utils/event-emitter.js";

const LOCALES = { en, fr };

class I18nManager extends EventEmitter {
  /** @type {string} */
  #locale = DEFAULT_LOCALE;

  constructor() {
    super();
    const saved = localStorage.getItem(STORAGE_KEYS.LOCALE);
    if (saved && LOCALES[saved]) this.#locale = saved;
    else if (typeof navigator !== "undefined") {
      const lang = navigator.language?.slice(0, 2);
      if (lang && LOCALES[lang]) this.#locale = lang;
    }
  }

  /** @returns {string} */
  get locale() {
    return this.#locale;
  }

  /** @returns {string[]} */
  get availableLocales() {
    return Object.keys(LOCALES);
  }

  /**
   * Translate a key with optional `{var}` interpolation.
   * @param {string} key
   * @param {Record<string, string | number>} [params]
   * @returns {string}
   */
  t(key, params) {
    const dict = LOCALES[this.#locale] ?? LOCALES[DEFAULT_LOCALE];
    let text = dict[key];
    if (text === undefined) {
      console.warn(`[i18n] missing key "${key}" for locale "${this.#locale}"`);
      return key;
    }
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        text = text.replaceAll(`{${k}}`, String(v));
      }
    }
    return text;
  }

  /**
   * Switch locale and persist.
   * @param {string} code
   */
  setLocale(code) {
    if (!LOCALES[code] || code === this.#locale) return;
    this.#locale = code;
    localStorage.setItem(STORAGE_KEYS.LOCALE, code);
    this.emit("change", code);
  }

  /** Subscribe to locale changes. */
  onChange(callback) {
    return this.on("change", callback);
  }
}

export const i18n = new I18nManager();

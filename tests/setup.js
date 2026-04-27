/**
 * Vitest setup — runs before every test file.
 *
 * On Node 25, vitest's environment glue partially enables the experimental
 * `--localstorage-file` flag, which leaves `globalThis.localStorage` as a
 * stub object without `getItem` / `clear` methods. We replace it with a
 * complete polyfill so tests round-trip through a real Storage API
 * regardless of the Node version.
 */

import { afterEach, beforeEach } from "vitest";

class MemoryStorage {
  #store = new Map();
  get length() {
    return this.#store.size;
  }
  key(i) {
    return [...this.#store.keys()][i] ?? null;
  }
  getItem(k) {
    return this.#store.has(k) ? this.#store.get(k) : null;
  }
  setItem(k, v) {
    this.#store.set(String(k), String(v));
  }
  removeItem(k) {
    this.#store.delete(k);
  }
  clear() {
    this.#store.clear();
  }
}

function installStorage(name) {
  const existing = globalThis[name];
  if (
    existing &&
    typeof existing.clear === "function" &&
    typeof existing.getItem === "function"
  ) {
    return; // a working Storage is already present
  }
  const storage = new MemoryStorage();
  Object.defineProperty(globalThis, name, {
    configurable: true,
    writable: true,
    value: storage,
  });
  if (typeof window !== "undefined") {
    Object.defineProperty(window, name, {
      configurable: true,
      writable: true,
      value: storage,
    });
  }
}

installStorage("localStorage");
installStorage("sessionStorage");

beforeEach(() => {
  globalThis.localStorage.clear();
  globalThis.sessionStorage.clear();
});

afterEach(() => {
  document.body.innerHTML = "";
  document.documentElement.removeAttribute("data-orientation");
});

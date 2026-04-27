/**
 * Tiny DOM helpers used across components. Kept intentionally minimal — if a
 * helper grows to more than a screen, move it to its own file.
 */

/**
 * Create an HTML element with attributes and optional children.
 * @template {keyof HTMLElementTagNameMap} K
 * @param {K} tag
 * @param {Record<string, string | number | boolean | undefined> & { class?: string, dataset?: Record<string, string> }} [attrs]
 * @param {Array<Node | string> | string} [children]
 * @returns {HTMLElementTagNameMap[K]}
 */
export function el(tag, attrs = {}, children) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue;
    if (k === "class") node.className = String(v);
    else if (k === "dataset") {
      for (const [dk, dv] of Object.entries(
        /** @type {Record<string, string>} */ (v),
      )) {
        node.dataset[dk] = dv;
      }
    } else if (k.startsWith("on") && typeof v === "function") {
      node.addEventListener(
        k.slice(2).toLowerCase(),
        /** @type {EventListener} */ (v),
      );
    } else if (v === true) {
      node.setAttribute(k, "");
    } else {
      node.setAttribute(k, String(v));
    }
  }
  if (children !== undefined) {
    if (typeof children === "string") {
      node.textContent = children;
    } else {
      for (const child of children) {
        node.append(
          typeof child === "string" ? document.createTextNode(child) : child,
        );
      }
    }
  }
  return node;
}

/**
 * Force a synchronous reflow so a class change commits before the next paint.
 * Use sparingly — only when you need to chain CSS animations.
 * @param {HTMLElement} element
 */
export function reflow(element) {
  void element.offsetHeight;
}

/**
 * Resolve on the next animation frame.
 * @returns {Promise<number>} Frame timestamp
 */
export function nextFrame() {
  return new Promise((resolve) => requestAnimationFrame(resolve));
}

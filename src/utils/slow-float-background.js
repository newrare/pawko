/**
 * SlowFloatBackground — pure DOM + CSS animated background.
 *
 * Card suits float slowly upward; 4-pointed sparkles twinkle across the
 * full viewport. No canvas, no rAF — all motion is driven by CSS animations.
 *
 * Usage:
 *   const bg = new SlowFloatBackground(rootEl);
 *   // later:
 *   bg.destroy();
 */

const SUITS = [
  { d: 'M2 8.5a5.5 5.5 0 0 1 10-3.163A5.5 5.5 0 0 1 22 8.5c0 7.5-10 12.985-10 12.985S2 16 2 8.5', color: '#f28090', vb: '0 0 24 24' },
  { d: 'M10.951 15.893A5.83 5.83 0 0 1 7.5 17C4.462 17 2 14.761 2 12c0-3.548 3.525-6.089 6.644-8.338C9.92 2.742 11.129 1.872 12 1c.871.871 2.08 1.742 3.356 2.662C18.476 5.911 22 8.452 22 12c0 2.761-2.462 5-5.5 5a5.83 5.83 0 0 1-3.451-1.107c.284 1.646 1.009 2.82 1.794 4.092l.369.602c.384.636-.087 1.413-.83 1.413H9.618c-.743 0-1.214-.777-.83-1.413l.369-.602c.785-1.272 1.51-2.446 1.794-4.092', color: '#6a3040', vb: '0 0 24 24' },
  { d: 'M13.775 11.04C14.933 9.266 16 7.632 16 6a4 4 0 0 0-8 0c0 1.633 1.067 3.267 2.225 5.04h.001l.234.359q-.433-.331-.808-.626C8.276 9.697 7.386 9 6 9a4 4 0 0 0 0 8c1.633 0 3.267-1.067 5.04-2.225l.03-.02c-.093 2.281-.958 3.683-1.913 5.23l-.369.602c-.384.636.087 1.413.83 1.413h4.764c.743 0 1.214-.777.83-1.413l-.369-.602c-.955-1.547-1.82-2.949-1.913-5.23l.03.02C14.734 15.933 16.368 17 18 17a4 4 0 0 0 0-8c-1.386 0-2.276.697-3.652 1.773q-.375.296-.808.626z', color: '#8a7040', vb: '0 0 24 24' },
];
const DIAMOND = { d: 'm4.036 10.734l7.19-8.788a1 1 0 0 1 1.548 0l7.19 8.787a2 2 0 0 1 0 2.534l-7.19 8.787a1 1 0 0 1-1.548 0l-7.19-8.787a2 2 0 0 1 0-2.533', color: '#d4af37', vb: '0 0 24 24' };
const SPARKLE_D = 'M12 0 L13.5 9.5 L24 12 L13.5 14.5 L12 24 L10.5 14.5 L0 12 L10.5 9.5 Z';
const SPARKLE_COLORS = ['#f5d77a', '#f28090', '#cc2840', '#d4af37'];

export class SlowFloatBackground {
  /** @type {HTMLElement} */ #layer;

  /** @param {HTMLElement} root */
  constructor(root) {
    this.#layer = document.createElement('div');
    this.#layer.className = 'pk-bg-layer';
    this.#buildSuits();
    this.#buildSparkles();
    root.prepend(this.#layer);
  }

  destroy() {
    this.#layer.remove();
  }

  #buildSuits() {
    const suitDefs = [
      ...Array(3).fill(SUITS[0]),
      ...Array(3).fill(SUITS[1]),
      ...Array(3).fill(SUITS[2]),
      DIAMOND,
    ];
    for (const s of suitDefs) {
      const el = document.createElement('div');
      el.className = 'pk-bg-suit';
      const sz = 80 + Math.random() * 80;
      el.style.cssText = [
        `width:${sz}px`,
        `height:${sz}px`,
        `left:${(5 + Math.random() * 88).toFixed(1)}%`,
        `bottom:-${(sz + 20).toFixed(0)}px`,
        `opacity:${(0.06 + Math.random() * 0.06).toFixed(3)}`,
        `animation-duration:${(30 + Math.random() * 30).toFixed(1)}s`,
        `animation-delay:${(-Math.random() * 60).toFixed(1)}s`,
      ].join(';');
      el.innerHTML = `<svg viewBox="${s.vb}" style="color:${s.color}"><path fill="currentColor" d="${s.d}"/></svg>`;
      this.#layer.appendChild(el);
    }
  }

  #buildSparkles() {
    for (let i = 0; i < 60; i++) {
      const el = document.createElement('div');
      el.className = 'pk-bg-sparkle';
      const sz = 6 + Math.random() * 12;
      const col = SPARKLE_COLORS[Math.floor(Math.random() * SPARKLE_COLORS.length)];
      el.style.cssText = [
        `width:${sz.toFixed(1)}px`,
        `height:${sz.toFixed(1)}px`,
        `left:${(Math.random() * 100).toFixed(1)}%`,
        `top:${(Math.random() * 100).toFixed(1)}%`,
        `color:${col}`,
        `animation-duration:${(2 + Math.random() * 4).toFixed(2)}s`,
        `animation-delay:${(-Math.random() * 6).toFixed(2)}s`,
      ].join(';');
      el.innerHTML = `<svg viewBox="0 0 24 24"><path fill="currentColor" d="${SPARKLE_D}"/></svg>`;
      this.#layer.appendChild(el);
    }
  }
}

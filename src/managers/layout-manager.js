import {
  ORIENTATION,
  ORIENTATIONS,
  SAFE_ZONE,
  ANIM,
} from "../configs/constants.js";
import { EventEmitter } from "../utils/event-emitter.js";

/**
 * LayoutManager — computes a centered safe-zone box from the viewport and
 * pushes its metrics as CSS custom properties so stylesheets stay free of
 * hardcoded pixel values.
 *
 * The safe-zone box is **always centered on both axes** within the
 * available viewport (minus device insets). Caps in `SAFE_ZONE` keep it
 * from sprawling on a desktop window.
 *
 * Variables exposed (read-only from CSS):
 *   --gt-vw, --gt-vh                                 viewport
 *   --gt-safe-top, --gt-safe-bottom,
 *   --gt-safe-left, --gt-safe-right                  insets relative to viewport
 *   --gt-safe-width, --gt-safe-height                box dimensions
 *   --gt-safe-cx, --gt-safe-cy                       box center
 *   --anim-fast, --anim-normal, --anim-slow,
 *   --anim-modal-open, --anim-modal-close            animation durations
 */
class LayoutManager extends EventEmitter {
  /** Full viewport (matches Phaser.Scale.RESIZE size). */
  width = 0;
  height = 0;

  /** Safe area — centered rectangle reserved for gameplay. */
  safe = {
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    width: 0,
    height: 0,
    cx: 0,
    cy: 0,
  };

  /** Active orientation (mirrors `ORIENTATION` config). */
  orientation = ORIENTATION;

  constructor() {
    super();
    this.#publishAnimVars();
  }

  /**
   * Recompute layout for the given viewport. Idempotent.
   * @param {number} w  CSS px
   * @param {number} h  CSS px
   */
  update(w, h) {
    this.width = w;
    this.height = h;

    const root = getComputedStyle(document.documentElement);
    const envTop = parseFloat(root.getPropertyValue("--sai-top")) || 0;
    const envBottom = parseFloat(root.getPropertyValue("--sai-bottom")) || 0;
    const envLeft = parseFloat(root.getPropertyValue("--sai-left")) || 0;
    const envRight = parseFloat(root.getPropertyValue("--sai-right")) || 0;

    const insetTop = Math.max(envTop, h * SAFE_ZONE.MIN_TOP);
    const insetBottom = Math.max(envBottom, h * SAFE_ZONE.MIN_BOTTOM);
    const insetLeft = Math.max(envLeft, w * SAFE_ZONE.MIN_SIDE);
    const insetRight = Math.max(envRight, w * SAFE_ZONE.MIN_SIDE);

    const isPortrait = ORIENTATION === ORIENTATIONS.PORTRAIT;
    const maxW = isPortrait
      ? SAFE_ZONE.MAX_WIDTH_PORTRAIT
      : SAFE_ZONE.MAX_WIDTH_LANDSCAPE;
    const maxH = isPortrait
      ? SAFE_ZONE.MAX_HEIGHT_PORTRAIT
      : SAFE_ZONE.MAX_HEIGHT_LANDSCAPE;

    const availW = w - insetLeft - insetRight;
    const availH = h - insetTop - insetBottom;
    const cappedWidth = Math.max(0, Math.min(availW, maxW));
    const cappedHeight = Math.max(0, Math.min(availH, maxH));

    /* Center the box inside the available area (the rectangle between
       device insets). When uncapped, the box fills the available area
       exactly; when capped, the leftover space splits evenly on each side.
       This keeps margins symmetric *to the insets* — i.e. equal distance
       from notch and home bar — even when MIN_TOP and MIN_BOTTOM differ. */
    const left = insetLeft + (availW - cappedWidth) / 2;
    const top = insetTop + (availH - cappedHeight) / 2;

    this.safe.left = left;
    this.safe.right = left + cappedWidth;
    this.safe.top = top;
    this.safe.bottom = top + cappedHeight;
    this.safe.width = cappedWidth;
    this.safe.height = cappedHeight;
    this.safe.cx = left + cappedWidth / 2;
    this.safe.cy = top + cappedHeight / 2;

    this.#publishLayoutVars();
    this.emit("change", this);
  }

  /** Subscribe to layout changes (fired on every `update`). */
  onChange(callback) {
    return this.on("change", callback);
  }

  // ─── Publish CSS vars ──────────────────────────────────────────────────

  #publishLayoutVars() {
    const r = document.documentElement.style;
    r.setProperty("--gt-vw", `${Math.round(this.width)}px`);
    r.setProperty("--gt-vh", `${Math.round(this.height)}px`);
    r.setProperty("--gt-safe-top", `${Math.round(this.safe.top)}px`);
    r.setProperty(
      "--gt-safe-bottom",
      `${Math.round(this.height - this.safe.bottom)}px`,
    );
    r.setProperty("--gt-safe-left", `${Math.round(this.safe.left)}px`);
    r.setProperty(
      "--gt-safe-right",
      `${Math.round(this.width - this.safe.right)}px`,
    );
    r.setProperty("--gt-safe-width", `${Math.round(this.safe.width)}px`);
    r.setProperty("--gt-safe-height", `${Math.round(this.safe.height)}px`);
    r.setProperty("--gt-safe-cx", `${Math.round(this.safe.cx)}px`);
    r.setProperty("--gt-safe-cy", `${Math.round(this.safe.cy)}px`);
    document.documentElement.setAttribute("data-orientation", this.orientation);
  }

  #publishAnimVars() {
    const r = document.documentElement.style;
    r.setProperty("--anim-fast", `${ANIM.FAST}ms`);
    r.setProperty("--anim-normal", `${ANIM.NORMAL}ms`);
    r.setProperty("--anim-slow", `${ANIM.SLOW}ms`);
    r.setProperty("--anim-modal-open", `${ANIM.MODAL_OPEN}ms`);
    r.setProperty("--anim-modal-close", `${ANIM.MODAL_CLOSE}ms`);
  }
}

export const layout = new LayoutManager();

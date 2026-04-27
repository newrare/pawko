import Phaser from "phaser";
import { SCENE_KEYS } from "../configs/constants.js";
import { layout } from "../managers/layout-manager.js";

/**
 * Boot scene — wires the layout manager to viewport resizes, then hands off
 * to PreloadScene. Intentionally minimal: no asset loading happens here.
 */
export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: SCENE_KEYS.BOOT });
  }

  create() {
    layout.update(window.innerWidth, window.innerHeight);
    this.scale.on("resize", () =>
      layout.update(window.innerWidth, window.innerHeight),
    );
    this.scene.start(SCENE_KEYS.PRELOAD);
  }
}

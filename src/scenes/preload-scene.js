import Phaser from "phaser";
import { SCENE_KEYS } from "../configs/constants.js";
import { layout } from "../managers/layout-manager.js";
import { audioManager } from "../managers/audio-manager.js";

/**
 * Preload scene — loads images and warms up the audio pool. Renders a tiny
 * progress bar; replace with branded artwork later if needed.
 */
export class PreloadScene extends Phaser.Scene {
  constructor() {
    super({ key: SCENE_KEYS.PRELOAD });
  }

  preload() {
    const { width, height } = layout;
    const barW = Math.min(width * 0.6, 320);
    const barH = 6;
    const barX = (width - barW) / 2;
    const barY = height / 2;

    const bg = this.add
      .rectangle(barX + barW / 2, barY, barW, barH, 0x222230)
      .setOrigin(0.5);
    const fill = this.add
      .rectangle(barX, barY, 0, barH, 0x6da9ff)
      .setOrigin(0, 0.5);
    this.load.on("progress", (v) => {
      fill.width = barW * v;
    });
    this.load.on("complete", () => {
      bg.destroy();
      fill.destroy();
    });

    /* Add asset loads here, e.g.:
       this.load.image('logo', 'images/logo.png');
       Then declare the path under public/images/. */

    audioManager.preload();
  }

  create() {
    this.scene.start(SCENE_KEYS.TITLE);
  }
}

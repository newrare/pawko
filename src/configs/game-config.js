import Phaser from 'phaser';
import { ORIENTATION, ORIENTATIONS } from './constants.js';
import { BootScene } from '../scenes/boot-scene.js';
import { PreloadScene } from '../scenes/preload-scene.js';
import { TitleScene } from '../scenes/title-scene.js';
import { GameScene } from '../scenes/game-scene.js';

/* Cap Phaser canvas resolution on high-DPI mobile screens. 2× is
   indistinguishable from 3× at phone viewing distance and costs ~44 % fewer
   pixels — important on WebView. */
const maxDpr = Math.min(window.devicePixelRatio || 1, 2);
const isPortrait = ORIENTATION === ORIENTATIONS.PORTRAIT;

/** @type {Phaser.Types.Core.GameConfig} */
const gameConfig = {
  type: Phaser.CANVAS,
  parent: 'game-container',
  backgroundColor: '#0e0e1a',
  scale: {
    mode: Phaser.Scale.RESIZE,
    min: isPortrait ? { width: 320, height: 480 } : { width: 480, height: 320 },
    max: isPortrait ? { width: 720, height: 1600 } : { width: 1600, height: 720 },
  },
  render: {
    pixelArt: false,
    resolution: maxDpr,
  },
  dom: {
    createContainer: true,
  },
  /* StyleguideScene is registered at runtime in DEV builds (see main.js).
     Keeping it out of the static scene list lets Vite tree-shake it from
     production bundles. */
  scene: [BootScene, PreloadScene, TitleScene, GameScene],
};

export default gameConfig;

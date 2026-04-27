import Phaser from 'phaser';
import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import gameConfig from './configs/game-config.js';
import { APP_NAME, SCENE_KEYS } from './configs/constants.js';

/* Set the page title from the centralized constant. */
document.title = APP_NAME;

/* On Capacitor native (Android/iOS), `window.close()` is a no-op. Override it
   so any "Exit" button can properly terminate the app. */
if (Capacitor.isNativePlatform()) {
  window.close = () => App.exitApp();
}

const game = new Phaser.Game(gameConfig);

/* Dev-only: install the safe-zone overlay + nav bar and register the
   Styleguide scene. Both branches use dynamic imports so Vite strips them
   from production. */
if (import.meta.env.DEV) {
  import('./scenes/styleguide-scene.js').then(({ StyleguideScene }) => {
    game.scene.add(SCENE_KEYS.STYLEGUIDE, StyleguideScene);
  });
  import('./utils/dev-overlay.js').then(({ installDevOverlay }) => {
    const switchScene = (key) => {
      [SCENE_KEYS.TITLE, SCENE_KEYS.STYLEGUIDE, SCENE_KEYS.GAME].forEach((k) => {
        if (k !== key) game.scene.stop(k);
      });
      game.scene.start(key);
    };
    const install = () =>
      installDevOverlay({
        onTitle: () => switchScene(SCENE_KEYS.TITLE),
        onStyleguide: () => switchScene(SCENE_KEYS.STYLEGUIDE),
      });
    if (document.body) install();
    else document.addEventListener('DOMContentLoaded', install, { once: true });
  });
}

export default game;

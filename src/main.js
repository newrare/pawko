import { Capacitor } from "@capacitor/core";
import { App } from "@capacitor/app";
import { APP_NAME } from "./configs/constants.js";
import { layout } from "./managers/layout-manager.js";
import { audioManager } from "./managers/audio-manager.js";
import { SceneRouter } from "./scenes/scene-router.js";
import { TitleScene } from "./scenes/title-scene.js";

document.title = APP_NAME;

if (Capacitor.isNativePlatform()) {
  window.close = () => App.exitApp();
}

const container = document.getElementById("game-container");

const syncLayout = () => layout.update(window.innerWidth, window.innerHeight);
syncLayout();
window.addEventListener("resize", syncLayout);

audioManager.preload();

const router = new SceneRouter(container);
router.start(TitleScene);

if (import.meta.env.DEV) {
  Promise.all([
    import("./scenes/styleguide-scene.js"),
    import("./scenes/shop-scene.js"),
    import("./scenes/ability-scene.js"),
    import("./utils/dev-overlay.js"),
    import("./utils/dev-admin-panel.js"),
  ]).then(([{ StyleguideScene }, { ShopScene }, { AbilityScene }, { installDevOverlay }, { installDevAdminPanel }]) => {
    const install = () => {
      installDevOverlay();
      installDevAdminPanel({
        onTitle: () => router.start(TitleScene),
        onStyleguide: () => router.start(StyleguideScene),
        onShop: () => router.start(ShopScene),
        onAbility: () => router.start(AbilityScene),
      });
    };
    if (document.body) install();
    else document.addEventListener("DOMContentLoaded", install, { once: true });
  });
}

export default router;

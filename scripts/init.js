import { initYZECoreAPI } from "./api.js";
import { registerSheets } from "./sheets/register.js";

Hooks.once("init", () => {
  initYZECoreAPI();

  registerSheets();
});

Hooks.once("ready", () => {
  console.log("YZE Core | ready", { foundry: game.version, system: game.system.id });
});

Hooks.on("yzeCoreSettingActivated", () => {
  // Re-render any open actor sheets so they pick up the new context
  for (const app of Object.values(ui.windows)) {
    if (app?.document instanceof Actor && app.rendered) {
      app.render({ force: true });
    } else if (app?.document instanceof Item && app.rendered) {
      app.render({ force: true });
    }
  }
});

Hooks.on("yzeCoreSettingDeactivated", () => {
  // Re-render any open actor sheets so they drop the old context
  for (const app of Object.values(ui.windows)) {
    if (app?.document instanceof Actor && app.rendered) {
      app.render({ force: true });
    } else if (app?.document instanceof Item && app.rendered) {
      app.render({ force: true });
    }
  }
});

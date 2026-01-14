import { initYZECoreAPI } from "./api.js";
import { YZECoreActorSheetV2 } from "./sheets/actor-sheet.js";
import { YZECoreItemSheetV2 } from "./sheets/item-sheet.js";

Hooks.once("init", () => {
  Actors.registerSheet("yze-core", YZECoreActorSheetV2, {
    types: ["character"],     // start narrow while testing
    makeDefault: true,
    label: "YZE Core Actor Sheet"
  });

  Items.registerSheet("yze-core", YZECoreItemSheetV2, {
    types: ["gear"],          // whatever your test type is
    makeDefault: true,
    label: "YZE Core Item Sheet"
  });
});

Hooks.once("ready", () => {
  initYZECoreAPI();
  console.log("YZE Core | ready", { foundry: game.version, system: game.system.id });
});

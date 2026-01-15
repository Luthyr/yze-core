import { YZECoreActorSheetV2 } from "./actor-sheet.js";
import { YZECoreNpcSheetV2 } from "./npc-sheet.js";
import { YZECoreItemSheetV2 } from "./item-sheet.js";

export function registerSheets() {
  // Centralized AppV2 sheet registration; called during init.
  Actors.unregisterSheet("core", ActorSheet);
  Actors.registerSheet("yze-core", YZECoreActorSheetV2, {
    types: ["character"],
    makeDefault: true,
    label: "YZE Core Actor Sheet"
  });
  Actors.registerSheet("yze-core", YZECoreNpcSheetV2, {
    types: ["npc"],
    makeDefault: true,
    label: "YZE Core NPC Sheet"
  });

  Items.unregisterSheet("core", ItemSheet);
  Items.registerSheet("yze-core", YZECoreItemSheetV2, {
    types: ["gear", "talent"],
    makeDefault: true,
    label: "YZE Core Item Sheet"
  });
}

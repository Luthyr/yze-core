import { YZECoreActorSheet } from "./actor-sheet.js";
import { YZECoreItemSheet } from "./item-sheet.js";

export function registerSheets() {
  Actors.unregisterSheet("core", ActorSheet);
  Actors.registerSheet("yze-core", YZECoreActorSheet, {
    makeDefault: true,
    label: "YZE Core Actor Sheet"
  });

  Items.unregisterSheet("core", ItemSheet);
  Items.registerSheet("yze-core", YZECoreItemSheet, {
    makeDefault: true,
    label: "YZE Core Item Sheet"
  });
}

// IMPORTANT: rollState is the single source of truth.
// Never infer dice from ChatMessage.rolls alone.

import { rollAttribute } from "./rolls/attribute.js";
import { rollSkill } from "./rolls/skill.js";
import { pushRoll } from "./rolls/push.js";
import { registerExampleSetting } from "./dev/example-setting.js";
import { validateSetting } from "./sdk/validate-setting.js";

// scripts/api.js
export function initYZECoreAPI() {

  // API
  game.yzecore = game.yzecore ?? {};
  game.yzecore.version = game.system.version;
  game.yzecore.apiVersion = 1;
  game.yzecore.settings = game.yzecore.settings ?? {};
  game.yzecore.rollAttribute = rollAttribute;
  game.yzecore.rollSkill = rollSkill;
  game.yzecore.pushRoll = pushRoll;
  game.yzecore.onPushedRoll = fn => Hooks.on("yzeCorePushedRoll", fn);

  game.yzecore.registerSetting = config => {
    validateSetting(config); // ? SDK enforcement

    game.yzecore.settings[config.id] = config;
    return config;
  };

  game.yzecore.activateSetting = id => {
    const setting = game.yzecore.settings?.[id];
    if (!setting) {
      ui.notifications.warn(`YZE Core | Setting not found: ${id}`);
      return null;
    }
    game.yzecore.activeSettingId = id;
    game.yzecore.config = setting;
    Hooks.callAll("yzeCoreSettingActivated", { id, config: setting });
    return setting;
  };
  game.yzecore.getActiveSetting = () => game.yzecore.config ?? null;
  game.yzecore.pushLastRoll = async () => {
    const msg = game.messages.contents
      .slice()
      .reverse()
      .find(m => m.flags?.["yze-core"]?.rollState);
    if (!msg) return ui.notifications.warn("No YZE roll message found.");
    return game.yzecore.pushRoll(msg);
  };

  game.settings.register("yze-core", "migratedLegacyFlags", {
    name: "Migrated Legacy Flags",
    hint: "Internal flag migration marker for yze-core.",
    scope: "world",
    config: false,
    type: Boolean,
    default: false
  });

  game.settings.register("yze-core", "autoActivatedExampleSetting", {
    name: "Auto Activated Example Setting",
    hint: "Internal marker to only auto-activate the example setting once.",
    scope: "world",
    config: false,
    type: Boolean,
    default: false
  });

  // Always register the dev example setting for the switcher.
  registerExampleSetting();

  // Auto-activate the example setting only once if nothing is active.
  const alreadyActivated = game.settings.get("yze-core", "autoActivatedExampleSetting");
  if (!alreadyActivated && !game.yzecore.activeSettingId) {
    game.yzecore.activateSetting("example");
    game.settings.set("yze-core", "autoActivatedExampleSetting", true);
  }
}

// IMPORTANT: rollState is the single source of truth.
// Never infer dice from ChatMessage.rolls alone.

import { rollAttribute } from "./rolls/attribute.js";
import { rollSkill } from "./rolls/skill.js";
import { pushRoll } from "./rolls/push.js";
import { registerExampleSetting } from "./dev/example-setting.js";

// scripts/api.js
export function initYZECoreAPI() {

  // Create the namespace once
  if (!game.yzecore) game.yzecore = {};

  // Fill in your API surface (example)
  game.yzecore = game.yzecore ?? {};
  game.yzecore.version = "0.1.0";
  game.yzecore.apiVersion = 1;
  game.yzecore.settings = game.yzecore.settings ?? {};
  game.yzecore.rollAttribute = rollAttribute;
  game.yzecore.rollSkill = rollSkill;
  game.yzecore.pushRoll = pushRoll;
  game.yzecore.onPushedRoll = fn => Hooks.on("yzeCorePushedRoll", fn);
  game.yzecore.registerSetting = config => {
    if (!config?.id) {
      ui.notifications.error("YZE Core | registerSetting: config.id is required.");
      throw new Error("registerSetting: config.id is required");
    }
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
    return setting;
  };
  game.yzecore.pushLastRoll = async () => {
    const msg = game.messages.contents
      .slice()
      .reverse()
      .find(m => m.flags?.yzecore?.rollState);
    if (!msg) return ui.notifications.warn("No YZE roll message found.");
    return game.yzecore.pushRoll(msg);
  };

  // TODO: add registerSetting/activateSetting, etc.

  // DEV: enable example setting automatically
  registerExampleSetting();
}

// IMPORTANT: rollState is the single source of truth.
// Never infer dice from ChatMessage.rolls alone.

import { rollAttribute } from "./rolls/attribute.js";
import { rollSkill } from "./rolls/skill.js";
import { pushRoll } from "./rolls/push.js";

// scripts/api.js
export function initYZECoreAPI() {
  // Create the namespace once
  if (!game.yzecore) game.yzecore = {};

  // Fill in your API surface (example)
  game.yzecore.version = "0.1.0";
  game.yzecore.apiVersion = 1;
  game.yzecore.rollAttribute = rollAttribute;
  game.yzecore.rollSkill = rollSkill;
  game.yzecore.pushRoll = pushRoll;
  game.yzecore.onPushedRoll = fn => Hooks.on("yzeCorePushedRoll", fn);
  game.yzecore.pushLastRoll = async () => {
    const msg = game.messages.contents
      .slice()
      .reverse()
      .find(m => m.flags?.yzecore?.rollState);
    if (!msg) return ui.notifications.warn("No YZE roll message found.");
    return game.yzecore.pushRoll(msg);
  };

  // TODO: add registerSetting/activateSetting, etc.
}

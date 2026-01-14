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
    validateSetting(config); // ✅ SDK enforcement

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
      .find(m => m.flags?.yzecore?.rollState);
    if (!msg) return ui.notifications.warn("No YZE roll message found.");
    return game.yzecore.pushRoll(msg);
  };

    // Always register in init (safe)
  game.settings.register("yze-core", "enableDevExampleSetting", {
    name: "Enable Dev Example Setting",
    hint: "Auto-registers the dev example setting on ready (for local testing only).",
    scope: "world",
    config: true,
    type: Boolean,
    default: false,

    onChange: enabled => {
      // Toggle ON: register + activate example
      if (enabled) {
        registerExampleSetting(); // should call registerSetting + activateSetting
        ui.notifications.info("YZE Core | Example setting enabled.");
      }

      // Toggle OFF: deactivate current setting if it’s the example
      else {
        if (game.yzecore?.activeSettingId === "example") {
          game.yzecore.activeSettingId = null;
          game.yzecore.config = null;
          Hooks.callAll("yzeCoreSettingDeactivated", { id: "example" });
          ui.notifications.info("YZE Core | Example setting disabled.");
        }
      }

    }
  });

  // "Ready work" as a function so we can run it now OR on ready
  const maybeEnableDevSetting = () => {
    const enabled = game.settings.get("yze-core", "enableDevExampleSetting");
    console.log("YZE Core | Dev example setting enabled?", enabled);

    if (enabled) {
      registerExampleSetting();
      if (game.yzecore.activeSettingId !== "example") {
        game.yzecore.activateSetting("example");
      }
      console.log("YZE Core | Active setting after registerExampleSetting:", game.yzecore.activeSettingId, game.yzecore.getActiveSetting?.());
    }
  };

  // ✅ If initYZECoreAPI runs after ready, run immediately.
  // ✅ Otherwise, run on ready.
  if (game.ready) maybeEnableDevSetting();
  else Hooks.once("ready", maybeEnableDevSetting);

}

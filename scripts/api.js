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

  game.yzecore.buildDicePool = (actor, config = {}) => {
    if (!actor) {
      ui.notifications.error("YZE Core | buildDicePool: actor is required.");
      throw new Error("buildDicePool: actor is required");
    }

    const attributeId = config.attribute;
    const skillId = config.skill;
    const baseOverride = config.baseOverride;
    const modifiers = Array.isArray(config.modifiers) ? [...config.modifiers] : [];

    let attrValue = 0;
    let skillValue = 0;

    if (!Number.isFinite(baseOverride)) {
      if (!attributeId || typeof attributeId !== "string") {
        ui.notifications.error("YZE Core | buildDicePool: attribute is required.");
        throw new Error("buildDicePool: attribute is required");
      }

      const attrPath = `system.attributes.${attributeId}.value`;
      attrValue = foundry.utils.getProperty(actor, attrPath);
      if (typeof attrValue !== "number" || Number.isNaN(attrValue)) {
        ui.notifications.error(
          `YZE Core | buildDicePool: ${actor.name} is missing a numeric attribute value at ${attrPath}`
        );
        throw new Error(`buildDicePool: invalid attribute value at ${attrPath}`);
      }

      if (skillId) {
        const skillPath = `system.skills.${skillId}.value`;
        skillValue = foundry.utils.getProperty(actor, skillPath);
        if (typeof skillValue !== "number" || Number.isNaN(skillValue)) {
          ui.notifications.error(
            `YZE Core | buildDicePool: ${actor.name} is missing a numeric skill value at ${skillPath}`
          );
          throw new Error(`buildDicePool: invalid skill value at ${skillPath}`);
        }
      }
    }

    const base = Number.isFinite(baseOverride)
      ? Number(baseOverride)
      : Number(attrValue) + Number(skillValue);

    const dicePool = {
      base,
      modifiers,
      total: base,
      breakdown: ""
    };

    Hooks.call("yzeCoreBuildDicePool", actor, dicePool);

    const modifierTotal = (dicePool.modifiers ?? []).reduce((sum, mod) => {
      const value = Number(mod?.value ?? 0) || 0;
      return sum + value;
    }, 0);

    dicePool.total = Math.max(0, Number(dicePool.base ?? 0) + modifierTotal);

    const parts = [`Base ${Number(dicePool.base ?? 0)}`];
    for (const mod of dicePool.modifiers ?? []) {
      const value = Number(mod?.value ?? 0) || 0;
      if (!value) continue;
      const sign = value >= 0 ? "+" : "-";
      const label = mod?.source ? ` ${mod.source}` : "";
      parts.push(`${sign}${label} ${Math.abs(value)}`);
    }
    parts.push(`= ${dicePool.total}`);
    dicePool.breakdown = parts.join(" ");

    return dicePool;
  };

  game.yzecore.activateSetting = async id => {
    const setting = game.yzecore.settings?.[id];
    if (!setting) {
      ui.notifications.warn(`YZE Core | Setting not found: ${id}`);
      return null;
    }
    game.yzecore.activeSettingId = id;
    game.yzecore.config = setting;
    await game.settings.set("yze-core", "activeSettingId", id);
    Hooks.callAll("yzeCoreSettingActivated", { id, config: setting });
    return setting;
  };

  game.yzecore.deactivateSetting = async id => {
    const deactivatedId = id ?? game.yzecore.activeSettingId ?? null;
    game.yzecore.activeSettingId = null;
    game.yzecore.config = null;
    await game.settings.set("yze-core", "activeSettingId", "");
    Hooks.callAll("yzeCoreSettingDeactivated", { id: deactivatedId });
  };

  game.yzecore.initializeActor = async (actor, { overwrite = false } = {}) => {
    if (!actor) return null;
    const setting = game.yzecore.getActiveSetting?.();
    if (!setting) {
      ui.notifications.warn("YZE Core | initializeActor: no active setting.");
      return null;
    }

    const updateData = {};
    const setIfMissing = (path, value) => {
      const hasValue = foundry.utils.hasProperty(actor, path);
      if (overwrite || !hasValue) {
        foundry.utils.setProperty(updateData, path, value);
      }
    };

    for (const attr of setting.attributes ?? []) {
      const value = Number(attr.default ?? 0) || 0;
      setIfMissing(`system.attributes.${attr.id}.value`, value);
    }

    for (const skill of setting.skills ?? []) {
      const value = Number(skill.default ?? 0) || 0;
      setIfMissing(`system.skills.${skill.id}.value`, value);
    }

    const resources = setting.resources ?? {};
    for (const res of Object.values(resources)) {
      if (!res?.path) continue;
      const value = Number(res.default ?? 0) || 0;
      setIfMissing(res.path, value);
      if (res.maxPath) {
        const maxValue = Number(res.maxDefault ?? 0) || 0;
        setIfMissing(res.maxPath, maxValue);
      }
    }

    if (!Object.keys(updateData).length) return null;
    return actor.update(updateData);
  };

  game.yzecore.normalizeAllActors = async ({ overwrite = false } = {}) => {
    if (!game.user?.isGM) {
      ui.notifications.warn("YZE Core | normalizeAllActors: GM only.");
      return;
    }
    for (const actor of game.actors.contents) {
      await game.yzecore.initializeActor(actor, { overwrite });
    }
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

  game.settings.register("yze-core", "activeSettingId", {
    name: "Active Setting Id",
    hint: "Persisted active setting id.",
    scope: "world",
    config: false,
    type: String,
    default: ""
  });

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

  Hooks.once("ready", async () => {
    const persistedId = game.settings.get("yze-core", "activeSettingId") ?? "";
    if (persistedId) {
      if (game.yzecore.settings?.[persistedId]) {
        await game.yzecore.activateSetting(persistedId);
      } else {
        ui.notifications.warn(`YZE Core | Persisted setting not found: ${persistedId}`);
        await game.settings.set("yze-core", "activeSettingId", "");
      }
      return;
    }

    const alreadyActivated = game.settings.get("yze-core", "autoActivatedExampleSetting");
    if (!alreadyActivated) {
      await game.yzecore.activateSetting("example");
      await game.settings.set("yze-core", "autoActivatedExampleSetting", true);
    }
  });
}

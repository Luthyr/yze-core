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
    const actorModifiers = (actor.flags?.["yze-core"]?.modifiers ?? [])
      .filter(mod => mod?.enabled)
      .map(mod => ({
        source: mod.source ?? "Modifier",
        value: Number(mod.value ?? 0) || 0,
        type: "manual"
      }));

    const setting = game.yzecore.getActiveSetting?.() ?? null;
    const conditionDefs = Array.isArray(setting?.conditions) ? setting.conditions : [];
    const conditionFlags = actor.flags?.["yze-core"]?.conditions ?? {};
    const conditionModifiers = conditionDefs.flatMap(def => {
      if (!def?.id) return [];
      const state = conditionFlags?.[def.id] ?? {};
      const enabled = !!state.enabled;
      if (!enabled) return [];
      const stacks = Number(state.stacks ?? 1) || 1;
      const isStacking = !!def.stacks;
      const maxStacks = Number(def.maxStacks ?? 3) || 3;
      const clampedStacks = Math.max(1, Math.min(maxStacks, stacks));
      const mods = isStacking
        ? (Array.isArray(def.modifiersPerStack) ? def.modifiersPerStack : [])
        : (Array.isArray(def.modifiers) ? def.modifiers : []);
      const multiplier = isStacking ? clampedStacks : 1;
      const stackLabel = isStacking ? `(x${clampedStacks})` : "";
      return mods.map(mod => ({
        conditionId: def.id,
        source: def.name ?? def.id,
        value: (Number(mod?.value ?? 0) || 0) * multiplier,
        scope: mod?.scope ?? "all",
        attribute: mod?.attribute ?? "",
        skill: mod?.skill ?? "",
        stacks: isStacking ? clampedStacks : null,
        stackLabel,
        type: "condition"
      }));
    }).filter(mod => {
      if (mod.scope === "all") return true;
      if (mod.scope === "attribute") {
        return !!attributeId && mod.attribute === attributeId;
      }
      if (mod.scope === "skill") {
        return !!skillId && mod.skill === skillId;
      }
      return false;
    });

    const itemModifiers = (actor.items?.contents ?? [])
      .filter(item => item?.system?.equipped)
      .flatMap(item => {
        const mods = Array.isArray(item.system?.modifiers) ? item.system.modifiers : [];
        return mods.map(mod => ({
          source: (mod?.label && String(mod.label).trim()) ? String(mod.label) : item.name,
          value: Number(mod?.value ?? 0) || 0,
          scope: mod?.scope ?? "all",
          attribute: mod?.attribute ?? "",
          skill: mod?.skill ?? "",
          type: "item",
          itemType: item.type ?? "gear"
        }));
      })
      .filter(mod => {
        if (mod.scope === "all") return true;
      if (mod.scope === "attribute") {
        return !!attributeId && mod.attribute === attributeId;
      }
        if (mod.scope === "skill") {
          return !!skillId && mod.skill === skillId;
        }
        return false;
      });

    const configModifiers = Array.isArray(config.modifiers)
      ? config.modifiers.map(mod => ({
        ...mod,
        source: mod?.source ?? "Modifier",
        value: Number(mod?.value ?? 0) || 0,
        type: "config"
      }))
      : [];

    const modifiers = [
      ...actorModifiers,
      ...conditionModifiers,
      ...itemModifiers,
      ...configModifiers
    ];

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
    const grouped = new Map();
    const conditionTotals = new Map();
    for (const mod of dicePool.modifiers ?? []) {
      const value = Number(mod?.value ?? 0) || 0;
      if (!value) continue;
      const source = (mod?.source && String(mod.source).trim()) ? String(mod.source).trim() : "Modifier";
      const stacks = Number(mod?.stacks ?? 0) || 0;
      const stackLabel = (mod?.stackLabel && String(mod.stackLabel).trim())
        ? String(mod.stackLabel).trim()
        : (stacks ? `(x${stacks})` : "");
      const key = `${source}::${stackLabel}`;
      const entry = grouped.get(key) ?? { source, stacks, stackLabel, total: 0 };
      entry.total += value;
      grouped.set(key, entry);
      if (mod?.type === "condition") {
        const condKey = mod?.conditionId ?? source;
        const condEntry = conditionTotals.get(condKey) ?? 0;
        conditionTotals.set(condKey, condEntry + value);
      }
    }
    for (const entry of grouped.values()) {
      if (!entry.total) continue;
      const sign = entry.total >= 0 ? "+" : "-";
      const suffix = entry.stackLabel ? ` ${entry.stackLabel}` : "";
      parts.push(`${sign} ${entry.source}${suffix} ${Math.abs(entry.total)}`);
    }
    parts.push(`= ${dicePool.total}`);
    dicePool.breakdown = parts.join(" ");
    dicePool.conditionLines = conditionDefs
      .filter(def => {
        const state = conditionFlags?.[def.id] ?? {};
        return !!state.enabled;
      })
      .map(def => {
        const state = conditionFlags?.[def.id] ?? {};
        const stacks = Number(state.stacks ?? 1) || 1;
        const maxStacks = Number(def.maxStacks ?? 3) || 3;
        const clampedStacks = Math.max(1, Math.min(maxStacks, stacks));
        const total = Number(conditionTotals.get(def.id) ?? 0) || 0;
        if (!total) return null;
        const sign = total >= 0 ? "+" : "-";
        const stackLabel = def.stacks && clampedStacks > 1 ? ` (x${clampedStacks})` : "";
        return `${def.name ?? def.id}${stackLabel} ${sign}${Math.abs(total)}`;
      })
      .filter(Boolean);

    const formatTotals = totals => totals
      .map(({ source, total }) => {
        const sign = total >= 0 ? "+" : "-";
        return `${source} ${sign}${Math.abs(total)}`;
      })
      .join("; ");

    const groupBySource = mods => {
      const map = new Map();
      for (const mod of mods) {
        const value = Number(mod?.value ?? 0) || 0;
        if (!value) continue;
        const source = (mod?.source && String(mod.source).trim()) ? String(mod.source).trim() : "Modifier";
        map.set(source, (map.get(source) ?? 0) + value);
      }
      return Array.from(map.entries()).map(([source, total]) => ({ source, total }));
    };

    const gearTotals = groupBySource(
      (dicePool.modifiers ?? []).filter(mod => mod?.type === "item" && mod?.itemType === "gear")
    );
    const talentTotals = groupBySource(
      (dicePool.modifiers ?? []).filter(mod => mod?.type === "item" && mod?.itemType === "talent")
    );
    const genericTotals = groupBySource(
      (dicePool.modifiers ?? []).filter(mod => mod?.type === "manual" || mod?.type === "config")
    );

    const attrName = setting?.attributes?.find(a => a.id === attributeId)?.name ?? attributeId ?? "";
    const skillName = setting?.skills?.find(s => s.id === skillId)?.name ?? skillId ?? "";

    const summaryLines = [];
    if (attributeId) {
      summaryLines.push(`Attribute: ${attrName} ${Number(attrValue ?? 0)}`);
    }
    if (skillId) {
      summaryLines.push(`Skill: ${skillName} ${Number(skillValue ?? 0)}`);
    }
    if (gearTotals.length) {
      summaryLines.push(`Gear: ${formatTotals(gearTotals)}`);
    }
    if (talentTotals.length) {
      const label = talentTotals.length > 1 ? "Talents" : "Talent";
      summaryLines.push(`${label}: ${formatTotals(talentTotals)}`);
    }
    if (dicePool.conditionLines?.length) {
      const label = dicePool.conditionLines.length > 1 ? "Conditions" : "Condition";
      summaryLines.push(`${label}: ${dicePool.conditionLines.join(", ")}`);
    }
    if (genericTotals.length) {
      summaryLines.push(`Modifiers: ${formatTotals(genericTotals)}`);
    }

    dicePool.summaryLines = summaryLines;

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
    if (actor.type !== "character") return null;
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
  game.yzecore.getConditions = actor => {
    if (!actor) return [];
    const setting = game.yzecore.getActiveSetting?.() ?? null;
    const defs = Array.isArray(setting?.conditions) ? setting.conditions : [];
    const flags = actor.flags?.["yze-core"]?.conditions ?? {};
    return defs.map(def => {
      const state = flags?.[def.id] ?? {};
      const stacks = Number(state.stacks ?? 1) || 1;
      const maxStacks = Number(def.maxStacks ?? 3) || 3;
      return {
        ...def,
        enabled: !!state.enabled,
        stacks: Math.max(1, Math.min(maxStacks, stacks)),
        maxStacks
      };
    });
  };

  game.yzecore.setCondition = async (actor, id, enabled, stacks) => {
    if (!actor || !id) return null;
    const setting = game.yzecore.getActiveSetting?.() ?? null;
    const def = Array.isArray(setting?.conditions)
      ? setting.conditions.find(cond => cond.id === id)
      : null;
    const maxStacks = Number(def?.maxStacks ?? 3) || 3;
    const nextStacks = Number.isFinite(stacks)
      ? Math.max(1, Math.min(maxStacks, Number(stacks)))
      : 1;
    const conditions = foundry.utils.duplicate(actor.flags?.["yze-core"]?.conditions ?? {});
    conditions[id] = {
      enabled: !!enabled,
      stacks: nextStacks
    };
    return actor.update({ "flags.yze-core.conditions": conditions });
  };

  game.yzecore.toggleCondition = async (actor, id) => {
    if (!actor || !id) return null;
    const current = actor.flags?.["yze-core"]?.conditions?.[id];
    const enabled = !current?.enabled;
    const stacks = Number(current?.stacks ?? 1) || 1;
    return game.yzecore.setCondition(actor, id, enabled, stacks);
  };

  game.yzecore.adjustConditionStacks = async (actor, id, delta) => {
    if (!actor || !id) return null;
    const setting = game.yzecore.getActiveSetting?.() ?? null;
    const def = Array.isArray(setting?.conditions)
      ? setting.conditions.find(cond => cond.id === id)
      : null;
    const maxStacks = Number(def?.maxStacks ?? 3) || 3;
    const current = actor.flags?.["yze-core"]?.conditions?.[id];
    const enabled = !!current?.enabled;
    const stacks = Number(current?.stacks ?? 1) || 1;
    const next = Math.max(1, Math.min(maxStacks, stacks + Number(delta ?? 0)));
    return game.yzecore.setCondition(actor, id, enabled, next);
  };
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

  game.settings.register("yze-core", "migratedTalentEquipped", {
    name: "Migrated Talent Equipped",
    hint: "Internal marker to default existing talent items to equipped.",
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

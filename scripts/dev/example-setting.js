// scripts/dev/example-setting.js
import { ensureActorDefaults } from "../settings/init-actors.js";

export function registerExampleSetting() {
  if (!game?.yzecore) {
    console.warn("Example Setting | yze-core API not found.");
    return;
  }

  const settingConfig = {
    id: "example",
    name: "Example Setting",
    attributes: [
      { id: "str", name: "Strength" },
      { id: "agi", name: "Agility" },
      { id: "wits", name: "Wits" },
      { id: "emp", name: "Empathy" }
    ],
    skills: [
      { id: "melee", name: "Melee", attribute: "str" },
      { id: "stealth", name: "Stealth", attribute: "agi" }
    ],
    resources: {
      stress: { name: "Stress", path: "system.stress.value", maxPath: "system.stress.max" }
    }
  };

  game.yzecore.registerSetting(settingConfig);

  let activeConfig = null;

  Hooks.on("yzeCoreSettingActivated", async ({ id, config }) => {
    if (id !== "example") {
      activeConfig = null;
      return;
    }
    activeConfig = config;
    for (const actor of game.actors.contents) {
      await ensureActorDefaults(actor, config);
    }
  });

  Hooks.on("createActor", async actor => {
    if (!activeConfig) return;
    await ensureActorDefaults(actor, activeConfig);
  });

  Hooks.on("yzeCorePushedRoll", async ctx => {
    if (!ctx?.actor) return;
    if (game.yzecore.getActiveSetting()?.id !== "example") return;

    const stress = activeConfig?.resources?.stress;
    const valuePath = stress?.path ?? "system.stress.value";
    const maxPath = stress?.maxPath ?? "system.stress.max";
    const cur = Number(foundry.utils.getProperty(ctx.actor, valuePath) ?? 0) || 0;
    const max = Number(foundry.utils.getProperty(ctx.actor, maxPath) ?? 10) || 10;
    const next = Math.min(max, cur + 1);

    await ctx.actor.update({ [valuePath]: next, [maxPath]: max });
    ui.notifications.info(`Example Setting: ${ctx.actor.name} gains 1 Stress (${next}/${max}).`);
  });

  console.log("Example Setting | registered");
}

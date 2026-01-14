// YZE Example Setting module

function ensureStressOnActor(actor) {
  const hasValue = foundry.utils.getProperty(actor, "system.stress.value");
  const hasMax = foundry.utils.getProperty(actor, "system.stress.max");
  const updateData = {};

  if (typeof hasValue !== "number") updateData["system.stress.value"] = 0;
  if (typeof hasMax !== "number") updateData["system.stress.max"] = 10;

  if (Object.keys(updateData).length > 0) {
    return actor.update(updateData);
  }

  return null;
}

Hooks.once("ready", async () => {
  if (!game.yzecore) {
    ui.notifications.warn("YZE Example Setting | yze-core not found.");
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
      stress: {
        name: "Stress",
        path: "system.stress.value",
        maxPath: "system.stress.max"
      }
    }
  };

  try {
    game.yzecore.registerSetting(settingConfig);
    game.yzecore.activateSetting("example");
  } catch (error) {
    ui.notifications.error("YZE Example Setting | Failed to register setting.");
    return;
  }

  for (const actor of game.actors.contents) {
    await ensureStressOnActor(actor);
  }

  Hooks.on("createActor", async actor => {
    await ensureStressOnActor(actor);
  });

  Hooks.on("yzeCorePushedRoll", async ctx => {
    if (!ctx?.actor) return;

    const valuePath = "system.stress.value";
    const maxPath = "system.stress.max";
    const current = Number(foundry.utils.getProperty(ctx.actor, valuePath) ?? 0);
    const max = Number(foundry.utils.getProperty(ctx.actor, maxPath) ?? 10);
    const next = Math.min(current + 1, Number.isFinite(max) ? max : current + 1);

    await ctx.actor.update({ [valuePath]: next });
    ui.notifications.info(
      `Example Setting: ${ctx.actor.name} gains 1 Stress (now ${next}/${Number.isFinite(max) ? max : "-"}).`
    );
  });

  // Testing:
  // 1) Create an actor with str=3, melee=2.
  // 2) Run: await game.yzecore.rollSkill(actor, "str", "melee");
  // 3) Run: await game.yzecore.pushLastRoll();
  // 4) Observe stress increments and notification.
});

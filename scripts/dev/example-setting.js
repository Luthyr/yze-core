// scripts/dev/example-setting.js
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

  // Register + activate
  game.yzecore.registerSetting(settingConfig);
  game.yzecore.activateSetting("example");

  // Ensure stress on all existing actors
  for (const a of game.actors.contents) ensureStress(a);

  // Ensure stress on newly created actors
  Hooks.on("createActor", (a) => ensureStress(a));

  // Consequence on push: +1 stress
  Hooks.on("yzeCorePushedRoll", async (ctx) => {
    const a = ctx.actor;
    if (!a) return;

    const cur = Number(foundry.utils.getProperty(a, "system.stress.value") ?? 0) || 0;
    const max = Number(foundry.utils.getProperty(a, "system.stress.max") ?? 10) || 10;
    const next = Math.min(max, cur + 1);

    await a.update({ "system.stress.value": next, "system.stress.max": max });
    ui.notifications.info(`Example Setting: ${a.name} gains 1 Stress (${next}/${max}).`);
  });

  console.log("Example Setting | registered + active");
}

async function ensureStress(actor) {
  const hasVal = foundry.utils.hasProperty(actor, "system.stress.value");
  const hasMax = foundry.utils.hasProperty(actor, "system.stress.max");
  if (hasVal && hasMax) return;

  const update = {};
  if (!hasVal) update["system.stress.value"] = 0;
  if (!hasMax) update["system.stress.max"] = 10;
  await actor.update(update);
}

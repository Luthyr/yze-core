import { rollD6Pool } from "./dicepool.js";

export async function rollAttribute(actor, attrId, opts = {}) {
  if (!actor) {
    ui.notifications.error("YZE Core | Missing actor for roll.");
    throw new Error("Missing actor for roll.");
  }

  const attr = actor.system?.attributes?.[attrId];
  const value = attr?.value;
  if (!Number.isFinite(value) || value < 0) {
    ui.notifications.error(`YZE Core | Invalid attribute value for "${attrId}".`);
    throw new Error(`Invalid attribute value for "${attrId}".`);
  }

  const mod = Number(opts.mod ?? 0);
  const safeMod = Number.isNaN(mod) ? 0 : mod;
  const diceCount = Math.max(0, value + safeMod);

  const pool = await rollD6Pool(diceCount);

  const attrName = attr?.label ?? attrId;
  const title = opts.title ?? `${attrName} Roll`;

  const chatData = {
    title,
    actorName: actor.name ?? "Unknown Actor",
    diceCount,
    dice: pool.dice,
    successes: pool.successes
  };

  const content = await renderTemplate("templates/chat/roll-card.hbs", chatData);

  const rollState = {
    settingId: game.yzecore?.activeSettingId ?? null,
    actorUuid: actor.uuid,
    rollType: "attribute",
    title,
    pool: { attrId, diceCount, mod: safeMod },
    results: { dice: [...pool.dice], successes: pool.successes },
    pushed: false,
    createdAt: Date.now()
  };

  const message = await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor }),
    content,
    flags: {
      yzecore: { rollState }
    }
  });

  return { message, roll: pool.roll, rollState };
}

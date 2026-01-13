// scripts/rolls/attribute.js
import { rollD6Pool } from "./dicepool.js";

/**
 * Roll an attribute dice pool and post a chat card.
 * @param {Actor} actor
 * @param {string} attrId
 * @param {object} opts
 * @param {string} [opts.title]
 * @param {number} [opts.mod] - bonus/penalty dice
 * @returns {Promise<ChatMessage>}
 */
export async function rollAttribute(actor, attrId, opts = {}) {
  if (!actor) {
    ui.notifications.error("YZE Core | rollAttribute: actor is required.");
    throw new Error("rollAttribute: actor is required");
  }
  if (!attrId || typeof attrId !== "string") {
    ui.notifications.error("YZE Core | rollAttribute: attrId is required.");
    throw new Error("rollAttribute: attrId is required");
  }

  const attrPath = `system.attributes.${attrId}.value`;
  const attrValue = foundry.utils.getProperty(actor, attrPath);

  if (typeof attrValue !== "number" || Number.isNaN(attrValue)) {
    ui.notifications.error(
      `YZE Core | rollAttribute: ${actor.name} is missing a numeric attribute value at ${attrPath}`
    );
    throw new Error(`rollAttribute: invalid attribute value at ${attrPath}`);
  }

  const mod = Number(opts.mod ?? 0) || 0;
  const diceCount = Math.max(0, attrValue + mod);

  // Roll dice (async evaluate in v13)
  const rollResult = await rollD6Pool(diceCount);

  // Try to fetch attribute display name from active config (optional)
  const cfg = game.yzecore?.config;
  const attrName =
    cfg?.attributes?.find(a => a.id === attrId)?.name ??
    attrId.toUpperCase();

  const title = opts.title ?? `${attrName} Roll`;

  const templatePath = `systems/${game.system.id}/templates/chat/roll-card.hbs`;

  const templateData = {
    title,
    actorName: actor.name,
    attrId,
    attrName,
    diceCount,
    dice: rollResult.dice,
    successes: rollResult.successes
  };

  const html = await foundry.applications.handlebars.renderTemplate(
    templatePath,
    templateData
  );

  // Create the chat message
  const messageData = {
    user: game.user.id,
    speaker: ChatMessage.getSpeaker({ actor }),
    content: html,
    type: CONST.CHAT_MESSAGE_TYPES.ROLL,
    roll: rollResult.roll,
    flags: {
      yzecore: {
        rollState: {
          settingId: game.yzecore?.activeSettingId ?? null,
          actorUuid: actor.uuid,
          rollType: "attribute",
          title,
          pool: { attrId, diceCount, mod },
          results: { dice: [...rollResult.dice], successes: rollResult.successes },
          pushed: false,
          createdAt: Date.now()
        }
      }
    }
  };

  return ChatMessage.create(messageData);
}

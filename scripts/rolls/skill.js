// scripts/rolls/skill.js
/**
 * Roll an attribute + skill dice pool and post a chat card.
 * @param {Actor} actor
 * @param {string} attrId
 * @param {string} skillId
 * @param {object} opts
 * @param {string} [opts.title]
 * @param {number} [opts.mod] - bonus/penalty dice
 * @returns {Promise<ChatMessage>}
 */
import { buildRollSummary } from "./roll-summary.js";

export async function rollSkill(actor, attrId, skillId, opts = {}) {
  if (!actor) {
    ui.notifications.error("YZE Core | rollSkill: actor is required.");
    throw new Error("rollSkill: actor is required");
  }
  if (!attrId || typeof attrId !== "string") {
    ui.notifications.error("YZE Core | rollSkill: attrId must be a string.");
    throw new Error("rollSkill: attrId must be a string");
  }
  if (!skillId || typeof skillId !== "string") {
    ui.notifications.error("YZE Core | rollSkill: skillId must be a string.");
    throw new Error("rollSkill: skillId must be a string");
  }

  const attrPath = `system.attributes.${attrId}.value`;
  const skillPath = `system.skills.${skillId}.value`;
  const attrValue = foundry.utils.getProperty(actor, attrPath);
  const skillValue = foundry.utils.getProperty(actor, skillPath);

  if (typeof attrValue !== "number" || Number.isNaN(attrValue)) {
    ui.notifications.error(
      `YZE Core | rollSkill: ${actor.name} is missing a numeric attribute value at ${attrPath}`
    );
    throw new Error(`rollSkill: invalid attribute value at ${attrPath}`);
  }
  if (typeof skillValue !== "number" || Number.isNaN(skillValue)) {
    ui.notifications.error(
      `YZE Core | rollSkill: ${actor.name} is missing a numeric skill value at ${skillPath}`
    );
    throw new Error(`rollSkill: invalid skill value at ${skillPath}`);
  }

  const modifiers = Array.isArray(opts.modifiers) ? opts.modifiers : [];
  if (Number.isFinite(opts.mod)) {
    modifiers.push({ source: "Modifier", value: Number(opts.mod) });
  }
  const dicePool = game.yzecore.buildDicePool(actor, {
    attribute: attrId,
    skill: skillId,
    modifiers
  });
  const totalDice = dicePool.total;
  const modTotal = (dicePool.modifiers ?? []).reduce((sum, mod) => {
    const value = Number(mod?.value ?? 0) || 0;
    return sum + value;
  }, 0);

  const roll = await new Roll(`${totalDice}d6`).evaluate();
  const dice = roll.dice?.[0]?.results?.map(result => result.result) ?? [];
  const successes = dice.filter(value => value === 6).length;

  const attributeDice = dice.slice(0, attrValue);
  const skillDice = dice.slice(attrValue, attrValue + skillValue);
  const modDice = dice.slice(attrValue + skillValue);

  const cfg = game.yzecore?.config;
  const attrName =
    cfg?.attributes?.find(a => a.id === attrId)?.name ??
    attrId.toUpperCase();
  const skillName =
    cfg?.skills?.find(s => s.id === skillId)?.name ??
    skillId.toUpperCase();

  const title = opts.title ?? `${attrName}+${skillName} Roll`;

  const templatePath = `systems/${game.system.id}/templates/chat/skill-roll-card.hbs`;

  const rollState = {
    settingId: game.yzecore?.activeSettingId ?? null,
    authorId: game.user.id,
    actorUuid: actor.uuid,
    rollType: "skill",
    title,
    pool: {
      attrId,
      skillId,
      attrValue,
      skillValue,
      totalDice,
      mod: modTotal
    },
    dicePool,
    results: {
      attributeDice: [...attributeDice],
      skillDice: [...skillDice],
      modDice: [...modDice],
      dice: [...dice],
      successes
    },
    pushed: false,
    pushable: true,
    pushCount: 0,
    createdAt: Date.now()
  };

  const messageData = {
    user: game.user.id,
    speaker: ChatMessage.getSpeaker({ actor }),
    content: "",
    rolls: [roll],
    flags: {
      "yze-core": {
        rollState
      }
    }
  };

  const message = await ChatMessage.create(messageData);

  const templateData = {
    title,
    actorName: actor.name,
    attrId,
    attrName,
    attrValue,
    skillId,
    skillName,
    skillValue,
    mod: modTotal,
    totalDice,
    attributeDice,
    skillDice,
    modDice,
    successes,
    hasMod: (dicePool.modifiers ?? []).some(m => (Number(m?.value ?? 0) || 0) !== 0),
    pushed: false,
    messageId: message.id,
    rollState,
    dicePool
  };

  const html = await foundry.applications.handlebars.renderTemplate(
    templatePath,
    templateData
  );

  await message.update({ content: html });
  const summary = buildRollSummary(rollState, message.id);
  if (summary) await actor.setFlag("yze-core", "lastRoll", summary);
  return message;
}

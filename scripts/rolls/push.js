// scripts/rolls/push.js
import { buildRollSummary } from "./roll-summary.js";
/**
 * Push (reroll) a YZE roll message.
 * @param {ChatMessage|object} message
 * @param {object} opts
 * @returns {Promise<ChatMessage|null>}
 */
export async function pushRoll(message, opts = {}) {
  let targetMessage = message;
  if (!(message instanceof ChatMessage) && message?.id) {
    const found = game.messages?.get(message.id);
    if (found) targetMessage = found;
  }

  if (!targetMessage || !targetMessage.flags) {
    ui.notifications.error("YZE Core | pushRoll: message is required.");
    throw new Error("pushRoll: message is required");
  }

  const rollState = targetMessage.flags?.["yze-core"]?.rollState;
  if (!rollState) {
    ui.notifications.error("YZE Core | pushRoll: rollState not found.");
    throw new Error("pushRoll: rollState not found");
  }

  if (rollState.pushed) {
    ui.notifications.warn("YZE Core | This roll has already been pushed.");
    return null;
  }

  const prevRollState = foundry.utils.duplicate(rollState);
  const oldDice = rollState.results?.dice;
  const oldSuccesses = Number.isFinite(rollState.results?.successes)
    ? rollState.results.successes
    : Array.isArray(oldDice)
      ? oldDice.filter(value => value === 6).length
      : 0;
  if (!Array.isArray(oldDice) || !oldDice.every(n => typeof n === "number")) {
    ui.notifications.error("YZE Core | pushRoll: dice results are missing.");
    throw new Error("pushRoll: dice results are missing");
  }

  const rerollIndices = oldDice
    .map((value, index) => (value !== 6 ? index : -1))
    .filter(index => index >= 0);
  if (rerollIndices.length === 0) {
    ui.notifications.warn("YZE Core | No dice available to push.");
    return null;
  }

  const rerollCount = rerollIndices.length;
  const newRoll = await new Roll(`${rerollCount}d6`).evaluate();
  const newResults = newRoll.dice?.[0]?.results?.map(r => r.result) ?? [];

  const updatedDice = [...oldDice];
  rerollIndices.forEach((index, i) => {
    if (typeof newResults[i] === "number") updatedDice[index] = newResults[i];
  });

  const successes = updatedDice.filter(value => value === 6).length;
  const pushMeta = {
    rerolledIndices: [...rerollIndices],
    beforeDice: [...oldDice],
    afterDice: [...updatedDice]
  };

  let attributeDice = [];
  let skillDice = [];
  let modDice = [];

  if (rollState.rollType === "attribute") {
    const baseCount = Number(rollState.dicePool?.base);
    const totalCount = Number(rollState.dicePool?.total);

    if (
      Number.isFinite(baseCount) &&
      Number.isFinite(totalCount) &&
      baseCount >= 0 &&
      totalCount >= baseCount &&
      totalCount <= updatedDice.length
    ) {
      attributeDice = updatedDice.slice(0, baseCount);
      modDice = updatedDice.slice(baseCount);
    } else {
      attributeDice = [];
      skillDice = [];
      modDice = [];
    }
  } else if (rollState.rollType === "skill") {
    const attrValue = Number(rollState.pool?.attrValue);
    const skillValue = Number(rollState.pool?.skillValue);
    const splitCount = Number.isFinite(rollState.dicePool?.base)
      ? Number(rollState.dicePool.base)
      : attrValue + skillValue;

    if (
      Number.isFinite(attrValue) &&
      Number.isFinite(skillValue) &&
      attrValue >= 0 &&
      skillValue >= 0 &&
      splitCount <= updatedDice.length
    ) {
      attributeDice = updatedDice.slice(0, attrValue);
      skillDice = updatedDice.slice(attrValue, splitCount);
      modDice = updatedDice.slice(splitCount);
    } else {
      attributeDice = [];
      skillDice = [];
      modDice = [];
    }
  }

  const updatedRollState = foundry.utils.duplicate(rollState);
  updatedRollState.results = {
    ...updatedRollState.results,
    attributeDice: [...attributeDice],
    skillDice: [...skillDice],
    modDice: [...modDice],
    dice: [...updatedDice],
    successes
  };
  updatedRollState.pushed = true;
  updatedRollState.pushable = false;
  updatedRollState.pushCount = (updatedRollState.pushCount ?? 0) + 1;
  updatedRollState.push = pushMeta;
  updatedRollState.updatedAt = Date.now();

  const cfg = game.yzecore?.config;
  const actorName = targetMessage.speaker?.alias ?? "Unknown Actor";
  const title = updatedRollState.title ?? "YZE Roll";
  let templatePath = `systems/${game.system.id}/templates/chat/roll-card.hbs`;
  let templateData = {
    title,
    actorName,
    diceCount: updatedRollState.dicePool?.total ?? updatedDice.length,
    dice: updatedDice,
    successes,
    pushed: true,
    messageId: targetMessage.id,
    rollState: updatedRollState,
    dicePool: updatedRollState.dicePool
  };

  if (rollState.rollType === "skill") {
    const attrId = updatedRollState.pool?.attrId;
    const skillId = updatedRollState.pool?.skillId;
    const attrName =
      cfg?.attributes?.find(a => a.id === attrId)?.name ??
      String(attrId ?? "").toUpperCase();
    const skillName =
      cfg?.skills?.find(s => s.id === skillId)?.name ??
      String(skillId ?? "").toUpperCase();
    const mod = Number(updatedRollState.pool?.mod ?? 0) || 0;
    templatePath = `systems/${game.system.id}/templates/chat/skill-roll-card.hbs`;
    templateData = {
      title,
      actorName,
      attrId,
      attrName,
      attrValue: updatedRollState.pool?.attrValue ?? 0,
      skillId,
      skillName,
      skillValue: updatedRollState.pool?.skillValue ?? 0,
      mod,
      totalDice: updatedRollState.dicePool?.total ?? updatedDice.length,
      attributeDice,
      skillDice,
      modDice,
      successes,
      hasMod: (updatedRollState.dicePool?.modifiers ?? []).some(
        m => (Number(m?.value ?? 0) || 0) !== 0
      ),
      pushed: true,
      messageId: targetMessage.id,
      rollState: updatedRollState,
      dicePool: updatedRollState.dicePool
    };
  }

  const html = await foundry.applications.handlebars.renderTemplate(
    templatePath,
    templateData
  );

  const updatedMessage = await targetMessage.update({
    content: html,
    rolls: [newRoll],
    flags: { "yze-core": { rollState: updatedRollState } }
  });

  let actor = null;
  if (updatedRollState.actorUuid) {
    try {
      actor = await fromUuid(updatedRollState.actorUuid);
    } catch (error) {
      actor = null;
    }
    if (!actor) {
      ui.notifications.warn("YZE Core | pushRoll: actor could not be resolved.");
    }
  }

  if (actor) {
    const summary = buildRollSummary(updatedRollState, targetMessage.id);
    if (summary) await actor.setFlag("yze-core", "lastRoll", summary);
  }

  Hooks.callAll("yzeCorePushedRoll", {
    actor,
    message: updatedMessage ?? targetMessage,
    rollState: updatedRollState,
    roll: newRoll,
    previous: {
      rollState: prevRollState,
      dice: [...oldDice],
      successes: oldSuccesses
    }
  });

  return updatedMessage ?? targetMessage;
}

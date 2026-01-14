export function buildRollSummary(rollState, messageId) {
  if (!rollState) return null;

  const cfg = game.yzecore?.config;
  const rollType = rollState.rollType;
  const attrId = rollState.pool?.attrId;
  const skillId = rollState.pool?.skillId;

  let label = rollState.title ?? "YZE Roll";
  if (rollType === "attribute") {
    const attrName =
      cfg?.attributes?.find(a => a.id === attrId)?.name ??
      String(attrId ?? "").toUpperCase();
    label = attrName;
  } else if (rollType === "skill") {
    const attrName =
      cfg?.attributes?.find(a => a.id === attrId)?.name ??
      String(attrId ?? "").toUpperCase();
    const skillName =
      cfg?.skills?.find(s => s.id === skillId)?.name ??
      String(skillId ?? "").toUpperCase();
    label = `${skillName} (${attrName})`;
  }

  const dice = rollState.results?.dice ?? [];
  const banes = Array.isArray(dice)
    ? dice.filter(value => value === 1).length
    : 0;

  return {
    messageId: messageId ?? null,
    label,
    successes: rollState.results?.successes ?? 0,
    banes,
    pushed: !!rollState.pushed,
    pushCount: rollState.pushCount ?? (rollState.pushed ? 1 : 0),
    ts: rollState.updatedAt ?? rollState.createdAt ?? Date.now()
  };
}

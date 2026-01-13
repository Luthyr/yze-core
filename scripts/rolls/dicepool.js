export function rollD6Pool(count) {
  const safe = Math.max(0, Number(count) || 0);
  const roll = new Roll(`${safe}d6`).evaluateSync();

  // Foundry Roll terms -> results
  const dice = roll.dice?.[0]?.results?.map(r => r.result) ?? [];
  const successes = dice.filter(n => n === 6).length;

  return { count: safe, dice, successes, roll };
}

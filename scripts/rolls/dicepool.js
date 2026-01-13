export async function rollD6Pool(count) {
  const roll = await new Roll(`${count}d6`).evaluate({ async: true });
  const dice = roll.dice?.[0]?.results?.map((result) => result.result) ?? [];
  const successes = dice.filter((value) => value === 6).length;

  return {
    count,
    dice,
    successes,
    roll
  };
}

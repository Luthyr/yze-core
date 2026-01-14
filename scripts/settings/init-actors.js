// scripts/settings/init-actors.js
export async function ensureActorDefaults(actor, config) {
  if (!actor || !config) return null;

  const updateData = {};

  const attrObj = foundry.utils.getProperty(actor, "system.attributes");
  if (!attrObj) updateData["system.attributes"] = {};

  const skillObj = foundry.utils.getProperty(actor, "system.skills");
  if (!skillObj) updateData["system.skills"] = {};

  const resources = config.resources ?? {};
  for (const resource of Object.values(resources)) {
    if (!resource?.path) continue;
    const currentValue = foundry.utils.getProperty(actor, resource.path);
    if (currentValue === undefined) updateData[resource.path] = 0;

    if (resource.maxPath) {
      const currentMax = foundry.utils.getProperty(actor, resource.maxPath);
      if (currentMax === undefined) updateData[resource.maxPath] = 10;
    }
  }

  if (Object.keys(updateData).length === 0) return null;
  return actor.update(updateData);
}

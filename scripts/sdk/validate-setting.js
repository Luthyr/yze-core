export function validateSetting(config) {
  const errors = [];

  if (!config?.id) errors.push("Missing setting.id");
  if (!config?.name) errors.push("Missing setting.name");

  if (!Array.isArray(config.attributes)) {
    errors.push("attributes must be an array");
  }

  if (!Array.isArray(config.skills)) {
    errors.push("skills must be an array");
  }

  for (const attr of config.attributes ?? []) {
    if (!attr.id || !attr.name) {
      errors.push(`Attribute missing id or name: ${JSON.stringify(attr)}`);
    }
  }

  for (const skill of config.skills ?? []) {
    if (!skill.id || !skill.name || !skill.attribute) {
      errors.push(`Skill missing id/name/attribute: ${JSON.stringify(skill)}`);
    }
  }

  if (errors.length) {
    console.error("YZE Setting Validation Failed:", errors);
    throw new Error(`Invalid YZE Setting:\n- ${errors.join("\n- ")}`);
  }

  return true;
}

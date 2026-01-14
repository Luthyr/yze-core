export class YZECoreActorSheet extends ActorSheet {
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["yze-core", "sheet", "actor"],
      width: 600,
      height: 640,
      template: "systems/yze-core/templates/actor/actor-sheet.hbs"
    });
  }

  get template() {
    return "systems/yze-core/templates/actor/actor-sheet.hbs";
  }

  async getData(options = {}) {
    const data = await super.getData(options);
    const setting = game.yzecore?.getActiveSetting?.() ?? null;
    const actor = this.actor;

    const attributes = (setting?.attributes ?? []).map(attr => {
      const path = `system.attributes.${attr.id}.value`;
      const value = foundry.utils.getProperty(actor, path);
      return {
        ...attr,
        path,
        value: Number.isFinite(value) ? value : 0
      };
    });

    const skills = (setting?.skills ?? []).map(skill => {
      const path = `system.skills.${skill.id}.value`;
      const value = foundry.utils.getProperty(actor, path);
      const linkedAttrId = skill.attribute;
      const linkedAttrName =
        setting?.attributes?.find(a => a.id === linkedAttrId)?.name ?? linkedAttrId;
      return {
        ...skill,
        path,
        value: Number.isFinite(value) ? value : 0,
        linkedAttrName
      };
    });

    const resources = Object.entries(setting?.resources ?? {}).map(([id, resource]) => {
      const value = foundry.utils.getProperty(actor, resource.path);
      const max = resource.maxPath
        ? foundry.utils.getProperty(actor, resource.maxPath)
        : null;
      return {
        id,
        name: resource.name ?? id,
        path: resource.path,
        maxPath: resource.maxPath ?? null,
        value: Number.isFinite(value) ? value : 0,
        max: Number.isFinite(max) ? max : null
      };
    });

    return {
      ...data,
      setting,
      attributes,
      skills,
      resources
    };
  }

  activateListeners(html) {
    super.activateListeners(html);

    html.find("[data-roll-attr]").on("click", event => {
      event.preventDefault();
      const attrId = event.currentTarget.dataset.rollAttr;
      if (!attrId) return;
      game.yzecore?.rollAttribute?.(this.actor, attrId);
    });

    html.find("[data-roll-skill]").on("click", event => {
      event.preventDefault();
      const skillId = event.currentTarget.dataset.rollSkill;
      if (!skillId) return;

      const attrId =
        event.currentTarget.dataset.attrId ??
        game.yzecore
          ?.getActiveSetting?.()
          ?.skills?.find(s => s.id === skillId)?.attribute;

      if (!attrId) return;
      game.yzecore?.rollSkill?.(this.actor, attrId, skillId);
    });
  }
}

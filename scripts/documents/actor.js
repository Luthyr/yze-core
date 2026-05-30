export class YZECoreActor extends Actor {
  prepareDerivedData() {
    super.prepareDerivedData();

    const setting = game.yzecore?.getActiveSetting?.() ?? null;
    const prepareDerivedData = setting?.hooks?.prepareDerivedData;
    if (typeof prepareDerivedData !== "function") return;

    try {
      prepareDerivedData(this);
    } catch (error) {
      console.error("YZE Core | prepareDerivedData hook failed", {
        actor: this,
        setting,
        error
      });
    }
  }

  getRollData() {
    const data = foundry.utils.deepClone(this.system ?? {});
    const setting = game.yzecore?.getActiveSetting?.() ?? null;

    data.yze = {
      settingId: setting?.id ?? null,
      settingName: setting?.name ?? null
    };

    if (this.type === "character") {
      this._prepareCharacterRollData(data, setting);
    } else if (this.type === "npc") {
      this._prepareNpcRollData(data);
    }

    return data;
  }

  _prepareCharacterRollData(data, setting) {
    for (const attr of setting?.attributes ?? []) {
      const value = foundry.utils.getProperty(this, `system.attributes.${attr.id}.value`) ?? 0;
      data[attr.id] = {
        id: attr.id,
        label: attr.name,
        value
      };
    }

    for (const skill of setting?.skills ?? []) {
      const value = foundry.utils.getProperty(this, `system.skills.${skill.id}.value`) ?? 0;
      data[skill.id] = {
        id: skill.id,
        label: skill.name,
        attribute: skill.attribute,
        value
      };
    }
  }

  _prepareNpcRollData(data) {
    data.pools = Array.isArray(this.system?.pools)
      ? foundry.utils.deepClone(this.system.pools)
      : [];
  }
}

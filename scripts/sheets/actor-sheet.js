const { HandlebarsApplicationMixin } = foundry.applications.api;
const { ActorSheetV2 } = foundry.applications.sheets;

export class YZECoreActorSheetV2 extends HandlebarsApplicationMixin(ActorSheetV2) {
  static get DEFAULT_OPTIONS() {
    return foundry.utils.mergeObject(
      super.DEFAULT_OPTIONS,
      {
        classes: ["yze-core", "sheet", "actor"],
        position: { width: 860, height: 820 },
        window: { resizable: true, title: "YZE Core Actor" },

        // ? explicit permissions
        viewPermission: CONST.DOCUMENT_OWNERSHIP_LEVELS.LIMITED,
        editPermission: CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER
      },
      { inplace: false }
    );
  }

  // IMPORTANT: In AppV2 templates, do NOT wrap your part in a <form>.
  // DocumentSheetV2 provides the form shell; your template is the inside.
  static PARTS = {
    main: { template: "systems/yze-core/templates/actor/actor-sheet.hbs" },
    footer: { template: "templates/generic/form-footer.hbs" }
  };

  _attachPartListeners(partId, html) {
    super._attachPartListeners(partId, html);
    if (partId !== "main") return;
    const root = html instanceof HTMLElement ? html : html?.[0];
    if (!root) return;

    root.querySelectorAll("[data-action='rollAttr']").forEach(el => {
      el.addEventListener("click", event => this._onRollAttr(event));
    });

    root.querySelectorAll("[data-action='rollSkill']").forEach(el => {
      el.addEventListener("click", event => this._onRollSkill(event));
    });

    root.querySelectorAll("[data-action='addModifier']").forEach(el => {
      el.addEventListener("click", event => this._onAddModifier(event));
    });

    root.querySelectorAll("[data-action='removeModifier']").forEach(el => {
      el.addEventListener("click", event => this._onRemoveModifier(event));
    });

    root.querySelectorAll("[data-action='toggleModifier']").forEach(el => {
      el.addEventListener("change", event => this._onToggleModifier(event));
    });

    root.querySelectorAll("[data-action='editModifier']").forEach(el => {
      el.addEventListener("change", event => this._onEditModifier(event));
    });

    root.querySelectorAll("[data-action='toggleItemEquipped']").forEach(el => {
      el.addEventListener("change", event => this._onToggleItemEquipped(event));
    });

    root.querySelectorAll("[data-action='createItem']").forEach(el => {
      el.addEventListener("click", event => this._onCreateItem(event));
    });

    root.querySelectorAll("[data-action='createGear']").forEach(el => {
      el.addEventListener("click", event => this._onCreateItem(event, "gear"));
    });

    root.querySelectorAll("[data-action='createTalent']").forEach(el => {
      el.addEventListener("click", event => this._onCreateItem(event, "talent"));
    });

    root.querySelectorAll("[data-action='editItem']").forEach(el => {
      el.addEventListener("click", event => this._onEditItem(event));
    });

    root.querySelectorAll("[data-action='toggleCondition']").forEach(el => {
      el.addEventListener("change", event => this._onToggleCondition(event));
    });

    root.querySelectorAll("[data-action='adjustConditionStacks']").forEach(el => {
      el.addEventListener("click", event => this._onAdjustConditionStacks(event));
    });
  }

  _onRollAttr(event) {
    const attrId = event.currentTarget?.dataset?.attrId;
    if (!attrId) return;
    return game.yzecore.rollAttribute(this.document, attrId);
  }

  _onRollSkill(event) {
    const skillId = event.currentTarget?.dataset?.skillId;
    const attrId = event.currentTarget?.dataset?.attrId;
    if (!skillId || !attrId) return;
    return game.yzecore.rollSkill(this.document, attrId, skillId);
  }

  async _onAddModifier() {
    const modifiers = this.document.getFlag("yze-core", "modifiers") ?? [];
    const next = [
      ...modifiers,
      {
        id: foundry.utils.randomID(),
        source: "",
        value: 0,
        enabled: true
      }
    ];
    await this.document.update({ "flags.yze-core.modifiers": next });
  }

  async _onRemoveModifier(event) {
    const id = event.currentTarget?.dataset?.id;
    if (!id) return;
    const modifiers = this.document.getFlag("yze-core", "modifiers") ?? [];
    const next = modifiers.filter(mod => mod.id !== id);
    await this.document.update({ "flags.yze-core.modifiers": next });
  }

  async _onToggleModifier(event) {
    const id = event.currentTarget?.dataset?.id;
    if (!id) return;
    const modifiers = this.document.getFlag("yze-core", "modifiers") ?? [];
    const next = modifiers.map(mod => (
      mod.id === id
        ? { ...mod, enabled: !!event.currentTarget.checked }
        : mod
    ));
    await this.document.update({ "flags.yze-core.modifiers": next });
  }

  async _onEditModifier(event) {
    const id = event.currentTarget?.dataset?.id;
    const field = event.currentTarget?.dataset?.field;
    if (!id || !field) return;
    const value =
      field === "value"
        ? Number(event.currentTarget.value ?? 0) || 0
        : String(event.currentTarget.value ?? "");
    const modifiers = this.document.getFlag("yze-core", "modifiers") ?? [];
    const next = modifiers.map(mod => (
      mod.id === id
        ? { ...mod, [field]: value }
        : mod
    ));
    await this.document.update({ "flags.yze-core.modifiers": next });
  }

  async _onToggleItemEquipped(event) {
    const itemId = event.currentTarget?.dataset?.itemId;
    if (!itemId) return;
    const item = this.document.items?.get(itemId);
    if (!item) return;
    await item.update({ "system.equipped": !!event.currentTarget.checked });
  }

  async _onCreateItem(event, forcedType = null) {
    const itemTypes = game.system.documentTypes?.Item ?? [];
    const type = forcedType ?? itemTypes[0] ?? "gear";
    await this.document.createEmbeddedDocuments("Item", [
      { name: "New Item", type }
    ]);
  }

  async _onEditItem(event) {
    const itemId = event.currentTarget?.dataset?.itemId;
    if (!itemId) return;
    const item = this.document.items?.get(itemId);
    if (!item) return;
    item.sheet?.render(true);
  }

  async _onToggleCondition(event) {
    const id = event.currentTarget?.dataset?.id;
    if (!id) return;
    const enabled = !!event.currentTarget.checked;
    await game.yzecore.setCondition(this.document, id, enabled);
  }

  async _onAdjustConditionStacks(event) {
    const id = event.currentTarget?.dataset?.id;
    const delta = Number(event.currentTarget?.dataset?.delta ?? 0) || 0;
    if (!id || !delta) return;
    await game.yzecore.adjustConditionStacks(this.document, id, delta);
  }

  async _prepareContext(options) {
    const context = await super._prepareContext(options);

    // ? guarantee config exists or show a nicer error
    const active = game.yzecore.getActiveSetting?.() ?? null;
    context.yze = { activeSetting: active, hasActiveSetting: !!active };

    if (active) {
      context.attributesRendered = (active.attributes ?? []).map(a => ({
        ...a,
        value: foundry.utils.getProperty(this.document, `system.attributes.${a.id}.value`) ?? 0
      }));

      context.skillsRendered = (active.skills ?? []).map(s => ({
        ...s,
        value: foundry.utils.getProperty(this.document, `system.skills.${s.id}.value`) ?? 0
      }));

      const resObj = active.resources ?? {};
      context.resourcesRendered = Object.entries(resObj).map(([resId, res]) => ({
        resId,
        ...res,
        value: foundry.utils.getProperty(this.document, res.path) ?? 0,
        max: res.maxPath ? (foundry.utils.getProperty(this.document, res.maxPath) ?? 0) : null
      }));
    }

    // expose doc data (ActorSheetV2 already gives you document/system, but explicit is fine)
    context.actor = this.document;
    context.system = this.document.system;
    context.editable = this.isEditable || this.document.isOwner;
    context.lastRoll = this.document.getFlag("yze-core", "lastRoll") ?? null;
    context.modifiers = this.document.getFlag("yze-core", "modifiers") ?? [];
    const attrNameById = new Map(
      (context.attributesRendered ?? []).map(attr => [attr.id, attr.name])
    );
    const skillNameById = new Map(
      (context.skillsRendered ?? []).map(skill => [skill.id, skill.name])
    );
    const items = (this.document.items?.contents ?? []).map(item => {
      const modifiers = Array.isArray(item.system?.modifiers)
        ? item.system.modifiers
        : [];
      const modifierLabels = modifiers.map(mod => {
        const value = Number(mod?.value ?? 0) || 0;
        const sign = value >= 0 ? "+" : "-";
        const scope = String(mod?.scope ?? "all");
        if (scope === "attribute") {
          const attrName = attrNameById.get(mod?.attribute) ?? mod?.attribute ?? "Attribute";
          return `${sign}${Math.abs(value)} ${attrName}`;
        }
        if (scope === "skill") {
          const skillName = skillNameById.get(mod?.skill) ?? mod?.skill ?? "Skill";
          return `${sign}${Math.abs(value)} ${skillName}`;
        }
        return `${sign}${Math.abs(value)} All`;
      });
      return {
        id: item.id,
        name: item.name,
        type: item.type,
        equipped: !!item.system?.equipped,
        modifiers: modifierLabels
      };
    });
    context.items = items;
    context.gearItems = items.filter(item => item.type === "gear");
    context.talentItems = items.filter(item => item.type === "talent");
    context.conditions = game.yzecore.getConditions?.(this.document) ?? [];

    // form footer buttons
    context.buttons = [
      { type: "submit", icon: "fa-solid fa-save", label: "SETTINGS.Save" }
    ];

    return context;
  }
}

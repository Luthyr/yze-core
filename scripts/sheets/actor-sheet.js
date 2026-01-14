const { HandlebarsApplicationMixin } = foundry.applications.api;
const { ActorSheetV2 } = foundry.applications.sheets;

export class YZECoreActorSheetV2 extends HandlebarsApplicationMixin(ActorSheetV2) {
  static get DEFAULT_OPTIONS() {
    return foundry.utils.mergeObject(super.DEFAULT_OPTIONS, {
    classes: ["yze-core", "sheet", "actor"],
    position: { width: 720, height: 680 },
    window: { resizable: true, title: "YZE Core Actor" },

    // ✅ explicit permissions
    viewPermission: CONST.DOCUMENT_OWNERSHIP_LEVELS.LIMITED,
    editPermission: CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER
    });
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


  async _prepareContext(options) {
    const context = await super._prepareContext(options);

    // ✅ guarantee config exists or show a nicer error
  const active = game.yzecore.getActiveSetting?.() ?? null;
  console.log("YZE sheet ctx active:", !!active, active?.id);
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
    console.debug("YZE sheet editability", {
      user: game.user?.id,
      role: game.user?.role,
      actorIsOwner: this.document.isOwner,
      sheetIsEditable: this.isEditable,
      contextEditable: context.editable
    });

    // form footer buttons
    context.buttons = [
      { type: "submit", icon: "fa-solid fa-save", label: "SETTINGS.Save" }
    ];

    return context;
  }
}

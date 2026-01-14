const { HandlebarsApplicationMixin } = foundry.applications.api;
const { ActorSheetV2 } = foundry.applications.sheets;

export class YZECoreActorSheetV2 extends HandlebarsApplicationMixin(ActorSheetV2) {
  static DEFAULT_OPTIONS = {
    classes: ["yze-core", "sheet", "actor"],
    position: { width: 720, height: 680 },
    window: { resizable: true, title: "YZE Core Actor" }
  };

  // IMPORTANT: In AppV2 templates, do NOT wrap your part in a <form>.
  // DocumentSheetV2 provides the form shell; your template is the inside.
  static PARTS = {
    main: { template: "systems/yze-core/templates/actor/actor-sheet.hbs" },
    footer: { template: "templates/generic/form-footer.hbs" }
  };

  static actions = {
    rollAttr: async function (event) {
      const attrId = event.currentTarget?.dataset?.attrId;
      if (!attrId) return;
      return game.yzecore.rollAttribute(this.document, attrId);
    },
    rollSkill: async function (event) {
      const skillId = event.currentTarget?.dataset?.skillId;
      const attrId = event.currentTarget?.dataset?.attrId;
      if (!skillId || !attrId) return;
      return game.yzecore.rollSkill(this.document, attrId, skillId);
    }
  };


  async _prepareContext(options) {
    const context = await super._prepareContext(options);

    // ✅ guarantee config exists or show a nicer error
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
    context.resourcesRendered = Object.entries(resObj).map(([id, r]) => ({
      id,
      ...r,
      value: foundry.utils.getProperty(this.document, r.path) ?? 0,
      max: r.maxPath ? (foundry.utils.getProperty(this.document, r.maxPath) ?? 0) : null
    }));
  }

    // expose doc data (ActorSheetV2 already gives you document/system, but explicit is fine)
    context.actor = this.document;
    context.system = this.document.system;
    context.editable = this.isEditable;

    // form footer buttons
    context.buttons = [
      { type: "submit", icon: "fa-solid fa-save", label: "SETTINGS.Save" }
    ];

    return context;
  }
}

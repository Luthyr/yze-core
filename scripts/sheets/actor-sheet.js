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
    rollStr: async function () {
      // example: call your roller with this.document (Actor)
      // await game.yzecore.rollAttribute(this.document, "str");
      ui.notifications.info(`Roll STR for ${this.document.name} (wire me up)`);
    }
  };

  async _prepareContext(options) {
    const context = await super._prepareContext(options);

    // ✅ guarantee config exists or show a nicer error
    const active = game.yzecore.getActiveSetting();
    context.yze = {
      activeSetting: active,
      hasActiveSetting: !!active
    };

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

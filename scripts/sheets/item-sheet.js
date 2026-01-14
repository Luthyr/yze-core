const { HandlebarsApplicationMixin } = foundry.applications.api;
const { ItemSheetV2 } = foundry.applications.sheets;

export class YZECoreItemSheetV2 extends HandlebarsApplicationMixin(ItemSheetV2) {
  static DEFAULT_OPTIONS = {
    classes: ["yze-core", "sheet", "item"],
    position: { width: 520, height: 520 },
    window: { resizable: true, title: "YZE Core Item" }
  };

  static PARTS = {
    main: { template: "systems/yze-core/templates/item/item-sheet.hbs" },
    footer: { template: "templates/generic/form-footer.hbs" }
  };

  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    context.item = this.document;
    context.system = this.document.system;
    context.editable = this.isEditable;
    context.buttons = [
      { type: "submit", icon: "fa-solid fa-save", label: "SETTINGS.Save" }
    ];
    return context;
  }
}

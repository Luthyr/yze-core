export class YZECoreItemSheet extends ItemSheet {
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["yze-core", "sheet", "item"],
      width: 520,
      height: 480,
      template: "systems/yze-core/templates/item/item-sheet.hbs"
    });
  }

  get template() {
    return "systems/yze-core/templates/item/item-sheet.hbs";
  }

  async getData(options = {}) {
    const data = await super.getData(options);
    data.system = data.system ?? {};
    data.system.description = data.system.description ?? "";
    return data;
  }
}

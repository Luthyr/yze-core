const { HandlebarsApplicationMixin } = foundry.applications.api;
const { ItemSheetV2 } = foundry.applications.sheets;

export class YZECoreItemSheetV2 extends HandlebarsApplicationMixin(ItemSheetV2) {
  static DEFAULT_OPTIONS = {
    classes: ["yze-core", "sheet", "item"],
    position: { width: 620, height: 720 },
    window: { resizable: true, title: "YZE Core Item" }
  };

  static PARTS = {
    main: { template: "systems/yze-core/templates/item/item-sheet.hbs" },
    footer: { template: "templates/generic/form-footer.hbs" }
  };

  _attachPartListeners(partId, html) {
    super._attachPartListeners(partId, html);
    if (partId !== "main") return;
    const root = html instanceof HTMLElement ? html : html?.[0];
    if (!root) return;

    root.querySelectorAll("[data-action='toggleItemEquipped']").forEach(el => {
      el.addEventListener("change", event => this._onToggleEquipped(event));
    });

    root.querySelectorAll("[data-action='addItemModifier']").forEach(el => {
      el.addEventListener("click", event => this._onAddModifier(event));
    });

    root.querySelectorAll("[data-action='removeItemModifier']").forEach(el => {
      el.addEventListener("click", event => this._onRemoveModifier(event));
    });

    root.querySelectorAll("[data-action='editItemModifier']").forEach(el => {
      el.addEventListener("change", event => this._onEditModifier(event));
    });
  }

  async _onToggleEquipped(event) {
    await this.document.update({ "system.equipped": !!event.currentTarget.checked });
  }

  async _onAddModifier() {
    const modifiers = Array.isArray(this.document.system?.modifiers)
      ? this.document.system.modifiers
      : [];
    const next = [
      ...modifiers,
      {
        id: foundry.utils.randomID(),
        value: 0,
        scope: "all",
        attribute: "",
        skill: "",
        label: ""
      }
    ];
    await this.document.update({ "system.modifiers": next });
  }

  async _onRemoveModifier(event) {
    const id = event.currentTarget?.dataset?.id;
    if (!id) return;
    const modifiers = Array.isArray(this.document.system?.modifiers)
      ? this.document.system.modifiers
      : [];
    const next = modifiers.filter(mod => mod.id !== id);
    await this.document.update({ "system.modifiers": next });
  }

  async _onEditModifier(event) {
    const id = event.currentTarget?.dataset?.id;
    const field = event.currentTarget?.dataset?.field;
    if (!id || !field) return;
    const value =
      field === "value"
        ? Number(event.currentTarget.value ?? 0) || 0
        : String(event.currentTarget.value ?? "");
    const modifiers = Array.isArray(this.document.system?.modifiers)
      ? this.document.system.modifiers
      : [];
    const next = modifiers.map(mod => (
      mod.id === id
        ? { ...mod, [field]: value }
        : mod
    ));
    await this.document.update({ "system.modifiers": next });
  }

  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    const active = game.yzecore.getActiveSetting?.() ?? null;
    context.item = this.document;
    context.system = this.document.system;
    context.editable = this.isEditable;
    context.yze = { activeSetting: active, hasActiveSetting: !!active };
    context.attributeOptions = active?.attributes ?? [];
    context.skillOptions = active?.skills ?? [];
    context.modifiers = Array.isArray(this.document.system?.modifiers)
      ? this.document.system.modifiers
      : [];
    context.buttons = [
      { type: "submit", icon: "fa-solid fa-save", label: "SETTINGS.Save" }
    ];
    return context;
  }
}

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

export class YZESettingSwitcherV2 extends HandlebarsApplicationMixin(ApplicationV2) {
  static get DEFAULT_OPTIONS() {
    return foundry.utils.mergeObject(
      super.DEFAULT_OPTIONS,
      {
        classes: ["yze-core", "app", "setting-switcher"],
        position: { width: 420, height: "auto" },
        window: { resizable: true, title: "YZE Core — Setting Switcher" }
      },
      { inplace: false }
    );
  }

  static PARTS = {
    main: { template: "systems/yze-core/templates/dev/setting-switcher.hbs" }
  };

  _attachPartListeners(partId, html) {
    super._attachPartListeners(partId, html);
    if (partId !== "main") return;
    const root = html instanceof HTMLElement ? html : html?.[0];
    if (!root) return;

    root.querySelectorAll("[data-action='activate']").forEach(el => {
      el.addEventListener("click", event => this._onActivate(event));
    });

    root.querySelectorAll("[data-action='deactivate']").forEach(el => {
      el.addEventListener("click", event => this._onDeactivate(event));
    });
  }

  async _onActivate(event) {
    const id = event.currentTarget?.dataset?.id;
    if (!id) return;
    game.yzecore.activateSetting(id);
    this.render({ force: true });
  }

  async _onDeactivate(event) {
    const id = event.currentTarget?.dataset?.id;
    game.yzecore.activeSettingId = null;
    game.yzecore.config = null;
    Hooks.callAll("yzeCoreSettingDeactivated", { id });
    this.render({ force: true });
  }

  async _prepareContext(options) {
    const context = await super._prepareContext(options);

    const active = game.yzecore.getActiveSetting?.() ?? null;
    const settings = Object.values(game.yzecore.settings ?? {}).map(s => ({
      id: s.id,
      name: s.name ?? s.id,
      isActive: active?.id === s.id
    }));

    context.active = active
      ? { id: active.id, name: active.name ?? active.id }
      : null;
    context.settings = settings;
    context.isGM = game.user?.isGM ?? false;
    context.devExampleEnabled = game.settings.get("yze-core", "enableDevExampleSetting");

    return context;
  }
}

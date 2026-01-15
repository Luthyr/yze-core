const { HandlebarsApplicationMixin } = foundry.applications.api;
const { ActorSheetV2 } = foundry.applications.sheets;
import { rollD6Pool } from "../rolls/dicepool.js";

export class YZECoreNpcSheetV2 extends HandlebarsApplicationMixin(ActorSheetV2) {
  static get DEFAULT_OPTIONS() {
    return foundry.utils.mergeObject(
      super.DEFAULT_OPTIONS,
      {
        classes: ["yze-core", "sheet", "npc"],
        position: { width: 480, height: 640 },
        window: { resizable: true, title: "YZE Core NPC" },
        viewPermission: CONST.DOCUMENT_OWNERSHIP_LEVELS.LIMITED,
        editPermission: CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER
      },
      { inplace: false }
    );
  }

  static PARTS = {
    main: { template: "systems/yze-core/templates/actor/npc-sheet.hbs" },
    footer: { template: "templates/generic/form-footer.hbs" }
  };

  _attachPartListeners(partId, html) {
    super._attachPartListeners(partId, html);
    if (partId !== "main") return;
    const root = html instanceof HTMLElement ? html : html?.[0];
    if (!root) return;

    root.querySelectorAll("[data-action='addPool']").forEach(el => {
      el.addEventListener("click", event => this._onAddPool(event));
    });

    root.querySelectorAll("[data-action='removePool']").forEach(el => {
      el.addEventListener("click", event => this._onRemovePool(event));
    });

    root.querySelectorAll("[data-action='editPool']").forEach(el => {
      el.addEventListener("change", event => this._onEditPool(event));
    });

    root.querySelectorAll("[data-action='rollPool']").forEach(el => {
      el.addEventListener("click", event => this._onRollPool(event));
    });

    root.querySelectorAll("[data-action='pushPool']").forEach(el => {
      el.addEventListener("click", event => this._onPushPool(event));
    });
  }

  async _onAddPool() {
    if (!this.isEditable) return;
    const pools = Array.isArray(this.document.system?.pools)
      ? this.document.system.pools
      : [];
    const next = [
      ...pools,
      {
        id: foundry.utils.randomID(),
        name: "New Pool",
        dice: 1,
        canPush: false
      }
    ];
    await this.document.update({ "system.pools": next });
  }

  async _onRemovePool(event) {
    if (!this.isEditable) return;
    const id = event.currentTarget?.dataset?.id;
    if (!id) return;
    const pools = Array.isArray(this.document.system?.pools)
      ? this.document.system.pools
      : [];
    const next = pools.filter(pool => pool.id !== id);
    await this.document.update({ "system.pools": next });
  }

  async _onEditPool(event) {
    if (!this.isEditable) return;
    const id = event.currentTarget?.dataset?.id;
    const field = event.currentTarget?.dataset?.field;
    if (!id || !field) return;
    const value =
      field === "dice"
        ? Number(event.currentTarget.value ?? 0) || 0
        : field === "canPush"
          ? !!event.currentTarget.checked
          : String(event.currentTarget.value ?? "");
    const pools = Array.isArray(this.document.system?.pools)
      ? this.document.system.pools
      : [];
    const next = pools.map(pool => (
      pool.id === id
        ? { ...pool, [field]: value }
        : pool
    ));
    await this.document.update({ "system.pools": next });
  }

  async _onRollPool(event) {
    const id = event.currentTarget?.dataset?.id;
    if (!id) return;
    const pool = (this.document.system?.pools ?? []).find(p => p.id === id);
    if (!pool) return;
    await this._rollNpcPool(pool, { pushed: false });
  }

  async _onPushPool(event) {
    const id = event.currentTarget?.dataset?.id;
    if (!id) return;
    const pool = (this.document.system?.pools ?? []).find(p => p.id === id);
    if (!pool?.canPush) return;
    await this._rollNpcPool(pool, { pushed: true });
  }

  async _rollNpcPool(pool, { pushed } = {}) {
    const diceCount = Number(pool?.dice ?? 0) || 0;
    let roll;
    let dice = [];
    let successes = 0;
    let pushMeta = null;

    if (!pushed) {
      const result = await rollD6Pool(diceCount);
      roll = result.roll;
      dice = result.dice;
      successes = result.successes;
    } else {
      const last = this.document.getFlag("yze-core", "npcLastRolls")?.[pool.id];
      const oldDice = Array.isArray(last?.results?.dice) ? last.results.dice : null;
      if (!oldDice) {
        ui.notifications.warn("YZE Core | No previous NPC roll to push.");
        return;
      }
      const rerollIndices = oldDice
        .map((value, index) => (value !== 6 ? index : -1))
        .filter(index => index >= 0);
      if (!rerollIndices.length) {
        ui.notifications.warn("YZE Core | No dice available to push.");
        return;
      }
      const rerollCount = rerollIndices.length;
      roll = await new Roll(`${rerollCount}d6`).evaluate();
      const newResults = roll.dice?.[0]?.results?.map(r => r.result) ?? [];
      const updatedDice = [...oldDice];
      rerollIndices.forEach((index, i) => {
        if (typeof newResults[i] === "number") updatedDice[index] = newResults[i];
      });
      dice = updatedDice;
      successes = updatedDice.filter(value => value === 6).length;
      pushMeta = { rerolledIndices: [...rerollIndices] };
    }

    const rollState = {
      settingId: game.yzecore?.activeSettingId ?? null,
      authorId: game.user.id,
      actorUuid: this.document.uuid,
      rollType: "npc",
      pool: {
        id: pool.id,
        name: pool.name,
        dice: diceCount,
        canPush: !!pool.canPush
      },
      results: {
        dice: [...dice],
        successes
      },
      pushed: !!pushed,
      push: pushMeta,
      createdAt: Date.now()
    };

    const messageData = {
      user: game.user.id,
      speaker: ChatMessage.getSpeaker({ actor: this.document }),
      content: "",
      rolls: [roll],
      flags: {
        "yze-core": {
          rollState
        }
      }
    };

    const message = await ChatMessage.create(messageData);
    const templatePath = `systems/${game.system.id}/templates/chat/npc-roll-card.hbs`;
    const templateData = {
      actorName: this.document.name,
      poolName: pool.name,
      dice,
      successes,
      pushed: !!pushed,
      messageId: message.id,
      rollState
    };

    const html = await foundry.applications.handlebars.renderTemplate(
      templatePath,
      templateData
    );
    await message.update({ content: html });

    const existing = this.document.getFlag("yze-core", "npcLastRolls") ?? {};
    await this.document.setFlag("yze-core", "npcLastRolls", {
      ...existing,
      [pool.id]: rollState
    });
  }

  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    context.actor = this.document;
    context.system = this.document.system;
    context.editable = this.isEditable || this.document.isOwner;
    context.pools = Array.isArray(this.document.system?.pools)
      ? this.document.system.pools
      : [];
    context.buttons = [
      { type: "submit", icon: "fa-solid fa-save", label: "SETTINGS.Save" }
    ];
    return context;
  }
}

import { initYZECoreAPI } from "./api.js";
import { registerSheets } from "./sheets/register.js";
import { YZESettingSwitcherV2 } from "./dev/setting-switcher.js";

Hooks.once("init", () => {
  initYZECoreAPI();

  registerSheets();

  game.settings.registerMenu("yze-core", "settingSwitcher", {
    name: "YZE Core — Setting Switcher",
    label: "Open Setting Switcher",
    hint: "Developer tool to activate or deactivate YZE Core settings.",
    icon: "fa-solid fa-toggle-on",
    type: YZESettingSwitcherV2,
    restricted: true
  });
});

Hooks.once("ready", async () => {
  console.log("YZE Core | ready", { foundry: game.version, system: game.system.id });

  // Migrate legacy yzecore flags to yze-core scope (one-time best-effort)
  const migrated = game.settings.get("yze-core", "migratedLegacyFlags");
  if (!migrated) {
  for (const actor of game.actors.contents) {
    const legacy = actor.flags?.yzecore?.lastRoll;
    const current = actor.flags?.["yze-core"]?.lastRoll;
    if (legacy && !current) {
      await actor.update({ "flags.yze-core.lastRoll": legacy });
    }
  }

  for (const msg of game.messages.contents) {
    const legacy = msg.flags?.yzecore?.rollState;
    const current = msg.flags?.["yze-core"]?.rollState;
    if (legacy && !current) {
      await msg.update({ "flags.yze-core.rollState": legacy });
    }
  }
    await game.settings.set("yze-core", "migratedLegacyFlags", true);
  }
});

Hooks.on("yzeCoreSettingActivated", () => {
  // Re-render any open actor sheets so they pick up the new context
  for (const app of Object.values(ui.windows)) {
    if (app?.document instanceof Actor && app.rendered) {
      app.render({ force: true });
    } else if (app?.document instanceof Item && app.rendered) {
      app.render({ force: true });
    }
  }
});

Hooks.on("yzeCoreSettingDeactivated", () => {
  // Re-render any open actor sheets so they drop the old context
  for (const app of Object.values(ui.windows)) {
    if (app?.document instanceof Actor && app.rendered) {
      app.render({ force: true });
    } else if (app?.document instanceof Item && app.rendered) {
      app.render({ force: true });
    }
  }
});

Hooks.on("renderChatMessageHTML", (message, html) => {
  const root = html instanceof HTMLElement ? html : html?.[0];
  if (!root) return;

  root.querySelectorAll("button[data-action='yze-push']").forEach(button => {
    button.addEventListener("click", async event => {
      event.preventDefault();

      const msgId = event.currentTarget.dataset.messageId;
      const msg = game.messages.get(msgId);
      if (!msg) return ui.notifications.warn("YZE Core | Roll message not found.");

      // Must have rollState
      const rollState = msg.flags?.["yze-core"]?.rollState;
      if (!rollState) return ui.notifications.warn("YZE Core | No rollState on message.");

      // Optional: permission guard (only the roller or GM)
      const authorId = rollState.authorId ?? msg.author?.id;
      if (!(game.user.isGM || game.user.id === authorId)) {
        return ui.notifications.warn("You can only push your own rolls.");
      }

      try {
        await game.yzecore.pushRoll(msg);
      } catch (err) {
        console.error(err);
        ui.notifications.error(`YZE Core | Push failed: ${err.message ?? err}`);
      }
    });
  });
});

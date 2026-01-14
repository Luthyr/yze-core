import { initYZECoreAPI } from "./api.js";
import { registerSheets } from "./sheets/register.js";

Hooks.once("init", () => {
  registerSheets();
});

Hooks.once("ready", () => {
  initYZECoreAPI();
  console.log("YZE Core | ready", { foundry: game.version, system: game.system.id });
});

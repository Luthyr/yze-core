import { initYZECoreAPI } from "./api.js";

Hooks.once("ready", () => {
  initYZECoreAPI();
  console.log("YZE Core | ready", { foundry: game.version, system: game.system.id });
});

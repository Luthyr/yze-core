// scripts/api.js
export function initYZECoreAPI() {
  // Create the namespace once
  if (!game.yzecore) game.yzecore = {};

  // Fill in your API surface (example)
  game.yzecore.version = "0.1.0";
  game.yzecore.apiVersion = 1;

  // TODO: add registerSetting/activateSetting, etc.
}

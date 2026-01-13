import { initYZECoreAPI } from "./api.js";

Hooks.once("ready", () => {
  initYZECoreAPI();
  console.log("YZE Core | Ready");
});

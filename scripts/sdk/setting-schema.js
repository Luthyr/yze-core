export const YZESettingSchema = {
  id: "string",
  name: "string",

  attributes: "array",
  skills: "array",

  resources: "object", // optional but recommended

  hooks: {
    onRoll: "function?",
    onPush: "function?",
    prepareActorData: "function?"
  }
};

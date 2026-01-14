YZE Core — Setting Design Kit (SDK)

This document defines how to create a setting module that plugs into YZE Core.
A setting provides rules and structure; YZE Core provides behavior and UI.

If you follow this contract, your setting will:

validate on registration

render correctly in actor/item sheets

participate in rolls and pushes

hot-reload when enabled/disabled (no page reload)

1. What a Setting Is

A setting is a plain JavaScript object registered via:

game.yzecore.registerSetting(config);
game.yzecore.activateSetting(config.id);


Settings do not define sheets or systems.
They define:

attributes

skills

resources

optional behavior hooks

2. Required Fields
id (string)

Unique identifier for the setting.

id: "example"


Must be stable across versions.

name (string)

Human-readable name shown in sheets/debug UI.

name: "Example Setting"

attributes (array)

Defines base attributes.

attributes: [
  { id: "str", name: "Strength" },
  { id: "agi", name: "Agility" },
  { id: "wits", name: "Wits" }
]


Rules:

id must be unique

id must match actor data path:
system.attributes.<id>.value

skills (array)

Defines skills and their governing attribute.

skills: [
  { id: "melee", name: "Melee", attribute: "str" },
  { id: "stealth", name: "Stealth", attribute: "agi" }
]


Rules:

attribute must match an attribute id

Data path: system.skills.<id>.value

3. Optional Fields
resources (object)

Defines tracked resources (stress, health, ammo, etc.).

resources: {
  stress: {
    name: "Stress",
    path: "system.stress.value",
    maxPath: "system.stress.max"
  }
}


Rules:

path must be a valid actor data path

maxPath is optional

YZE Core will default missing values to 0

hooks (object)

Optional lifecycle and rules hooks.

hooks: { ... }


All hooks are optional.

4. Hooks API
onActivate({ setting })

Called when the setting becomes active.

Use for:

initialization

logging

dev-only helpers

onActivate({ setting }) {
  console.log("Activated setting:", setting.id);
}

onRoll({ actor, roll, context })

Called after a roll is constructed, before it is finalized.

Use for:

modifying dice

adding bonuses/penalties

tagging roll metadata

onRoll({ actor, roll }) {
  // Example: add a flat bonus
  roll.modifiers.push({ value: 1, label: "Situational Bonus" });
}

onPush({ actor, rollState })

Called when a roll is pushed.

Use for:

stress gain

conditions

corruption, panic, trauma

onPush({ actor }) {
  actor.update({
    "system.stress.value": actor.system.stress.value + 1
  });
}

prepareActorData(actor, updateData)

Called during actor updates.

Use for:

derived stats

clamping values

auto-initializing missing fields

prepareActorData(actor) {
  if (!actor.system.stress) {
    actor.system.stress = { value: 0, max: 10 };
  }
}

5. Validation Rules (Important)

All settings are validated at registration time.

If a setting is invalid:

registration throws an error

the setting is NOT added

the system continues running safely

Example failure:

game.yzecore.registerSetting({ id: "bad" });
// ❌ throws: attributes must be an array


This prevents broken settings from crashing sheets or rolls.

6. Example Minimal Setting
game.yzecore.registerSetting({
  id: "minimal",
  name: "Minimal YZE",

  attributes: [
    { id: "str", name: "Strength" }
  ],

  skills: [
    { id: "melee", name: "Melee", attribute: "str" }
  ],

  resources: {
    stress: {
      name: "Stress",
      path: "system.stress.value",
      maxPath: "system.stress.max"
    }
  },

  hooks: {
    onPush({ actor }) {
      actor.update({
        "system.stress.value": actor.system.stress.value + 1
      });
    }
  }
});

7. Best Practices

Never mutate Core logic from a setting

Never assume sheets exist — settings are data + rules only

Fail fast: validation errors are good

Keep hooks small and predictable

Prefer data paths, not hardcoded properties

8. What Settings Should NOT Do

Settings should NOT:

register sheets

override system behavior

assume a specific UI layout

depend on other settings

If you need that, you want a module, not a setting.

9. Mental Model

YZE Core is the engine.
Settings are rulebooks.

If you can swap rulebooks without changing the engine, the SDK is doing its job.
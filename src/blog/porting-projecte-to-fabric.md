---
title: Porting ProjectE to Fabric, and pricing every item in the game
date: 2026-10-17
summary: Standing in for the Forge APIs Fabric leaves out, and the exact-arithmetic solver that prices every item when a world loads.
---

Equivalent exchange is one of the oldest ideas in modded Minecraft. Every item has an EMC value; once you've learned an item, you can break other things down into EMC and pull that item back out. ProjectE is the version most people know. It's good and MIT-licensed, but it only runs on Forge and NeoForge.

Fabric, the other half of modern modding, had nothing like it. So I built [EternalExchange](https://eternalexchangemod.com), a Fabric-native spin-off of ProjectE for Minecraft 1.21.1, with ProjectE credited in the README and the LICENSE. Getting it working came down to two problems: replacing half the platform ProjectE expects, and pricing every item in a modpack without anyone typing values in by hand.

## Standing in for Forge

Forge ships a lot of machinery that mods build on: capabilities and attachments for hanging data off players and blocks, item handlers for inventories, a TOML config spec, fluid stacks, and an event bus. ProjectE uses all of it. Fabric leaves almost all of that out on purpose, giving you a small API and expecting you to bring the rest.

EternalExchange carries a 2,031-line compatibility layer that reimplements only the slice of Forge's surface the mod actually touches, so the rest of the codebase keeps roughly the shapes ProjectE uses. I took my cues for how to structure a port like this from Jarred Sumner's [port of Bun from Zig to Rust](https://github.com/oven-sh/bun/pull/30412).

A library only covers what lives outside vanilla Minecraft. Forge also fires events from inside vanilla methods, and Fabric doesn't fire most of them. To get those hooks back, the mod applies nine Mixins, small patches to vanilla classes at load time, plus an access widener for the vanilla internals it has to reach.

Networking had to be rebuilt on Fabric's `PayloadTypeRegistry`. Client-side receivers are installed later, from the client side, so the packet classes stay loadable on a dedicated server that has no client code for them to reference.

## Pricing every item at world load

ProjectE's best idea is that most values aren't written down. Give a few base items a value, and everything craftable gets one from its recipe. EternalExchange runs its own solver to do the same thing.

At server start, and again after every `/reload`, it walks the whole loaded recipe graph starting from a seed set of 209 values shipped as datapack JSON. Priced ingredients give a value to whatever they craft, which unlocks the recipes depending on that output, propagating outward until nothing else resolves. Because it reads the recipe graph that's actually loaded, other mods come along for free: add a mod with new recipes and its items have values the next time the world loads, without anyone writing a compatibility patch.

A recipe that turns one item into four splits its value four ways, and chains of recipes like that produce fractions nobody would choose on purpose. In floating point, rounding at every step piles up as values travel through the graph, so the solver uses `BigFraction` from Apache Commons Math instead, keeping a quarter an exact quarter all the way through.

If a computed value isn't the one you want, you can still override any item through `custom_emc.json`, a datapack, or the TOML config.

## Where it is

EternalExchange is at v1.0.0 pre-release under MIT, with CI building a 4.5 MB jar and attaching it to the release. It ships 86 items, 21 blocks, and 15 GUI screens, including the 104-slot alchemical bags. It's also save-compatible with the NeoForge original, so learned items, bags, and custom EMC carry over if you move a world across.

Original content beyond the classic set is on the roadmap, not in the jar yet.

The site is [eternalexchangemod.com](https://eternalexchangemod.com) and the source is on [GitHub](https://github.com/whoisaldo/EternalExchange).

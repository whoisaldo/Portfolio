---
title: Porting ProjectE to Fabric, and pricing every item in the game
date: 2026-10-17
summary: ProjectE leans on Forge features Fabric doesn't have. What it took to stand in for them, and the solver that prices every item when a world loads.
---

Equivalent exchange is one of the oldest ideas in modded Minecraft. Every item has a value called EMC. Once you've learned an item, you can break other things down into EMC and build that item back out of it. ProjectE is the version most people know. It's MIT-licensed, it's good, and it only runs on Forge and NeoForge.

Fabric, the other half of modern modding, had nothing like it. So I built [EternalExchange](https://eternalexchangemod.com), a Fabric-native spin-off of ProjectE for Minecraft 1.21.1, with ProjectE credited in the README and the LICENSE. This post is about the two parts that weren't copying: what to do when the platform is missing half of what the original assumes, and how to give every item in a modpack a value without anyone typing it in.

## Fabric isn't Forge with a different name

Porting between the two isn't a find-and-replace. Forge ships a lot of machinery that mods build on: capabilities and attachments for hanging data off players and blocks, item handlers for inventories, a TOML config spec, fluid stacks, an event bus. ProjectE uses all of it. Fabric leaves almost all of it out on purpose. It gives you a small API and expects you to bring the rest.

So before any alchemy worked, the alchemy needed something to stand on. EternalExchange carries its own compatibility layer, 2,031 lines at last count, that reimplements the parts of that surface the mod actually touches. The rest of the code keeps roughly the shapes ProjectE uses. My reference for how to approach a port like this was Jarred Sumner's [port of Bun from Zig to Rust](https://github.com/oven-sh/bun/pull/30412).

Some of it can't be a library, because it's about vanilla code doing something at the right moment. Forge fires events from inside vanilla methods. Fabric doesn't fire most of those, so the mod applies nine Mixins, small patches to vanilla classes at load time, plus an access widener for the vanilla internals it has to reach.

Networking was its own job. It's rebuilt on Fabric's `PayloadTypeRegistry`, and the client-side receivers are installed later, from the client side, so the packet classes stay loadable on a dedicated server, which has no client code for them to reference.

## Pricing every item at world load

ProjectE's best idea is that most values aren't written down. You give a few base items a value, and everything craftable gets one from its recipe. EternalExchange does the same with its own solver.

At server start, and again after every `/reload`, it walks the whole loaded recipe graph. It starts from a seed set, 209 values shipped as datapack JSON, and pushes values outward. An item made from priced ingredients gets a price, which lets the items made from it get one, and so on until nothing else can be priced.

Because it reads the recipe graph that is actually loaded, other mods come along for free. Add a mod with new recipes and its items have values the next time the world loads. Nobody writes a compatibility patch.

The arithmetic is exact. A recipe that turns one item into four splits its value four ways, and chains of recipes like that produce fractions nobody would choose on purpose. In floating point every step rounds a little, and the rounding piles up as values travel through the graph. The solver uses `BigFraction` from Apache Commons Math instead, so a quarter stays exactly a quarter all the way through.

Any value can still be overridden, through `custom_emc.json`, a datapack, or the TOML config, for when the computed value isn't the one you want.

## Where it is

EternalExchange is at v1.0.0 pre-release, under MIT. CI builds a 4.5 MB jar and attaches it to the release. It has 86 items, 21 blocks and 15 GUI screens, including the 104-slot alchemical bags. It's also save-compatible with the NeoForge original, so learned items, bags and custom EMC carry over if you move a world across.

Original content beyond the classic set is on the roadmap. It isn't in the jar yet, and I'd rather say that here than let a feature list suggest otherwise.

The site is [eternalexchangemod.com](https://eternalexchangemod.com) and the source is on [GitHub](https://github.com/whoisaldo/EternalExchange).

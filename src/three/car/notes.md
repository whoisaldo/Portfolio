# Audi S4 asset

The original procedural yellow car has been replaced by the user-supplied 2013 Audi S4, customized through Blender MCP from the owner's photos and specifications.

See [the source and rebuild notes](../../../design/audi-s4/README.md) for the editable Blender scene, modeling decisions, confirmed dimensions and remaining estimates.

Call `await preloadCar()` before `createObject()`. Both take a car, `"s4"` (the default) or `"s6"`; `cars` holds each one's URL, names, size, wheel radius and wheelbase. Until its GLB is built the S6's `cars.s6.unavailable` gives the reason, `preloadCar("s6")` rejects with it (error `code` `"car-unavailable"`) without fetching anything, and `createObject("s6")` throws it. The returned object exposes `userData.parts` with `wheel_fl`, `wheel_fr`, `wheel_rl`, `wheel_rr`, `steer_fl`, `steer_fr`, `body`, `headlights`, `taillights` and `hood_hinge`. Wheel groups spin about X; front steering pivots turn about Y. Forward is +Z and up is +Y.

`car.userData.setHoodProgress(value)` takes 0 for closed and 1 for open, rotates the hood and updates both telescoping strut segments (on the S6, both struts: the second set is suffixed `_r`). The Garage viewer animates this value only during an opening or closing transition. The intro uses the closed pose. `car.userData.setLowering(metres)` drops the body that far below its exported height over the fixed wheels, for the S6's Virtual Link stance; it does not clamp.

Each instance owns its geometry, materials and textures. Call `car.userData.dispose()` when removing it. The template remains cached for intro replay and Garage reopening; a failed download resets the cache for retry.

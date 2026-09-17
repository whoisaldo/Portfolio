# Audi S4 asset

The original procedural yellow car has been replaced by the user-supplied 2013 Audi S4, customized through Blender MCP from the owner's photos and specifications.

See [the source and rebuild notes](../../../design/audi-s4/README.md) for the editable Blender scene, modeling decisions, confirmed dimensions and remaining estimates.

Call `await preloadCar()` before `createObject()`. The returned object exposes `userData.parts` with `wheel_fl`, `wheel_fr`, `wheel_rl`, `wheel_rr`, `steer_fl`, `steer_fr`, `body`, `headlights`, `taillights` and `hood_hinge`. Wheel groups spin about X; front steering pivots turn about Y. Forward is +Z and up is +Y.

`car.userData.setHoodProgress(value)` takes 0 for closed and 1 for open, rotates the hood and updates both telescoping strut segments. The Garage viewer animates this value only during an opening or closing transition. The intro uses the closed pose.

Each instance owns its geometry, materials and textures. Call `car.userData.dispose()` when removing it. The template remains cached for intro replay and Garage reopening; a failed download resets the cache for retry.

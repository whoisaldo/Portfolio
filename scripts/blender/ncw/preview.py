from ncw.kit import *  # noqa: F401,F403 (the shared kit: primitives, materials, street constants)

# ---------------------------------------------------------------------------
# Preview only: sign words, a few lamps, the night. None of this exports.
# ---------------------------------------------------------------------------
# Its own font datablock, never one another scene loaded from the same file,
# and not packed: the words are a preview on this Mac, not part of the kit.
font = bpy.data.fonts.get(PREFIX + "preview_font")
if font is None:
    font = bpy.data.fonts.load("/System/Library/Fonts/Supplemental/Arial Unicode.ttf", check_existing=False)
    font.name = PREFIX + "preview_font"
for sid, text, (cx, cy, cz), w, h, yaw in SIGNS:
    data = bpy.data.curves.new(PREFIX + "txt_" + sid, "FONT")
    vertical = h > w * 1.6
    data.body = "\n".join(text) if vertical else text
    data.font = font
    data.align_x = "CENTER"
    data.align_y = "CENTER"
    data.size = min(w / max(1, len(text)) * 1.5, h * 0.7) if not vertical else min(w * 0.8, h / max(1, len(text)) * 0.9)
    data.space_line = 0.95
    obj = bpy.data.objects.new(PREFIX + "txt_" + sid, data)
    nx, nz = math.sin(yaw), math.cos(yaw)
    obj.location = P(cx + nx * 0.03, cy, cz + nz * 0.03)
    obj.rotation_euler = (math.pi / 2, 0, yaw)
    data.materials.append(MATS["neon_white"])
    link(obj, preview_coll)

world = bpy.data.worlds.new(PREFIX + "night")
world.use_nodes = True
bg = next(n for n in world.node_tree.nodes if n.type == "BACKGROUND")
bg.inputs["Color"].default_value = (*rgb("0b0a12"), 1)
bg.inputs["Strength"].default_value = 0.6
scene.world = world


def lamp(name, pos, hex_color, power, radius=0.5):
    data = bpy.data.lights.new(PREFIX + name, "POINT")
    data.color = rgb(hex_color)
    data.energy = power
    data.shadow_soft_size = radius
    obj = bpy.data.objects.new(PREFIX + name, data)
    obj.location = P(*pos)
    link(obj, preview_coll)


for i, (x, z, c) in enumerate(((-11, -16.5, "ff2e88"), (11.5, -28, "27dcf2"), (-11, -47, "2f6bff"), (11, -60, "ff003c"),
                               (-11, -80, "2ee6c8"), (11, -52, "27dcf2"), (0, -80, "2ee6c8"), (-11, -104, "ff3fd2"),
                               (11, -115, "ff2e88"), (0, -140, "ffb254"))):
    lamp(f"spill_{i}", (x, 5.0, z), c, 3500)
lamp("board_spill", (79.0, 20.0, -250.0), "fcee0a", 40000, 4.0)
lamp("garage_pink", (464.0, 3.0, -203.0), "ff278d", 2500)
lamp("garage_cyan", (464.0, 3.0, -227.0), "27dcf2", 2500)

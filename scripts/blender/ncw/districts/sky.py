from ncw.kit import *  # noqa: F401,F403 (the shared kit: primitives, materials, street constants)

# The moon: a huge disc over the southern skyline, which only the Contact
# shot looks at. The site maps the intro's own moon image onto it.
MOON = (760.0, 330.0, 440.0, 150.0)
mx, my, mz, mr = MOON
to_cam = Vector((458.0 - mx, 12.0 - my, -206.0 - mz)).normalized()
moon_yaw = math.atan2(to_cam.x, to_cam.z)
named_quad("moon_disc", "moon", mx, my, mz, mr * 2, mr * 2, moon_yaw, props={"district": "sky"})
empty("anchor_moon", (mx, my, mz), props={"radius": mr})

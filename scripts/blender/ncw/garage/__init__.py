"""The garage's prop kit: what a working Night City workshop is furnished with.

Every prop is a prototype of the city's own kind (ncw/props.py): built once
at the origin, its front toward +z, its base at y 0, in metres, through
`k(material)` batch keys in the kit's materials, so it renders in the city's
look with nothing of its own. Importing this package registers them all
(nothing is built until props.build_protos runs, as the city's own are);
a layout places them with props.place or the helpers beside each prop that
set down an assembly (a lift and its arms, a door and its tracks, a rack
and its tyres).

  shapes.py    the shapes the props are bent from, and their colours
  shop.py      lifts, jacks, the roll-up door and the man door
  bench.py     tool chests, the bench, the pegboard, lamps, tyres, air,
               oil, shelving, cable runs, the overhead lights, the tune cart
  lounge.py    the lounge corner, the dressing, the floor's marks, the
               shop's sign, its posters and its neon
  identity.py  the old Explore-garage room's signature pieces: David's
               jacket on its stool, Maine's arm cannon, Rebecca's Guts, the
               Adam Smasher frame, the braindance monitor, the amber bench
               strip and the pink and cyan wall tubes

The preview (scripts/blender/build_garage_props.py) lays every one out in
rows beside a scale figure and renders the contact sheet.
"""
from ncw.garage import shop, bench, lounge, identity  # noqa: F401 (each registers its prototypes)

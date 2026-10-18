"""What the builder writes beside the GLB, for the site and for later.

  props-source.json   every instanced prop (props.py): which prototype,
                      where, which way, how stretched; scripts/
                      optimize-world.mjs packs it per tier
  road-graph.json     the street network as a graph: junctions and street
                      ends as nodes, each run between them as an edge with
                      its centre line sampled a metre apart, its lanes (side,
                      direction, offset), its pavements and its speed; the
                      loop as the list of nodes it visits in order; the S4's
                      own road
  collision.json      boxes a car or a walker must not pass through:
                      building masses, kerbs, props, each with its district
  districts.json      each district's territory and label
  anchors.json        named places: every empty the kit sets down (the
                      page's cameras and anchors, the lamps, the set
                      pieces' marks), the loop's junctions by letter, each
                      district's centre, where a drive and a walk begin
                      (spawn_drive, spawn_walk) and the landmarks by name
                      (poi_*)

Unused by the page for now: they are for the drive, the walk and a richer
braindance (design/night-city-world/README.md, "Exports for later").
"""
import json
import math

from ncw import plan
from ncw import props as P
from ncw import buildings as B


def _r(v, n=2):
    return round(v, n)


DECK_ENDS = {"west": [plan.RAMP_FOOT_Z, plan.DECK_Z], "x120": [plan.DECK_Z]}


def road_graph():
    nodes = {}

    def node(x, z, kind):
        key = (_r(x, 1), _r(z, 1))
        if key not in nodes:
            nodes[key] = {"id": f"n{len(nodes)}", "x": key[0], "z": key[1], "kind": kind}
        return nodes[key]["id"]

    for p, names in plan.junctions().items():
        node(p[0], p[1], "junction")
    edges = []
    for s in plan.STREETS:
        # Every junction on the street, and its two ends, in order along it.
        stops = [s.a, s.b] + [(p[1] if s.axis == "z" else p[0]) for p, names in plan.junctions().items() if s.name in names]
        # The deck's two ends, where the loop leaves the west street and
        # comes down onto the x 120 road.
        stops += DECK_ENDS.get(s.name, [])
        stops = sorted(set(round(v, 3) for v in stops))
        for a, b in zip(stops, stops[1:]):
            pa = (s.c, a) if s.axis == "z" else (a, s.c)
            pb = (s.c, b) if s.axis == "z" else (b, s.c)
            ka = "deck" if a in DECK_ENDS.get(s.name, []) else "junction" if any(abs(pa[0] - q[0]) < 0.1 and abs(pa[1] - q[1]) < 0.1 for q in plan.junctions()) else s.ends.get("a" if a == s.a else "b", "end")
            kb = "deck" if b in DECK_ENDS.get(s.name, []) else "junction" if any(abs(pb[0] - q[0]) < 0.1 and abs(pb[1] - q[1]) < 0.1 for q in plan.junctions()) else s.ends.get("b" if b == s.b else "a", "end")
            n0, n1 = node(*pa, ka), node(*pb, kb)
            length = b - a
            pts = []
            steps = max(1, int(math.ceil(length)))
            for i in range(steps + 1):
                v = a + length * i / steps
                pts.append([_r(s.c if s.axis == "z" else v), 0.0, _r(v if s.axis == "z" else s.c)])
            lanes = []
            lane_w = (s.half - s.bay) / s.lanes
            for side in (-1, 1):
                for k in range(s.lanes):
                    # Driving on the right (Night City is in California):
                    # on a z street the +x lanes run north (toward -z, the
                    # edge's start), as the avenue's traffic does; on an x
                    # street the +z lanes run east (toward its end).
                    off = side * (lane_w * (k + 0.5))
                    forward = (side < 0) if s.axis == "z" else (side > 0)
                    lanes.append({"offset": _r(off), "toward": n1 if forward else n0, "width": _r(lane_w)})
            edges.append({
                "id": f"e{len(edges)}", "street": s.name, "from": n0, "to": n1, "length": _r(length),
                "points": pts, "lanes": lanes, "half": s.half, "bay": s.bay, "speed": s.speed,
                "pavements": [{"offset": _r(side * (s.half + 0.3 + s.walk / 2)), "width": _r(s.walk - 0.3)} for side in (-1, 1)],
                "district": plan.district_at((pa[0] + pb[0]) / 2, (pa[1] + pb[1]) / 2),
                "loop": s.loop,
            })
    # The ramp: up the middle of the west street going south, from grade at
    # RAMP_FOOT_Z to the deck's height at the turn (the service lanes either
    # side stay the west street's edges, at grade).
    r0, r1 = node(plan.DECK_X0, plan.RAMP_FOOT_Z, "deck"), node(plan.DECK_X0, plan.DECK_Z, "deck")
    ramp_len = plan.DECK_Z - plan.RAMP_FOOT_Z
    pts = []
    for i in range(int(ramp_len) + 1):
        z = plan.RAMP_FOOT_Z + i
        t = i / ramp_len
        pts.append([plan.DECK_X0, _r(plan.DECK_Y * t * t * (3 - 2 * t)), _r(z)])
    edges.append({"id": f"e{len(edges)}", "street": "ramp", "from": r0, "to": r1, "length": _r(ramp_len),
                  "points": pts, "lanes": [{"offset": 1.75, "toward": r0, "width": 3.5}, {"offset": -1.75, "toward": r1, "width": 3.5}],
                  "half": plan.RAMP_HALF, "bay": 0.0, "speed": 13.9, "pavements": [{"offset": -4.3, "width": 1.2}],
                  "district": "deck", "loop": True, "elevated": True})
    # The deck: from the top of the west street's ramp, over the avenue, down
    # to grade before the x 120 road. Its points carry their height.
    n0, n1 = node(plan.DECK_X0, plan.DECK_Z, "deck"), node(plan.DECK_X1, plan.DECK_Z, "deck")
    pts = []
    for i in range(int(plan.DECK_X1 - plan.DECK_X0) + 1):
        x = plan.DECK_X0 + i
        t = min(1.0, max(0.0, (x - plan.DECK_TOP_X1) / (plan.DECK_LAND_X - plan.DECK_TOP_X1)))
        y = plan.DECK_Y * (1.0 - t * t * (3 - 2 * t))
        pts.append([_r(x), _r(y), plan.DECK_Z])
    edges.append({"id": f"e{len(edges)}", "street": "deck", "from": n0, "to": n1, "length": _r(plan.DECK_X1 - plan.DECK_X0),
                  "points": pts, "lanes": [{"offset": -1.75, "toward": n0, "width": 3.5}, {"offset": 1.75, "toward": n1, "width": 3.5}],
                  "half": plan.DECK_HALF, "bay": 0.0, "speed": 13.9, "pavements": [{"offset": 4.3, "width": 1.2}],
                  "district": "deck", "loop": True, "elevated": True})
    by_xy = {(n["x"], n["z"]): n["id"] for n in nodes.values()}
    loop = [by_xy[(_r(x, 1), _r(z, 1))] for _, (x, z) in plan.LOOP if (_r(x, 1), _r(z, 1)) in by_xy]
    deck = {"z": plan.DECK_Z, "half": plan.DECK_HALF, "y": plan.DECK_Y, "x0": plan.DECK_X0, "x1": plan.DECK_X1,
            "level_to": plan.DECK_TOP_X1, "grade_from": plan.DECK_LAND_X, "ramp_foot_z": plan.RAMP_FOOT_Z}
    return {
        "frame": "world metres, +x east, +y up, +z south (toward the hero's lens)",
        "nodes": list(nodes.values()), "edges": edges,
        "loop": {"order": loop, "names": [n for n, _ in plan.LOOP], "deck": deck,
                 "note": "L to P climbs the ramp up the west street, P to Q runs on the deck (elevated over the avenue); the rest at grade"},
    }


def _props_table(protos, instances, districts):
    di = {d: k for k, d in enumerate(districts)}
    pi = {n: k for k, n in enumerate(protos)}
    return {
        "protos": [{"name": n, "box": list(P.PROTOS[n]["box"]), "detail": P.PROTOS[n]["detail"], "reach": P.PROTOS[n]["reach"]}
                   for n in protos],
        "districts": districts,
        "instances": [[pi[n], _r(x), _r(y), _r(z), _r(yaw, 4), _r(sy, 3), _r(sxz, 3), di[d]] for n, x, y, z, yaw, sy, sxz, d in instances],
    }


def write_all(out):
    from ncw.districts import garage_interior as GI
    # The workshop's props are a list of their own (garage-layout.json's
    # props_table), which streams with its pack: the city's list is the
    # city's, and the kit's prototypes are not in it.
    inside = [i for i in P.INSTANCES if i[7] in GI.SECTORS]
    city = [i for i in P.INSTANCES if i[7] not in GI.SECTORS]
    protos = [n for n in P.PROTOS if not n.startswith("garage_")]
    districts = [d for d, _, _ in plan.DISTRICTS] + ["far"]
    seen = sorted(set(i[7] for i in city) | set(districts))
    (out / "props-source.json").write_text(json.dumps(_props_table(protos, city, seen), separators=(",", ":")))
    used = {i[0] for i in inside}
    garage_protos = [n for n in P.PROTOS if n in used or (n.endswith(P.NEAR) and n[:-len(P.NEAR)] in used)]
    garage_props = _props_table(garage_protos, inside, list(GI.SECTORS))
    (out / "road-graph.json").write_text(json.dumps(road_graph(), separators=(",", ":")))
    boxes = []
    for kind, x0, x1, y0, y1, z0, z1, d in B.COLLISION:
        boxes.append({"min": [_r(x0), _r(y0), _r(z0)], "max": [_r(x1), _r(y1), _r(z1)], "district": d, "kind": "building"})
    for n, x, y, z, yaw, sy, sxz, d in P.INSTANCES:
        solids = P.PROTOS[n].get("solids")
        if solids is not None:
            # What of it stands in the way, in its own frame (ncw/garage's
            # lifts, doors and machines are mostly air inside their box;
            # an empty list is a floor mark): each box turned with it.
            c, s_ = math.cos(yaw), math.sin(yaw)
            for x0, x1, y0, y1, z0, z1 in solids:
                xs = [x + (ox * c + oz * s_) * sxz for ox in (x0, x1) for oz in (z0, z1)]
                zs = [z + (oz * c - ox * s_) * sxz for ox in (x0, x1) for oz in (z0, z1)]
                boxes.append({"min": [_r(min(xs)), _r(y + y0 * sy), _r(min(zs))], "max": [_r(max(xs)), _r(y + y1 * sy), _r(max(zs))],
                              "district": d, "kind": n})
            continue
        hx, hy, hz = P.PROTOS[n]["box"]
        if y > 1.0:
            continue  # on a roof or a wall: nothing a car or a walker meets
        c, s_ = abs(math.cos(yaw)), abs(math.sin(yaw))
        ex, ez = (hx * c + hz * s_) * sxz, (hx * s_ + hz * c) * sxz
        boxes.append({"min": [_r(x - ex), _r(y), _r(z - ez)], "max": [_r(x + ex), _r(y + 2 * hy * sy), _r(z + ez)], "district": d, "kind": n})
    # The workshop's walls, mezzanine, stair and lift, as a walker or a car
    # meets them (its overhead steel is for the cameras: garage-layout.json).
    for c in GI.COLLIDE:
        if c["nav"]:
            boxes.append({"min": c["min"], "max": c["max"], "district": GI.sector(*[(a + b) / 2 for a, b in zip(c["min"][::2], c["max"][::2])]),
                          "kind": "garage_" + c["name"]})
    (out / "collision.json").write_text(json.dumps({"frame": "world metres", "boxes": boxes}, separators=(",", ":")))
    layout = garage_layout(GI, inside)
    # The optimizer packs the workshop's props from here, as it does the
    # city's from props-source.json.
    layout["props_table"] = garage_props
    (out / "garage-layout.json").write_text(json.dumps(layout, indent=1))
    (out / "districts.json").write_text(json.dumps({
        "districts": [{"name": n, "label": label, "bounds": {"x0": b[0], "z0": b[1], "x1": b[2], "z1": b[3]}} for n, b, label in plan.DISTRICTS],
        "streets": [{"name": s.name, "axis": s.axis, "c": s.c, "from": s.a, "to": s.b, "half": s.half, "walk": s.walk,
                     "lanes": s.lanes, "bay": s.bay, "loop": s.loop} for s in plan.STREETS],
    }, indent=1))
    (out / "anchors.json").write_text(json.dumps(anchors(), indent=1))


def garage_layout(GI, inside):
    """The workshop for the site in one file: its sectors and portals, the
    cameras of its stations and poses (wide and portrait), the path graph
    (its routes, controls and gaze) and the default visit over the scroll
    (timeline), its lights, its boards, and what
    a camera and a walker must keep clear of (its own solids, and every
    placed prop's footprint as an oriented box)."""
    from ncw import cameras as C
    poses = {}
    for gid, *rest in C.GARAGE_STATIONS + [(g, None, *r) for g, *r in C.GARAGE_POSES]:
        (wpos, wtgt, wfov), (ppos, ptgt, pfov) = rest[-2], rest[-1]
        poses[gid] = {"wide": {"position": list(wpos), "target": list(wtgt), "fov": wfov},
                      "portrait": {"position": list(ppos), "target": list(ptgt), "fov": pfov},
                      "anchor": "cam_garage" if gid == "arrival" else f"cam_garage_{gid}",
                      **({"p": rest[0]} if rest[0] is not None else {}),
                      **({"cut_only": True} if gid.endswith("_cabin") else {})}

    def pt(g):
        return g if isinstance(g, str) else [_r(v, 3) for v in g]
    routes = {rid: {"from": a, "to": b, "controls": [pt(c) for c in ctrl],
                    "portrait": {f"{k:02d}": pt(v) for k, v in portrait.items()},
                    "gaze": [{"u": u, "at": pt(g), **({"portrait": {"u": own[0][0], "at": pt(own[0][1])}} if own else {})} for u, g, *own in gaze],
                    "anchors": [f"cam_garage_path_{rid}_{i:02d}" for i in range(1, len(ctrl) + 1)]}
              for rid, (a, b, ctrl, portrait, gaze) in C.GARAGE_ROUTES.items()}
    timeline = [{"p": [a, b], "route": r, "hold": at, "states": {k: [list(e) for e in v] for k, v in st.items()}}
                for a, b, r, at, st in C.GARAGE_ROUTE]
    props = []
    for n, x, y, z, yaw, sy, sxz, d in inside:
        hx, hy, hz = P.PROTOS[n]["box"]
        props.append({"proto": n, "at": [_r(x, 3), _r(y, 3), _r(z, 3)], "yaw": _r(yaw, 4), "half": [_r(hx * sxz, 3), _r(hy * sy, 3), _r(hz * sxz, 3)],
                      "sector": d})
    return {
        **GI.GARAGE,
        "note": "scripts/blender/ncw/districts/garage_interior.py and ncw/cameras.py write this; the site's own files are its readers",
        "stations": [g for g, *_ in C.GARAGE_STATIONS],
        "poses": poses,
        "nodes": {k: {"at": list(v), "anchor": f"anchor_garage_node_{k}"} for k, v in C.GARAGE_NODES.items()},
        "routes": routes,
        "timeline": timeline,
        "clearance": {"eye": 0.45, "near_plane": 0.15, "near": 0.1},
        "props": props,
    }


# What an empty's custom properties may carry that is a payload for the page
# (lanes, walks, lights, sign ids), not a description of the place.
_PAYLOAD = {"lanes", "walks", "lights", "ids", "cars", "paths", "stand", "faces"}


def anchors():
    import bpy
    out = []
    for o in sorted((o for o in bpy.data.objects if o.type == "EMPTY"), key=lambda o: o.name):
        # An empty's own location: the kit parents none of them, and their
        # matrix_world is still the identity at export (nearly every anchor
        # was written at 0, 0, 0).
        x, mz, y = o.location if o.parent is None else o.matrix_world.translation
        extras = {}
        for k in o.keys():
            if k in _PAYLOAD or k.startswith("_"):
                continue
            v = o[k]
            extras[k] = v if isinstance(v, (int, float, str)) else (list(v) if hasattr(v, "__len__") and len(v) < 16 else None)
        out.append({"name": o.name, "kind": o.name.split("_")[0], "at": [_r(x) + 0.0, _r(y) + 0.0, _r(-mz) + 0.0],
                    "yaw": _r(o.rotation_euler.z, 4), "district": plan.district_at(x, -mz),
                    **({"extras": {k: v for k, v in extras.items() if v is not None}} if extras else {})})
    junctions = [{"name": f"junction_{n}", "kind": "junction", "at": [x, 0.0, z], "district": plan.district_at(x, z)} for n, (x, z) in plan.LOOP]
    centres = [{"name": f"district_{n}", "kind": "district", "at": [_r((b[0] + b[2]) / 2), 0.0, _r((b[1] + b[3]) / 2)], "label": label}
               for n, b, label in plan.DISTRICTS]
    # Where a drive and a walk begin (the loop's start at A, heading north up
    # the avenue: yaw is the kit's, 0 facing +z and pi facing -z), and the
    # landmarks a map, a waypoint or a braindance mark would name.
    spawns = [
        {"name": "spawn_drive", "kind": "spawn", "at": [1.85, 0.0, -6.0], "yaw": _r(math.pi, 4), "district": "avenue",
         "note": "the avenue's inner northbound lane, facing north: the loop runs A B C L P Q F E I H"},
        {"name": "spawn_walk", "kind": "spawn", "at": [11.8, 0.16, -6.0], "yaw": _r(math.pi, 4), "district": "avenue",
         "note": "the middle of the avenue's east pavement, facing north"},
    ]
    pois = [{"name": f"poi_{n}", "kind": "poi", "at": [x, y, z], "district": plan.district_at(x, z), "label": label} for n, x, y, z, label in (
        ("hero_curb", 0.6, 0.0, 10.0, "where the page opens: the avenue, looking north"),
        ("deck_girder", 0.0, 8.5, -80.0, "the deck's girder over the avenue"),
        ("deck_turn", -80.0, 8.5, -80.0, "the deck's turn off the ramp"),
        ("deck_stair", -65.2, 0.16, -74.5, "the stair's foot, west street's east pavement, up to the deck's walkway"),
        ("arasaka", 75.0, 0.0, -490.0, "ARASAKA's tower and forecourt"),
        ("megabuilding", 0.0, 0.0, -760.0, "the megabuilding at the canyon's end"),
        ("japantown_gate", -80.0, 0.0, -696.0, "the red gate over the west street"),
        ("plaza_hub", 70.0, 0.0, -234.0, "Corpo Plaza's sunken hub, under the koi"),
        ("plaza_board", 79.0, 26.0, -263.0, "the plaza's main board"),
        ("corpo_row", 280.0, 0.0, -330.0, "the boulevard under Corpo Row's towers"),
        ("corpo_track", 246.0, 19.0, -378.5, "the halt on Corpo Row's elevated track"),
        ("afterlife", 432.0, 0.0, -281.0, "AFTERLIFE's door"),
        ("rooftop", 468.0, 34.0, -279.0, "the rooftop over the garage street"),
        ("garage", 462.0, 0.0, -215.0, "the garage's bay"),
        ("tank_farm", 300.0, 0.0, -88.0, "Santo Domingo's estate cross, by the tank farm"),
    )]
    return {"frame": "world metres, +x east, +y up, +z south (toward the hero's lens)",
            "note": "unused by the page for now: for the drive, the walk and a richer braindance",
            "anchors": out + junctions + centres + spawns + pois}

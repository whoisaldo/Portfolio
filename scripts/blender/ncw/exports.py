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
                  "half": plan.RAMP_HALF, "bay": 0.0, "speed": 13.9, "pavements": [],
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
                 "note": "P to Q runs on the deck (elevated over the avenue); the rest at grade"},
    }


def write_all(out):
    protos = list(P.PROTOS)
    districts = [d for d, _, _ in plan.DISTRICTS] + ["far"]
    seen = sorted(set(i[7] for i in P.INSTANCES) | set(districts))
    di = {d: k for k, d in enumerate(seen)}
    pi = {n: k for k, n in enumerate(protos)}
    props = {
        "protos": [{"name": n, "box": list(P.PROTOS[n]["box"]), "detail": P.PROTOS[n]["detail"], "reach": P.PROTOS[n]["reach"]}
                   for n in protos],
        "districts": seen,
        "instances": [[pi[n], _r(x), _r(y), _r(z), _r(yaw, 4), _r(sy, 3), _r(sxz, 3), di[d]] for n, x, y, z, yaw, sy, sxz, d in P.INSTANCES],
    }
    (out / "props-source.json").write_text(json.dumps(props, separators=(",", ":")))
    (out / "road-graph.json").write_text(json.dumps(road_graph(), separators=(",", ":")))
    boxes = []
    for kind, x0, x1, y0, y1, z0, z1, d in B.COLLISION:
        boxes.append({"min": [_r(x0), _r(y0), _r(z0)], "max": [_r(x1), _r(y1), _r(z1)], "district": d, "kind": "building"})
    for n, x, y, z, yaw, sy, sxz, d in P.INSTANCES:
        hx, hy, hz = P.PROTOS[n]["box"]
        if y > 1.0:
            continue  # on a roof or a wall: nothing a car or a walker meets
        c, s_ = abs(math.cos(yaw)), abs(math.sin(yaw))
        ex, ez = (hx * c + hz * s_) * sxz, (hx * s_ + hz * c) * sxz
        boxes.append({"min": [_r(x - ex), _r(y), _r(z - ez)], "max": [_r(x + ex), _r(y + 2 * hy * sy), _r(z + ez)], "district": d, "kind": n})
    (out / "collision.json").write_text(json.dumps({"frame": "world metres", "boxes": boxes}, separators=(",", ":")))
    (out / "districts.json").write_text(json.dumps({
        "districts": [{"name": n, "label": label, "bounds": {"x0": b[0], "z0": b[1], "x1": b[2], "z1": b[3]}} for n, b, label in plan.DISTRICTS],
        "streets": [{"name": s.name, "axis": s.axis, "c": s.c, "from": s.a, "to": s.b, "half": s.half, "walk": s.walk,
                     "lanes": s.lanes, "bay": s.bay, "loop": s.loop} for s in plan.STREETS],
    }, indent=1))

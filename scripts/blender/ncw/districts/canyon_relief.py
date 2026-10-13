"""What stands out of a canyon wall between its signs (ARL_JWwKdDs@22,
ax5YUmkWf_Y@131): balconies with their rails and pots, air conditioners
under windows, small lit boards, conduits up the face. Seen from a crossing,
a lookout or a flying car a face was a plain grid of windows.

Everything here is proud of a face the hero's lens sees at a glance, so it
stands only where the line from the lens through it runs on into the
canyon's own walls (under the lower of the face's two neighbours' roofs,
clear of the face's ends), and only on the lot line's plain floors.
"""
import math

from ncw.kit import *  # noqa: F401,F403
from ncw import buildings as B
from ncw import props as P
from ncw.districts import canyon_kit as C
from ncw.districts import canyon_mass as M
from ncw.districts.canyon_kit import CB, fl

POT = (0.03, 0.06, 0.035, 1)


@P.proto("cy_balc", box=(1.3, 0.6, 0.5), reach=380, detail=True)
def _cy_balc(k):
    """A balcony 2.6 m wide off a wall (its back at z 0, out toward +z): a
    slab with its edge, a rail of bars, a pot with a plant, a stool, a lamp
    over the door."""
    box(k("trim"), -1.3, 1.3, -0.16, 0.0, 0.0, 0.95, scale=1.0, col=(0.05, 0.055, 0.07, 1), bottom=True)
    box(k("metal"), -1.3, 1.3, 0.98, 1.03, 0.9, 0.95, scale=0.5)
    for x0, x1, z0, z1 in ((-1.3, -1.26, 0.0, 0.95), (1.26, 1.3, 0.0, 0.95)):
        box(k("metal"), x0, x1, 0.98, 1.03, z0, z1, scale=0.5)
    x = -1.2
    while x < 1.25:
        box(k("metal"), x - 0.015, x + 0.015, 0.0, 0.98, 0.91, 0.94, scale=0.5)
        x += 0.24
    box(k("trim"), 0.55, 0.95, 0.0, 0.4, 0.15, 0.5, scale=1.0, col=(0.09, 0.05, 0.04, 1))
    box(k("trim"), 0.5, 1.0, 0.4, 0.95, 0.12, 0.55, scale=1.0, col=POT)
    cylinder(k("metal"), -0.6, 0.45, 0.0, 0.45, 0.03, segs=4, cap=False)
    cylinder(k("trim"), -0.6, 0.45, 0.45, 0.5, 0.17, segs=7, col=(0.2, 0.06, 0.05, 1))
    box(k("glow"), -0.08, 0.08, 2.35, 2.45, 0.02, 0.1, scale=0.5, col=GLOW["amber"])


@P.proto("cy_acpair", box=(0.5, 0.8, 0.35), reach=300, detail=True)
def _cy_acpair(k):
    """Two air conditioners on a bracket one over the other (back at z 0),
    a drip pipe down from them."""
    for y in (0.0, 0.72):
        box(k("trim"), -0.45, 0.45, y, y + 0.6, 0.06, 0.6, scale=0.6, col=(0.32, 0.33, 0.34, 1))
        quad(k("trim"), (-0.35, y + 0.08, 0.605), (0.15, y + 0.08, 0.605), (0.15, y + 0.52, 0.605), (-0.35, y + 0.52, 0.605), col=(0.02, 0.02, 0.025, 1))
    box(k("metal"), -0.5, 0.5, -0.06, 0.0, 0.0, 0.62, scale=0.5)
    cylinder(k("metal"), 0.38, 0.1, -1.4, 0.0, 0.02, segs=4, cap=False)


def _safe_top(U, rows):
    """How high on a unit's street face things may stand proud of it: under
    the roofs of the faces on either side of it along the row (where the
    line from the hero's lens through them runs on into a wall)."""
    L, h = U["lot"], U["h"]
    hs = [h]
    for N in rows:
        if N is not L and (abs(N["z1"] - L["z0"]) < 6.0 or abs(N["z0"] - L["z1"]) < 6.0):
            hs.append(N["h"])
    return min(hs) - 4.0


def _spot(U, s0, s1, y0, y1):
    """How far proud of the lot line the face stands behind a rectangle, if
    it is one plane there (not across a tier's edge, a cut into the face or
    a service floor), else None."""
    for q in U["holes"]:
        if q["s0"] - 0.3 < s1 and q["s1"] + 0.3 > s0 and q["y0"] - 0.3 < y1 and q["y1"] + 0.3 > y0:
            return None
    for z in U["zones"]:
        if z["kind"] == "svc" and z["y0"] - 0.1 < y1 and z["y1"] + 0.1 > y0:
            return None
    om = M.off(U, s0, s1, y0, y1)
    if M.off(U, s0, s0 + 0.1, y0, y1) != om or M.off(U, s1 - 0.1, s1, y0, y1) != om:
        return None
    if any(p["y0"] - 0.4 < y1 and p["y0"] + 0.4 > y0 or p["y1"] - 0.4 < y1 and p["y1"] + 0.4 > y0
           for p in U["proud"] if p["s0"] < s1 and p["s1"] > s0):
        return None
    return om


def street(U, taken, rows, r):
    """Balconies, pairs of air conditioners, small lit boards and conduits
    over a tower's street face, bay by bay and floor by floor, clear of its
    signs (`taken`), its tiers' edges and its cuts."""
    L = U["lot"]
    st, ph, h = U["st"], L["ph"], U["h"]
    w = st.width
    bays = max(1, round(w / CELL_W))
    bw = w / bays
    top = _safe_top(U, rows)
    tcol = B.TRIM[U["tint"]]
    k0, k1 = int((ph - SHOP_H) / CELL_H) + 2, int((min(top, h - 4.0) - SHOP_H) / CELL_H)
    edge = [(p["s0"], p["s1"]) for p in U["proud"]]
    n = 0
    for k in range(k0, k1):
        y = fl(k)
        for b in range(1, bays - 1):
            s = (b + 0.5) * bw + r.uniform(-0.3, 0.3)
            roll = r.random()
            if roll < 0.15:
                rect = (s - 1.45, s + 1.45, y - 0.3, y + 2.6)
                base = _spot(U, *rect)
                # (A balcony only off the lot line's own face: off a tier it
                # would stand further out than the hero's picture allows.)
                if base == 0.0 and M._free(taken, rect, pad=0.2):
                    taken.append(rect)
                    x, _, z = st.p(st.at(s), 0.0, 0.0)
                    P.place("cy_balc", x, y, z, st.yaw, district=CB)
                    n += 1
            elif roll < 0.44:
                rect = (s - 0.55, s + 0.55, y - 1.5, y + 1.5)
                base = _spot(U, *rect)
                if base is not None and M._free(taken, rect, pad=0.1):
                    taken.append(rect)
                    x, _, z = st.p(st.at(s), 0.0, base)
                    P.place("cy_acpair", x, y + 0.1, z, st.yaw, district=CB)
                    n += 1
            elif roll < 0.5:
                size = r.choice(("pm", "ps", "pm"))
                sw, sh = ST_SIZES[size]
                rect = (s - sw / 2 - 0.2, s + sw / 2 + 0.2, y + 1.3, y + 1.5 + sh)
                if _spot(U, *rect) == 0.0 and M._free(taken, rect, pad=0.2):
                    taken.append(rect)
                    C.board(st, s, y + 1.4 + sh / 2, size, r, key=CB)
                    n += 1
    # A conduit or two up the face from the podium to the roof's line of
    # safety, a box at its foot.
    for _ in range(r.choice((0, 1, 1, 2))):
        s = r.uniform(2.0, w - 2.0)
        if any(abs(s - a) < 0.6 or abs(s - c) < 0.6 for a, c in edge) or not M._free(taken, (s - 0.2, s + 0.2, ph, top), pad=0.1):
            continue
        x, _, z = st.p(st.at(s), 0.0, 0.0)
        P.place("pipe_v", x, ph + 0.2, z, st.yaw, sy=top - ph - 0.4, district=CB)
        st.box((CB, "trim", 1), s - 0.3, s + 0.3, ph + 0.3, ph + 1.0, 0.0, 0.25, col=tcol)
    return n


def side(f, y0, y1, r, key=CB):
    """The same on a tower's side wall over a slot (a lookout's walls): runs
    of air conditioners, a balcony here and there, a conduit with its
    boxes. The caller keeps y0..y1 where the hero's lens does not see it."""
    w = f.width
    if w < 6.0 or y1 - y0 < 4.0:
        return 0
    n = 0
    k = max(1, int((y0 - SHOP_H) / CELL_H) + 1)
    while fl(k) < y1 - 2.6:
        y = fl(k)
        s = 1.4
        while s < w - 1.4:
            roll = r.random()
            x, _, z = f.p(f.at(s), 0.0, 0.0)
            if roll < 0.12 and s < w - 1.5:
                P.place("cy_balc", x, y, z, f.yaw, district=key)
                n += 1
                s += 3.2
                continue
            if roll < 0.36:
                P.place("cy_acpair", x, y + 0.1, z, f.yaw, district=key)
                n += 1
            s += r.uniform(1.6, 3.0)
        k += 1
    s = r.uniform(1.0, w - 1.0)
    x, _, z = f.p(f.at(s), 0.0, 0.0)
    P.place("pipe_v", x, y0 + 0.2, z, f.yaw, sy=y1 - y0 - 0.6, district=key)
    y = y0 + 1.5
    while y < y1 - 1.0:
        f.box((key, "trim", 1), s - 0.18, s + 0.18, y, y + 0.4, 0.0, 0.2, col=(0.1, 0.1, 0.12, 1))
        y += r.uniform(5.0, 9.0)
    return n

// src/braindance/roam/vehicle.js: the S4, driven.
//
// Arcade, on purpose: it should feel right the first time someone holds W.
// The car is a point with a heading and a velocity over the ground. The
// throttle pushes it along its nose with less and less as it nears its top
// speed, the brake pulls it up hard, and the front wheels turn it by the
// bicycle model with the lock coming off as the speed goes on, never asking
// for more sideways grip than the tyres have. The velocity is the ground's,
// not the nose's, so a fast turn leaves a little of it going sideways, which
// the tyres take back in a moment (and Space, the brake, lets the tail go a
// little way before they do).
//
// The street is the map's (nav.js): three circles down the car's length are
// each moved off whatever ground wheels cannot stand on, the car is moved
// and turned by what moved them, and what it was carrying into the wall is
// taken off its velocity, so it slides along a wall and does not stick to
// it. Each frame is cut into steps no longer than a third of a metre, so no
// speed carries it through anything, and a step that would leave its
// middle over ground wheels cannot stand on is not taken at all: the car
// is put back where it stood. Its height, pitch and roll are the ground's
// under its four wheels.
import { CAR } from "./nav.js";

// The S4 B8.5: 4.72 m long, 1.83 wide, 2.81 between the axles.
const WHEELBASE = 2.81;
const TRACK = 1.56;
const AXLE = WHEELBASE / 2;
// Its shape on the ground, as circles the map can push about: three down
// the middle (nose, middle, tail) and a small one in each corner, which the
// big ones leave sticking out. Each is how far along the nose, how far to
// the right, and its radius.
const RADIUS = 0.95;
const CIRCLES = [
  [1.42, 0, RADIUS],
  [0, 0, RADIUS],
  [-1.42, 0, RADIUS],
  [1.94, 0.5, 0.42],
  [1.94, -0.5, 0.42],
  [-1.94, 0.5, 0.42],
  [-1.94, -0.5, 0.42],
];

const TOP = 60; // m/s the throttle runs out at
const PUSH = 9; // m/s2 off the line
const BRAKE = 15;
const HAND = 9;
const BACK = 4.5; // m/s2 backing up, to BACK_TOP
const BACK_TOP = 9;
const LOCK = 0.6; // rad of steering lock at a standstill
const GRIP = 12; // m/s2 the tyres hold sideways
const STEP = 0.3; // metres a step of the simulation may cover

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));

export function createVehicle(nav) {
  const car = {
    x: 0,
    y: 0,
    z: 0,
    heading: 0,
    pitch: 0,
    roll: 0,
    // Metres a second along the nose (what the speedometer shows) and to
    // its right; the ground velocity is both.
    v: 0,
    slide: 0,
    steer: 0,
    ds: 0,
    brake: 0,
    reverse: 0,
    cut: true,
    // The hardest knock this frame, m/s into a wall, and whether it touched.
    knock: 0,
    touching: false,
  };
  // The ground velocity, world.
  let vx = 0;
  let vz = 0;
  let wheel = 0;
  const p = { x: 0, z: 0, nx: 0, nz: 0 };

  const groundAt = (x, z) => {
    const h = nav.ground(x, z, car.y, CAR, 0.8);
    return h === h ? h : car.y;
  };

  /** Put it down at (x, z) near height y, facing `heading`, at rest. */
  const place = (x, z, heading, y = 0) => {
    car.x = x;
    car.z = z;
    car.heading = heading;
    const h = nav.ground(x, z, y, CAR, 1.5);
    car.y = h === h ? h : y;
    car.v = car.slide = car.steer = car.ds = car.pitch = car.roll = 0;
    car.brake = car.reverse = car.knock = 0;
    car.touching = false;
    vx = vz = wheel = 0;
    car.cut = true;
  };

  /**
   * One frame. `input`: throttle, brake (0..1 each), steer (-1 right .. 1
   * left), hand (the Space brake). Returns the car.
   */
  const step = (dt, input) => {
    car.ds = 0;
    car.knock = 0;
    car.touching = false;
    if (dt <= 0) return car;
    // The wheel: quick to turn in, quicker to centre.
    const turnRate = Math.abs(input.steer) > Math.abs(wheel) || input.steer * wheel < 0 ? 4.2 : 6.5;
    wheel += clamp(input.steer - wheel, -turnRate * dt, turnRate * dt);

    const speed0 = Math.hypot(vx, vz);
    const steps = clamp(Math.ceil((speed0 * dt) / STEP), 1, 12);
    const h = dt / steps;
    let scraping = false;
    for (let s = 0; s < steps; s++) {
      const fromX = car.x;
      const fromZ = car.z;
      const fromHeading = car.heading;
      let fx = Math.sin(car.heading);
      let fz = Math.cos(car.heading);
      let v = vx * fx + vz * fz;
      let slide = vx * -fz + vz * fx;

      // Along the nose.
      const forward = input.throttle > 0;
      const back = input.brake > 0;
      let a = 0;
      let braking = false;
      if (forward && v >= -0.3) a = PUSH * Math.max(0, 1 - v / TOP) * input.throttle;
      else if (forward) {
        a = BRAKE;
        braking = true;
      } else if (back && v > 0.4) {
        a = -BRAKE * input.brake;
        braking = true;
      } else if (back) a = v > -BACK_TOP ? -BACK * input.brake : 0;
      if (input.hand) {
        // (At rest it holds the car where it is.)
        a = v > 0.05 ? Math.min(a, 0) - HAND : v < -0.05 ? Math.max(a, 0) + HAND : 0;
        if (Math.abs(v) <= 0.05) v = 0;
        braking = true;
      }
      // Rolling and the air.
      const drag = (0.35 + 0.0026 * v * v) * Math.sign(v);
      const before = v;
      v += (a - drag) * h;
      // A brake stops the car; it does not send it the other way.
      if ((braking || (!forward && !back)) && before * v < 0) v = 0;
      if (Math.abs(v) < 0.05 && !forward && !back) v = 0;

      // Round the corner: the lock comes off with speed, and the turn never
      // asks for more than the tyres' grip.
      const lock = LOCK / Math.sqrt(1 + (v / 13) * (v / 13));
      car.steer = wheel * lock;
      let turn = (v * Math.tan(car.steer)) / WHEELBASE;
      const most = GRIP / Math.max(3, Math.abs(v));
      turn = clamp(turn, -most, most);
      car.heading += turn * h;

      // What the tyres hold of the sideways slip (less with the Space brake on).
      slide *= Math.exp(-h * (input.hand && Math.abs(v) > 6 ? 2.2 : scraping ? 3 : 9));

      fx = Math.sin(car.heading);
      fz = Math.cos(car.heading);
      vx = fx * v - fz * slide;
      vz = fz * v + fx * slide;
      car.x += vx * h;
      car.z += vz * h;
      car.ds += v * h;

      // The street. Each circle at the height of the ground under it.
      for (let pass = 0; pass < 2; pass++) {
        let any = false;
        for (const [d, side, radius] of CIRCLES) {
          p.x = car.x + fx * d - fz * side;
          p.z = car.z + fz * d + fx * side;
          const px = p.x;
          const pz = p.z;
          if (!nav.resolve(p, radius, car.y - Math.sin(car.pitch) * d, CAR, 0.6)) continue;
          any = true;
          car.touching = true;
          scraping = true;
          const mx = p.x - px;
          const mz = p.z - pz;
          // Along the nose and across it (right is (-fz, fx)).
          const along = mx * fx + mz * fz;
          const across = mx * -fz + mz * fx;
          const share = d ? 0.5 : 1;
          car.x += fx * along - fz * across * share;
          car.z += fz * along + fx * across * share;
          if (d) {
            car.heading -= (across * (1 - share)) / d;
            fx = Math.sin(car.heading);
            fz = Math.cos(car.heading);
          }
          // What it was carrying into the wall comes off, and the wall
          // scrubs a little of the rest.
          const len = Math.hypot(mx, mz) || 1;
          const nx = mx / len;
          const nz = mz / len;
          const into = vx * nx + vz * nz;
          if (into < 0) {
            vx -= into * nx;
            vz -= into * nz;
            car.knock = Math.max(car.knock, -into);
            const scrub = Math.exp(-h * 1.2);
            vx *= scrub;
            vz *= scrub;
            // And the wall turns the car the way it is now going (nose
            // first, or tail first backing up), so it runs on along it
            // and does not grind to a stop with its nose in the kerb.
            if (vx * vx + vz * vz > 1) {
              const way = vx * fx + vz * fz >= 0 ? 1 : -1;
              const off = wrap(Math.atan2(vx * way, vz * way) - car.heading);
              if (Math.abs(off) < 1.3) {
                car.heading += off * (1 - Math.exp(-h * 12));
                fx = Math.sin(car.heading);
                fz = Math.cos(car.heading);
              }
            }
          }
        }
        if (!any) break;
      }
      // Never off the road: if all that pushing has left its middle over
      // ground it cannot stand on, it stays where it was, stopped.
      const under = nav.floor(car.x, car.z, car.y, CAR, 0.8);
      if (under !== under) {
        car.x = fromX;
        car.z = fromZ;
        car.heading = fromHeading;
        car.knock = Math.max(car.knock, Math.hypot(vx, vz));
        vx = vz = 0;
        car.touching = true;
        break;
      }
    }

    const fx = Math.sin(car.heading);
    const fz = Math.cos(car.heading);
    const was = car.v;
    car.v = vx * fx + vz * fz;
    car.slide = vx * -fz + vz * fx;

    // The ground under the four wheels: height, pitch, roll. (Right is
    // (-fz, fx); the front is +nose.)
    const rx = -fz * (TRACK / 2);
    const rz = fx * (TRACK / 2);
    const fl = groundAt(car.x + fx * AXLE - rx, car.z + fz * AXLE - rz);
    const fr = groundAt(car.x + fx * AXLE + rx, car.z + fz * AXLE + rz);
    const rl = groundAt(car.x - fx * AXLE - rx, car.z - fz * AXLE - rz);
    const rr = groundAt(car.x - fx * AXLE + rx, car.z - fz * AXLE + rz);
    const k = 1 - Math.exp(-dt * 18);
    car.y += ((fl + fr + rl + rr) / 4 - car.y) * k;
    // And how it sits on its springs: down at the nose under the brake, up
    // under power, leaning out of a turn.
    const accel = (car.v - was) / dt;
    const lean = clamp(car.v * ((car.v * Math.tan(car.steer)) / WHEELBASE) * 0.0028, -0.045, 0.045);
    const wantPitch = -Math.atan2((fl + fr - rl - rr) / 2, WHEELBASE) + clamp(-accel * 0.0022, -0.03, 0.03);
    const wantRoll = Math.atan2((fl + rl - fr - rr) / 2, TRACK) + lean;
    const kb = 1 - Math.exp(-dt * 10);
    car.pitch += (wantPitch - car.pitch) * kb;
    car.roll += (wantRoll - car.roll) * kb;
    car.brake = (input.brake > 0 && was > 0.4) || (input.throttle > 0 && was < -0.3) || input.hand ? 1 : 0;
    car.reverse = car.v < -0.3 ? 1 : 0;
    return car;
  };

  return {
    car,
    place,
    step,
    /** The ground velocity, world metres a second. */
    velocity(out) {
      out.x = vx;
      out.z = vz;
      return out;
    },
    /** Take speed off (something soft in the way): the share kept. */
    slow(keep) {
      vx *= keep;
      vz *= keep;
    },
    RADIUS,
    CIRCLES,
  };
}

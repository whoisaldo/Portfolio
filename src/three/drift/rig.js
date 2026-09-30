// src/three/drift/rig.js: the car's moving parts, and the drift that moves them.
//
// Out of src/lib/drift-scene.js, so the drift is one piece of code whether
// it runs over the plate (the fallback) or in the live city. The rig is the
// S4's own nodes, as the garage reads them: four wheels that spin about X,
// two steering knuckles that turn about Y. The drift is what the intro does
// with them: yaw from the path's heading plus its slip, a roll toward the
// outside of the turn and a squat on the launch, the rears spinning faster
// than the road while they slide, smoke off them, and the tail lights'
// streaks.
import * as THREE from "three";
import { clamp, smooth, deg } from "./path.js";
import { discTexture } from "./lamps.js";
import { Smoke } from "./smoke.js";
import { Trail } from "./trail.js";

export function createRig(car) {
  car.rotation.order = "YXZ";
  const parts = car.userData.parts || {};
  const pick = (names) => names.map((n) => parts[n]).filter(Boolean);
  return {
    wheels: pick(["wheel_fl", "wheel_fr", "wheel_rl", "wheel_rr"]),
    steers: pick(["steer_fl", "steer_fr"]),
    rears: pick(["wheel_rl", "wheel_rr"]),
    radius: car.userData.wheelRadius,
    wheelbase: car.userData.wheelbase,
  };
}

const _w = new THREE.Vector3();
const _side = new THREE.Vector3();
const _back = new THREE.Vector3();
const _v = new THREE.Vector3();
const _jit = new THREE.Vector3();

/**
 * The drift's choreography on `car`: its smoke and its two tail-light
 * streaks live in `scene`. `smokeRgb` colours the smoke (see smoke.js).
 */
export function createDrift(scene, car, rig, { smokeRgb } = {}) {
  const smokeTex = discTexture(128, 0.9, 0.4);
  const smoke = new Smoke(scene, smokeTex, smokeRgb);
  const trailL = new Trail(scene, 0xff2e88);
  const trailR = new Trail(scene, 0xff2e88);
  let carry = 0;
  const state = { slipN: 0, launch: 0, spin: 0 };

  return {
    smoke,
    trailL,
    trailR,
    state,

    /** Put the car where the drift has it `d` seconds after the drop. */
    place(pose, d, dt) {
      const yaw = pose.heading + pose.slip;
      const slipN = clamp(Math.abs(pose.slip) / (47 * deg), 0, 1);
      // Launch wheelspin: the rears light up again as the car straightens
      // and goes. The window is exactly where the ramp reaches zero, so it
      // fades in from nothing rather than switching on.
      const launch = d > 1.3 && d < 2.3 ? smooth(1 - Math.abs((d - 1.8) / 0.5)) : 0;
      const spin = Math.max(slipN, launch);

      car.position.set(pose.x, 0, pose.z);
      car.rotation.y = yaw;
      // Body roll toward the outside of the turn, and a squat as it launches.
      car.rotation.z = 0.07 * slipN * Math.sign(pose.slip || 1);
      car.rotation.x = -0.025 * launch + 0.012 * slipN;

      const omega = (pose.speed / rig.radius) * dt;
      for (const w of rig.wheels) w.rotation.x += omega;
      for (const w of rig.rears) w.rotation.x += omega * 1.7 * spin;
      const steer = clamp(-0.85 * pose.slip, -0.62, 0.62);
      for (const st of rig.steers) st.rotation.y = steer;
      state.slipN = slipN;
      state.launch = launch;
      state.spin = spin;
      return state;
    },

    /** Smoke off the rear tyres while they are sliding or spinning. Call
     *  after the car's matrices are current. */
    emitSmoke(pose, dt, now) {
      const { slipN, spin } = state;
      // The outside of the turn: the car's left in a right-hand drift.
      _side.set(pose.slip < 0 ? 1 : -1, 0, 0).applyQuaternion(car.quaternion);
      _back.set(0, 0, -1).applyQuaternion(car.quaternion);
      carry += dt * (18 + 80 * spin);
      while (carry >= 1) {
        carry -= 1;
        for (const w of rig.rears) {
          w.getWorldPosition(_w);
          _w.y = 0.12;
          _w.x += (Math.random() - 0.5) * 0.35;
          _w.z += (Math.random() - 0.5) * 0.35;
          _v.copy(_side).multiplyScalar(0.9 + 2.4 * slipN + Math.random() * 0.6)
            .addScaledVector(_back, 1.4 + Math.random() * 1.2)
            .add(_jit.set((Math.random() - 0.5) * 0.8, 0.25 + Math.random() * 0.4, (Math.random() - 0.5) * 0.8));
          smoke.emit(_w, _v, now, 0.45 + Math.random() * 0.45 + 0.5 * spin);
        }
      }
    },

    /** The tail lights' streaks: where the lamps (car space) are now. */
    pushTrails(tailL, tailR, speed, now) {
      const strength = clamp(0.35 + speed / 30, 0, 1);
      trailL.push(_w.copy(tailL).applyMatrix4(car.matrixWorld), now, strength);
      trailR.push(_w.copy(tailR).applyMatrix4(car.matrixWorld), now, strength);
    },

    update(now) {
      smoke.update(now);
      trailL.update(now);
      trailR.update(now);
    },

    /** Clean air and no streaks: before a replay, after a warm-up frame. */
    reset() {
      carry = 0;
      smoke.clear();
      trailL.clear();
      trailR.clear();
    },

    /** Forget the smoke emitter's remainder only, as the warm-up always did. */
    resetCarry() {
      carry = 0;
    },

    dispose() {
      smoke.dispose();
      trailL.dispose();
      trailR.dispose();
      smokeTex.dispose();
    },
  };
}

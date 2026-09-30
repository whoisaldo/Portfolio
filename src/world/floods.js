// src/world/floods.js: the billboard's floodlights, as light.
//
// The big board's housing is dark steel, and four floodlights on arms along
// its top edge light it from above (lamp_board_<n> in the kit). Dark steel
// lit by a lamp is still nearly black, so the light is drawn where the eye
// finds it: a fan of it down the housing's face from each fixture,
// brightest on the ribs, which catch it, and fading as it falls. One
// additive draw, behind the screen (the screen covers what it covers).
import * as THREE from "three";
import { COMMON } from "./glsl.js";

const COLOR = "#dfe6ff";

export function createFloods(anchors, shared, { reflectLayer = 2 } = {}) {
  const housing = anchors.get("anchor_board_housing");
  const lamps = [...anchors.entries()].filter(([n]) => n.startsWith("lamp_board_")).map(([, a]) => a.position);
  if (!housing || !lamps.length) return { group: null, update() {}, dispose() {} };
  const { w = 48, h = 25, rib0 = 0, ribStep = 3.1 } = housing.extras ?? {};
  const group = new THREE.Group();
  group.name = "floods";

  // The wash: one quad over the housing's face, a hair in front of its ribs.
  const washGeo = new THREE.PlaneGeometry(w, h);
  washGeo.translate(housing.position.x, housing.position.y, housing.position.z + 0.2);
  const lampUniform = lamps.slice(0, 4).map((p) => new THREE.Vector2(p.x, p.y));
  while (lampUniform.length < 4) lampUniform.push(new THREE.Vector2(1e5, 1e5));
  const washMat = new THREE.ShaderMaterial({
    uniforms: {
      ...shared,
      uFixtures: { value: lampUniform },
      uColor: { value: new THREE.Color(COLOR) },
      uRib0: { value: rib0 },
      uRibStep: { value: ribStep },
    },
    vertexShader: /* glsl */ `
      varying vec3 vWorld;
      void main() {
        vec4 w = modelMatrix * vec4(position, 1.0);
        vWorld = w.xyz;
        gl_Position = projectionMatrix * viewMatrix * w;
      }
    `,
    fragmentShader: /* glsl */ `
      ${COMMON}
      uniform vec2 uFixtures[4];
      uniform vec3 uColor;
      uniform float uRib0;
      uniform float uRibStep;
      varying vec3 vWorld;
      void main() {
        float light = 0.0;
        for (int i = 0; i < 4; i++) {
          // Down from the fixture: narrow at it, wider as it falls, fading.
          vec2 d = vWorld.xy - uFixtures[i];
          float down = -d.y;
          if (down < -0.3) continue;
          float width = 0.9 + max(down, 0.0) * 0.5;
          light += exp(-d.x * d.x / (width * width)) * smoothstep(-0.3, 0.6, down) * exp(-down / 6.0) * (1.0 + 2.0 * exp(-down * 1.2));
        }
        // The ribs stand proud and catch it; the panel between takes less.
        float r = fract((vWorld.y - uRib0) / uRibStep) * uRibStep;
        float rib = smoothstep(0.02, 0.0, abs(r - 0.07)) + 0.28;
        vec3 col = uColor * light * rib * 0.16 * (1.0 + 0.2 * uLevel);
        col *= exp(-length(vWorld - uCam) * uFogDensity * 0.6);
        gl_FragColor = vec4(col, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    polygonOffset: true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -1,
  });
  washMat.name = "floods_wash";
  const wash = new THREE.Mesh(washGeo, washMat);
  wash.name = "floods_wash";
  wash.renderOrder = 6;
  wash.layers.enable(reflectLayer);
  group.add(wash);

  return {
    group,
    update() {},
    dispose() {
      group.removeFromParent();
      washGeo.dispose();
      washMat.dispose();
    },
  };
}

import * as THREE from 'three';

/**
 * The floor: a ruled plane under whatever a scene has floating over it.
 *
 * A thing drawn in the air with nothing under it has no height, and the
 * camera moving around it has nothing to move against. A faint grid is the
 * least that fixes both — it is where the drop lines land, it is what slides
 * the other way when the camera leans, and it reads as a bench an instrument
 * is standing on rather than as scenery.
 *
 * The lines are worked out per pixel from the plane's own coordinates and
 * their screen-space rate of change, so they are one pixel wide at any
 * distance and fade out instead of turning to moiré where the cells shrink
 * below a pixel near the horizon.
 */
export interface FloorOptions {
  /** World height of the plane. */
  height?: number;
  /** Side of one cell, in world units. */
  cell?: number;
  /** Every this many cells the line is drawn heavier. */
  major?: number;
  /** How far from `centre` the grid has faded to nothing. */
  reach?: number;
  color?: THREE.ColorRepresentation;
  opacity?: number;
}

const VERTEX = /* glsl */ `
  varying vec3 vWorld;
  void main() {
    vec4 world = modelMatrix * vec4(position, 1.0);
    vWorld = world.xyz;
    gl_Position = projectionMatrix * viewMatrix * world;
  }
`;

const FRAGMENT = /* glsl */ `
  uniform vec3 uColor;
  uniform float uCell;
  uniform float uMajor;
  uniform float uReach;
  uniform float uOpacity;
  uniform vec2 uCentre;
  varying vec3 vWorld;

  float ruled(vec2 coord, float weight) {
    vec2 rate = max(fwidth(coord), vec2(1e-5));
    vec2 toLine = abs(fract(coord - 0.5) - 0.5) / rate;
    float line = 1.0 - min(min(toLine.x, toLine.y) / weight, 1.0);
    // Where a cell is under a couple of pixels there is no grid to draw,
    // only a shimmer.
    float crowd = max(rate.x, rate.y);
    return line * (1.0 - smoothstep(0.22, 0.6, crowd));
  }

  void main() {
    vec2 p = vWorld.xz;
    float minor = ruled(p / uCell, 1.0);
    float major = ruled(p / (uCell * uMajor), 1.4);
    float away = length(p - uCentre) / uReach;
    float fade = exp(-away * away * 2.2);
    float ink = (minor * 0.4 + major) * fade * uOpacity;
    gl_FragColor = vec4(uColor * ink, 1.0);
  }
`;

export interface Floor {
  mesh: THREE.Mesh;
  material: THREE.ShaderMaterial;
  /** Move the point the grid fades away from. */
  setCentre(x: number, z: number): void;
  dispose(): void;
}

export const createFloor = (options: FloorOptions = {}): Floor => {
  const reach = options.reach ?? 6;
  const geometry = new THREE.PlaneGeometry(reach * 4, reach * 4);
  geometry.rotateX(-Math.PI / 2);
  const material = new THREE.ShaderMaterial({
    vertexShader: VERTEX,
    fragmentShader: FRAGMENT,
    uniforms: {
      uColor: { value: new THREE.Color(options.color ?? 0x8fa3c4) },
      uCell: { value: options.cell ?? 0.25 },
      uMajor: { value: options.major ?? 4 },
      uReach: { value: reach },
      uOpacity: { value: options.opacity ?? 0.5 },
      uCentre: { value: new THREE.Vector2(0, 0) },
    },
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.y = options.height ?? 0;
  mesh.frustumCulled = false;

  return {
    mesh,
    material,
    setCentre(x, z) {
      material.uniforms.uCentre.value.set(x, z);
    },
    dispose() {
      geometry.dispose();
      material.dispose();
    },
  };
};

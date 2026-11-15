import * as THREE from 'three';

/**
 * Points of light: the nodes of a graph, drawn as discs that always face
 * the viewer.
 *
 * Every node is one instance of one quad, and everything about it that
 * changes — where it is, its colour, how large and how bright, whether it
 * wears a ring — is a number in a buffer, written by the scene and uploaded
 * once a frame. A graph of a few hundred nodes is one draw call.
 *
 * The disc is drawn by distance from the quad's centre: a core with a hard,
 * antialiased edge, a soft halo around it for the bloom to pick up, and a
 * thin ring further out that a scene can switch on to say "this one" — the
 * start of a search, the node under the pointer.
 */

const VERTEX = /* glsl */ `
  attribute vec3 aPosition;
  attribute vec3 aColor;
  attribute vec4 aParams;
  uniform float uScale;
  varying vec2 vUv;
  varying vec3 vColor;
  varying vec4 vParams;
  varying float vDistance;

  void main() {
    vec4 view = viewMatrix * modelMatrix * vec4(aPosition, 1.0);
    // The quad is three times the node's radius: the room the halo and the
    // ring are drawn in.
    view.xy += position.xy * aParams.x * uScale * 3.0;
    vUv = position.xy * 3.0;
    vColor = aColor;
    vParams = aParams;
    vDistance = -view.z;
    gl_Position = projectionMatrix * view;
  }
`;

const FRAGMENT = /* glsl */ `
  uniform vec3 uGround;
  uniform vec2 uFog;
  uniform float uStrength;
  varying vec2 vUv;
  varying vec3 vColor;
  varying vec4 vParams;
  varying float vDistance;

  void main() {
    float d = length(vUv);
    float edge = max(fwidth(d), 1e-4);
    float core = 1.0 - smoothstep(1.0 - edge, 1.0 + edge, d);
    float halo = exp(-d * d * 1.15) * vParams.z;
    float ring = (1.0 - smoothstep(0.0, edge * 1.6, abs(d - 2.1))) * vParams.w;

    // Brightest at the centre of the core: a bead, not a flat dot.
    float bead = core * (0.7 + 0.5 * (1.0 - d * d));
    vec3 color = vColor * (bead * vParams.y + halo * 0.5 + ring * 0.9);

    float fog = 1.0 - smoothstep(uFog.x, uFog.y, vDistance);
    gl_FragColor = vec4(color * fog * uStrength, 1.0);
  }
`;

export interface Sprites {
  mesh: THREE.Mesh;
  material: THREE.ShaderMaterial;
  /** Three floats a node: where it is. */
  positions: Float32Array;
  /** Three floats a node: its colour, in linear light. */
  colors: Float32Array;
  /** Four floats a node: radius, brightness, halo, ring. */
  params: Float32Array;
  /** How many of the buffer's nodes are drawn. */
  setCount(count: number): void;
  /** Upload what the scene has written this frame. */
  commit(): void;
  dispose(): void;
}

export const createSprites = (capacity: number): Sprites => {
  const quad = new THREE.PlaneGeometry(2, 2);
  const geometry = new THREE.InstancedBufferGeometry();
  geometry.index = quad.index;
  geometry.setAttribute('position', quad.attributes.position);

  const positions = new Float32Array(capacity * 3);
  const colors = new Float32Array(capacity * 3);
  const params = new Float32Array(capacity * 4);
  const positionAttribute = new THREE.InstancedBufferAttribute(positions, 3);
  const colorAttribute = new THREE.InstancedBufferAttribute(colors, 3);
  const paramAttribute = new THREE.InstancedBufferAttribute(params, 4);
  for (const attribute of [positionAttribute, colorAttribute, paramAttribute]) {
    attribute.setUsage(THREE.DynamicDrawUsage);
  }
  geometry.setAttribute('aPosition', positionAttribute);
  geometry.setAttribute('aColor', colorAttribute);
  geometry.setAttribute('aParams', paramAttribute);
  geometry.instanceCount = 0;

  const material = new THREE.ShaderMaterial({
    vertexShader: VERTEX,
    fragmentShader: FRAGMENT,
    uniforms: {
      uScale: { value: 1 },
      uGround: { value: new THREE.Color(0x07080a) },
      // Where distance starts to take a node, and where it has.
      uFog: { value: new THREE.Vector2(1e3, 1e4) },
      uStrength: { value: 1 },
    },
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });

  const mesh = new THREE.Mesh(geometry, material);
  mesh.frustumCulled = false;

  return {
    mesh,
    material,
    positions,
    colors,
    params,
    setCount(count) {
      geometry.instanceCount = Math.max(0, Math.min(capacity, count));
    },
    commit() {
      positionAttribute.needsUpdate = true;
      colorAttribute.needsUpdate = true;
      paramAttribute.needsUpdate = true;
    },
    dispose() {
      quad.dispose();
      geometry.dispose();
      material.dispose();
    },
  };
};

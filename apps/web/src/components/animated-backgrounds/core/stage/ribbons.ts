import * as THREE from 'three';

/**
 * Lines with a width: the edges of a graph.
 *
 * A line in WebGL is one device pixel wide, whatever it is asked for, and
 * the graph backgrounds used to get around that with one object and one
 * material for every edge — a few hundred draw calls a frame, each to set a
 * colour and a width on a single line. Here every edge is one instance of
 * one quad. The vertex shader stretches it from the edge's start to its end
 * and pushes its two sides apart across the line, in screen space, so the
 * width is in pixels at any distance; the scene writes ends, colours and
 * widths into buffers and the whole graph is one draw call.
 *
 * Two things an edge can also do, both along its length: be dashed, and
 * carry packets — short bright runs travelling from its start to its end,
 * which is the cheapest honest way to say that something is flowing along
 * a link and which way.
 */

const VERTEX = /* glsl */ `
  attribute vec3 aStart;
  attribute vec3 aEnd;
  attribute vec3 aColor;
  attribute vec4 aParams;
  uniform vec2 uResolution;
  uniform float uPixelRatio;
  uniform float uNear;
  varying vec3 vColor;
  varying vec4 vParams;
  varying float vSide;
  varying float vHalf;
  varying float vAlong;
  varying float vLength;
  varying float vDistance;

  void main() {
    vec4 a = viewMatrix * modelMatrix * vec4(aStart, 1.0);
    vec4 b = viewMatrix * modelMatrix * vec4(aEnd, 1.0);

    // An end behind the camera projects to nonsense; the segment is cut at
    // the near plane instead.
    float near = -uNear;
    if (a.z > near && b.z < near) a = mix(b, a, (near - b.z) / (a.z - b.z));
    if (b.z > near && a.z < near) b = mix(a, b, (near - a.z) / (b.z - a.z));

    vec4 clipA = projectionMatrix * a;
    vec4 clipB = projectionMatrix * b;
    vec2 screenA = clipA.xy / clipA.w * uResolution * 0.5;
    vec2 screenB = clipB.xy / clipB.w * uResolution * 0.5;
    vec2 along = screenB - screenA;
    float span = length(along);
    vec2 direction = span > 1e-4 ? along / span : vec2(1.0, 0.0);
    vec2 normal = vec2(-direction.y, direction.x);

    // A pixel of room either side of the line's own width, for its edge to
    // fade across.
    float halfWidth = aParams.x * uPixelRatio * 0.5;
    float reach = halfWidth + 1.0;
    vec4 clip = mix(clipA, clipB, position.x);
    clip.xy += normal * position.y * reach / (uResolution * 0.5) * clip.w;
    // Both ends behind the camera: nothing to draw.
    if (a.z > near && b.z > near) clip = vec4(2.0, 2.0, 2.0, 1.0);

    vColor = aColor;
    vParams = aParams;
    vSide = position.y * reach;
    vHalf = halfWidth;
    vAlong = position.x;
    vLength = distance(aStart, aEnd);
    vDistance = -mix(a.z, b.z, position.x);
    gl_Position = clip;
  }
`;

const FRAGMENT = /* glsl */ `
  uniform float uTime;
  uniform vec2 uFog;
  uniform float uStrength;
  uniform float uDash;
  varying vec3 vColor;
  varying vec4 vParams;
  varying float vSide;
  varying float vHalf;
  varying float vAlong;
  varying float vLength;
  varying float vDistance;

  void main() {
    float body = 1.0 - smoothstep(vHalf - 0.5, vHalf + 0.5, abs(vSide));
    float ink = body * vParams.y;

    // Dashes, measured along the edge in world units so they do not swim
    // as the camera moves.
    if (vParams.w > 0.5) {
      float dash = fract(vAlong * vLength / uDash);
      ink *= smoothstep(0.0, 0.08, dash) * (1.0 - smoothstep(0.55, 0.63, dash));
    }

    // Packets: bright runs travelling start to end, at the edge's own rate.
    float packets = 0.0;
    if (vParams.z > 0.0) {
      float count = max(1.0, floor(vLength * 5.0 + 0.5));
      float phase = fract(vAlong * count - uTime * vParams.z);
      packets = smoothstep(0.72, 0.96, phase) * (1.0 - smoothstep(0.96, 1.0, phase));
    }

    float fog = 1.0 - smoothstep(uFog.x, uFog.y, vDistance);
    vec3 color = vColor * ink * (1.0 + packets * 2.6);
    gl_FragColor = vec4(color * fog * uStrength, 1.0);
  }
`;

export interface Ribbons {
  mesh: THREE.Mesh;
  material: THREE.ShaderMaterial;
  /** Three floats an edge: where it starts. */
  starts: Float32Array;
  /** Three floats an edge: where it ends. */
  ends: Float32Array;
  /** Three floats an edge: its colour, in linear light. */
  colors: Float32Array;
  /** Four floats an edge: width in pixels, brightness, packet rate, dashed. */
  params: Float32Array;
  setCount(count: number): void;
  commit(): void;
  dispose(): void;
}

export const createRibbons = (capacity: number): Ribbons => {
  // One quad: x runs 0 → 1 along the edge, y −1 → 1 across it.
  const quad = new THREE.BufferGeometry();
  quad.setAttribute(
    'position',
    new THREE.BufferAttribute(
      new Float32Array([0, -1, 0, 1, -1, 0, 1, 1, 0, 0, 1, 0]),
      3
    )
  );
  quad.setIndex([0, 1, 2, 0, 2, 3]);

  const geometry = new THREE.InstancedBufferGeometry();
  geometry.index = quad.index;
  geometry.setAttribute('position', quad.attributes.position);

  const starts = new Float32Array(capacity * 3);
  const ends = new Float32Array(capacity * 3);
  const colors = new Float32Array(capacity * 3);
  const params = new Float32Array(capacity * 4);
  const attributes = [
    new THREE.InstancedBufferAttribute(starts, 3),
    new THREE.InstancedBufferAttribute(ends, 3),
    new THREE.InstancedBufferAttribute(colors, 3),
    new THREE.InstancedBufferAttribute(params, 4),
  ];
  attributes.forEach(attribute => attribute.setUsage(THREE.DynamicDrawUsage));
  geometry.setAttribute('aStart', attributes[0]);
  geometry.setAttribute('aEnd', attributes[1]);
  geometry.setAttribute('aColor', attributes[2]);
  geometry.setAttribute('aParams', attributes[3]);
  geometry.instanceCount = 0;

  const material = new THREE.ShaderMaterial({
    vertexShader: VERTEX,
    fragmentShader: FRAGMENT,
    uniforms: {
      uResolution: { value: new THREE.Vector2(1, 1) },
      uPixelRatio: { value: 1 },
      uNear: { value: 0.05 },
      uTime: { value: 0 },
      uFog: { value: new THREE.Vector2(1e3, 1e4) },
      uStrength: { value: 1 },
      // The length of one dash and its gap, in world units.
      uDash: { value: 0.06 },
    },
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
  });

  const mesh = new THREE.Mesh(geometry, material);
  mesh.frustumCulled = false;

  return {
    mesh,
    material,
    starts,
    ends,
    colors,
    params,
    setCount(count) {
      geometry.instanceCount = Math.max(0, Math.min(capacity, count));
    },
    commit() {
      attributes.forEach(attribute => {
        attribute.needsUpdate = true;
      });
    },
    dispose() {
      quad.dispose();
      geometry.dispose();
      material.dispose();
    },
  };
};

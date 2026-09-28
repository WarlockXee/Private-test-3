// The Red Keep — stage 1 layout blockout.
// World axes: +x = south (towards the bay mouth), -x = north (towards the beach),
// +z = west (the bay and the White Palace), -z = east (into the headland). Sea level is y = 0.

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { Sky } from 'three/addons/objects/Sky.js';
import { Water } from 'three/addons/objects/Water.js';
import { CSS2DRenderer, CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
import { MeshBVH } from 'three-mesh-bvh';

/* ------------------------------------------------------------------ utils */

const DEG = Math.PI / 180, TAU = Math.PI * 2;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const smooth = (e0, e1, x) => { const t = clamp((x - e0) / (e1 - e0), 0, 1); return t * t * (3 - 2 * t); };
function hash2(ix, iy) {
  let h = Math.imul(ix | 0, 374761393) ^ Math.imul(iy | 0, 668265263);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}
function vnoise(x, y) {
  const ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy;
  const ux = fx * fx * (3 - 2 * fx), uy = fy * fy * (3 - 2 * fy);
  return lerp(lerp(hash2(ix, iy), hash2(ix + 1, iy), ux), lerp(hash2(ix, iy + 1), hash2(ix + 1, iy + 1), ux), uy);
}
function fbm(x, y, oct = 4) {
  let s = 0, a = 0.5, f = 1, n = 0;
  for (let i = 0; i < oct; i++) { s += a * vnoise(x * f + i * 17.3, y * f - i * 9.1); n += a; a *= 0.5; f *= 2.03; }
  return s / n;
}
let seedCounter = 1;
const rnd = () => hash2(++seedCounter, 9187);

/* --------------------------------------------------------------- renderer */

const stageEl = document.getElementById('stage');
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
renderer.setSize(innerWidth, innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.62;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;
renderer.shadowMap.autoUpdate = false;
stageEl.appendChild(renderer.domElement);

const labelRenderer = new CSS2DRenderer({ element: document.getElementById('labels') });
labelRenderer.setSize(innerWidth, innerHeight);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(58, innerWidth / innerHeight, 0.1, 6000);

// Golden hour: the sun sits low in the west, a little south, so it sets over the bay mouth.
const sunDir = new THREE.Vector3().setFromSphericalCoords(1, (90 - 6.5) * DEG, 18 * DEG);

const sky = new Sky();
sky.scale.setScalar(4000);
const su = sky.material.uniforms;
su.turbidity.value = 7;
su.rayleigh.value = 2.4;
su.mieCoefficient.value = 0.006;
su.mieDirectionalG.value = 0.86;
su.sunPosition.value.copy(sunDir);
su.cloudCoverage.value = 0.32;
su.cloudDensity.value = 0.35;
const pmrem = new THREE.PMREMGenerator(renderer);
const envScene = new THREE.Scene();
envScene.add(sky);
scene.environment = pmrem.fromScene(envScene).texture;
scene.add(sky);
scene.environmentIntensity = 1.0;
scene.fog = new THREE.FogExp2(0xc99a80, 0.00022);

const sun = new THREE.DirectionalLight(0xffc28c, 3.1);
sun.castShadow = true;
sun.shadow.mapSize.set(4096, 4096);
Object.assign(sun.shadow.camera, { left: -48, right: 48, top: 48, bottom: -48, near: 1, far: 420 });
sun.shadow.bias = -0.0004;
sun.shadow.normalBias = 0.05;
sun.target.position.set(0, 20, -3);
sun.position.copy(sun.target.position).addScaledVector(sunDir, 220);
scene.add(sun, sun.target);
scene.add(new THREE.HemisphereLight(0xa9bdd8, 0x4b3526, 0.55));

const waterNormals = new THREE.TextureLoader().load('textures/waternormals.jpg');
waterNormals.wrapS = waterNormals.wrapT = THREE.RepeatWrapping;
const water = new Water(new THREE.PlaneGeometry(9000, 9000), {
  textureWidth: 512, textureHeight: 512, waterNormals,
  sunDirection: sunDir.clone(), sunColor: 0xffc79a, waterColor: 0x0b3440,
  distortionScale: 2.6, fog: true,
});
water.rotation.x = -Math.PI / 2;
water.material.uniforms.size.value = 1.6;
scene.add(water);

/* ---------------------------------------------------------------- palette */

const RED = 0x6b2a22, RED_DK = 0x4f1d17, BLADE = 0x5a2721;
const ROCK = 0x5f4d43, ROCK_DK = 0x463a33;
const TIMBER = 0x3a2417, TIMBER_MID = 0x5a3925, BRASS = 0xb08d4a;
const CREAM = 0xd9ccb5, GLASS = 0xbcd6de, SCREEN = 0x0f171b;
const PAL = {
  1: { floor: 0x7b5335, wall: 0xd9c6ab, ceil: 0xe6d9c6 },
  2: { floor: 0x8b6446, wall: 0xdfd0b8, ceil: 0xe9dfce },
  3: { floor: 0x74503a, wall: 0xd2bfa5, ceil: 0xe2d4c0 },
  4: { floor: 0x6d4830, wall: 0xd7c2a4, ceil: 0xe4d6c1 },
  5: { floor: 0x3a2920, wall: 0x5b2a23, ceil: 0x33211b },
  6: { floor: 0x4b3323, wall: 0x2f4b4d, ceil: 0xd4c5b0 },
  7: { floor: 0x8e8477, wall: 0x7d6e62, ceil: 0x4c3627 },
  8: { floor: 0x4e4b48, wall: 0x5d5249, ceil: 0x48413b },
  9: { floor: 0x5a4d44, wall: 0x6a5a4f, ceil: 0x6a5a4f },
};

/* ---------------------------------------------------------------- builder */
// Everything static is emitted into merged vertex-coloured buckets (one mesh per group and
// material kind), and everything solid is also copied into one collision soup for the BVH.

const MATS = {
  matte: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9, metalness: 0 }),
  satin: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.5, metalness: 0 }),
  metal: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.35, metalness: 0.75 }),
  rock: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95, metalness: 0, flatShading: true }),
  glass: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.04, metalness: 0.1, transparent: true, opacity: 0.16, depthWrite: false, side: THREE.DoubleSide, envMapIntensity: 1.6 }),
  water: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.12, metalness: 0.1, transparent: true, opacity: 0.86, envMapIntensity: 0.7 }),
  glow: new THREE.MeshBasicMaterial({ vertexColors: true, toneMapped: false }),
  crystal: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.1, metalness: 0.25, flatShading: true, envMapIntensity: 1.6, emissive: 0x2c3e50, emissiveIntensity: 0.9 }),
  oneway: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.55, metalness: 0.25, flatShading: true }),
};
const NO_SHADOW = new Set(['glass', 'water', 'glow', 'oneway']);
const NO_COLLIDE = new Set(['water', 'glow', 'oneway']);

const colorCache = new Map();
function lin(hex) {
  let c = colorCache.get(hex);
  if (!c) { const k = new THREE.Color(hex); c = [k.r, k.g, k.b]; colorCache.set(hex, c); }
  return c;
}

const buckets = new Map();
const colPos = [];
function bucket(group, kind) {
  const key = group.id + ':' + kind;
  let b = buckets.get(key);
  if (!b) { b = { group, kind, pos: [], nor: [], col: [] }; buckets.set(key, b); }
  return b;
}

const _v = new THREE.Vector3(), _n = new THREE.Vector3(), _nm = new THREE.Matrix3();
const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _p = new THREE.Vector3(), _s = new THREE.Vector3(), _e = new THREE.Euler();

function emit(group, kind, geom, matrix, color, opts = {}) {
  const g = geom.index ? geom.toNonIndexed() : geom;
  const P = g.attributes.position, N = g.attributes.normal;
  _nm.getNormalMatrix(matrix);
  const b = bucket(group, kind);
  const cols = (Array.isArray(color) ? color : [color]).map(lin);
  const per = P.count / cols.length;
  const collide = opts.collide ?? !NO_COLLIDE.has(kind);
  const vary = opts.vary || 0;
  const base = (seedCounter++) * 7919;
  for (let i = 0; i < P.count; i++) {
    _v.fromBufferAttribute(P, i).applyMatrix4(matrix);
    b.pos.push(_v.x, _v.y, _v.z);
    if (collide) colPos.push(_v.x, _v.y, _v.z);
    _n.fromBufferAttribute(N, i).applyMatrix3(_nm).normalize();
    b.nor.push(_n.x, _n.y, _n.z);
    const c = cols[Math.min(cols.length - 1, Math.floor(i / per))];
    const k = vary ? 1 + (hash2(base + Math.floor(i / 3), 31) - 0.5) * 2 * vary : 1;
    b.col.push(c[0] * k, c[1] * k, c[2] * k);
  }
}

const UNIT_BOX = new THREE.BoxGeometry(1, 1, 1).toNonIndexed(); // faces: +x -x +y -y +z -z
const geomCache = new Map();
function cached(key, make) { let g = geomCache.get(key); if (!g) { g = make(); if (g.index) g = g.toNonIndexed(); geomCache.set(key, g); } return g; }
const cylG = (seg = 16) => cached('cyl' + seg, () => new THREE.CylinderGeometry(1, 1, 1, seg));
const coneG = (seg = 5) => cached('cone' + seg, () => new THREE.ConeGeometry(1, 1, seg));
const sphG = () => cached('sph', () => new THREE.SphereGeometry(1, 14, 10));
const icoG = () => cached('ico', () => new THREE.IcosahedronGeometry(1, 1));
const dodG = () => cached('dod', () => new THREE.DodecahedronGeometry(1, 0));

function box(group, x0, y0, z0, x1, y1, z1, color, opts = {}) {
  _m.compose(
    _p.set((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2), _q.identity(),
    _s.set(Math.abs(x1 - x0) || 1e-3, Math.abs(y1 - y0) || 1e-3, Math.abs(z1 - z0) || 1e-3));
  emit(group, opts.kind || 'matte', UNIT_BOX, _m, color, opts);
}
function solid(x0, y0, z0, x1, y1, z1) {
  _m.compose(_p.set((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2), _q.identity(),
    _s.set(Math.abs(x1 - x0), Math.abs(y1 - y0), Math.abs(z1 - z0)));
  const P = UNIT_BOX.attributes.position;
  for (let i = 0; i < P.count; i++) { _v.fromBufferAttribute(P, i).applyMatrix4(_m); colPos.push(_v.x, _v.y, _v.z); }
}
function obj(group, kind, geom, px, py, pz, rx, ry, rz, sx, sy, sz, color, opts = {}) {
  _m.compose(_p.set(px, py, pz), _q.setFromEuler(_e.set(rx, ry, rz, 'YXZ')), _s.set(sx, sy, sz));
  emit(group, kind, geom, _m, color, opts);
}
// Stretch a unit geometry whose axis is +y so it runs from point a to point b.
const _up = new THREE.Vector3(0, 1, 0), _dir = new THREE.Vector3(), _mid = new THREE.Vector3();
function span(group, kind, geom, a, b, sx, sz, color, opts = {}, spin = 0) {
  _dir.subVectors(b, a); const len = _dir.length(); _dir.normalize();
  _q.setFromUnitVectors(_up, _dir);
  if (spin) _q.multiply(new THREE.Quaternion().setFromAxisAngle(_up, spin));
  _m.compose(_mid.addVectors(a, b).multiplyScalar(0.5), _q, _s.set(sx, len, sz));
  emit(group, kind, geom, _m, color, opts);
}

const _a = new THREE.Vector3(), _b = new THREE.Vector3(), _c = new THREE.Vector3();
const _ab = new THREE.Vector3(), _ac = new THREE.Vector3(), _fn = new THREE.Vector3(), _ff = new THREE.Vector3(), _sw = new THREE.Vector3();
// One triangle. opts.face flips the winding so the triangle faces that direction;
// opts.normals supplies smooth per-vertex normals. A null group means collision only.
function tri(group, kind, A, B, C, color, opts = {}) {
  _a.fromArray(A); _b.fromArray(B); _c.fromArray(C);
  _fn.crossVectors(_ab.subVectors(_b, _a), _ac.subVectors(_c, _a));
  if (_fn.lengthSq() < 1e-14) return;
  _fn.normalize();
  let ns = opts.normals;
  if (opts.face && _fn.dot(_ff.fromArray(opts.face)) < 0) {
    _sw.copy(_b); _b.copy(_c); _c.copy(_sw); _fn.negate();
    if (ns) ns = [ns[0], ns[2], ns[1]];
  }
  const collide = opts.collide ?? (group ? !NO_COLLIDE.has(kind) : true);
  if (collide) colPos.push(_a.x, _a.y, _a.z, _b.x, _b.y, _b.z, _c.x, _c.y, _c.z);
  if (!group) return;
  const bk = bucket(group, kind), c = lin(color);
  const vs = [_a, _b, _c];
  for (let i = 0; i < 3; i++) {
    bk.pos.push(vs[i].x, vs[i].y, vs[i].z);
    if (ns) bk.nor.push(ns[i][0], ns[i][1], ns[i][2]); else bk.nor.push(_fn.x, _fn.y, _fn.z);
    bk.col.push(c[0], c[1], c[2]);
  }
}
function quad(group, kind, A, B, C, D, color, opts = {}) {
  tri(group, kind, A, B, C, color, opts);
  tri(group, kind, A, C, D, color, opts);
}

function rectMinusHoles(R, holes) {
  if (!holes.length) return [R];
  const xs = new Set([R.x0, R.x1]), zs = new Set([R.z0, R.z1]);
  for (const h of holes) {
    for (const x of [h[0], h[1]]) if (x > R.x0 && x < R.x1) xs.add(x);
    for (const z of [h[2], h[3]]) if (z > R.z0 && z < R.z1) zs.add(z);
  }
  const X = [...xs].sort((a, b) => a - b), Z = [...zs].sort((a, b) => a - b), out = [];
  for (let i = 0; i < X.length - 1; i++) for (let j = 0; j < Z.length - 1; j++) {
    const cx = (X[i] + X[i + 1]) / 2, cz = (Z[j] + Z[j + 1]) / 2;
    if (holes.some(h => cx > h[0] && cx < h[1] && cz > h[2] && cz < h[3])) continue;
    out.push({ x0: X[i], x1: X[i + 1], z0: Z[j], z1: Z[j + 1] });
  }
  return out;
}

/* ------------------------------------------------------------ floor plans */
// Rooms are rectangles [x0, x1, z0, z1]. Walls are derived from room edges: a shared edge becomes
// an interior wall, an edge facing nothing becomes glass, red stone or cliff rock.
// Openings sit on a wall line: doors (default), arches, windows and one-way cliff glass.

const FLOORS = [
  {
    n: 1, title: 'Bedroom & terrace', y: 36.7, h: 4.0,
    rooms: [
      { name: 'Bedroom', r: [-6, 6, -5.5, 0], spawn: [0, -1.4] },
      { name: 'Stair hall', r: [-3.5, 3.5, -7.75, -5.5] },
      { name: 'Wardrobe', r: [-14, -6, -7.75, 0] },
      { name: 'Bathroom', r: [6, 14, -7.75, 0], spawn: [8, -1.2] },
    ],
    facade: { Wardrobe: { front: 'stone' }, Bathroom: { front: 'rock' } },
    openings: [
      { x: 0, z: -7.75, w: 1.5, h: 2.4 }, { x: -2.6, z: -5.5, w: 1.1 },
      { x: -6, z: -2.8, w: 1.2 }, { x: 6, z: -2.8, w: 1.2 }, { x: 0, z: 0, w: 3.2 },
      { x: -10, z: 0, w: 3.2, kind: 'window', sill: 0.9, head: 3.1 },
      { x: 10.5, z: 0, w: 1.8, kind: 'window', sill: 0.55, head: 1.55 },
    ],
    decks: [{ name: 'Terrace', r: [-14, 14, 0, 10], spawn: [0, 4.2], pools: [{ r: [-11, 11, 7, 10], depth: 1.2, edge: 'front' }] }],
  },
  {
    n: 2, title: 'Children', y: 32.8, h: 3.4,
    rooms: [
      { name: 'Hall', r: [[-3.5, 3.5, -7.75, -2.5], [-14, 5, -2.5, -1]], spawn: [0, -4] },
      { name: "Hisako's room", r: [-14, -7.5, -1, 4] },
      { name: "Eva's room", r: [-7.5, -1.5, -1, 4] },
      { name: "Hope's room", r: [-1.5, 5, -1, 4], spawn: [0.5, 2.5] },
      { name: 'Game room', r: [5, 14, -7.75, 4], spawn: [9.5, -1.5] },
      { name: 'Bathroom', r: [-9, -3.5, -7.75, -2.5] },
      { name: 'Storage', r: [-14, -9, -7.75, -2.5] },
    ],
    facade: { "Hisako's room": { front: 'stonewin' }, "Eva's room": { front: 'stonewin' }, "Hope's room": { front: 'stonewin' } },
    openings: [
      { x: 0, z: -7.75, w: 1.5, h: 2.4 }, { x: -10.75, z: -1, w: 1 }, { x: -4.5, z: -1, w: 1 }, { x: 1.75, z: -1, w: 1 },
      { x: 5, z: -1.75, w: 1.1 }, { x: -6.25, z: -2.5, w: 1 }, { x: -11.5, z: -2.5, w: 1 }, { x: 9.5, z: 4, w: 2.6 },
    ],
    decks: [{ name: "Kids' balcony", r: [5, 14, 4, 7] }],
  },
  {
    n: 3, title: 'Essentials', y: 28.7, h: 3.6,
    rooms: [
      { name: 'Hall', r: [[-3.5, 3.5, -7.75, -3], [-9, 14, -3, -1.5]], spawn: [0, -4.5] },
      { name: "Rachel's quiet room", r: [-14, -9, -7.75, 4], spawn: [-11.5, -3] },
      { name: "Kate's office", r: [-9, -3.5, -1.5, 4], spawn: [-6.2, 0] },
      { name: 'Sunroom', r: [-3.5, 5, -1.5, 4], spawn: [0.8, -0.4] },
      { name: 'Mini Bower', r: [5, 8.5, -1.5, 4], spawn: [6, -0.6] },
      { name: "Ai's music room", r: [8.5, 14, -1.5, 4], spawn: [11.2, 0] },
      { name: 'Gym', r: [3.5, 14, -7.75, -3] },
      { name: 'Linen & utility', r: [-9, -3.5, -7.75, -3] },
    ],
    facade: {
      "Rachel's quiet room": { front: 'stone' }, "Kate's office": { front: 'stonewin' },
      'Mini Bower': { front: 'stone' }, "Ai's music room": { front: 'stonewin' },
    },
    openings: [
      { x: 0, z: -7.75, w: 1.5, h: 2.4 }, { x: -9, z: -2.25, w: 1 }, { x: -6.25, z: -1.5, w: 1 }, { x: 0.75, z: -1.5, w: 1.4 },
      { x: 11.25, z: -1.5, w: 1 }, { x: 8.75, z: -3, w: 1.4 }, { x: -6.25, z: -3, w: 1 }, { x: 5, z: 1.25, w: 1.8, kind: 'arch' },
    ],
  },
  {
    n: 4, title: 'Family common', y: 24.0, h: 4.2,
    rooms: [
      { name: 'Entry', r: [-14, -10, -1, 6] },
      { name: 'Living room', r: [-10, 4, -1, 6], spawn: [-3, 3.3] },
      { name: 'Stair hall', r: [-3.5, 3.5, -7.75, -1], spawn: [0, -5] },
      { name: 'Dining', r: [4, 9, -1, 6], spawn: [4.8, 2.5] },
      { name: 'Kitchen', r: [9, 14, -1, 6], spawn: [9.7, 0.2] },
      { name: "Ororo's guest room", r: [-14, -9, -7.75, -1] },
      { name: 'Guest room', r: [-9, -3.5, -7.75, -1] },
      { name: 'Guest bath', r: [3.5, 7, -7.75, -1] },
      { name: 'Pantry', r: [7, 14, -7.75, -1] },
    ],
    open: [['Living room', 'Stair hall'], ['Dining', 'Kitchen']],
    facade: { Entry: { front: 'stone' }, Kitchen: { front: 'stone' } },
    openings: [
      { x: 0, z: -7.75, w: 1.5, h: 2.4 }, { x: -14, z: 2.5, w: 1.5, h: 2.6 }, { x: -10, z: 2.5, w: 2.6, kind: 'arch' },
      { x: 4, z: 2.5, w: 5, kind: 'arch' }, { x: -11.5, z: -1, w: 1 }, { x: -3.5, z: -4.4, w: 1 }, { x: 3.5, z: -4.4, w: 1 },
      { x: 11.5, z: -1, w: 1.2 }, { x: 14, z: 3, w: 1.4, kind: 'window', sill: 1.1, head: 3.6 },
    ],
    decks: [{ name: 'Front door landing', r: [-20, -14, 0, 5], noRail: ['back'], spawn: [-17, 2.5] }],
  },
  {
    n: 5, title: 'Play floor', y: 20.1, h: 3.4, frontDefault: 'stone',
    rooms: [
      { name: 'Arcade & bar', r: [-14, 8, -7.75, 1], spawn: [-1.5, -5.5] },
      { name: 'Cinema', r: [8, 14, -7.75, 1], spawn: [9, -7] },
    ],
    openings: [{ x: 0, z: -7.75, w: 1.5, h: 2.4 }, { x: 8, z: -7.0, w: 1.2 }, { x: -14, z: -6.5, w: 1.2 }],
  },
  {
    n: 6, title: 'Library & receiving', y: 15.4, h: 4.2,
    rooms: [
      { name: 'Library', r: [-14, -3, -9, 3], spawn: [-8, -1] },
      { name: 'Lounge', r: [[-3, 14, -2, 3], [8, 14, -7.75, -2]], spawn: [3, 1.8] },
      { name: 'Receiving hall', r: [-3, 3.5, -7.75, -2], spawn: [0, -5] },
      { name: 'Cloakroom', r: [3.5, 8, -7.75, -2] },
    ],
    open: [['Lounge', 'Receiving hall']],
    openings: [
      { x: 0, z: -7.75, w: 1.5, h: 2.4 }, { x: -3, z: 0.5, w: 4, kind: 'arch' }, { x: -3, z: -5, w: 1.2 },
      { x: 3.5, z: -4.8, w: 1 }, { x: -14, z: -1, w: 1.2 },
    ],
  },
  {
    n: 7, title: 'Spa & recovery', y: 11.3, h: 3.6, inRock: true,
    rooms: [
      { name: 'Spa hall', r: [[-14, 14, -6.5, -5], [-3.5, 3.5, -7.75, -6.5]], spawn: [0, -6] },
      { name: 'Thermal pools', r: [-14, 3, -5, -0.4], spawn: [-5.5, -4.6] },
      { name: 'Sauna', r: [3, 6.5, -5, -0.4] },
      { name: 'Cold plunge', r: [6.5, 10, -5, -0.4], spawn: [8.25, -4.7] },
      { name: 'Steam room', r: [10, 14, -5, -0.4] },
      { name: 'UV alcove 1', r: [-14, -10.5, -9.5, -6.5] },
      { name: 'UV alcove 2', r: [-10.5, -7, -9.5, -6.5] },
      { name: 'UV alcove 3', r: [-7, -3.5, -9.5, -6.5] },
      { name: 'Treatment room', r: [3.5, 8.5, -11, -6.5] },
      { name: 'Medic station', r: [8.5, 14, -11, -6.5] },
    ],
    openings: [
      { x: 0, z: -7.75, w: 1.5, h: 2.4 }, { x: -6, z: -5, w: 1.6 }, { x: 8.25, z: -5, w: 1.1 },
      { x: 6.5, z: -2.7, w: 0.9 }, { x: 10, z: -2.7, w: 0.9 },
      { x: -12.25, z: -6.5, w: 1 }, { x: -8.75, z: -6.5, w: 1 }, { x: -5.25, z: -6.5, w: 1 }, { x: 6, z: -6.5, w: 1 }, { x: 11.25, z: -6.5, w: 1 },
      { x: -9, z: -0.4, w: 7, kind: 'oneway', sill: 0.35, head: 3.2 },
      { x: -2.25, z: -0.4, w: 3.5, kind: 'oneway', sill: 0.35, head: 3.2 },
      { x: 1.5, z: -0.4, w: 2, kind: 'oneway', sill: 0.35, head: 3.2 },
      { x: 4.75, z: -0.4, w: 0.7, kind: 'oneway', sill: 1.2, head: 1.9 },
      { x: 12, z: -0.4, w: 0.7, kind: 'oneway', sill: 1.2, head: 1.9 },
    ],
    pools: [
      { r: [-13, -6, -4.3, -1.1], depth: 1.1, temp: 'hot' },
      { r: [-5, -0.6, -4.3, -1.3], depth: 1.0, temp: 'warm' },
      { r: [0.2, 2.4, -3.9, -1.6], depth: 1.2, temp: 'cold' },
      { r: [7.1, 9.4, -4.4, -1.4], depth: 1.6, temp: 'cold' },
    ],
  },
  {
    n: 8, title: 'Armory & operations', y: 7.5, h: 3.3, inRock: true,
    rooms: [
      { name: 'Landing', r: [-3.5, 3.5, -7.75, -1.5], spawn: [0, -5] },
      { name: 'Armory', r: [-14, -3.5, -12, -1.5], spawn: [-5, -6.5] },
      { name: 'Operations room', r: [-14, -3.5, -18, -12], spawn: [-8.75, -12.9] },
    ],
    openings: [{ x: 0, z: -7.75, w: 1.5, h: 2.4 }, { x: -3.5, z: -4.5, w: 1.4 }, { x: -8.75, z: -12, w: 1.3 }, { x: -14, z: -16.8, w: 1.1 }],
  },
  { n: 9, title: 'Grotto', y: 1.5, h: 5.2, inRock: true, grotto: true, rooms: [], openings: [] },
];
const byN = n => FLOORS[n - 1];
const TOP_Y = FLOORS[0].y + FLOORS[0].h + 0.2; // 40.9, the roof of the top floor
FLOORS.forEach((F, i) => { F.top = i === 0 ? TOP_Y : FLOORS[i - 1].y; });

const floorGroups = {}, ceilGroups = {}, labelObjs = {};
for (const F of FLOORS) {
  F.group = floorGroups[F.n] = new THREE.Group();
  F.ceil = ceilGroups[F.n] = new THREE.Group();
  labelObjs[F.n] = [];
  scene.add(F.group, F.ceil);
  F.rects = [];
  for (const room of F.rooms) {
    const list = Array.isArray(room.r[0]) ? room.r : [room.r];
    for (const r of list) F.rects.push({ room, x0: r[0], x1: r[1], z0: r[2], z1: r[3] });
  }
  F.roomAt = (x, z) => {
    for (const R of F.rects) if (x > R.x0 && x < R.x1 && z > R.z0 && z < R.z1) return R.room;
    return null;
  };
  F.deckAt = (x, z) => (F.decks || []).find(D => x > D.r[0] && x < D.r[1] && z > D.r[2] && z < D.r[3]) || null;
}
const exterior = new THREE.Group();   // the Keep's own outside: piers, blades, ledges
const site = new THREE.Group();       // cliff, beach, jungle, the White Palace
site.userData.noShadow = true;
scene.add(exterior, site);

function isOpenPair(F, A, B) {
  return (F.open || []).some(([p, q]) => (p === A.name && q === B.name) || (p === B.name && q === A.name));
}
function perimType(F, room, side, lineC, mid) {
  const ov = F.facade && F.facade[room.name] && F.facade[room.name][side];
  if (ov) return ov;
  if (F.inRock || side === 'back') return 'rock';
  if (side === 'front') return lineC > -0.01 ? (F.frontDefault || 'glass') : 'rock';
  return mid > 0 ? 'stone' : 'rock';
}

function buildWalls(F) {
  const lines = new Map();
  const addEdge = (axis, c, a, b) => {
    const k = axis + ':' + c.toFixed(3);
    let L = lines.get(k);
    if (!L) { L = { axis, c, iv: [] }; lines.set(k, L); }
    L.iv.push([Math.min(a, b), Math.max(a, b)]);
  };
  for (const R of F.rects) {
    addEdge('z', R.z0, R.x0, R.x1); addEdge('z', R.z1, R.x0, R.x1);
    addEdge('x', R.x0, R.z0, R.z1); addEdge('x', R.x1, R.z0, R.z1);
  }
  const segs = [];
  for (const L of lines.values()) {
    const pts = new Set();
    for (const [a, b] of L.iv) { pts.add(a); pts.add(b); }
    if (L.axis === 'x') pts.add(0);
    const arr = [...pts].sort((a, b) => a - b);
    for (let i = 0; i < arr.length - 1; i++) {
      const p = arr[i], q = arr[i + 1];
      if (q - p < 1e-3) continue;
      const m = (p + q) / 2;
      if (!L.iv.some(([a, b]) => m > a && m < b)) continue;
      const e = 0.05;
      const A = L.axis === 'z' ? F.roomAt(m, L.c - e) : F.roomAt(L.c - e, m);
      const B = L.axis === 'z' ? F.roomAt(m, L.c + e) : F.roomAt(L.c + e, m);
      if (A === B) continue;
      let type, sign = 0;
      if (A && B) {
        if (isOpenPair(F, A, B)) continue;
        type = 'int';
      } else {
        const room = A || B;
        sign = A ? 1 : -1;
        const side = L.axis === 'z' ? (sign > 0 ? 'front' : 'back') : (sign > 0 ? 'south' : 'north');
        type = perimType(F, room, side, L.c, m);
      }
      segs.push({ axis: L.axis, c: L.c, a: p, b: q, type, sign, key: (A ? A.name : '-') + '|' + (B ? B.name : '-') });
    }
  }
  segs.sort((s, t) => (s.axis + s.c).localeCompare(t.axis + t.c) || s.a - t.a);
  const merged = [];
  for (const s of segs) {
    const last = merged[merged.length - 1];
    if (last && last.axis === s.axis && last.c === s.c && last.type === s.type && last.sign === s.sign && last.key === s.key && Math.abs(last.b - s.a) < 1e-6) last.b = s.b;
    else merged.push({ ...s });
  }
  for (const s of merged) wallSegment(F, s);
}

const WALL_T = { int: 0.14, glass: 0.1, stone: 0.34, stonewin: 0.34, rock: 0.34 };
function faceColors(axis, sign, inner, outer) {
  if (axis === 'z') return [inner, inner, inner, inner, sign > 0 ? outer : inner, sign < 0 ? outer : inner];
  return [sign > 0 ? outer : inner, sign < 0 ? outer : inner, inner, inner, inner, inner];
}
function wallSegment(F, s) {
  const { axis, c, type, sign } = s;
  const h = F.h, y = F.y, t = WALL_T[type];
  let a = s.a, b = s.b;
  if (type !== 'int' && type !== 'glass') { a -= t / 2; b += t / 2; }
  const ops = [];
  for (const o of F.openings) {
    const along = axis === 'z' ? o.x : o.z, across = axis === 'z' ? o.z : o.x;
    if (Math.abs(across - c) > 0.06 || along <= s.a || along >= s.b) continue;
    const kind = o.kind || 'door';
    let y0 = 0, y1;
    if (kind === 'door') y1 = Math.min(o.h || 2.3, h - 0.15);
    else if (kind === 'arch') y1 = h - 0.35;
    else { y0 = o.sill; y1 = o.head; }
    ops.push({ lo: along - o.w / 2, hi: along + o.w / 2, y0, y1, kind });
  }
  if (type === 'stonewin' && !ops.length) {
    const len = s.b - s.a, w = Math.min(len - 1.4, len * 0.62), mid = (s.a + s.b) / 2;
    if (w > 0.8) ops.push({ lo: mid - w / 2, hi: mid + w / 2, y0: 0.55, y1: h - 0.45, kind: 'window' });
  }
  ops.sort((p, q) => p.lo - q.lo);
  const inner = PAL[F.n].wall;
  const outer = type === 'stone' || type === 'stonewin' ? RED : type === 'rock' ? ROCK_DK : inner;
  const cols = faceColors(axis, sign, inner, outer);
  const put = (lo, hi, y0, y1, tt, col, opts) => {
    if (hi - lo < 0.01 || y1 - y0 < 0.01) return;
    if (axis === 'z') box(F.group, lo, y + y0, c - tt / 2, hi, y + y1, c + tt / 2, col, opts);
    else box(F.group, c - tt / 2, y + y0, lo, c + tt / 2, y + y1, hi, col, opts);
  };
  if (type === 'glass') {
    put(a, b, h - 0.12, h, 0.12, TIMBER);
    let cur = a;
    const spans = [];
    for (const o of ops) { spans.push([cur, Math.max(cur, o.lo)]); cur = Math.min(b, o.hi); }
    spans.push([cur, b]);
    for (const [lo, hi] of spans) {
      if (hi - lo < 0.05) continue;
      put(lo, hi, 0, 0.06, 0.12, TIMBER);
      const n = Math.max(1, Math.ceil((hi - lo) / 2.1));
      for (let i = 0; i <= n; i++) { const m = lo + (hi - lo) * i / n; put(m - 0.045, m + 0.045, 0, h - 0.12, 0.12, TIMBER); }
      put(lo, hi, 0.06, h - 0.12, 0.03, GLASS, { kind: 'glass' });
    }
    return;
  }
  let cur = a;
  for (const o of ops) {
    const lo = Math.max(o.lo, a), hi = Math.min(o.hi, b);
    put(cur, lo, 0, h, t, cols);
    put(lo, hi, 0, o.y0, t, cols);
    put(lo, hi, o.y1, h, t, cols);
    if (o.kind === 'window') {
      put(lo, hi, o.y0, o.y1, 0.03, GLASS, { kind: 'glass' });
      put(lo - 0.04, hi + 0.04, o.y0 - 0.05, o.y0, t + 0.06, TIMBER);
    }
    cur = hi;
  }
  put(cur, b, 0, h, t, cols);
}

function buildSlabs(F) {
  const pal = PAL[F.n], side = F.inRock ? ROCK : RED, y = F.y, h = F.h;
  for (const R of F.rects) {
    const holes = (F.pools || []).map(p => p.r).filter(r => r[0] < R.x1 && r[1] > R.x0 && r[2] < R.z1 && r[3] > R.z0);
    for (const q of rectMinusHoles(R, holes)) box(F.group, q.x0, y - 0.3, q.z0, q.x1, y, q.z1, [side, side, pal.floor, side, side, side]);
    box(F.ceil, R.x0, y + h, R.z0, R.x1, y + h + 0.2, R.z1, [side, side, side, pal.ceil, side, side]);
  }
  for (const P of F.pools || []) buildPool(F.group, y, P, F.inRock ? ROCK : RED);
}

function buildPool(g, y, P, outer = RED) {
  const [x0, x1, z0, z1] = P.r, d = P.depth, w = 0.22, rim = 0xcfc4b3;
  const tile = P.temp === 'cold' ? 0x77a9b8 : P.temp === 'hot' ? 0x4b8e95 : 0x5aa5ad;
  const o = outer, nc = { collide: false };
  box(g, x0 - w, y - d - w, z0 - w, x1 + w, y - d, z1 + w, [o, o, tile, o, o, o], nc);
  box(g, x0 - w, y - d, z0 - w, x0 + 0.01, y - 0.005, z1 + w, [tile, o, rim, o, o, o], nc);
  box(g, x1 - 0.01, y - d, z0 - w, x1 + w, y - 0.005, z1 + w, [o, tile, rim, o, o, o], nc);
  box(g, x0, y - d, z0 - w, x1, y - 0.005, z0 + 0.01, [o, o, rim, o, tile, o], nc);
  box(g, x0, y - d, z1 - 0.01, x1, y - 0.005, z1 + w, [o, o, rim, o, o, tile], nc);
  box(g, x0, y - 0.13, z0, x1, y - 0.11, z1, 0x2f8f9c, { kind: 'water' });
  solid(x0, y - 0.45, z0, x1, y - 0.2, z1); // you wade rather than sink
}

function buildDeck(F, D) {
  const y = F.y, g = F.group, [x0, x1, z0, z1] = D.r;
  const holes = (D.pools || []).map(p => p.r);
  for (const q of rectMinusHoles({ x0, x1, z0, z1 }, holes)) box(g, q.x0, y - 0.3, q.z0, q.x1, y, q.z1, [RED, RED, 0xa38b72, RED_DK, RED, RED]);
  for (const P of D.pools || []) buildPool(g, y, P);
  const edges = [
    { side: 'back', axis: 'z', c: z0, a: x0, b: x1, out: -1 },
    { side: 'front', axis: 'z', c: z1, a: x0, b: x1, out: 1 },
    { side: 'north', axis: 'x', c: x0, a: z0, b: z1, out: -1 },
    { side: 'south', axis: 'x', c: x1, a: z0, b: z1, out: 1 },
  ];
  for (const E of edges) {
    if (D.noRail && D.noRail.includes(E.side)) continue;
    const step = 0.25;
    let runStart = null, runKind = null;
    const close = end => { if (runKind && end - runStart > 0.05) railRun(F, E, runStart, end, runKind); };
    for (let u = E.a; u < E.b - 1e-6; u += step) {
      const m = Math.min(u + step / 2, E.b);
      const px = E.axis === 'z' ? m : E.c + E.out * 0.1, pz = E.axis === 'z' ? E.c + E.out * 0.1 : m;
      let k = 'rail';
      if (F.roomAt(px, pz) || (F.deckAt(px, pz) && F.deckAt(px, pz) !== D)) k = null;
      else if ((D.pools || []).some(p => p.edge === E.side && (E.axis === 'z' ? m > p.r[0] && m < p.r[1] : m > p.r[2] && m < p.r[3]))) k = 'edge';
      if (k !== runKind) { close(u); runStart = u; runKind = k; }
    }
    close(E.b);
  }
}
function railRun(F, E, lo, hi, kind) {
  const y = F.y, g = F.group, inset = -E.out * 0.06, c = E.c + inset;
  const put = (a, b, y0, y1, t, col, opts) => {
    if (E.axis === 'z') box(g, a, y + y0, c - t / 2, b, y + y1, c + t / 2, col, opts);
    else box(g, c - t / 2, y + y0, a, c + t / 2, y + y1, b, col, opts);
  };
  if (kind === 'edge') {
    if (E.axis === 'z') solid(lo, y - 0.3, c - 0.05, hi, y + 1.2, c + 0.05); else solid(c - 0.05, y - 0.3, lo, c + 0.05, y + 1.2, hi);
    put(lo, hi, -0.03, -0.005, 0.04, 0xffd49a, { kind: 'glow' });
    return;
  }
  put(lo, hi, 0.05, 1.0, 0.03, GLASS, { kind: 'glass' });
  put(lo, hi, 1.0, 1.06, 0.07, BRASS, { kind: 'metal' });
  const n = Math.max(1, Math.round((hi - lo) / 1.6));
  for (let i = 0; i <= n; i++) { const m = lo + (hi - lo) * i / n; put(m - 0.03, m + 0.03, 0, 1.0, 0.06, BRASS, { kind: 'metal', collide: false }); }
}

/* -------------------------------------------------------------- furniture */

function kit(F) {
  const g = F.group, y = F.y;
  const K = {
    box: (x0, x1, z0, z1, h0, h1, col, o) => box(g, x0, y + h0, z0, x1, y + h1, z1, col, o),
    deco: (x0, x1, z0, z1, h0, h1, col, o = {}) => box(g, x0, y + h0, z0, x1, y + h1, z1, col, { collide: false, ...o }),
    glow: (x0, x1, z0, z1, h0, h1, col) => box(g, x0, y + h0, z0, x1, y + h1, z1, col, { kind: 'glow' }),
    ceilGlow: (x0, x1, z0, z1, col) => box(F.ceil, x0, y + F.h - 0.02, z0, x1, y + F.h, z1, col, { kind: 'glow' }),
    cyl: (x, z, r, h0, h1, col, o = {}) => obj(g, o.kind || 'matte', cylG(o.seg || 18), x, y + (h0 + h1) / 2, z, 0, 0, 0, r, h1 - h0, r, col, o),
    ball: (x, h, z, r, col, o = {}) => obj(g, o.kind || 'satin', sphG(), x, y + h, z, 0, 0, 0, r, r, r, col, { collide: false, ...o }),
    rug: (x0, x1, z0, z1, col) => box(g, x0, y, z0, x1, y + 0.012, z1, col, { collide: false }),
    // facing: direction the person sitting looks: 'x+', 'x-', 'z+', 'z-'
    sofa(x0, x1, z0, z1, facing, col, back = 0.95) {
      K.box(x0, x1, z0, z1, 0, 0.42, col);
      const bd = 0.24, arm = 0.2;
      if (facing === 'z+') { K.box(x0, x1, z0, z0 + bd, 0.42, back, col); K.box(x0, x0 + arm, z0, z1, 0.42, 0.64, col); K.box(x1 - arm, x1, z0, z1, 0.42, 0.64, col); }
      if (facing === 'z-') { K.box(x0, x1, z1 - bd, z1, 0.42, back, col); K.box(x0, x0 + arm, z0, z1, 0.42, 0.64, col); K.box(x1 - arm, x1, z0, z1, 0.42, 0.64, col); }
      if (facing === 'x+') { K.box(x0, x0 + bd, z0, z1, 0.42, back, col); K.box(x0, x1, z0, z0 + arm, 0.42, 0.64, col); K.box(x0, x1, z1 - arm, z1, 0.42, 0.64, col); }
      if (facing === 'x-') { K.box(x1 - bd, x1, z0, z1, 0.42, back, col); K.box(x0, x1, z0, z0 + arm, 0.42, 0.64, col); K.box(x0, x1, z1 - arm, z1, 0.42, 0.64, col); }
    },
    bed(x0, x1, z0, z1, head, sheet = CREAM, frame = TIMBER) {
      K.box(x0, x1, z0, z1, 0, 0.36, frame);
      K.box(x0 + 0.05, x1 - 0.05, z0 + 0.05, z1 - 0.05, 0.36, 0.6, sheet);
      const pw = 0.5;
      if (head === 'z-') { K.box(x0, x1, z0 - 0.08, z0, 0, 1.15, frame); K.deco(x0 + 0.15, x1 - 0.15, z0 + 0.1, z0 + 0.1 + pw, 0.6, 0.74, 0xf1ebe0); }
      if (head === 'z+') { K.box(x0, x1, z1, z1 + 0.08, 0, 1.15, frame); K.deco(x0 + 0.15, x1 - 0.15, z1 - 0.1 - pw, z1 - 0.1, 0.6, 0.74, 0xf1ebe0); }
      if (head === 'x-') { K.box(x0 - 0.08, x0, z0, z1, 0, 1.15, frame); K.deco(x0 + 0.1, x0 + 0.1 + pw, z0 + 0.15, z1 - 0.15, 0.6, 0.74, 0xf1ebe0); }
      if (head === 'x+') { K.box(x1, x1 + 0.08, z0, z1, 0, 1.15, frame); K.deco(x1 - 0.1 - pw, x1 - 0.1, z0 + 0.15, z1 - 0.15, 0.6, 0.74, 0xf1ebe0); }
    },
    table(x0, x1, z0, z1, h, col = TIMBER_MID) {
      K.box(x0, x1, z0, z1, h - 0.05, h, col, { kind: 'satin' });
      const l = 0.06;
      for (const [x, z] of [[x0 + l, z0 + l], [x1 - l, z0 + l], [x0 + l, z1 - l], [x1 - l, z1 - l]]) K.deco(x - l / 2, x + l / 2, z - l / 2, z + l / 2, 0, h - 0.05, col);
    },
    chair(x, z, col = TIMBER_MID, facing = 'z+') {
      K.box(x - 0.23, x + 0.23, z - 0.23, z + 0.23, 0.42, 0.47, col, { kind: 'satin' });
      K.deco(x - 0.2, x + 0.2, z - 0.2, z + 0.2, 0, 0.42, col);
      if (facing === 'z+') K.box(x - 0.23, x + 0.23, z - 0.25, z - 0.2, 0.47, 0.95, col);
      if (facing === 'z-') K.box(x - 0.23, x + 0.23, z + 0.2, z + 0.25, 0.47, 0.95, col);
      if (facing === 'x+') K.box(x - 0.25, x - 0.2, z - 0.23, z + 0.23, 0.47, 0.95, col);
      if (facing === 'x-') K.box(x + 0.2, x + 0.25, z - 0.23, z + 0.23, 0.47, 0.95, col);
    },
    shelf(x0, x1, z0, z1, h, col = TIMBER, books = true) {
      K.box(x0, x1, z0, z1, 0, h, col);
      if (!books) return;
      const along = x1 - x0 > z1 - z0, rows = Math.floor(h / 0.36);
      const bookCols = [0x6e2a24, 0x2e4a52, 0x8a6a3a, 0x3f3a52, 0x9c8e70, 0x4d5b36];
      for (let r = 0; r < rows; r++) {
        const h0 = 0.08 + r * 0.36, h1 = h0 + 0.26;
        if (along) {
          const face = Math.abs(z1) < Math.abs(z0) ? z1 : z0, sgn = face === z1 ? 1 : -1;
          K.deco(x0 + 0.05, x1 - 0.05, face + sgn * 0.001, face + sgn * 0.012, h0, h1, bookCols[r % 6]);
        } else {
          const face = Math.abs(x1) < Math.abs(x0) ? x1 : x0, sgn = face === x1 ? 1 : -1;
          K.deco(face + sgn * 0.001, face + sgn * 0.012, z0 + 0.05, z1 - 0.05, h0, h1, bookCols[r % 6]);
        }
      }
    },
    plant(x, z, s = 1) {
      K.cyl(x, z, 0.22 * s, 0, 0.42 * s, 0x6b4a3a, { collide: false });
      K.ball(x, 0.75 * s, z, 0.38 * s, 0x3f6b35, { kind: 'matte' });
      K.ball(x + 0.12 * s, 1.0 * s, z - 0.08 * s, 0.26 * s, 0x4c7a3d, { kind: 'matte' });
    },
    screen(x0, x1, z0, z1, h0, h1) { K.deco(x0, x1, z0, z1, h0, h1, SCREEN, { kind: 'satin' }); },
    frames(axis, c, from, to, h0, h1, n, seed = 1) {
      for (let i = 0; i < n; i++) {
        const u = lerp(from, to, (i + 0.5) / n) + (hash2(i, seed) - 0.5) * 0.3, hh = lerp(h0, h1, hash2(seed, i)), w = 0.25 + hash2(i + 9, seed) * 0.25;
        const col = [0x2d2320, 0xc9b79c, 0x6e2a24][i % 3];
        if (axis === 'x') K.deco(c - 0.02, c + 0.02, u - w / 2, u + w / 2, hh, hh + w * 1.2, col);
        else K.deco(u - w / 2, u + w / 2, c - 0.02, c + 0.02, hh, hh + w * 1.2, col);
      }
    },
  };
  return K;
}

function furnish1(F) {
  const K = kit(F), g = F.group, y = F.y;
  // Bedroom: the bed for three against the back wall, four-poster, Kate's red curtains.
  K.rug(-3.8, 3.8, -3.1, -0.7, 0x6d2622);
  K.bed(-1.5, 1.5, -5.4, -3.0, 'z-', 0xe7ddcb);
  for (const [x, z] of [[-1.47, -5.37], [1.47, -5.37], [-1.47, -3.03], [1.47, -3.03]]) K.box(x - 0.06, x + 0.06, z - 0.06, z + 0.06, 0, 2.75, TIMBER);
  K.deco(-1.53, 1.53, -5.43, -2.97, 2.68, 2.78, TIMBER);
  K.deco(-1.56, -1.5, -5.3, -4.5, 0.55, 2.68, 0x8a1f24); K.deco(1.5, 1.56, -5.3, -4.5, 0.55, 2.68, 0x8a1f24);
  K.deco(-1.56, -1.5, -3.7, -3.1, 0.55, 2.68, 0x8a1f24); K.deco(1.5, 1.56, -3.7, -3.1, 0.55, 2.68, 0x8a1f24);
  K.ceilGlow(-1.2, 1.2, -5.0, -3.4, 0xffd9a6);                   // warm UV panel above Rachel
  K.glow(0.25, 0.55, -5.44, -5.43, 0.95, 1.15, 0x7fd0e6);       // her health monitor, set into the wood
  K.cyl(-2.2, -4.9, 0.3, 0, 0.72, 0x5a3a24);                      // Kate's barrel side table
  K.box(1.9, 2.5, -5.4, -4.8, 0, 0.55, TIMBER_MID);
  K.cyl(4.7, -0.9, 0.05, 0, 1.25, BRASS, { kind: 'metal', collide: false });  // telescope by the window
  obj(g, 'metal', cylG(12), 4.75, y + 1.35, -0.75, 0, 0, 1.1, 0.07, 0.9, 0.07, BRASS, { collide: false });
  K.box(4.2, 5.9, -5.45, -3.9, 0, 0.45, 0x6d4b6a); K.deco(5.6, 5.9, -5.45, -3.9, 0.45, 1.1, 0x6d4b6a); // Rachel's reading nook
  K.glow(4.4, 4.6, -5.3, -5.1, 1.3, 1.5, 0xffe2b0);
  obj(g, 'satin', cached('wheel', () => new THREE.TorusGeometry(0.42, 0.04, 8, 24)), -5.92, y + 1.85, -2.8, 0, Math.PI / 2, 0, 1, 1, 1, TIMBER, { collide: false });
  obj(g, 'metal', UNIT_BOX, -5.93, y + 2.6, -1.3, 0.6, 0, 0, 0.02, 0.9, 0.05, 0x9aa0a4, { collide: false });
  obj(g, 'metal', UNIT_BOX, -5.93, y + 2.6, -1.3, -0.6, 0, 0, 0.02, 0.9, 0.05, 0x9aa0a4, { collide: false });
  K.frames('x', 5.93, -2.6, -0.6, 1.5, 2.2, 4, 3);
  K.plant(5.5, -0.35, 0.6);
  // Wardrobe: three sections around a shared mirror and vanity.
  K.cyl(-10, -3.9, 0.7, 0, 0.78, TIMBER_MID, { kind: 'satin' });
  K.box(-10.05, -9.95, -4.5, -3.3, 0.78, 2.3, 0xc8d4d8, { kind: 'metal' });
  K.box(-13.9, -13.3, -6.8, -1.2, 0, 2.2, 0x3b1a18);          // Kate
  K.box(-12.6, -7.6, -7.6, -7.0, 0, 2.2, 0xcbb9c9);           // Rachel
  K.box(-6.95, -6.35, -7.4, -3.6, 0, 2.2, 0x2f6f8f);          // Ai, the largest
  K.box(-13.2, -11.8, -0.6, -0.12, 0, 2.2, 0xc2473d); K.box(-8.2, -6.6, -0.6, -0.12, 0, 2.2, 0xe3b04b);
  // Bathroom: deep soaking tub in the middle, UV light above it, window at tub height.
  K.box(8.9, 11.9, -4.7, -2.9, 0, 0.62, 0xd8cfc2);
  K.deco(9.1, 11.7, -4.5, -3.1, 0.45, 0.5, 0x3b9aa6, { kind: 'water' });
  K.ceilGlow(9.2, 11.6, -4.4, -3.2, 0xffd9a6);
  K.box(7.0, 11.0, -7.6, -7.0, 0, 0.9, 0x8f7b69);
  K.box(12.3, 13.9, -7.6, -5.9, 0, 2.3, GLASS, { kind: 'glass' });
  K.plant(13.3, -1.0, 0.8); K.plant(6.8, -0.7, 0.6);
  // Terrace: a lounge under timber ribs (the curved-ribs look), garden beds, sunbathing stone, infinity pool.
  for (const rx of [-5.25, -3.75, -2.25, -0.75, 0.75, 2.25, 3.75, 5.25]) {
    const pts = [];
    for (let i = 0; i <= 10; i++) { const a = (i / 10) * Math.PI / 2; pts.push(new THREE.Vector3(rx, y + 3.9 * Math.cos(a), 0.15 + 3.45 * Math.sin(a))); }
    for (let i = 0; i < 10; i++) {
      span(g, 'satin', UNIT_BOX, pts[i], pts[i + 1], 0.12, 0.2, TIMBER, { collide: false });
      const c = new THREE.Vector3(rx, y, 0.15);
      const o0 = pts[i].clone().lerp(c, 0.035), o1 = pts[i + 1].clone().lerp(c, 0.035);
      span(g, 'glow', UNIT_BOX, o0, o1, 0.035, 0.035, 0xffcf8a);
    }
    solid(rx - 0.07, y, 3.4, rx + 0.07, y + 1.2, 3.7);
  }
  for (const a of [0.35, 0.85, 1.3]) {
    const zz = 0.15 + 3.45 * Math.sin(a), hh = 3.9 * Math.cos(a);
    box(g, -5.4, y + hh - 0.05, zz - 0.05, 5.4, y + hh + 0.05, zz + 0.05, TIMBER, { collide: false });
  }
  K.sofa(-5.0, -1.3, 0.9, 1.95, 'z+', 0xd6cbb8, 0.8);
  K.sofa(1.3, 5.0, 0.9, 1.95, 'z+', 0xd6cbb8, 0.8);
  K.box(-0.6, 0.6, 1.2, 1.9, 0, 0.38, TIMBER_MID, { kind: 'satin' });
  const bed = (x0, x1, z0, z1) => {
    K.box(x0, x1, z0, z1, 0, 0.55, RED_DK);
    K.deco(x0 + 0.08, x1 - 0.08, z0 + 0.08, z1 - 0.08, 0.55, 0.6, 0x4d3a2a);
    for (let i = 0; i < Math.floor((x1 - x0) * (z1 - z0) * 3); i++) {
      const px = lerp(x0 + 0.3, x1 - 0.3, rnd()), pz = lerp(z0 + 0.3, z1 - 0.3, rnd());
      const col = [0x4f7a3a, 0x3f6b35, 0x6b8f3f, 0xc2476a, 0xe3b04b, 0x9b5fc0][Math.floor(rnd() * 6)];
      K.ball(px, 0.66 + rnd() * 0.3, pz, 0.07 + rnd() * 0.12, col, { kind: 'matte' });
    }
  };
  bed(-13.4, -7.4, 0.6, 6.2); bed(-6.2, -1.4, 4.4, 6.2); bed(1.4, 6.2, 4.4, 6.2);
  K.box(7.0, 13.0, 2.4, 6.2, 0, 0.42, 0xb49a7e);                                   // sunbathing stone
  for (const x of [7.8, 9.9, 12.0]) K.deco(x - 0.45, x + 0.45, 3.0, 5.6, 0.42, 0.5, CREAM);
  K.glow(-11, 11, 6.99, 7.03, -0.03, -0.005, 0xffd49a);
}

function furnish2(F) {
  const K = kit(F);
  // Hisako: ordered, anime posters, manga towers.
  K.bed(-13.9, -11.9, 0.3, 2.6, 'x-', 0xc9d4e0);
  K.table(-9.4, -7.8, -0.85, -0.25, 0.75, 0xd8c7a8); K.chair(-8.6, -0.05, TIMBER_MID, 'z-');
  K.shelf(-7.95, -7.6, 0.6, 3.4, 2.0, 0xe6dccb);
  for (let i = 0; i < 4; i++) K.deco(-11.3 + i * 0.35, -11.1 + i * 0.35, 3.5, 3.7, 0, 0.5 + i * 0.2, [0xd94f4f, 0x3f7fbf, 0xe8c547, 0x6a4fbf][i]);
  for (let i = 0; i < 3; i++) K.deco(-13.95, -13.92, -0.4 + i * 1.2, 0.5 + i * 1.2, 1.4, 2.5, [0xe86a8f, 0x4fa3d9, 0xf2c14e][i]);
  // Eva: grounded, tactile, a corkboard full of pinned moments.
  K.bed(-7.3, -5.3, 1.6, 3.85, 'z+', 0xb58a6a);
  K.deco(-6.6, -4.4, -0.93, -0.9, 1.0, 2.0, 0xb99468);
  for (let i = 0; i < 10; i++) K.deco(-6.5 + rnd() * 1.9, -6.35 + rnd() * 1.9, -0.9, -0.89, 1.1 + rnd() * 0.7, 1.25 + rnd() * 0.7, 0xf2eee6);
  K.rug(-5.2, -2.0, 0.2, 3.2, 0x8a4f3a);
  for (let i = 0; i < 3; i++) K.deco(-2.4 + i * 0.3, -2.15 + i * 0.3, 3.4, 3.7, 0, 0.3 + i * 0.25, 0x6e2a24);
  // Hope: things everywhere; something in the middle of the floor.
  K.bed(2.8, 4.85, 1.6, 3.85, 'z+', 0x9f3b36);
  K.ball(1.6, 0.35, 1.2, 0.35, 0xd8612f);
  K.box(-1.4, -0.8, 3.2, 3.9, 0, 1.6, 0x55606a);
  K.deco(0.2, 1.2, 2.8, 3.4, 0, 0.12, 0x2f3a44);
  // Game room: consoles, a big screen, board games, Rachel's couch, two arcade cabinets.
  K.screen(7.4, 11.6, -7.72, -7.66, 0.8, 2.6);
  K.sofa(7.2, 11.8, -4.7, -3.7, 'z-', 0x3d566b);
  K.sofa(5.3, 6.4, -6.8, -4.0, 'x+', 0x8f6a8a);
  K.table(8.8, 10.4, 0.4, 1.4, 0.72, TIMBER_MID);
  for (const [x, z] of [[8.5, 0.9], [10.7, 0.9], [9.6, 0.05], [9.6, 1.75]]) K.cyl(x, z, 0.2, 0, 0.48, 0x5a3925);
  K.box(13.1, 13.9, -2.4, -1.6, 0, 1.85, 0x1c1c22); K.box(13.1, 13.9, -1.4, -0.6, 0, 1.85, 0x1c1c22);
  K.glow(13.08, 13.1, -2.3, -1.7, 1.1, 1.5, 0x5fd0ff); K.glow(13.08, 13.1, -1.3, -0.7, 1.1, 1.5, 0xff7a5f);
  K.rug(7.6, 11.4, -3.6, -1.0, 0x2f3f4f);
  // Bathroom and storage.
  K.box(-8.8, -6.0, -7.6, -7.0, 0, 0.9, 0x8f7b69); K.box(-5.2, -3.7, -7.6, -6.0, 0, 2.2, GLASS, { kind: 'glass' });
  K.shelf(-13.9, -9.2, -7.6, -7.1, 2.2, TIMBER_MID, false);
  // Balcony.
  K.ball(7.0, 0.3, 5.5, 0.45, 0xc9763a, { collide: true }); K.ball(8.3, 0.3, 5.7, 0.45, 0x3f7f8f, { collide: true });
}

function furnish3(F) {
  const K = kit(F);
  // Rachel's quiet room: shielded, minimal. A chair, a surface.
  K.deco(-13.8, -13.75, -7.6, 3.8, 0.1, 3.4, 0x2d3b40); K.deco(-9.25, -9.2, -7.6, -2.9, 0.1, 3.4, 0x2d3b40);
  K.deco(-13.8, -9.2, -7.6, -7.55, 0.1, 3.4, 0x2d3b40);
  K.sofa(-12.2, -11.2, -4.2, -3.2, 'z+', 0x5e6f6a, 1.05);
  K.table(-12.1, -11.3, -2.6, -2.0, 0.55, 0xcfc4b3);
  // Kate's office: captain's desk facing the ocean window, charts and screens.
  K.box(-7.5, -5.1, 1.9, 2.8, 0, 0.78, 0x2e1b12, { kind: 'satin' });
  K.chair(-6.3, 1.3, 0x4a2a1a, 'z+');
  K.deco(-8.95, -8.92, -1.0, 3.5, 1.1, 2.6, 0xd8c79f);
  K.screen(-8.3, -4.2, -1.47, -1.42, 1.2, 2.5);
  K.glow(-8.2, -4.3, -1.42, -1.41, 1.3, 2.4, 0x1d5a6e);
  K.box(-4.3, -3.7, 2.6, 3.8, 0, 1.1, TIMBER);
  // Sunroom: UV panels, cushioned surfaces for lying flat.
  for (const x of [-2.6, -0.4, 1.8, 4.0]) { K.box(x - 0.9, x + 0.9, 0.6, 2.8, 0, 0.32, 0xe8dcc7); K.ceilGlow(x - 0.8, x + 0.8, 0.7, 2.7, 0xf6f0ff); }
  K.plant(-3.0, 3.5, 0.8); K.plant(4.5, 3.5, 0.8);
  // Mini Bower: a single Bower flower Krakoa grew here, on a cushioned floor.
  K.box(5.1, 8.4, -1.4, 3.9, 0, 0.1, 0x5a2a4a);
  bowerFlower(F.group, 6.75, F.y + 0.1, 1.6, 1.0, false);
  // Ai's music room: piano, recording desk, space to move.
  K.box(9.3, 10.8, 1.3, 3.1, 0, 1.0, 0x121214, { kind: 'satin' });
  K.box(9.6, 10.5, 0.6, 1.0, 0, 0.48, 0x121214, { kind: 'satin' });
  K.box(13.2, 13.9, -1.2, 1.2, 0, 0.76, TIMBER_MID); K.screen(13.85, 13.9, -0.9, 0.9, 0.95, 1.6);
  K.cyl(12.2, 2.8, 0.03, 0, 1.5, 0x222222, { kind: 'metal', collide: false });
  // Gym: training floor, weights, mirror wall.
  K.deco(4.3, 9.4, -7.2, -3.6, 0, 0.03, 0x4a5b5f);
  K.box(12.5, 13.8, -7.5, -4.2, 0, 1.45, 0x2a2a2c, { kind: 'metal' });
  K.deco(4.0, 11.5, -7.72, -7.68, 0.3, 2.9, 0xc9d3d6, { kind: 'metal' });
  for (let i = 0; i < 3; i++) K.deco(10.0 + i * 0.8, 10.6 + i * 0.8, -4.2, -3.2, 0, 0.012, [0x8a4f7a, 0x3f7f6f, 0xc9843a][i]);
  K.shelf(-8.9, -3.7, -7.6, -7.1, 2.4, 0xcfc4b3, false);
}

function furnish4(F) {
  const K = kit(F);
  // Living room: deep low sofas toward the glass and the Palace, the long rug, the chipped table.
  K.rug(-8.8, 2.8, 0.4, 4.9, 0xb49f84);
  K.sofa(-8.2, -3.3, 0.9, 2.0, 'z+', 0x8e7f70, 0.85);
  K.sofa(-2.4, 2.5, 0.9, 2.0, 'z+', 0x8e7f70, 0.85);
  K.box(-6.4, -4.8, 2.9, 3.8, 0, 0.38, TIMBER_MID, { kind: 'satin' });
  K.box(-0.8, 0.8, 2.9, 3.8, 0, 0.38, TIMBER_MID, { kind: 'satin' });
  K.sofa(-9.8, -8.8, 4.3, 5.5, 'x+', 0x3f5a47, 1.05);          // Rachel's reading chair
  K.screen(-9.4, -6.6, -0.97, -0.92, 0.9, 2.4);
  K.frames('z', -0.95, -2.8, 3.2, 1.3, 2.5, 9, 7);
  for (const x of [-6.5, -2.5, 1.5]) K.ceilGlow(x - 1.2, x + 1.2, 1.0, 4.0, 0xf6f0ff);
  K.plant(3.5, 5.4, 1.1);
  // Dining: long table, seats ten; Kate at the window end.
  K.table(5.9, 7.1, 0.2, 5.2, 0.76, 0x3b2519);
  for (let i = 0; i < 5; i++) { K.chair(5.45, 0.7 + i * 1.0, TIMBER_MID, 'x+'); K.chair(7.55, 0.7 + i * 1.0, TIMBER_MID, 'x-'); }
  K.chair(6.5, 5.65, 0x4a2a1a, 'z-'); K.chair(6.5, -0.25, TIMBER_MID, 'z+');
  // Kitchen: island with stools on the far side, counters, sink under the tall window.
  K.box(10.6, 12.4, 1.4, 3.8, 0, 0.92, 0xcfc4b3, { kind: 'satin' });
  for (const z of [1.9, 2.6, 3.3]) K.cyl(10.15, z, 0.2, 0, 0.72, 0x2e2e30);
  K.box(9.2, 10.8, -0.95, -0.35, 0, 0.92, 0xbfb3a1); K.box(12.2, 13.9, -0.95, -0.35, 0, 0.92, 0xbfb3a1);
  K.box(13.3, 13.9, -0.3, 5.8, 0, 0.92, 0xbfb3a1);
  K.box(9.2, 13.2, 5.35, 5.9, 0, 2.3, TIMBER_MID);
  K.deco(13.4, 13.8, 2.6, 3.4, 0.86, 0.93, 0x9aa0a4, { kind: 'metal' });
  K.deco(13.4, 13.75, 0.2, 0.55, 0.92, 1.3, 0x1a1a1c, { kind: 'metal' });     // Kate's coffee machine
  // Entry, guest rooms, pantry.
  K.box(-13.9, -13.4, 3.8, 5.6, 0, 0.45, TIMBER_MID); K.rug(-13.2, -10.8, 0.5, 4.5, 0x6d2622);
  K.bed(-13.8, -11.8, -7.6, -5.4, 'z-', 0xd8d0e0); K.box(-11.6, -11.1, -7.6, -7.1, 0, 0.55, TIMBER_MID);
  K.bed(-8.8, -6.8, -7.6, -5.4, 'z-', 0xe0d8c8);
  K.box(3.7, 5.2, -7.6, -7.0, 0, 0.9, 0x8f7b69);
  K.shelf(7.2, 13.8, -7.6, -7.1, 2.4, TIMBER_MID, false); K.shelf(13.3, 13.8, -7.0, -1.8, 2.4, TIMBER_MID, false);
  // Front door landing.
  K.plant(-19.3, 0.7, 0.9); K.plant(-19.3, 4.3, 0.9);
}

function furnish5(F) {
  const K = kit(F), g = F.group, y = F.y;
  // Arcade: twelve cabinets along the front wall.
  const screens = [0x5fd0ff, 0xff7a5f, 0xffe066, 0x7dff9a, 0xc38bff, 0xff5fa2];
  let x = -11.2;
  for (let i = 0; i < 12; i++) {
    const w = i === 5 ? 1.2 : 0.82;
    K.box(x, x + w - 0.04, 0.15, 0.82, 0, 1.85, 0x17161a);
    K.glow(x + 0.1, x + w - 0.14, 0.13, 0.15, 1.1, 1.55, screens[i % 6]);
    x += w;
  }
  // Opposite wall: driving rig, light guns, three pinball machines.
  K.box(-11.0, -9.6, -7.7, -6.3, 0, 1.2, 0x2a2024); K.glow(-10.9, -9.7, -7.3, -7.28, 1.0, 1.7, 0x5fd0ff);
  K.box(-9.4, -8.6, -7.7, -7.0, 0, 1.9, 0x201a26); K.box(-8.4, -7.6, -7.7, -7.0, 0, 1.9, 0x201a26);
  for (const px of [-7.2, -6.3, -5.4]) { K.box(px - 0.35, px + 0.35, -7.7, -6.4, 0, 0.95, 0x3a1f2a); K.deco(px - 0.35, px + 0.35, -7.7, -7.5, 0.95, 1.8, 0x3a1f2a); K.glow(px - 0.3, px + 0.3, -7.49, -7.47, 1.2, 1.7, 0xffb14e); }
  // Console corner at the arcade's far end.
  K.screen(-13.97, -13.9, -5.3, -1.3, 0.7, 2.5);
  K.sofa(-12.0, -11.0, -5.6, -1.0, 'x-', 0x4a2d2a); K.sofa(-13.4, -12.0, -5.9, -5.0, 'z+', 0x4a2d2a); K.sofa(-13.4, -12.0, -1.6, -0.7, 'z-', 0x4a2d2a);
  K.rug(-13.6, -11.2, -5.0, -1.6, 0x2c3a44);
  // Pool table in the middle, scoreboard with the chalk that is never where it should be.
  K.box(-2.85, -0.15, -3.75, -2.25, 0, 0.8, 0x2e1b12, { kind: 'satin' });
  K.deco(-2.7, -0.3, -3.6, -2.4, 0.8, 0.82, 0x1f6b3f);
  K.deco(-3.6, -2.2, -7.7, -7.66, 1.4, 2.1, 0x222a26);
  // The bar: along the interior wall, back shelf to the ceiling, mismatched stools.
  K.box(1.2, 5.5, -6.3, -5.6, 0, 1.08, 0x3a2016, { kind: 'satin' });
  K.box(1.2, 5.5, -7.7, -7.35, 0, 3.35, TIMBER);
  for (let r = 0; r < 4; r++) K.glow(1.3, 5.4, -7.35, -7.33, 0.9 + r * 0.6, 0.94 + r * 0.6, 0xffb66e);
  for (let i = 0; i < 5; i++) K.cyl(1.7 + i * 0.85, -5.05, 0.19, 0, 0.72 + (i % 3) * 0.04, [0x7a2b21, 0x2f4b4d, 0x5a3925, 0x9aa0a4, 0x2e2e30][i]);
  // Dance space at the bar's far end: kept clear, speakers in the corners.
  K.box(7.3, 7.9, -7.6, -6.8, 0, 1.9, 0x111113); K.box(7.3, 7.9, 0.1, 0.9, 0, 1.9, 0x111113);
  // Low vault ribs overhead.
  for (let xr = -12.5; xr < 8; xr += 2.5) {
    let prev = null;
    for (let i = 0; i <= 8; i++) {
      const t = i / 8, zz = lerp(-7.75, 1, t), hh = 2.85 + 0.5 * Math.sin(t * Math.PI);
      const p = new THREE.Vector3(xr, y + hh, zz);
      if (prev) span(g, 'satin', UNIT_BOX, prev, p, 0.16, 0.12, 0x6e2a22, { collide: false });
      prev = p;
    }
  }
  // Cinema: twelve seats in three raked rows, 2.4:1 screen.
  K.deco(13.92, 13.96, -5.4, 0.4, 0.45, 2.85, 0xdcdad4);
  K.box(8.1, 9.6, -6.2, 0.9, 0, 0.4, 0x2a1a18); K.box(9.6, 11.0, -6.2, 0.9, 0, 0.2, 0x2a1a18);
  const seat = (sx, base, z) => { K.box(sx - 0.45, sx + 0.45, z - 0.62, z + 0.62, base, base + 0.45, 0x6e1f24); K.box(sx - 0.55, sx - 0.4, z - 0.62, z + 0.62, base + 0.45, base + 1.05, 0x6e1f24); };
  for (const z of [-5.2, -3.5, -1.8, -0.1]) { seat(8.9, 0.4, z); seat(10.3, 0.2, z); seat(11.7, 0, z); }
}

function furnish6(F) {
  const K = kit(F);
  // Lounge: Emma's composition — teal, dark timber, high backs toward the glass.
  K.rug(-1.5, 12.5, -1.4, 2.4, 0x274345);
  K.sofa(1.0, 5.0, -0.8, 0.3, 'z+', 0x234a4c, 1.25);
  K.sofa(8.0, 9.2, -1.2, 1.2, 'x-', 0x234a4c, 1.25);
  K.sofa(6.0, 7.0, 1.4, 2.4, 'x+', 0xece6da, 1.3);              // Emma's seat
  K.box(4.4, 5.8, 1.2, 2.2, 0, 0.4, TIMBER, { kind: 'satin' });
  K.sofa(10.5, 13.5, -6.5, -5.3, 'z+', 0x234a4c, 1.2);
  K.box(9.0, 11.6, -7.7, -7.2, 0, 1.8, TIMBER, { kind: 'satin' });  // drinks cabinet for guests
  K.deco(9.1, 11.5, -7.2, -7.18, 1.3, 1.35, BRASS, { kind: 'metal' });
  K.plant(13.3, 2.4, 1.2); K.plant(-2.3, 2.4, 1.0);
  // Library: shelves floor to ceiling on three walls, rolling ladder, the long reading table.
  K.shelf(-13.95, -13.55, -8.9, -1.8, 4.0, TIMBER); K.shelf(-13.95, -13.55, -0.2, 2.6, 4.0, TIMBER);
  K.shelf(-13.5, -3.5, -8.95, -8.55, 4.0, TIMBER);
  K.shelf(-3.45, -3.05, -8.5, -5.8, 4.0, TIMBER); K.shelf(-3.45, -3.05, -4.2, -1.9, 4.0, TIMBER);
  obj(F.group, 'metal', UNIT_BOX, -8, F.y + 1.9, -8.3, -0.2, 0, 0, 0.5, 3.9, 0.05, BRASS, { collide: false });
  K.table(-10.2, -6.4, -4.4, -3.1, 0.78, 0x3b2519);
  K.sofa(-10.9, -10.1, -4.2, -3.3, 'x+', 0x2f5a3a, 1.0);           // Rachel's, close to green
  K.chair(-8.3, -4.75, 0xcaa46a, 'z+');                             // Ai's, Japanese in proportion
  K.sofa(-6.2, -5.3, -4.2, -3.3, 'x-', 0x4a2a1a, 1.1);              // Kate's leather captain's chair
  K.glow(-8.5, -8.1, -3.9, -3.5, 1.1, 1.3, 0xffe2b0);
  K.table(-13.5, -12.2, -8.5, -7.9, 0.76, TIMBER_MID); K.chair(-12.85, -7.4, TIMBER_MID, 'z-');
  // Receiving hall and cloakroom.
  K.box(-1.5, 1.5, -7.6, -7.2, 0, 0.85, TIMBER, { kind: 'satin' });
  K.box(3.7, 7.8, -7.6, -7.1, 0, 2.0, TIMBER_MID);
}

function furnish7(F) {
  const K = kit(F), g = F.group, y = F.y;
  // Thermal pools under a timber-beamed ceiling (the stone-and-beams spa look).
  for (let xb = -13.5; xb <= 2.6; xb += 1.35) K.deco(xb - 0.12, xb + 0.12, -5, -0.4, 3.3, 3.6, 0x4a3122, { kind: 'satin' });
  K.deco(-14, 3, -2.9, -2.6, 3.15, 3.3, 0x4a3122, { kind: 'satin' });
  for (const [px, pz, s] of [[-13.4, -0.9, 0.5], [-5.6, -4.6, 0.4], [-0.3, -1.0, 0.45], [2.7, -4.5, 0.35]]) obj(g, 'rock', dodG(), px, y + s * 0.6, pz, rnd(), rnd(), 0, s * 1.3, s, s, 0x3f3a36, { collide: true });
  for (const x of [-9.5, -3, 1.3]) K.ceilGlow(x - 0.8, x + 0.8, -3.2, -2.2, 0xfff0d8);
  // Sauna: cedar tiers. Steam room: tiled benches. Cold plunge between them.
  K.box(3.2, 6.3, -4.8, -3.9, 0, 0.45, 0x9a6a3e); K.box(3.2, 6.3, -4.8, -4.3, 0.45, 0.9, 0x9a6a3e);
  K.box(10.2, 13.8, -4.8, -3.9, 0, 0.45, 0xd9d4cc); K.box(13.2, 13.8, -3.9, -0.8, 0, 0.45, 0xd9d4cc);
  // UV recovery alcoves: a padded surface, light on three sides.
  for (const [x0, x1] of [[-14, -10.5], [-10.5, -7], [-7, -3.5]]) {
    K.box(x0 + 0.35, x1 - 0.35, -9.2, -7.1, 0, 0.5, 0xd9d0c0);
    K.glow(x0 + 0.2, x0 + 0.23, -9.3, -6.9, 0.5, 2.6, 0xffe6c7); K.glow(x1 - 0.23, x1 - 0.2, -9.3, -6.9, 0.5, 2.6, 0xffe6c7);
    K.glow(x0 + 0.3, x1 - 0.3, -9.37, -9.34, 0.5, 2.6, 0xffe6c7);
  }
  // Treatment room and medic station.
  K.box(5.1, 6.9, -9.3, -8.6, 0, 0.8, 0xd9d0c0);
  K.box(9.2, 11.2, -10.6, -9.7, 0, 0.7, 0xe8e6e0); K.box(12.2, 13.9, -10.9, -7.0, 0, 2.0, 0xc9cfd2, { kind: 'metal' });
  K.cyl(11.6, -9.2, 0.03, 0, 1.9, 0x9aa0a4, { kind: 'metal', collide: false });
}

function furnish8(F) {
  const K = kit(F);
  // Armory: weapons on the left wall, suit bays on the right, Kate's workbench at the end.
  K.box(-13.5, -4.5, -1.95, -1.6, 0.4, 2.4, 0x3a3d40, { kind: 'metal' });
  for (let i = 0; i < 14; i++) K.deco(-13.2 + i * 0.62, -13.15 + i * 0.62, -2.0, -1.96, 0.6, 2.2, 0x9aa0a4, { kind: 'metal' });
  K.deco(-5.3, -5.25, -2.02, -1.98, 0.3, 2.35, 0x5a3925);          // bo staff, primary mount
  K.deco(-4.95, -4.88, -2.02, -1.98, 0.9, 2.1, 0xb8bec2, { kind: 'metal' }); // Red Queen blade
  K.box(-13.5, -11.2, -2.4, -1.6, 0, 2.4, GLASS, { kind: 'glass' }); K.glow(-13.3, -11.4, -2.1, -1.9, 0.5, 2.1, 0x4fd28a);
  for (const x0 of [-13.5, -12.3, -11.1, -7.8, -6.6, -5.4]) {
    K.box(x0, x0 + 1.05, -11.95, -11.2, 0, 2.4, 0x2a2c2e, { kind: 'metal' });
    K.deco(x0 + 0.3, x0 + 0.75, -11.25, -11.15, 0.2, 1.9, x0 === -13.5 ? 0x8a1f24 : 0x4a4f55);
  }
  K.box(-13.95, -13.2, -11.5, -7.3, 0, 0.92, 0x55595c, { kind: 'metal' }); K.box(-13.95, -13.2, -5.7, -2.3, 0, 0.92, 0x55595c, { kind: 'metal' });
  K.cyl(-12.8, -9.0, 0.2, 0, 0.7, 0x2e2e30);
  K.box(-13.85, -13.72, -7.1, -5.9, 0, 2.2, 0x6c7176, { kind: 'metal' });      // the vault panel
  K.glow(-13.72, -13.7, -6.6, -6.4, 1.2, 1.45, 0xff5a4a);
  // Operations room: tactical table, feeds in the rock, comms hub, briefing arc.
  K.box(-10.35, -7.15, -16.0, -14.0, 0, 0.95, 0x24282b, { kind: 'metal' });
  K.glow(-10.2, -7.3, -15.9, -14.1, 0.95, 0.97, 0x1f6f8f);
  for (const x0 of [-12.5, -9.9, -7.3]) { K.screen(x0, x0 + 2.3, -17.85, -17.8, 1.0, 2.6); K.glow(x0 + 0.1, x0 + 2.2, -17.8, -17.79, 1.1, 2.5, 0x163f52); }
  K.box(-4.3, -3.7, -17.5, -12.6, 0, 0.8, 0x2a2c2e, { kind: 'metal' }); K.glow(-3.72, -3.7, -17.3, -12.8, 1.1, 2.3, 0x1d5a6e);
  K.chair(-4.8, -12.9, 0x2f5a3a, 'x+');                              // Rachel's station
  K.screen(-13.85, -13.8, -15.6, -13.2, 1.0, 2.4);
  for (let i = 0; i < 6; i++) K.chair(-11.6 - Math.sin(i / 5 * Math.PI) * 0.6, -15.4 + i * 0.45, 0x3a3d40, 'x-');
}

function bowerFlower(g, x, y, z, s, hanging) {
  const petal = sphG();
  const dir = hanging ? -1 : 1;
  if (!hanging) obj(g, 'matte', cylG(8), x, y + 0.4 * s, z, 0, 0, 0, 0.12 * s, 0.8 * s, 0.12 * s, 0x3f6b35, { collide: false });
  for (let i = 0; i < 7; i++) {
    const a = i / 7 * TAU;
    obj(g, 'satin', petal, x + Math.sin(a) * 0.75 * s, y + dir * 1.1 * s, z + Math.cos(a) * 0.75 * s, dir * 0.55, a, 0, 0.55 * s, 0.95 * s, 0.22 * s, i % 2 ? 0x6b2a7a : 0x8c1f36, { collide: false });
  }
  obj(g, 'glow', sphG(), x, y + dir * 0.85 * s, z, 0, 0, 0, 0.18 * s, 0.18 * s, 0.18 * s, 0xffb3d9);
}

/* ------------------------------------------------ stair tower and the lift */

const CORE_X = 0, CORE_Z = -11, R_OUT = 3.25, R_IN = 3.0, R_SHAFT = 1.25;
const LAND = 24 * DEG, SHAFT_GAP = 22 * DEG, DOOR_GAP = 13.5 * DEG;
const PC = (r, th, y) => [CORE_X + r * Math.sin(th), y, CORE_Z + r * Math.cos(th)];

function ringWall(g, kind, color, r, y0, y1, th0, th1, inward, opts = {}) {
  const n = Math.max(2, Math.ceil(56 * (th1 - th0) / TAU));
  for (let i = 0; i < n; i++) {
    const a = th0 + (th1 - th0) * i / n, b = th0 + (th1 - th0) * (i + 1) / n;
    const A = PC(r, a, y0), B = PC(r, b, y0), C = PC(r, b, y1), D = PC(r, a, y1);
    const s = inward ? -1 : 1, na = [s * Math.sin(a), 0, s * Math.cos(a)], nb = [s * Math.sin(b), 0, s * Math.cos(b)];
    if (!inward) { tri(g, kind, A, B, C, color, { ...opts, normals: [na, nb, nb] }); tri(g, kind, A, C, D, color, { ...opts, normals: [na, nb, na] }); }
    else { tri(g, kind, A, C, B, color, { ...opts, normals: [na, nb, nb] }); tri(g, kind, A, D, C, color, { ...opts, normals: [na, na, nb] }); }
  }
}
// A flat ring sector slab between radii r0..r1 and angles th0..th1, top at yTop.
function sectorSlab(g, kind, top, side, r0, r1, th0, th1, yTop, thick, opts = {}) {
  const n = Math.max(1, Math.ceil(40 * (th1 - th0) / TAU)), yb = yTop - thick;
  for (let i = 0; i < n; i++) {
    const a = th0 + (th1 - th0) * i / n, b = th0 + (th1 - th0) * (i + 1) / n;
    quad(g, kind, PC(r0, a, yTop), PC(r1, a, yTop), PC(r1, b, yTop), PC(r0, b, yTop), top, { ...opts, face: [0, 1, 0] });
    quad(g, kind, PC(r0, a, yb), PC(r1, a, yb), PC(r1, b, yb), PC(r0, b, yb), side, { ...opts, face: [0, -1, 0], collide: false });
    const mo = (a + b) / 2;
    quad(g, kind, PC(r1, a, yb), PC(r1, b, yb), PC(r1, b, yTop), PC(r1, a, yTop), side, { ...opts, face: [Math.sin(mo), 0, Math.cos(mo)], collide: false });
    quad(g, kind, PC(r0, a, yb), PC(r0, b, yb), PC(r0, b, yTop), PC(r0, a, yTop), side, { ...opts, face: [-Math.sin(mo), 0, -Math.cos(mo)], collide: false });
  }
  for (const [th, sg] of [[th0, -1], [th1, 1]]) {
    quad(g, kind, PC(r0, th, yb), PC(r1, th, yb), PC(r1, th, yTop), PC(r0, th, yTop), side, { ...opts, face: [sg * Math.cos(th), 0, -sg * Math.sin(th)], collide: false });
  }
}
function disc(g, kind, color, r, y, face, opts = {}) {
  const n = 40;
  for (let i = 0; i < n; i++) {
    const a = i / n * TAU, b = (i + 1) / n * TAU;
    tri(g, kind, [CORE_X, y, CORE_Z], PC(r, a, y), PC(r, b, y), color, { ...opts, face });
  }
}

function buildCore() {
  const tread = 0x3b2519, soffit = 0xcdbba2;
  for (let i = 0; i < FLOORS.length; i++) {
    const F = FLOORS[i], g = F.group, y = F.y, top = F.top;
    const wallCol = F.inRock ? 0x8a7a6c : 0xd5c4ab;
    // Tower walls: stone outside, plaster (or rock) inside, a door toward the floor at the front.
    ringWall(g, 'matte', RED_DK, R_OUT, y, y + 2.4, DOOR_GAP, TAU - DOOR_GAP, false, { collide: false });
    ringWall(g, 'matte', RED_DK, R_OUT, y + 2.4, top, 0, TAU, false, { collide: false });
    ringWall(g, 'matte', wallCol, R_IN, y, y + 2.4, DOOR_GAP, TAU - DOOR_GAP, true);
    ringWall(g, 'matte', wallCol, R_IN, y + 2.4, top, 0, TAU, true);
    for (const th of [DOOR_GAP, -DOOR_GAP]) quad(g, 'matte', PC(R_IN, th, y), PC(R_OUT, th, y), PC(R_OUT, th, y + 2.4), PC(R_IN, th, y + 2.4), wallCol, { face: [Math.cos(th) * -Math.sign(th), 0, Math.sin(th) * Math.sign(th)], collide: false });
    // Landing, threshold and jambs.
    sectorSlab(g, 'matte', PAL[F.n].floor, RED_DK, R_SHAFT, R_IN, -LAND, LAND, y, 0.3);
    box(g, -0.8, y - 0.3, -8.12, 0.8, y - 0.002, -7.75, PAL[F.n].floor);
    box(g, -1.0, y, -8.2, -0.75, y + 2.4, -7.75, wallCol); box(g, 0.75, y, -8.2, 1.0, y + 2.4, -7.75, wallCol);
    // Lift shaft: glass with a door at every landing, brass frame rings.
    ringWall(g, 'glass', GLASS, R_SHAFT, y, y + 2.3, SHAFT_GAP, TAU - SHAFT_GAP, false);
    ringWall(g, 'glass', GLASS, R_SHAFT, y + 2.3, top, 0, TAU, false);
    ringWall(g, 'metal', BRASS, R_SHAFT + 0.02, y + 2.3, y + 2.42, 0, TAU, false, { collide: false });
    for (const th of [SHAFT_GAP, -SHAFT_GAP]) { const p = PC(R_SHAFT + 0.02, th, 0); box(g, p[0] - 0.035, y, p[2] - 0.035, p[0] + 0.035, y + 2.3, p[2] + 0.035, BRASS, { kind: 'metal', collide: false }); }
    disc(null, 'matte', 0, R_SHAFT + 0.01, y, [0, 1, 0]);         // invisible lift floor at each landing
    if (i === 0) {
      disc(g, 'matte', PAL[1].ceil, R_OUT, top - 0.2, [0, -1, 0]);
      disc(F.ceil, 'matte', RED_DK, R_OUT, top, [0, 1, 0], { collide: false });
    }
    if (F.n === 9) disc(g, 'matte', PAL[9].floor, R_IN, y - 0.004, [0, 1, 0]);
    // Helix down to the next floor.
    if (i < FLOORS.length - 1) {
      const L = FLOORS[i + 1], yU = y, yL = L.y, gL = L.group, rise = yU - yL;
      const th0 = LAND, th1 = TAU - LAND, N = 72;
      const yAt = t => lerp(yU, yL, t);
      for (let k = 0; k < N; k++) {
        const t0 = k / N, t1 = (k + 1) / N, a = lerp(th0, th1, t0), b = lerp(th0, th1, t1);
        quad(null, 'matte', PC(R_SHAFT, a, yAt(t0)), PC(R_IN, a, yAt(t0)), PC(R_IN, b, yAt(t1)), PC(R_SHAFT, b, yAt(t1)), 0, { face: [0, 1, 0] });
        quad(gL, 'matte', PC(R_SHAFT, a, yAt(t0) - 0.34), PC(R_IN, a, yAt(t0) - 0.34), PC(R_IN, b, yAt(t1) - 0.34), PC(R_SHAFT, b, yAt(t1) - 0.34), soffit, { face: [0, -1, 0], collide: false });
      }
      const n = Math.max(10, Math.round(rise / 0.18));
      for (let k = 0; k < n; k++) {
        const a = lerp(th0, th1, k / n), b = lerp(th0, th1, (k + 1) / n) + 0.004, topY = yU - (k + 0.5) * rise / n;
        sectorSlab(gL, 'satin', tread, 0x2a1810, 1.3, 2.97, a, b, topY, 0.08, { collide: false });
      }
      const pts = [];
      for (let k = 0; k <= 40; k++) { const t = k / 40; pts.push(new THREE.Vector3(...PC(2.9, lerp(th0, th1, t), yAt(t) + 0.95))); }
      emit(gL, 'metal', new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 80, 0.028, 6), new THREE.Matrix4(), BRASS, { collide: false });
    }
  }
}

// The lift cabin rides inside the glass shaft.
const cabin = new THREE.Group();
{
  const wood = new THREE.MeshStandardMaterial({ color: 0x3a2417, roughness: 0.5 });
  const brass = new THREE.MeshStandardMaterial({ color: BRASS, roughness: 0.3, metalness: 0.8 });
  const glassM = new THREE.MeshStandardMaterial({ color: 0xbcd6de, roughness: 0.05, transparent: true, opacity: 0.18, side: THREE.DoubleSide, depthWrite: false });
  const floorM = new THREE.Mesh(new THREE.CylinderGeometry(1.18, 1.18, 0.1, 40), wood); floorM.position.y = -0.05;
  const roof = new THREE.Mesh(new THREE.CylinderGeometry(1.18, 1.18, 0.1, 40), wood); roof.position.y = 2.45;
  const shell = new THREE.Mesh(new THREE.CylinderGeometry(1.19, 1.19, 2.4, 40, 1, true, SHAFT_GAP, TAU - 2 * SHAFT_GAP), glassM); shell.position.y = 1.2;
  const rail = new THREE.Mesh(new THREE.TorusGeometry(1.08, 0.02, 6, 48), brass); rail.rotation.x = Math.PI / 2; rail.position.y = 1.0;
  const lamp = new THREE.Mesh(new THREE.CircleGeometry(0.5, 24), new THREE.MeshBasicMaterial({ color: 0xffe2b0 })); lamp.rotation.x = Math.PI / 2; lamp.position.y = 2.39;
  cabin.add(floorM, roof, shell, rail, lamp);
  cabin.position.set(CORE_X, FLOORS[3].y, CORE_Z);
  scene.add(cabin);
}

/* ----------------------------------------------- guest stair and tunnels */

// A straight run between two heights along x or z, with steps, a collision ramp,
// and optionally tunnel walls and a ceiling cut through the rock.
function slopedRun(g, axis, s0, s1, y0, y1, c, w, o = {}) {
  const P = (s, u, y) => axis === 'x' ? [s, y, u] : [u, y, s];
  const u0 = c - w / 2, u1 = c + w / 2, clear = o.clear || 2.6, rock = o.rockCol || 0x6c5d52;
  quad(null, 'matte', P(s0, u0, y0), P(s1, u0, y1), P(s1, u1, y1), P(s0, u1, y0), 0, { face: [0, 1, 0] });
  const rise = Math.abs(y1 - y0), n = Math.round(rise / 0.18);
  const lo = Math.min(y0, y1);
  if (n >= 3) {
    for (let i = 0; i < n; i++) {
      const sa = lerp(s0, s1, i / n), sb = lerp(s0, s1, (i + 1) / n), top = lerp(y0, y1, (i + 0.5) / n);
      const bot = Math.min(top - 0.3, lerp(y0, y1, i / n) - 0.3, lerp(y0, y1, (i + 1) / n) - 0.3);
      if (axis === 'x') box(g, Math.min(sa, sb), bot, u0, Math.max(sa, sb), top, u1, o.stepCol || 0x7d6d60, { collide: false });
      else box(g, u0, bot, Math.min(sa, sb), u1, top, Math.max(sa, sb), o.stepCol || 0x7d6d60, { collide: false });
    }
  } else {
    quad(g, 'matte', P(s0, u0, y0), P(s1, u0, y1), P(s1, u1, y1), P(s0, u1, y0), o.stepCol || 0x6f635a, { face: [0, 1, 0], collide: false });
  }
  if (!o.tunnel) return;
  const pieces = (gaps) => {
    const cuts = [[Math.min(s0, s1), Math.max(s0, s1)]];
    for (const [ga, gb] of gaps || []) {
      for (let i = cuts.length - 1; i >= 0; i--) {
        const [a, b] = cuts[i];
        if (gb <= a || ga >= b) continue;
        cuts.splice(i, 1, ...[[a, ga], [gb, b]].filter(([p, q]) => q - p > 0.01));
      }
    }
    return cuts;
  };
  const yAt = s => lerp(y0, y1, (s - s0) / (s1 - s0));
  for (const [u, gaps, faceSign] of [[u0, o.gaps0, 1], [u1, o.gaps1, -1]]) {
    for (const [a, b] of pieces(gaps)) {
      const face = axis === 'x' ? [0, 0, faceSign] : [faceSign, 0, 0];
      quad(g, 'matte', P(a, u, yAt(a) - 0.4), P(b, u, yAt(b) - 0.4), P(b, u, yAt(b) + clear), P(a, u, yAt(a) + clear), rock, { face });
    }
  }
  quad(g, 'matte', P(s0, u0, y0 + clear), P(s1, u0, y1 + clear), P(s1, u1, y1 + clear), P(s0, u1, y0 + clear), rock, { face: [0, -1, 0] });
  if (o.capStart) {
    const face = axis === 'x' ? [Math.sign(s1 - s0), 0, 0] : [0, 0, Math.sign(s1 - s0)];
    quad(g, 'matte', P(s0, u0, lo - 0.4), P(s0, u1, lo - 0.4), P(s0, u1, y0 + clear), P(s0, u0, y0 + clear), rock, { face });
  }
}

function buildGuestStair() {
  const F6 = byN(6), g = F6.group, y6 = F6.y, y5 = byN(5).y, rock = 0x7a6a5e, fl = 0x6b5a4c;
  // Stairwell from the library (F6) up to the play floor (F5), cut into the rock north of the Keep.
  box(g, -18.8, y6 - 0.3, -10.4, -14.15, y6, -0.4, [rock, rock, fl, rock, rock, rock]);
  box(g, -19.1, y6, -10.4, -18.8, y6 + 9, -2.4, rock); box(g, -19.1, y6, -0.8, -18.8, y6 + 9, -0.4, rock);
  box(g, -19.1, y6 + 2.6, -2.4, -18.8, y6 + 9, -0.8, rock);
  box(g, -19.1, y6, -10.7, -14.15, y6 + 9, -10.4, rock); box(g, -19.1, y6, -0.4, -14.15, y6 + 9, -0.1, rock);
  const east = (z0, z1, h0, h1) => box(g, -14.4, y6 + h0, z0, -14.3, y6 + h1, z1, rock);
  east(-10.4, -7.1, 0, 9); east(-5.9, -1.6, 0, 9); east(-7.1, -5.9, 0, 4.7); east(-7.1, -5.9, 4.7 + 2.3, 9); east(-1.6, -0.4, 2.3, 9);
  box(g, -19.1, y6 + 9, -10.7, -14.15, y6 + 9.3, -0.1, rock);
  box(g, -18.8, y5 - 0.3, -10.4, -14.15, y5, -9.2, [rock, rock, fl, rock, rock, rock]);
  box(g, -16.6, y5 - 0.3, -9.2, -14.15, y5, -5.6, [rock, rock, fl, rock, rock, rock]);
  slopedRun(g, 'z', -2.4, -9.2, y6, y5, -17.7, 2.2, { stepCol: 0x7d6d60 });
  const rail = (x0, z0, x1, z1, yb, h) => { box(g, x0, yb, z0, x1, yb + h, z1, GLASS, { kind: 'glass' }); };
  rail(-16.6, -5.62, -14.35, -5.58, y5, 1.0);
  for (let k = 0; k < 8; k++) {
    const za = lerp(-2.4, -9.2, k / 8), zb = lerp(-2.4, -9.2, (k + 1) / 8), yb = lerp(y6, y5, (k + 0.5) / 8);
    box(g, -16.63, y6, Math.min(za, zb), -16.57, yb + 1.0, Math.max(za, zb), GLASS, { kind: 'glass' });
  }
  // Beach tunnel: from the stairwell floor down through the headland to the beach door.
  slopedRun(g, 'x', -18.8, -48.4, y6, 1.6, -1.6, 1.6, { tunnel: true, clear: 2.6 });
  box(g, -51.6, 1.3, -2.4, -48.4, 1.6, -0.8, [rock, rock, fl, rock, rock, rock]);
  box(g, -51.6, 1.3, -0.8, -50.0, 1.6, 0.25, [rock, rock, fl, rock, rock, rock]);
  box(g, -51.9, 1.6, -2.7, -51.6, 4.2, 0.1, rock); box(g, -51.9, 1.6, -2.7, -48.4, 4.2, -2.4, rock);
  box(g, -50.0, 1.6, -0.8, -48.4, 4.2, -0.5, rock); box(g, -50.0, 1.6, -0.5, -49.7, 4.2, 0.1, rock);
  box(g, -51.9, 4.2, -2.7, -48.4, 4.5, 0.1, rock);
  solid(-51.6, 1.6, 0.18, -50.0, 4.2, 0.3);              // the beach stays scenery for now
  // Beach door frame on the cliff face.
  box(exterior, -51.95, 1.3, -0.2, -51.6, 4.35, 0.35, RED); box(exterior, -50.0, 1.3, -0.2, -49.65, 4.35, 0.35, RED);
  box(exterior, -51.95, 4.0, -0.2, -49.65, 4.35, 0.35, RED);
  obj(exterior, 'satin', UNIT_BOX, -51.1, 2.75, 0.75, 0, -1.1, 0, 0.08, 2.35, 1.5, TIMBER, { collide: false });
}

function buildSecretTunnel() {
  const F8 = byN(8), g = F8.group;
  slopedRun(g, 'x', -14.15, -29.2, 7.5, 7.1, -16.8, 1.6, { tunnel: true, clear: 2.4 });
  slopedRun(g, 'z', -17.6, 0.0, 7.1, 5.7, -30, 1.6, { tunnel: true, clear: 2.4, gaps1: [[-17.6, -16.0]], capStart: true });
  // Ledge outside, hidden behind a rock formation Krakoa shaped.
  box(g, -32.5, -1, 0, -27.5, 5.7, 2.4, [ROCK, ROCK, 0x6c5d52, ROCK, ROCK, ROCK]);
  obj(g, 'rock', dodG(), -30, 4.2, 3.6, 0.3, 0.8, 0.1, 2.4, 5.2, 1.3, 0x5a4a40, { collide: true });
  solid(-32.6, 5.7, 0, -32.4, 7, 2.4); solid(-27.6, 5.7, 0, -27.4, 7, 2.4); solid(-32.5, 5.7, 2.3, -27.5, 7, 2.5);
}

function buildEntryPath() {
  // The rock-cut path from the front door landing up to the clifftop (scenery beyond the gate).
  for (let x = -20; x > -58; x -= 1) {
    const t = (-20 - x) / 38, top = 24 + t * 22;
    box(exterior, x - 1, top - 1.4, 0, x, top, 2.4, [ROCK, ROCK, 0x8a7766, ROCK, ROCK, ROCK], { collide: false });
    box(exterior, x - 1, top, 2.2, x, top + 0.7, 2.4, ROCK, { collide: false });
  }
  box(byN(4).group, -20.05, 24, 0.3, -19.95, 26.2, 4.7, 0x2a2c2e, { kind: 'metal' });
  for (let z = 0.5; z < 4.6; z += 0.25) box(byN(4).group, -20.02, 24, z - 0.015, -19.98, 26.2, z + 0.015, 0x3a3d40, { kind: 'metal', collide: false });
}

/* --------------------------------------------------------------- grotto */

const GROTTO_ZONES = [
  { name: 'Soaking pool', r: [-2.3, 2.3, -5.7, -1.1] },
  { name: 'Sleeping nook', r: [-8.4, -4.6, -2.5, 0] },
  { name: 'Washing space', r: [-10, -6.4, -10, -6.4] },
  { name: 'Bower alcove', r: [6.2, 9.6, -10.4, -7.4] },
  { name: 'Firepit', r: [0.5, 5.5, 0, 3.5], outdoor: true },
];
function buildGrotto() {
  const F = byN(9), g = F.group, y0 = F.y, cz = -5, rx = 11, ry = 5.2, rz = 8;
  const NA = 110, NE = 26;
  const Pt = (a, e) => {
    const ce = Math.cos(e), se = Math.sin(e);
    const x = rx * ce * Math.sin(a), y = ry * se, z = rz * ce * Math.cos(a);
    const nx = x / (rx * rx), ny = y / (ry * ry), nz = z / (rz * rz), nl = Math.hypot(nx, ny, nz) || 1;
    const wz = z + cz, fade = smooth(0, -3, wz);
    const d = (0.25 + 0.95 * fbm(x * 0.35 + 5, (y + z) * 0.35)) * fade * (0.4 + 0.6 * ce);
    return [x - nx / nl * d, y0 + y - ny / nl * d, wz - nz / nl * d];
  };
  const grid = [];
  for (let i = 0; i <= NA; i++) { grid.push([]); for (let j = 0; j <= NE; j++) grid[i].push(Pt(-Math.PI + i / NA * TAU, j / NE * Math.PI / 2 * 0.999)); }
  for (let i = 0; i < NA; i++) for (let j = 0; j < NE; j++) {
    const A = grid[i][j], B = grid[i + 1][j], C = grid[i + 1][j + 1], D = grid[i][j + 1];
    if (Math.max(A[2], B[2], C[2], D[2]) > 0.2) continue;
    const cy = (A[1] + C[1]) / 2, n = fbm(A[0] * 0.3, A[2] * 0.3 + cy);
    let col = cy < 2.2 ? 0x3e342e : n > 0.62 ? 0x3f4a2e : n > 0.45 ? 0x5a4c43 : 0x4d4139;
    if (A[2] > -2.5 && n > 0.5) col = 0x3c4d2c;
    tri(g, 'rock', A, C, B, col); tri(g, 'rock', A, D, C, col);
  }
  // Floor: wet rock, with the soaking pool cut in and the tower's footprint left open.
  const cell = 0.5;
  for (let x = -11.5; x < 11.5; x += cell) for (let z = -13.5; z < 0.25; z += cell) {
    const cx = x + cell / 2, cz2 = z + cell / 2;
    const inside = (cx / 11) ** 2 + ((cz2 + 5) / 8) ** 2 < 1.04 || (cz2 > -1.2 && Math.abs(cx) < 9);
    if (!inside) continue;
    if (Math.hypot(cx, cz2 + 3.4) < 2.3 || Math.hypot(cx - CORE_X, cz2 - CORE_Z) < 3.28) continue;
    const col = hash2(Math.floor(cx * 2), Math.floor(cz2 * 2)) > 0.5 ? 0x4f443c : 0x574a41;
    quad(g, 'matte', [x, y0, z], [x + cell, y0, z], [x + cell, y0, z + cell], [x, y0, z + cell], col, { face: [0, 1, 0] });
  }
  // The soaking pool, flush with the floor, fed by a thermal spring.
  const pr = 2.3, pc = [0, -3.4], seg = 48;
  for (let i = 0; i < seg; i++) {
    const a = i / seg * TAU, b = (i + 1) / seg * TAU;
    const A = [pc[0] + pr * Math.sin(a), y0 - 1.0, pc[1] + pr * Math.cos(a)], B = [pc[0] + pr * Math.sin(b), y0 - 1.0, pc[1] + pr * Math.cos(b)];
    const C = [B[0], y0, B[2]], D = [A[0], y0, A[2]];
    tri(g, 'matte', A, C, B, 0x3f6f73, { collide: false }); tri(g, 'matte', A, D, C, 0x3f6f73, { collide: false });
    tri(g, 'matte', [pc[0], y0 - 1.0, pc[1]], A, B, 0x365f63, { face: [0, 1, 0], collide: false });
    tri(g, 'water', [pc[0], y0 - 0.12, pc[1]], [A[0], y0 - 0.12, A[2]], [B[0], y0 - 0.12, B[2]], 0x2f8f9c, { face: [0, 1, 0] });
    tri(null, 'matte', [pc[0], y0 - 0.2, pc[1]], [A[0], y0 - 0.2, A[2]], [B[0], y0 - 0.2, B[2]], 0, { face: [0, 1, 0] });
  }
  box(g, -0.15, y0 - 0.14, -1.1, 0.15, y0 - 0.1, 3.5, 0x2f8f9c, { kind: 'water' });
  // Ledge at the cave mouth, open to the Pacific.
  box(g, -9.5, -1.2, 0, 9.5, y0 - 0.2, 3.5, [ROCK, ROCK, 0x4a403a, ROCK, ROCK, ROCK]);
  solid(-9.6, y0 - 0.2, 0, -9.4, y0 + 1.2, 3.5); solid(9.4, y0 - 0.2, 0, 9.6, y0 + 1.2, 3.5); solid(-9.5, y0 - 0.2, 3.45, 9.5, y0 + 1.2, 3.6);
  box(g, -9.4, 0.02, 3.5, 9.4, 0.06, 3.56, 0x3fe0c8, { kind: 'glow' });                // bioluminescence
  for (let i = 0; i < 26; i++) { const x = lerp(-9, 9, rnd()), z = 3.55 + rnd() * 1.6; box(g, x - 0.06, 0.03, z - 0.06, x + 0.06, 0.05, z + 0.06, 0x48f0d4, { kind: 'glow' }); }
  // Firepit: flat rocks Ai arranged, driftwood.
  for (let i = 0; i < 9; i++) { const a = i / 9 * TAU; obj(g, 'rock', dodG(), 3 + Math.sin(a) * 0.75, y0 - 0.1, 2.0 + Math.cos(a) * 0.75, rnd(), a, 0, 0.32, 0.16, 0.26, 0x6b5d52); }
  box(g, 2.7, y0 - 0.15, 1.7, 3.3, y0 + 0.05, 2.3, 0xff8a3a, { kind: 'glow' });
  // Sleeping nook, washing basin, Bower alcove.
  box(g, -8.2, y0, -2.3, -4.8, y0 + 0.35, -0.2, 0x5a4c43);
  box(g, -8.0, y0 + 0.35, -2.1, -5.0, y0 + 0.5, -0.4, 0x8a6f7a, { collide: false });
  box(g, -9.6, y0, -8.8, -7.4, y0 + 0.9, -8.1, 0x5f5249); box(g, -9.3, y0 + 0.9, -8.7, -7.7, y0 + 0.92, -8.2, 0x2f8f9c, { kind: 'water' });
  obj(g, 'satin', cylG(12), -8.2, y0 + 0.23, -7.3, 0, 0, 0, 0.2, 0.46, 0.2, 0x8a6a3e);
  box(g, 6.6, y0, -10.0, 9.2, y0 + 0.15, -7.8, 0x5a2a4a);
  bowerFlower(g, 7.9, y0 + 4.1, -8.9, 0.9, true);
  // Vines from the vault; six lanterns and the bioluminescent pulse are the only light.
  for (let i = 0; i < 46; i++) {
    const a = rnd() * TAU, e = 0.5 + rnd() * 0.9, p = Pt(a, e);
    if (p[2] > -0.3) continue;
    const len = 0.8 + rnd() * 2.4;
    box(g, p[0] - 0.02, p[1] - len, p[2] - 0.02, p[0] + 0.02, p[1], p[2] + 0.02, 0x3c5a2c, { collide: false });
  }
  const lanterns = [[-6, 4.2, -6], [-2.5, 4.4, -9], [5, 4.0, -6.5], [7.5, 3.4, -2], [-9, 3.0, -3.5], [1.5, 4.5, -1.5]];
  for (const [x, yy, z] of lanterns) {
    box(g, x - 0.12, yy - 0.2, z - 0.12, x + 0.12, yy + 0.12, z + 0.12, 0xffc27a, { kind: 'glow' });
    box(g, x - 0.01, yy + 0.12, z - 0.01, x + 0.01, yy + 1.0, z + 0.01, 0x222222, { collide: false });
  }
  for (const [x, yy, z] of [[-3, 4.0, -6], [4, 3.6, -3.5]]) {
    const l = new THREE.PointLight(0xffb36b, 7, 15, 1.6); l.position.set(x, yy, z); g.add(l);
  }
  const fire = new THREE.PointLight(0xff7a2e, 5, 10, 1.8); fire.position.set(3, 2.4, 2.0); g.add(fire);
}

/* -------------------------------------------------------- the Keep outside */

function buildExterior() {
  const e = exterior;
  // Red stone piers framing the facade; the north one lets the front door through on F4.
  box(e, 14.0, 15.1, -0.3, 15.2, 41.4, 6.6, RED, { vary: 0.05 });
  box(e, -15.2, 15.1, -0.3, -14.0, 24.0, 6.6, RED, { vary: 0.05 });
  box(e, -15.2, 24.0, -0.3, -14.0, 28.4, 1.6, RED); box(e, -15.2, 24.0, 3.4, -14.0, 28.4, 6.6, RED);
  box(e, -15.2, 26.8, 1.6, -14.0, 28.4, 3.4, RED);
  box(e, -15.2, 28.4, -0.3, -14.0, 41.4, 6.6, RED, { vary: 0.05 });
  box(e, -15.2, 40.7, -0.5, 15.2, 41.4, 0.5, RED_DK);      // cornice
  box(e, -15.2, 14.6, -0.5, 15.2, 15.3, 3.2, RED_DK);      // plinth under the library
  // Blades: the Red Keep's answer to the White Palace's crystal, in heavy red stone.
  const blade = (a, b, r, sq = 0.4, spin = 0) => span(e, 'rock', coneG(4), new THREE.Vector3(...a), new THREE.Vector3(...b), r, r * sq, BLADE, { collide: false, vary: 0.1 }, spin);
  blade([-22, 0, -3], [-31, 62, 21], 6.5, 0.45, 0);
  blade([-17.5, 27, -1.5], [-22, 56, 13], 3.2, 0.45, 0.2);
  blade([20, -1, -3], [30, 70, 27], 7.5, 0.45, 0);
  blade([17.5, 23, -1.5], [23, 53, 15], 3.4, 0.45, -0.2);
  blade([-7, 45, -5], [-3, 68, 5], 3.6, 0.5, 0);
  blade([6, 44, -4], [11, 62, 7], 3.0, 0.5, 0);
  for (const x of [-14.9, 14.9]) span(e, 'rock', cylG(5), new THREE.Vector3(x, 26, 0), new THREE.Vector3(x, 36.3, 10.2), 0.55, 0.55, RED_DK, { collide: false });
  // One-way glass on the spa floor: from outside it reads as rock.
  const F7 = byN(7);
  for (const o of F7.openings.filter(o => o.kind === 'oneway')) {
    const x0 = o.x - o.w / 2 - 0.35, x1 = o.x + o.w / 2 + 0.35, y0 = F7.y + o.sill - 0.35, y1 = F7.y + o.head + 0.35;
    quad(e, 'oneway', [x0, y0, 0.04], [x1, y0, 0.04], [x1, y1, 0.04], [x0, y1, 0.04], 0x4a3f38, { face: [0, 0, 1] });
  }
}

/* ------------------------------------------------------------ the site */

// Openings cut through the west face, and places where the rock must lie flat (the cliff path).
const HOLES = [
  { t: 'rect', x0: -14.9, x1: 14.9, y0: 15.0, y1: 41.0 },
  { t: 'arch', cx: 0, cy: 1.5, rx: 8.3, ry: 3.8, y0: 1.25 },
  { t: 'rect', x0: -51.75, x1: -49.85, y0: 1.45, y1: 4.15 },
  { t: 'rect', x0: -30.9, x1: -29.1, y0: 5.6, y1: 8.2 },
];
for (const o of FLOORS[6].openings.filter(o => o.kind === 'oneway')) HOLES.push({ t: 'rect', x0: o.x - o.w / 2 - 0.12, x1: o.x + o.w / 2 + 0.12, y0: FLOORS[6].y + o.sill - 0.12, y1: FLOORS[6].y + o.head + 0.12 });
const FLATS = [
  { t: 'seg', ax: -14, ay: 24.6, bx: -58.5, by: 47, r: 1.8 },
  { t: 'rect', x0: -20.5, x1: -14, y0: 22.5, y1: 27.5 },
  { t: 'rect', x0: -33, x1: -27, y0: 4.5, y1: 9.5 },
];
function sdf(S, x, y) {
  if (S.t === 'rect') {
    const dx = Math.max(S.x0 - x, x - S.x1), dy = Math.max(S.y0 - y, y - S.y1);
    return Math.hypot(Math.max(dx, 0), Math.max(dy, 0)) + Math.min(Math.max(dx, dy), 0);
  }
  if (S.t === 'seg') {
    const vx = S.bx - S.ax, vy = S.by - S.ay, t = clamp(((x - S.ax) * vx + (y - S.ay) * vy) / (vx * vx + vy * vy), 0, 1);
    return Math.hypot(x - S.ax - vx * t, y - S.ay - vy * t) - S.r;
  }
  const k = Math.hypot((x - S.cx) / S.rx, (y - S.cy) / S.ry);
  const ell = y >= S.cy ? (k - 1) * Math.min(S.rx, S.ry) : 1e9;
  const dx = Math.abs(x - S.cx) - S.rx, dy = Math.max(S.y0 - y, y - S.cy);
  const rect = Math.hypot(Math.max(dx, 0), Math.max(dy, 0)) + Math.min(Math.max(dx, dy), 0);
  return Math.min(ell, rect);
}
const holeDist = (x, y) => HOLES.reduce((m, S) => Math.min(m, sdf(S, x, y)), 1e9);
const flatDist = (x, y) => Math.min(holeDist(x, y), FLATS.reduce((m, S) => Math.min(m, sdf(S, x, y)), 1e9));

function mixHex(a, b, t) {
  t = Math.round(clamp(t, 0, 1) * 12) / 12;
  const ar = a >> 16, ag = (a >> 8) & 255, ab = a & 255, br = b >> 16, bg = (b >> 8) & 255, bb = b & 255;
  return (Math.round(lerp(ar, br, t)) << 16) | (Math.round(lerp(ag, bg, t)) << 8) | Math.round(lerp(ab, bb, t));
}
// Weathered headland stone: long vertical streaks, a reddish seam, wet dark at the waterline, moss on the brow.
function rockColor(u, v, top = 46) {
  const streak = fbm(u * 0.05, v * 0.012, 3), seam = fbm(u * 0.012 + 11, v * 0.03, 3), grain = vnoise(u * 0.7, v * 0.7);
  let c = mixHex(0x4e4039, 0x7a624f, streak * 1.4 - 0.2);
  c = mixHex(c, 0x6f3f31, smooth(0.55, 0.72, seam) * 0.8);
  c = mixHex(c, 0x3f352f, grain * 0.25);
  c = mixHex(c, 0x2e2724, smooth(2.2, 0.2, v));
  c = mixHex(c, 0x4a5530, smooth(top - 5, top - 0.5, v) * smooth(0.35, 0.6, fbm(u * 0.1, v * 0.2, 2)));
  return c;
}
const rockPush = (u, v, amp) => amp * (0.55 * fbm(u * 0.025, v * 0.04, 4) + 0.3 * fbm(u * 0.09 + 3, v * 0.12, 3) + 0.15 * vnoise(u * 0.45, v * 0.3));
// The height of the headland's west edge: steady above the Keep, uneven elsewhere.
function ridge(u) {
  const wild = 46.5 + (fbm(u * 0.012, 1.7, 3) - 0.5) * 14;
  return lerp(46, lerp(47.5, wild, smooth(16, 40, Math.abs(u))), smooth(-70, -55, u) * smooth(260, 240, u));
}

// The west face of the headland, rolling over a brow onto the clifftop. Holes are cut where the Keep shows.
const FACE_ROWS = 116, BROW_ROWS = 9, BROW_DEPTH = 22;
function westFace(u0, u1, du, holes) {
  const nu = Math.round((u1 - u0) / du), v0 = -8, V = [];
  for (let i = 0; i <= nu; i++) {
    const u = u0 + i * du, top = ridge(u), col = [];
    for (let j = 0; j <= FACE_ROWS; j++) {
      const v = lerp(v0, top, j / FACE_ROWS);
      let d = rockPush(u, v, 4.6) * smooth(top, top - 4, v) * smooth(-70, -64, u) * smooth(260, 254, u);
      d *= smooth(0.2, 4.0, flatDist(u, v));
      col.push([u, v, d]);
    }
    for (let k = 1; k <= BROW_ROWS; k++) {
      const t = k / BROW_ROWS, back = BROW_DEPTH * Math.pow(t, 1.35);
      const y = lerp(top, 46, smooth(0, 1, t)) + Math.sin(t * Math.PI) * (fbm(u * 0.05, k * 0.3, 2) - 0.3) * 2.2;
      col.push([u, y, -back]);
    }
    V.push(col);
  }
  for (let i = 0; i < nu; i++) for (let j = 0; j < FACE_ROWS + BROW_ROWS; j++) {
    const A = V[i][j], B = V[i + 1][j], C = V[i + 1][j + 1], D = V[i][j + 1];
    const brow = j >= FACE_ROWS;
    const uc = (A[0] + B[0]) / 2, vc = (A[1] + D[1]) / 2;
    if (!brow && holes && holeDist(uc, vc) < 0) continue;
    const face = brow ? [0, 1, 0] : [0, 0, 1];
    const col = brow ? mixHex(0x4c5a31, 0x5d5a3a, fbm(uc * 0.05, j, 2)) : rockColor(uc, vc, ridge(uc));
    tri(site, 'rock', A, B, C, col, { face, collide: false });
    tri(site, 'rock', A, C, D, col, { face, collide: false });
  }
}

// A plain vertical face (north and south sides of the headland).
function sideFace(x, sign, z0, z1, dz) {
  const nu = Math.round((z1 - z0) / dz), nv = 27, V = [];
  for (let i = 0; i <= nu; i++) {
    V.push([]);
    for (let j = 0; j <= nv; j++) {
      const z = z0 + i * dz, v = lerp(-8, 46, j / nv), d = rockPush(z, v, 5) * smooth(46, 42, v) * smooth(0, -6, z);
      V[i].push([x + sign * d, v, z]);
    }
  }
  for (let i = 0; i < nu; i++) for (let j = 0; j < nv; j++) {
    const col = rockColor(V[i][j][2], V[i][j][1]);
    quad(site, 'rock', V[i][j], V[i + 1][j], V[i + 1][j + 1], V[i][j + 1], col, { face: [sign, 0, 0], collide: false });
  }
}

function groundH(x, z) {
  let h = -12 + (fbm(x * 0.004, z * 0.004) - 0.5) * 4;
  h = Math.max(h, (-36 - x) * 0.1);                         // the bay floor rising to the beach
  if (x < -30) h = Math.min(Math.max(h, -3), 3.3);
  if (x < -85) {
    const t = -85 - x;
    h = Math.max(h, 3.3 + t * 0.28 + (fbm(x * 0.006, z * 0.006) - 0.5) * 50 * smooth(0, 140, t));
  }
  const edgeZ = 372 + (fbm(x * 0.02, 3.1) - 0.5) * 16, edgeX = 92 + (fbm(z * 0.02, 7.7) - 0.5) * 22;
  const a = smooth(edgeZ - 6, edgeZ + 3, z) * smooth(edgeX + 6, edgeX - 3, x);
  if (a > 0) h = lerp(h, Math.max(h, 56 + (fbm(x * 0.01, z * 0.01) - 0.5) * 10), a);
  if (x > -72 && x < 262 && z < -2) h = Math.min(h, -8);    // under the headland (drawn separately)
  return h;
}

function buildTerrain() {
  // The headland: west face (with the Keep, the grotto mouth and the two hidden doors), north and south faces, and its top.
  westFace(-70, -56, 1, true);
  westFace(-56, 24, 0.5, true);
  westFace(24, 260, 1, false);
  sideFace(-70, -1, -1600, 0, 5);
  sideFace(260, 1, -1600, 0, 5);
  const capN = 34, capM = 158;
  for (let i = 0; i < capN; i++) for (let j = 0; j < capM; j++) {
    const xa = lerp(-70, 260, i / capN), xb = lerp(-70, 260, (i + 1) / capN), za = lerp(-1600, -BROW_DEPTH, j / capM), zb = lerp(-1600, -BROW_DEPTH, (j + 1) / capM);
    const H = (x, z) => 46 + (fbm(x * 0.02, z * 0.02) - 0.5) * 3 * smooth(-70, -60, x) * smooth(260, 250, x) * smooth(-BROW_DEPTH, -BROW_DEPTH - 12, z);
    const col = mixHex(0x4a5a30, 0x5f5c3a, fbm(xa * 0.03, za * 0.03));
    quad(site, 'matte', [xa, H(xa, za), za], [xb, H(xb, za), za], [xb, H(xb, zb), zb], [xa, H(xa, zb), zb], col, { face: [0, 1, 0], collide: false });
  }
  // Everything else: beach, jungle hills, the Palace's western cliff, seabed.
  const X0 = -1000, X1 = 800, Z0 = -1000, Z1 = 1400, step = 8;
  const nx = Math.round((X1 - X0) / step), nz = Math.round((Z1 - Z0) / step);
  const pos = [], col = [], idx = [];
  for (let i = 0; i <= nx; i++) for (let j = 0; j <= nz; j++) {
    const x = X0 + i * step, z = Z0 + j * step, h = groundH(x, z);
    pos.push(x, h, z);
    const slope = Math.abs(groundH(x + 4, z) - groundH(x - 4, z)) + Math.abs(groundH(x, z + 4) - groundH(x, z - 4));
    let c;
    if (h < -0.4) c = 0x6f6450;
    else if (x < -30 && x > -95 && h < 3.8) c = h < 0.4 ? 0xb7a27a : 0xd8c49a;
    else if (slope > 9) c = 0x6a5a4e;
    else c = fbm(x * 0.01, z * 0.01) > 0.5 ? 0x3c5a2c : 0x4a6632;
    const k = lin(c); col.push(k[0], k[1], k[2]);
  }
  for (let i = 0; i < nx; i++) for (let j = 0; j < nz; j++) {
    const a = i * (nz + 1) + j, b = (i + 1) * (nz + 1) + j;
    idx.push(a, a + 1, b, b, a + 1, b + 1);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  const ground = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95 }));
  ground.receiveShadow = true;
  site.add(ground);
  // Krakoa's giant trees on the hills, the headland top and the Palace plateau.
  const spots = [];
  for (let i = 0; i < 1400 && spots.length < 420; i++) {
    const x = lerp(-900, -100, rnd()), z = lerp(-900, 1300, rnd()), h = groundH(x, z);
    if (h > 6) spots.push([x, h, z, 0.8 + rnd() * 0.9]);
  }
  for (let i = 0; i < 140; i++) {
    const x = lerp(-60, 250, rnd()), z = lerp(-600, -14, rnd());
    if (Math.abs(x) < 24 && z > -40) continue;
    spots.push([x, 46, z, 0.6 + rnd() * 0.7]);
  }
  for (let i = 0; i < 90; i++) {
    const x = lerp(-600, 60, rnd()), z = lerp(395, 900, rnd());
    if (x > -80 && x < 50 && z < 450) continue;
    spots.push([x, groundH(x, z), z, 0.6 + rnd() * 0.7]);
  }
  const trunks = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.45, 1, 1, 7), new THREE.MeshStandardMaterial({ color: 0x4a3526, roughness: 0.95 }), spots.length);
  const crowns = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 1), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9, flatShading: true }), spots.length * 2);
  const M = new THREE.Matrix4(), Q = new THREE.Quaternion(), S = new THREE.Vector3(), T = new THREE.Vector3(), CC = new THREE.Color();
  spots.forEach(([x, h, z, s], i) => {
    const th = 26 * s;
    trunks.setMatrixAt(i, M.compose(T.set(x, h + th / 2 - 1, z), Q.identity(), S.set(1.6 * s, th, 1.6 * s)));
    for (let k = 0; k < 2; k++) {
      const r = (11 - k * 3) * s;
      crowns.setMatrixAt(i * 2 + k, M.compose(T.set(x + (k ? 4 * s : 0), h + th + k * 4 * s, z + (k ? -3 * s : 0)), Q.setFromEuler(new THREE.Euler(0, rnd() * 3, 0)), S.set(r, r * 0.55, r)));
      crowns.setColorAt(i * 2 + k, CC.set([0x2f4a26, 0x3b5a2c, 0x2c4430, 0x4a5a2a][Math.floor(rnd() * 4)]));
    }
  });
  site.add(trunks, crowns);
  // The White Palace across the bay: Emma's diamond form as architecture.
  const crystal = (a, b, r, spin = 0) => span(site, 'crystal', coneG(5), new THREE.Vector3(...a), new THREE.Vector3(...b), r, r * 0.8, 0xdcecf7, { collide: false, vary: 0.06 }, spin);
  crystal([-6, 48, 390], [-10, 128, 376], 11, 0.3);
  crystal([12, 48, 396], [18, 104, 384], 9, 1.0);
  crystal([-24, 48, 398], [-33, 96, 386], 8, 0.6);
  crystal([28, 48, 408], [38, 84, 400], 6.5, 1.6);
  crystal([-40, 48, 410], [-52, 80, 404], 6, 2.1);
  crystal([2, 48, 414], [4, 146, 408], 10, 0.2);
  crystal([-42, 10, 384], [-84, 118, 240], 12, 0.5);
  crystal([34, 20, 382], [78, 104, 262], 9, 1.3);
  for (let k = 0; k < 7; k++) {
    const yy = 54 - k * 7.4, zz = 366 - k * 0.6, x0 = -24 + k * 1.5, x1 = 16 - k;
    box(site, x0 - 4, yy - 3.4, zz - 4.5, x1 + 4, yy, zz + 6, 0xece7de, { collide: false });
    box(site, x0 - 3.5, yy - 3.0, zz - 4.52, x1 + 3.5, yy - 0.8, zz - 4.48, 0xffe2b8, { kind: 'glow' });
  }
}

/* --------------------------------------------------------------- assemble */

function buildAll() {
  for (const F of FLOORS) {
    if (F.grotto) continue;
    buildSlabs(F);
    buildWalls(F);
    for (const D of F.decks || []) buildDeck(F, D);
  }
  furnish1(byN(1)); furnish2(byN(2)); furnish3(byN(3)); furnish4(byN(4));
  furnish5(byN(5)); furnish6(byN(6)); furnish7(byN(7)); furnish8(byN(8));
  buildCore();
  buildGuestStair();
  buildSecretTunnel();
  buildEntryPath();
  buildGrotto();
  buildExterior();
  buildTerrain();

  for (const b of buckets.values()) {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(b.pos, 3));
    geo.setAttribute('normal', new THREE.Float32BufferAttribute(b.nor, 3));
    geo.setAttribute('color', new THREE.Float32BufferAttribute(b.col, 3));
    geo.computeBoundingSphere();
    const mesh = new THREE.Mesh(geo, MATS[b.kind]);
    mesh.castShadow = !NO_SHADOW.has(b.kind) && !b.group.userData.noShadow;
    mesh.receiveShadow = b.kind !== 'glow';
    if (b.kind === 'glass' || b.kind === 'water') mesh.renderOrder = 2;
    b.group.add(mesh);
  }
  const cg = new THREE.BufferGeometry();
  cg.setAttribute('position', new THREE.Float32BufferAttribute(colPos, 3));
  const index = new Uint32Array(colPos.length / 3);
  for (let i = 0; i < index.length; i++) index[i] = i;
  cg.setIndex(new THREE.BufferAttribute(index, 1));
  return new MeshBVH(cg);
}

/* ------------------------------------------------------------- labels/UI */

function largestRect(room, F) {
  let best = null, area = -1;
  for (const R of F.rects) if (R.room === room) { const a = (R.x1 - R.x0) * (R.z1 - R.z0); if (a > area) { area = a; best = R; } }
  return best;
}
function roomSpots(F) {
  const out = [];
  for (const room of F.rooms) {
    const R = largestRect(room, F);
    const [sx, sz] = room.spawn || [(R.x0 + R.x1) / 2, (R.z0 + R.z1) / 2];
    out.push({ name: room.name, lx: (R.x0 + R.x1) / 2, lz: (R.z0 + R.z1) / 2, sx, sz, outdoor: false });
  }
  for (const D of F.decks || []) {
    const [sx, sz] = D.spawn || [(D.r[0] + D.r[1]) / 2, (D.r[2] + D.r[3]) / 2];
    out.push({ name: D.name, lx: (D.r[0] + D.r[1]) / 2, lz: (D.r[2] + D.r[3]) / 2, sx, sz, outdoor: true });
  }
  if (F.n === 9) {
    out.push({ name: 'Grotto', lx: -3, lz: -7, sx: -2.5, sz: -6.5, outdoor: false });
    for (const Z of GROTTO_ZONES) out.push({ name: Z.name, lx: (Z.r[0] + Z.r[1]) / 2, lz: (Z.r[2] + Z.r[3]) / 2, sx: Z.name === 'Soaking pool' ? 3 : (Z.r[0] + Z.r[1]) / 2, sz: Z.name === 'Soaking pool' ? -3.4 : (Z.r[2] + Z.r[3]) / 2, outdoor: !!Z.outdoor });
  }
  if (F.n === 6) out.push({ name: 'Guest stair', lx: -16.5, lz: -4, sx: -15.3, sz: -3, outdoor: false });
  if (F.n === 1 || F.n === 5) out.push({ name: 'Spiral stair & lift', lx: CORE_X, lz: CORE_Z, sx: 0, sz: -8.6, outdoor: false });
  return out;
}

const listEl = document.getElementById('floor-list');
const floorButtons = new Map();
function addFloorButton(n, name, elev, ft, extra = '') {
  const li = document.createElement('li');
  const b = document.createElement('button');
  b.className = 'floor-btn ' + extra;
  b.style.setProperty('--ft', ft);
  b.setAttribute('aria-pressed', 'false');
  b.innerHTML = n === 0
    ? `<span class="num">◆</span><span class="name">${name}</span><span class="elev">${elev}</span>`
    : `<span class="num">F${n}</span><span class="name">${name}</span><span class="elev">${elev}</span>`;
  b.addEventListener('click', () => { if (state.mode === 'walk') setMode('dollhouse'); selectFloor(n); });
  li.appendChild(b);
  listEl.appendChild(li);
  floorButtons.set(n, b);
}
addFloorButton(0, 'Whole Keep', '40.9 m', 0, 'whole');
for (const F of FLOORS) addFloorButton(F.n, F.title, '+' + F.y.toFixed(1), (F.top - F.y).toFixed(2), F.inRock ? 'rock' : '');

function makeLabels() {
  for (const F of FLOORS) {
    for (const s of roomSpots(F)) {
      const el = document.createElement('button');
      el.className = 'tag' + (s.outdoor ? ' outdoor' : '');
      el.textContent = s.name;
      el.title = 'Walk into ' + s.name;
      el.addEventListener('pointerdown', ev => ev.stopPropagation());
      el.addEventListener('click', ev => { ev.stopPropagation(); enterWalk(F.n, s.sx, s.sz); });
      const o = new CSS2DObject(el);
      o.position.set(s.lx, F.y + 1.3, s.lz);
      o.visible = false;
      scene.add(o);
      labelObjs[F.n].push(o);
    }
  }
}

/* -------------------------------------------------------------- controls */

const orbit = new OrbitControls(camera, renderer.domElement);
orbit.enableDamping = true;
orbit.dampingFactor = 0.08;
orbit.minDistance = 6;
orbit.maxDistance = 520;
orbit.maxPolarAngle = Math.PI * 0.495;

const state = { mode: 'dollhouse', floor: 0, phase: false, tween: null };
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function viewFor(n) {
  if (n === 0) return { pos: new THREE.Vector3(46, 24, 76), target: new THREE.Vector3(-3, 24, -2) };
  const F = byN(n), tz = n === 8 ? -9 : n === 9 ? -4 : -3;
  return { pos: new THREE.Vector3(20, F.y + 30, tz + 30), target: new THREE.Vector3(-1, F.y + 0.5, tz) };
}
function flyTo(v) {
  if (reduceMotion) { camera.position.copy(v.pos); orbit.target.copy(v.target); orbit.update(); return; }
  state.tween = { p0: camera.position.clone(), t0: orbit.target.clone(), p1: v.pos, t1: v.target, t: 0 };
}
function applyVisibility() {
  const sel = state.mode === 'walk' ? 0 : state.floor;
  for (const F of FLOORS) {
    floorGroups[F.n].visible = sel === 0 || F.n >= sel;
    ceilGroups[F.n].visible = sel === 0 || F.n > sel;
    for (const o of labelObjs[F.n]) o.visible = state.mode === 'dollhouse' && sel === F.n;
  }
  site.visible = sel === 0;
  exterior.visible = sel === 0;
  renderer.shadowMap.needsUpdate = true;
  for (const [n, b] of floorButtons) b.setAttribute('aria-pressed', String(state.mode === 'dollhouse' ? n === state.floor : false));
}
function selectFloor(n) {
  state.floor = n;
  applyVisibility();
  flyTo(viewFor(n));
}

// Walk-mode player: a capsule pushed around a BVH of the Keep (method from three-mesh-bvh's character demo).
const player = { pos: new THREE.Vector3(), vel: new THREE.Vector3(), onGround: false, radius: 0.3, len: 1.1, yaw: 0, pitch: 0, safe: new THREE.Vector3() };
const EYE = 0.25, FEET = 1.4, GRAV = -28;
const keys = new Set();
let bvh = null;

function enterWalk(n, x, z, yaw = Math.PI) {
  const F = byN(n);
  player.pos.set(x, F.y + FEET + 0.05, z);
  player.vel.set(0, 0, 0);
  player.yaw = yaw; player.pitch = -0.04;
  player.safe.copy(player.pos);
  lift.y = F.y;
  setMode('walk');
}
function setMode(mode) {
  const here = state.mode === 'walk' ? locate() : null;
  state.mode = mode;
  document.getElementById('btn-doll').setAttribute('aria-pressed', String(mode === 'dollhouse'));
  document.getElementById('btn-walk').setAttribute('aria-pressed', String(mode === 'walk'));
  document.getElementById('btn-phase').hidden = mode !== 'walk';
  document.getElementById('compass').hidden = mode !== 'walk';
  document.getElementById('where').hidden = mode !== 'walk';
  document.getElementById('crosshair').hidden = mode !== 'walk';
  orbit.enabled = mode === 'dollhouse';
  if (mode === 'walk') {
    state.tween = null;
    camera.near = 0.05; camera.updateProjectionMatrix();
    showGate(document.pointerLockElement !== renderer.domElement);
  } else {
    camera.near = 0.1; camera.updateProjectionMatrix();
    if (document.pointerLockElement) document.exitPointerLock();
    showGate(false);
    notice('', 0);
    if (here) state.floor = here.n;
    if (walkedOnce) flyTo(viewFor(state.floor));
    setPhase(false);
  }
  applyVisibility();
  renderKeys();
}
let walkedOnce = false;

const gateEl = document.getElementById('gate');
let dragLook = false;
function showGate(on) { gateEl.hidden = !on || dragLook; }
gateEl.addEventListener('click', () => {
  const p = renderer.domElement.requestPointerLock?.();
  if (p && p.catch) p.catch(() => { dragLook = true; showGate(false); notice('Drag with the mouse to look around.', 4); });
});
document.addEventListener('pointerlockchange', () => { if (state.mode === 'walk') showGate(document.pointerLockElement !== renderer.domElement); });
document.addEventListener('pointerlockerror', () => { dragLook = true; showGate(false); notice('Drag with the mouse to look around.', 4); });
let dragging = false;
renderer.domElement.addEventListener('pointerdown', e => { if (state.mode === 'walk' && dragLook) { dragging = true; renderer.domElement.setPointerCapture(e.pointerId); } });
renderer.domElement.addEventListener('pointerup', () => { dragging = false; });
document.addEventListener('mousemove', e => {
  if (state.mode !== 'walk') return;
  if (document.pointerLockElement !== renderer.domElement && !dragging) return;
  player.yaw -= e.movementX * 0.0022;
  player.pitch = clamp(player.pitch - e.movementY * 0.0022, -1.45, 1.45);
});

function setPhase(on) {
  state.phase = on;
  document.getElementById('btn-phase').setAttribute('aria-pressed', String(on));
  if (state.mode === 'walk') notice(on ? 'Phasing: walls won’t stop you. Space rises, C sinks.' : '', on ? 3.5 : 0);
  player.vel.set(0, 0, 0);
}

document.getElementById('btn-doll').addEventListener('click', () => { if (state.mode !== 'dollhouse') setMode('dollhouse'); });
function startWalking() {
  if (state.mode === 'walk') return;
  const n = state.floor || 4;
  const spot = roomSpots(byN(n))[n === 4 ? 1 : 0];
  enterWalk(n, spot.sx, spot.sz);
}
document.getElementById('btn-walk').addEventListener('click', startWalking);
document.getElementById('btn-phase').addEventListener('click', () => setPhase(!state.phase));

addEventListener('keydown', e => {
  if (e.target instanceof HTMLInputElement) return;
  const k = e.key.toLowerCase();
  if (state.mode === 'walk' && [' ', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(k)) e.preventDefault();
  keys.add(k);
  if (k === 'm') { if (state.mode === 'walk') setMode('dollhouse'); else startWalking(); }
  if (state.mode !== 'walk') return;
  if (k === 'p') setPhase(!state.phase);
  if (k === ' ' && player.onGround && !state.phase && !lift.riding) { player.vel.y = 6.5; player.onGround = false; }
  if (/^[1-9]$/.test(k) && inLift()) rideTo(Number(k));
});
addEventListener('keyup', e => keys.delete(e.key.toLowerCase()));
addEventListener('blur', () => keys.clear());

const lift = { y: 24, riding: false, from: 0, to: 0, t: 0, dur: 1 };
const inLift = () => Math.hypot(player.pos.x - CORE_X, player.pos.z - CORE_Z) < 1.05 && !state.phase;
function rideTo(n) {
  const F = byN(n);
  if (Math.abs(F.y - lift.y) < 0.05) return;
  Object.assign(lift, { riding: true, from: lift.y, to: F.y, t: 0, dur: clamp(Math.abs(F.y - lift.y) / 3.2, 1.2, 9) });
  notice('Lift to ' + F.title + '…', lift.dur);
}

const tmpBox = new THREE.Box3(), tmpSeg = new THREE.Line3(), tv1 = new THREE.Vector3(), tv2 = new THREE.Vector3(), mv = new THREE.Vector3();
function physicsStep(dt) {
  const fwd = (keys.has('w') || keys.has('arrowup') ? 1 : 0) - (keys.has('s') || keys.has('arrowdown') ? 1 : 0);
  const side = (keys.has('d') || keys.has('arrowright') ? 1 : 0) - (keys.has('a') || keys.has('arrowleft') ? 1 : 0);
  const run = keys.has('shift');
  const sy = Math.sin(player.yaw), cy = Math.cos(player.yaw);
  if (state.phase) {
    const speed = run ? 14 : 6, cp = Math.cos(player.pitch), sp = Math.sin(player.pitch);
    mv.set(-sy * cp * fwd + cy * side, sp * fwd + ((keys.has(' ') ? 1 : 0) - (keys.has('c') ? 1 : 0)), -cy * cp * fwd - sy * side);
    player.pos.addScaledVector(mv, speed * dt);
    return;
  }
  if (player.onGround) player.vel.y = dt * GRAV; else player.vel.y += dt * GRAV;
  player.pos.addScaledVector(player.vel, dt);
  mv.set(-sy * fwd + cy * side, 0, -cy * fwd - sy * side);
  if (mv.lengthSq() > 0) mv.normalize();
  player.pos.addScaledVector(mv, (run ? 6.2 : 3.1) * dt);

  const r = player.radius;
  tmpSeg.start.copy(player.pos);
  tmpSeg.end.set(player.pos.x, player.pos.y - player.len, player.pos.z);
  tmpBox.makeEmpty(); tmpBox.expandByPoint(tmpSeg.start); tmpBox.expandByPoint(tmpSeg.end);
  tmpBox.min.addScalar(-r); tmpBox.max.addScalar(r);
  bvh.shapecast({
    intersectsBounds: b => b.intersectsBox(tmpBox),
    intersectsTriangle: t => {
      const d = t.closestPointToSegment(tmpSeg, tv1, tv2);
      if (d < r) {
        const depth = r - d, dir = tv2.sub(tv1).normalize();
        tmpSeg.start.addScaledVector(dir, depth);
        tmpSeg.end.addScaledVector(dir, depth);
      }
    },
  });
  const delta = tv1.subVectors(tmpSeg.start, player.pos);
  player.onGround = delta.y > Math.abs(dt * player.vel.y * 0.25);
  const off = Math.max(0, delta.length() - 1e-5);
  delta.normalize().multiplyScalar(off);
  player.pos.add(delta);
  if (!player.onGround) { delta.normalize(); player.vel.addScaledVector(delta, -delta.dot(player.vel)); }
  else player.vel.set(0, 0, 0);
}

let safeTimer = 0;
function updateWalk(dt) {
  if (lift.riding) {
    lift.t += dt;
    const k = clamp(lift.t / lift.dur, 0, 1), e = k * k * (3 - 2 * k);
    lift.y = lerp(lift.from, lift.to, e);
    player.pos.y = lift.y + FEET + 0.02;
    player.vel.set(0, 0, 0);
    if (k >= 1) { lift.riding = false; player.onGround = true; }
  } else {
    const steps = 5;
    for (let i = 0; i < steps; i++) physicsStep(Math.min(dt, 0.05) / steps);
    const here = locate();
    const nearCore = Math.hypot(player.pos.x - CORE_X, player.pos.z - CORE_Z) < 7;
    if (here && nearCore && !state.phase) {
      const target = byN(here.n).y, d = target - lift.y;
      if (Math.hypot(player.pos.x - CORE_X, player.pos.z - CORE_Z) < 1.2) lift.y = target;
      else lift.y += clamp(d, -4 * dt, 4 * dt);
    }
    safeTimer += dt;
    if (player.onGround && here && safeTimer > 0.5) { player.safe.copy(player.pos); safeTimer = 0; }
    if (player.pos.y < -2.5 || (!state.phase && player.pos.y < 0.4 && !here)) {
      player.pos.copy(player.safe); player.vel.set(0, 0, 0);
      notice('The island caught you. Back where you were.', 2.5);
    }
  }
  cabin.position.y = lift.y;
  camera.position.set(player.pos.x, player.pos.y + EYE, player.pos.z);
  camera.rotation.set(player.pitch, player.yaw, 0, 'YXZ');
}

const ZONES = [
  { name: 'Guest stair', n: 6, x0: -19, x1: -14.2, z0: -10.4, z1: -0.4, y0: 15, y1: 24.5 },
  { name: 'Beach tunnel', n: 6, x0: -52, x1: -18.8, z0: -2.7, z1: 0.4, y0: 1, y1: 19 },
  { name: 'Hidden tunnel', n: 8, x0: -31, x1: -14, z0: -17.6, z1: 0, y0: 5, y1: 10 },
  { name: 'Hidden ledge', n: 8, x0: -33, x1: -27, z0: 0, z1: 3, y0: 5, y1: 9 },
  { name: 'Cave mouth ledge', n: 9, x0: -9.5, x1: 9.5, z0: 0, z1: 3.6, y0: 0.8, y1: 4 },
];
function locate() {
  const p = state.mode === 'walk' ? player.pos : null;
  if (!p) return { n: state.floor || 4, name: '' };
  const x = p.x, z = p.z, fy = p.y - FEET;
  for (const Z of ZONES) if (x > Z.x0 && x < Z.x1 && z > Z.z0 && z < Z.z1 && fy > Z.y0 && fy < Z.y1) return { n: Z.n, name: Z.name };
  const r = Math.hypot(x - CORE_X, z - CORE_Z);
  for (const F of FLOORS) {
    if (fy < F.y - 0.7 || fy > F.top - 0.5) continue;
    if (r < R_SHAFT) return { n: F.n, name: 'Lift' };
    if (r < R_IN + 0.05) return { n: F.n, name: 'Spiral stair' };
    if (F.grotto) {
      const Z = GROTTO_ZONES.find(Z => x > Z.r[0] && x < Z.r[1] && z > Z.r[2] && z < Z.r[3]);
      if ((x / 11.5) ** 2 + ((z + 5) / 8.5) ** 2 < 1.1 || Z) return { n: 9, name: Z ? Z.name : 'Grotto' };
      continue;
    }
    const room = F.roomAt(x, z);
    if (room) return { n: F.n, name: room.name };
    const D = F.deckAt(x, z);
    if (D) return { n: F.n, name: D.name };
  }
  return null;
}

/* ------------------------------------------------------------------ HUD */

const noticeEl = document.getElementById('notice');
let noticeTimer = 0;
function notice(text, secs) { noticeEl.textContent = text; noticeEl.hidden = !text; noticeTimer = secs || 0; }
function renderKeys() {
  const k = s => `<kbd>${s}</kbd>`;
  document.getElementById('keys').innerHTML = state.mode === 'walk'
    ? `<span>${k('W')}${k('A')}${k('S')}${k('D')} move</span><span>${k('Shift')} run</span><span>${k('Space')} jump</span><span>${k('P')} phase</span><span>${k('1')}–${k('9')} in the lift</span><span>${k('M')} dollhouse</span>`
    : `<span>Drag to orbit</span><span>Right-drag to pan</span><span>Scroll to zoom</span><span>Pick a floor, then click a room tag to walk in</span>`;
}
const CARD = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
let hudTimer = 0;
function updateHud(dt) {
  if (noticeTimer > 0) { noticeTimer -= dt; if (noticeTimer <= 0) noticeEl.hidden = true; }
  hudTimer -= dt;
  if (hudTimer > 0 || state.mode !== 'walk') return;
  hudTimer = 0.12;
  const dx = -Math.sin(player.yaw), dz = -Math.cos(player.yaw);
  const bearing = (Math.atan2(-dz, -dx) / DEG + 360) % 360;
  document.getElementById('compass-dir').textContent = CARD[Math.round(bearing / 45) % 8];
  document.getElementById('compass-deg').textContent = String(Math.round(bearing)).padStart(3, '0') + '°';
  const here = locate();
  const fy = player.pos.y - FEET;
  document.getElementById('where-room').textContent = here ? here.name : 'Outside';
  document.getElementById('where-meta').textContent = (here ? 'Floor ' + here.n + ' · ' + byN(here.n).title + ' · ' : '') + (fy >= 0 ? '+' : '') + fy.toFixed(1) + ' m';
  if (inLift() && !lift.riding && noticeTimer <= 0) { noticeEl.innerHTML = 'In the lift: press <kbd>1</kbd>–<kbd>9</kbd> to choose a floor'; noticeEl.hidden = false; }
  else if (!inLift() && noticeTimer <= 0) noticeEl.hidden = true;
}

/* ----------------------------------------------------------------- loop */

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
  labelRenderer.setSize(innerWidth, innerHeight);
});

let lastT = performance.now();
function frame() {
  const now = performance.now(), dt = Math.min((now - lastT) / 1000, 0.1);
  lastT = now;
  water.material.uniforms.time.value += dt * 0.55;
  su.time.value += dt;
  if (state.mode === 'walk') updateWalk(dt);
  else {
    if (state.tween) {
      const T = state.tween;
      T.t = Math.min(1, T.t + dt / 1.1);
      const e = 1 - Math.pow(1 - T.t, 3);
      camera.position.lerpVectors(T.p0, T.p1, e);
      orbit.target.lerpVectors(T.t0, T.t1, e);
      if (T.t >= 1) state.tween = null;
    }
    orbit.update();
  }
  updateHud(dt);
  renderer.render(scene, camera);
  labelRenderer.render(scene, camera);
}

function start() {
  bvh = buildAll();
  makeLabels();
  const v = viewFor(0);
  camera.position.copy(v.pos);
  orbit.target.copy(v.target);
  orbit.update();
  applyVisibility();
  renderKeys();
  renderer.setAnimationLoop(frame);
  const ld = document.getElementById('loading');
  ld.classList.add('done');
  setTimeout(() => ld.remove(), 800);
  walkedOnce = true;
}

// Small hook used for automated screenshots; harmless for viewers.
window.__keep = {
  view: (n) => { setMode('dollhouse'); selectFloor(n); state.tween = null; const v = viewFor(n); camera.position.copy(v.pos); orbit.target.copy(v.target); orbit.update(); },
  walk: (n, x, z, yaw = 0, pitch = -0.04) => { enterWalk(n, x, z, yaw); player.pitch = pitch; },
  cam: (px, py, pz, tx, ty, tz) => { setMode('dollhouse'); state.floor = 0; applyVisibility(); state.tween = null; camera.position.set(px, py, pz); orbit.target.set(tx, ty, tz); orbit.update(); },
  sim: (secs) => { for (let t = 0; t < secs; t += 1 / 60) updateWalk(1 / 60); },
  spots: () => FLOORS.map(F => ({ n: F.n, y: F.y, spots: roomSpots(F) })),
  keys, player, locate, state, lift,
};

requestAnimationFrame(() => setTimeout(start, 30));

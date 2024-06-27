import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import * as dat from 'dat.gui';

// Initialize scene, camera, and renderer
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);
renderer.setClearColor(0xffffff, 1);

// Add orbit controls
const controls = new OrbitControls(camera, renderer.domElement);
camera.position.z = 5;

// Create functions for different geometries
function createPlaneGeometry() {
  return new THREE.PlaneGeometry(10, 10, 100, 100);
}

function createSphereGeometry() {
  return new THREE.SphereGeometry(5, 100, 100);
}

function createCapsuleGeometry() {
  return new THREE.CapsuleGeometry(5, 2, 50, 100); // radius, length, capSegments, radialSegments
}

function createDodecahedronGeometry() {
  return new THREE.DodecahedronGeometry(5); // radius
}

// Custom shader material
const material = new THREE.ShaderMaterial({
  uniforms: {
    time: { value: 0 },
    color1: { value: new THREE.Vector4(1, 0, 0, 1) },
    color2: { value: new THREE.Vector4(0, 1, 0, 1) },
    color3: { value: new THREE.Vector4(0, 0, 1, 1) },
    edgeAlpha: { value: 0.0 },
    noiseScale: { value: 1.0 },
    distortionStrength: { value: 0.5 },
    colorNoiseScale: { value: 1.0 },
    alphaNoiseScale: { value: 1.0 },
    distortionNoiseScale: { value: 1.0 },
    alphaNoiseStrength: { value: 1.0 }
  },
  vertexShader: `
    uniform float time;
    uniform float noiseScale;
    uniform float distortionStrength;
    uniform float colorNoiseScale;
    uniform float alphaNoiseScale;
    uniform float distortionNoiseScale;

    varying vec2 vUv;
    varying float colorNoise;
    varying float alphaNoise;
    varying float distortionNoise;

    vec3 mod289(vec3 x) {
      return x - floor(x * (1.0 / 289.0)) * 289.0;
    }

    vec4 mod289(vec4 x) {
      return x - floor(x * (1.0 / 289.0)) * 289.0;
    }

    vec4 permute(vec4 x) {
         return mod289(((x*34.0)+1.0)*x);
    }

    vec4 taylorInvSqrt(vec4 r) {
      return 1.79284291400159 - 0.85373472095314 * r;
    }

    float snoise(vec3 v) { 
      const vec2  C = vec2(1.0/6.0, 1.0/3.0);
      const vec4  D = vec4(0.0, 0.5, 1.0, 2.0);

      vec3 i  = floor(v + dot(v, C.yyy));
      vec3 x0 =   v - i + dot(i, C.xxx);

      vec3 g = step(x0.yzx, x0.xyz);
      vec3 l = 1.0 - g;
      vec3 i1 = min(g.xyz, l.zxy);
      vec3 i2 = max(g.xyz, l.zxy);

      vec3 x1 = x0 - i1 + C.xxx;
      vec3 x2 = x0 - i2 + C.yyy;
      vec3 x3 = x0 - D.yyy;

      i = mod289(i); 
      vec4 p = permute(permute(permute(
                 i.z + vec4(0.0, i1.z, i2.z, 1.0))
               + i.y + vec4(0.0, i1.y, i2.y, 1.0)) 
               + i.x + vec4(0.0, i1.x, i2.x, 1.0));

      float n_ = 0.142857142857;
      vec3  ns = n_ * D.wyz - D.xzx;

      vec4 j = p - 49.0 * floor(p * ns.z * ns.z);

      vec4 x_ = floor(j * ns.z);
      vec4 y_ = floor(j - 7.0 * x_);
      vec4 x = x_ *ns.x + ns.yyyy;
      vec4 y = y_ *ns.x + ns.yyyy;
      vec4 h = 1.0 - abs(x) - abs(y);

      vec4 b0 = vec4(x.xy, y.xy);
      vec4 b1 = vec4(x.zw, y.zw);

      vec4 s0 = floor(b0)*2.0 + 1.0;
      vec4 s1 = floor(b1)*2.0 + 1.0;
      vec4 sh = -step(h, vec4(0.0));

      vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy;
      vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww;

      vec3 p0 = vec3(a0.xy,h.x);
      vec3 p1 = vec3(a0.zw,h.y);
      vec3 p2 = vec3(a1.xy,h.z);
      vec3 p3 = vec3(a1.zw,h.w);

      vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2, p2), dot(p3,p3)));
      p0 *= norm.x;
      p1 *= norm.y;
      p2 *= norm.z;
      p3 *= norm.w;

      vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
      m = m * m;
      return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
    }

    void main() {
      vUv = uv;
      vec3 pos = position;

      colorNoise = snoise(vec3(pos.x * colorNoiseScale, pos.y * colorNoiseScale, time * 0.2));
      alphaNoise = snoise(vec3(pos.x * alphaNoiseScale, pos.y * alphaNoiseScale, time * 0.3));
      distortionNoise = snoise(vec3(pos.x * distortionNoiseScale, pos.y * distortionNoiseScale, time * 0.1));

      pos.z += distortionNoise * distortionStrength;

      gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
    }
  `,
  fragmentShader: `
    uniform vec4 color1;
    uniform vec4 color2;
    uniform vec4 color3;
    uniform float edgeAlpha;
    uniform float alphaNoiseStrength;

    varying vec2 vUv;
    varying float colorNoise;
    varying float alphaNoise;

    void main() {
      float edgeFactor = smoothstep(0.0, 0.1, min(vUv.x, min(vUv.y, min(1.0 - vUv.x, 1.0 - vUv.y))));

      vec4 color = mix(color1, color2, colorNoise * 0.5 + 0.5);
      color = mix(color, color3, vUv.x * vUv.y);

      float alpha = mix(edgeAlpha, color.a * (alphaNoise * 0.5 + 0.5) * alphaNoiseStrength, edgeFactor);

      vec3 finalColor = color.rgb * alpha;

      gl_FragColor = vec4(finalColor, alpha);
    }
  `,
});

// Initialize with a plane geometry
let currentGeometry = createPlaneGeometry();
let mesh = new THREE.Mesh(currentGeometry, material);
scene.add(mesh);

function updateGeometry(newGeometry) {
  scene.remove(mesh);
  mesh.geometry.dispose(); // Clean up previous geometry
  mesh.geometry = newGeometry;
  scene.add(mesh);
}

// Animation loop
function animate() {
  requestAnimationFrame(animate);
  material.uniforms.time.value += 0.01;
  controls.update();
  renderer.render(scene, camera);
}

animate();

// Resize handler with debounce
let resizeTimeout;
window.addEventListener('resize', () => {
  clearTimeout(resizeTimeout);
  resizeTimeout = setTimeout(() => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  }, 100);
});

// GUI for adjusting colors and parameters
const gui = new dat.GUI();
const params = {
  geometryType: 'Plane', // Initial geometry type
  color1: [250, 30, 10],
  color1Alpha: 1,
  color2: [0, 255, 0],
  color2Alpha: 1,
  color3: [0, 0, 255],
  color3Alpha: 1,
  edgeAlpha: 0.0,
  distortionStrength: 0.5,
  colorNoiseScale: 1.0,
  alphaNoiseScale: 1.0,
  distortionNoiseScale: 1.0,
  alphaNoiseStrength: 1.0
};

// Geometry type selection
gui.add(params, 'geometryType', ['Plane', 'Sphere', 'Capsule', 'Dodecahedron']).onChange((value) => {
  let newGeometry;
  switch(value) {
    case 'Plane':
      newGeometry = createPlaneGeometry();
      break;
    case 'Sphere':
      newGeometry = createSphereGeometry();
      break;
    case 'Capsule':
      newGeometry = createCapsuleGeometry();
      break;
    case 'Dodecahedron':
      newGeometry = createDodecahedronGeometry();
      break;
  }
  updateGeometry(newGeometry);
});

// Function to update color uniform
function updateColor(colorUniform, colorArray, alpha) {
  console.log(`Updating color uniform: ${colorUniform}, Color: ${colorArray}, Alpha: ${alpha}`);
  colorUniform.value.set(
    colorArray[0] / 255,
    colorArray[1] / 255,
    colorArray[2] / 255,
    alpha
  );
}

// Color 1
const color1Folder = gui.addFolder('Color 1');
color1Folder.addColor(params, 'color1').onChange((value) => {
  console.log('Color 1 changed:', value);
  updateColor(material.uniforms.color1, value, params.color1Alpha);
});
color1Folder.add(params, 'color1Alpha', 0, 1).onChange((value) => {
  console.log('Color 1 Alpha changed:', value);
  updateColor(material.uniforms.color1, params.color1, value);
});

// Color 2
const color2Folder = gui.addFolder('Color 2');
color2Folder.addColor(params, 'color2').onChange((value) => {
  console.log('Color 2 changed:', value);
  updateColor(material.uniforms.color2, value, params.color2Alpha);
});
color2Folder.add(params, 'color2Alpha', 0, 1).onChange((value) => {
  console.log('Color 2 Alpha changed:', value);
  updateColor(material.uniforms.color2, params.color2, value);
});

// Color 3
const color3Folder = gui.addFolder('Color 3');
color3Folder.addColor(params, 'color3').onChange((value) => {
  console.log('Color 3 changed:', value);
  updateColor(material.uniforms.color3, value, params.color3Alpha);
});
color3Folder.add(params, 'color3Alpha', 0, 1).onChange((value) => {
  console.log('Color 3 Alpha changed:', value);
  updateColor(material.uniforms.color3, params.color3, value);
});

// Noise and distortion parameters
const noiseFolder = gui.addFolder('Noise and Distortion');
noiseFolder.add(params, 'distortionStrength', 0, 2).onChange((value) => material.uniforms.distortionStrength.value = value);
noiseFolder.add(params, 'colorNoiseScale', 0.1, 5).onChange((value) => material.uniforms.colorNoiseScale.value = value);
noiseFolder.add(params, 'alphaNoiseScale', 0.1, 5).onChange((value) => material.uniforms.alphaNoiseScale.value = value);
noiseFolder.add(params, 'distortionNoiseScale', 0.1, 5).onChange((value) => material.uniforms.distortionNoiseScale.value = value);
noiseFolder.add(params, 'alphaNoiseStrength', 0, 2).onChange((value) => material.uniforms.alphaNoiseStrength.value = value);

// Other parameters
gui.add(params, 'edgeAlpha', 0, 1).onChange((value) => material.uniforms.edgeAlpha.value = value);

// Open all folders
color1Folder.open();
color2Folder.open();
color3Folder.open();
noiseFolder.open();

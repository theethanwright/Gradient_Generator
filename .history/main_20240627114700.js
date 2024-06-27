import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import * as dat from 'dat.gui';

// Initialize scene, camera, and renderer
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Add orbit controls
const controls = new OrbitControls(camera, renderer.domElement);
camera.position.z = 5;

// Create a plane geometry
const geometry = new THREE.PlaneGeometry(10, 10, 100, 100);

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
  },
  vertexShader: `
    uniform float time;
    uniform float noiseScale;
    uniform float distortionStrength;
    uniform float distortionNoiseScale;
    
    varying vec2 vUv;
    varying float colorNoise;
    varying float alphaNoise;
    varying float distortionNoise;
    
    // Simplex noise function
    ${THREE.ShaderChunk.noise}

    float noise(vec3 p) {
      return snoise(p);
    }

    void main() {
      vUv = uv;
      vec3 pos = position;
      
      // Generate different noise values for color, alpha, and distortion
      colorNoise = noise(vec3(pos.x * noiseScale, pos.y * noiseScale, time * 0.2));
      alphaNoise = noise(vec3(pos.x * noiseScale * 1.5, pos.y * noiseScale * 1.5, time * 0.3));
      distortionNoise = noise(vec3(pos.x * distortionNoiseScale, pos.y * distortionNoiseScale, time * 0.1));
      
      // Apply distortion
      pos.z += distortionNoise * distortionStrength;
      
      gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
    }
  `,
  fragmentShader: `
    uniform vec4 color1;
    uniform vec4 color2;
    uniform vec4 color3;
    uniform float edgeAlpha;
    uniform float colorNoiseScale;
    uniform float alphaNoiseScale;
    
    varying vec2 vUv;
    varying float colorNoise;
    varying float alphaNoise;
    
    void main() {
      float edgeFactor = smoothstep(0.0, 0.1, min(vUv.x, min(vUv.y, min(1.0 - vUv.x, 1.0 - vUv.y))));
      
      // Use colorNoise for color mixing
      vec4 color = mix(color1, color2, colorNoise * 0.5 + 0.5);
      color = mix(color, color3, vUv.x * vUv.y);
      
      // Use alphaNoise for alpha
      float alpha = mix(edgeAlpha, color.a * (alphaNoise * 0.5 + 0.5), edgeFactor);
      
      gl_FragColor = vec4(color.rgb, alpha);
    }
  `,
  transparent: true,
});

const plane = new THREE.Mesh(geometry, material);
scene.add(plane);

// Animation loop
function animate() {
  requestAnimationFrame(animate);
  material.uniforms.time.value += 0.01;
  controls.update();
  renderer.render(scene, camera);
}

animate();

// Resize handler
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// GUI for adjusting colors and parameters
const gui = new dat.GUI();
const params = {
  color1: [255, 0, 0],
  color1Alpha: 1,
  color2: [0, 255, 0],
  color2Alpha: 1,
  color3: [0, 0, 255],
  color3Alpha: 1,
  edgeAlpha: 0.0,
  noiseScale: 1.0,
  distortionStrength: 0.5,
  colorNoiseScale: 1.0,
  alphaNoiseScale: 1.0,
  distortionNoiseScale: 1.0,
};

function updateColor(colorUniform, colorArray, alpha) {
  colorUniform.value.set(
    colorArray[0] / 255,
    colorArray[1] / 255,
    colorArray[2] / 255,
    alpha
  );
}

// Color 1
const color1Folder = gui.addFolder('Color 1');
color1Folder.addColor(params, 'color1').onChange((value) => updateColor(material.uniforms.color1, value, params.color1Alpha));
color1Folder.add(params, 'color1Alpha', 0, 1).onChange((value) => updateColor(material.uniforms.color1, params.color1, value));

// Color 2
const color2Folder = gui.addFolder('Color 2');
color2Folder.addColor(params, 'color2').onChange((value) => updateColor(material.uniforms.color2, value, params.color2Alpha));
color2Folder.add(params, 'color2Alpha', 0, 1).onChange((value) => updateColor(material.uniforms.color2, params.color2, value));

// Color 3
const color3Folder = gui.addFolder('Color 3');
color3Folder.addColor(params, 'color3').onChange((value) => updateColor(material.uniforms.color3, value, params.color3Alpha));
color3Folder.add(params, 'color3Alpha', 0, 1).onChange((value) => updateColor(material.uniforms.color3, params.color3, value));

// Noise and distortion parameters
const noiseFolder = gui.addFolder('Noise and Distortion');
noiseFolder.add(params, 'noiseScale', 0.1, 5).onChange((value) => material.uniforms.noiseScale.value = value);
noiseFolder.add(params, 'distortionStrength', 0, 2).onChange((value) => material.uniforms.distortionStrength.value = value);
noiseFolder.add(params, 'colorNoiseScale', 0.1, 5).onChange((value) => material.uniforms.colorNoiseScale.value = value);
noiseFolder.add(params, 'alphaNoiseScale', 0.1, 5).onChange((value) => material.uniforms.alphaNoiseScale.value = value);
noiseFolder.add(params, 'distortionNoiseScale', 0.1, 5).onChange((value) => material.uniforms.distortionNoiseScale.value = value);

// Other parameters
gui.add(params, 'edgeAlpha', 0, 1).onChange((value) => material.uniforms.edgeAlpha.value = value);

// Open all folders
color1Folder.open();
color2Folder.open();
color3Folder.open();
noiseFolder.open();
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

let scene, camera, renderer, controls, car, clock;

init();
animate();

function init() {
  const container = document.querySelector('.container');
  const canvas = document.querySelector('.canvas');

  scene = new THREE.Scene();
  clock = new THREE.Clock();



  // Camera setup
  camera = new THREE.PerspectiveCamera(
    500,
    window.innerWidth / window.innerHeight,
    1.1,
    500
  );
  camera.position.set(10, 20, 80); // lift the view higher
  camera.lookAt(0, 0.5, 0);

  // Renderer
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  // ✅ Improved lighting setup
  const hemiLight = new THREE.HemisphereLight(0xffffff, 0x555555, 1.5);
  hemiLight.position.set(0, 10, 0);
  scene.add(hemiLight);

  const dirLight = new THREE.DirectionalLight(0xffffff, 2);
  dirLight.position.set(5, 10, 7);
  dirLight.castShadow = true;
  dirLight.shadow.mapSize.width = 2048;
  dirLight.shadow.mapSize.height = 2048;
  scene.add(dirLight);

  // Ground plane
  const groundGeo = new THREE.PlaneGeometry(100, 100);
  const groundMat = new THREE.MeshStandardMaterial({
    color: 0x0b1821,
    roughness: 1.9,
    metalness: 1.1
  });
  const ground = new THREE.Mesh(groundGeo, groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -1.3;
  ground.receiveShadow = true;
  scene.add(ground);

  // ✅ Load car model
  const loader = new GLTFLoader();
  loader.load(
    './models/old_rusty_car.glb',
    (gltf) => {
      car = gltf.scene;
      car.scale.set(0.2, 0.2, 0.2); // slightly larger
      car.position.set(0, -1.1, 0);
      car.rotation.y = Math.PI / 4; // angle for a dynamic look

      car.traverse((child) => {
        if (child.isMesh) {
          child.castShadow = true;
          child.receiveShadow = true;
        }
      });

      scene.add(car);
    },
    (xhr) => console.log(`Loading: ${(xhr.loaded / xhr.total) * 100}%`),
    (err) => console.error('Error loading model:', err)
  );

  // Orbit Controls
  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.autoRotate = true;
  controls.autoRotateSpeed = 0.7;
  controls.enableZoom = false;
  controls.minPolarAngle = Math.PI / 3;
  controls.maxPolarAngle = Math.PI / 2;

  // Resize handler
  window.addEventListener('resize', onWindowResize);
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
  requestAnimationFrame(animate);

  if (car) {
    const t = clock.getElapsedTime();
    // Subtle floating animation
    car.position.y = -1.1 + Math.sin(t * 1.5) * 0.05;
  }

  controls.update();
  renderer.render(scene, camera);
}

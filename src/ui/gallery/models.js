import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { PALETTE } from '../../art/palette.js';
import { phrase } from '../../i18n/index.js';

/** One scissored renderer avoids a WebGL context for each preview card. */
export async function mountModels(cards, { reducedMotion, status }) {
  const canvas = document.createElement('canvas');
  canvas.className = 'model-canvas';
  canvas.setAttribute('aria-hidden', 'true');
  let context;
  try {
    context = canvas.getContext('webgl2', { alpha: true, antialias: true });
  } catch {
    /* Fallback remains readable. */
  }
  if (!context) {
    status.textContent =
      '3D previews are unavailable here. All asset names, badges, and SVG art are still below.';
    cards.forEach((card) => {
      card.dataset.modelState = 'fallback';
      card.querySelector('.model-window').textContent =
        '3D preview unavailable';
    });
    return { setPaused() {}, dispose() {} };
  }
  const renderer = new THREE.WebGLRenderer({
    canvas,
    context,
    alpha: true,
    antialias: true,
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.setClearColor(0, 0);
  renderer.setScissorTest(true);
  document.body.append(canvas);
  const loader = new GLTFLoader();
  const previews = [];
  await Promise.all(
    cards.map(async (card) => {
      const gltf = await loader.loadAsync(card.dataset.modelPath);
      const model = gltf.scene;
      model.traverse((node) => {
        if (node.isMesh) {
          node.castShadow = true;
          node.receiveShadow = true;
        }
      });
      const bounds = new THREE.Box3().setFromObject(model),
        size = bounds.getSize(new THREE.Vector3());
      const height = Math.max(size.y, size.x * 0.9, size.z * 1.1);
      const scene = new THREE.Scene();
      scene.add(model);
      const camera = new THREE.OrthographicCamera(
        -height,
        height,
        height,
        -height,
        0.1,
        40,
      );
      camera.position.set(height * 3, height * 2.1, height * 4);
      camera.lookAt(0, size.y * 0.44, 0);
      const fill = new THREE.HemisphereLight(PALETTE.white, PALETTE.ink, 2);
      scene.add(fill);
      const sun = new THREE.DirectionalLight(PALETTE.amber, 3);
      sun.position.set(-6, 3, 5);
      sun.castShadow = true;
      sun.shadow.mapSize.set(512, 512);
      sun.shadow.camera.left = -4;
      sun.shadow.camera.right = 4;
      sun.shadow.camera.top = 4;
      sun.shadow.camera.bottom = -4;
      sun.shadow.normalBias = 0.04;
      scene.add(sun);
      const terrain = new THREE.Mesh(
        new THREE.CircleGeometry(Math.max(size.x, size.z, 1) * 0.7, 24),
        new THREE.MeshStandardMaterial({
          color: PALETTE.regolith,
          roughness: 1,
        }),
      );
      terrain.rotation.x = -Math.PI / 2;
      terrain.position.y = -0.025;
      terrain.receiveShadow = true;
      scene.add(terrain);
      previews.push({
        card,
        window: card.querySelector('.model-window'),
        model,
        scene,
        camera,
        height,
      });
      card.dataset.modelState = 'loaded';
    }),
  );
  status.textContent = phrase(
    `${previews.length} original models loaded. ${reducedMotion.matches ? 'Rotation is paused for reduced motion.' : 'Visible models rotate slowly.'}`,
  );
  let paused = reducedMotion.matches,
    frame = 0,
    disposed = false,
    last = 0,
    elapsed = 0;
  const resize = () => {
    renderer.setSize(window.innerWidth, window.innerHeight, false);
    draw(performance.now(), true);
  };
  function draw(now, forced = false) {
    if (disposed) return;
    cancelAnimationFrame(frame);
    if (!forced && now - last < 32) {
      frame = requestAnimationFrame(draw);
      return;
    }
    const delta = Math.min(0.05, (now - (last || now)) / 1000);
    last = now;
    if (!paused && !document.hidden) elapsed += delta;
    renderer.setScissorTest(false);
    renderer.clear();
    renderer.setScissorTest(true);
    let visible = 0;
    for (const preview of previews) {
      const rect = preview.window.getBoundingClientRect();
      if (
        rect.bottom < 0 ||
        rect.top > window.innerHeight ||
        rect.right < 0 ||
        rect.left > window.innerWidth
      )
        continue;
      visible++;
      const left = Math.max(0, rect.left),
        bottom = Math.max(0, window.innerHeight - rect.bottom);
      const width = Math.min(window.innerWidth, rect.right) - left,
        height =
          Math.min(window.innerHeight, rect.bottom) - Math.max(0, rect.top);
      preview.model.rotation.y = elapsed * 0.24;
      const aspect = rect.width / rect.height;
      const scale = preview.height * 0.78;
      preview.camera.left = -scale * aspect;
      preview.camera.right = scale * aspect;
      preview.camera.top = scale;
      preview.camera.bottom = -scale;
      preview.camera.updateProjectionMatrix();
      renderer.setViewport(
        rect.left,
        window.innerHeight - rect.bottom,
        rect.width,
        rect.height,
      );
      renderer.setScissor(left, bottom, width, height);
      renderer.render(preview.scene, preview.camera);
    }
    if (visible && !paused && !document.hidden)
      frame = requestAnimationFrame(draw);
  }
  const onScroll = () => draw(performance.now(), true);
  window.addEventListener('resize', resize);
  window.addEventListener('scroll', onScroll, { passive: true });
  document.addEventListener('visibilitychange', onScroll);
  resize();
  return {
    setPaused(value) {
      paused = value;
      draw(performance.now(), true);
    },
    dispose() {
      disposed = true;
      cancelAnimationFrame(frame);
      window.removeEventListener('resize', resize);
      window.removeEventListener('scroll', onScroll);
      document.removeEventListener('visibilitychange', onScroll);
      previews.forEach(({ scene }) =>
        scene.traverse((node) => {
          node.geometry?.dispose();
          if (node.material) node.material.dispose();
          node.shadow?.map?.dispose();
        }),
      );
      renderer.dispose();
      canvas.remove();
    },
  };
}

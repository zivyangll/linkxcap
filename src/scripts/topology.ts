import {
  Scene,
  PerspectiveCamera,
  WebGLRenderer,
  Group,
  BufferGeometry,
  Float32BufferAttribute,
  Points,
  PointsMaterial,
  LineSegments,
  LineBasicMaterial,
  Vector3,
  Mesh,
  OctahedronGeometry,
  MeshBasicMaterial,
  AdditiveBlending,
} from 'three';

type Anchor = {
  element: HTMLElement;
  origin: Vector3;
  mesh: Mesh<OctahedronGeometry, MeshBasicMaterial>;
  x: number;
  y: number;
  width: number;
  height: number;
};
export function mountTopology(root: HTMLElement) {
  const canvas = root.querySelector<HTMLCanvasElement>('.topology-canvas')!;
  const stage = root.querySelector<HTMLElement>('.network-stage') || root;
  const home = root.dataset.topologyKind === 'home';
  let renderer: WebGLRenderer;
  try {
    renderer = new WebGLRenderer({
      canvas,
      alpha: true,
      antialias: false,
      powerPreference: 'low-power',
    });
  } catch {
    root.dataset.renderer = 'static';
    root.querySelector('[data-motion-toggle]')?.setAttribute('hidden', '');
    return;
  }
  const scene = new Scene(),
    camera = new PerspectiveCamera(38, 1, 1, 3000),
    group = new Group();
  camera.position.z = 1000;
  scene.add(group);
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const anchors: Anchor[] = [];
  const selector = home ? '.sector-star' : '[data-node3d]';
  const sharedGeometry = new OctahedronGeometry(5, 0);
  let width = 0,
    height = 0,
    frame = 0,
    last = 0,
    visible = false,
    paused = false,
    disposed = false,
    hovering = -1,
    elapsed = 0;
  let targetX = 0,
    targetY = 0;
  let edges: number[][] = [];
  let edgeGeometry = new BufferGeometry();
  const edgeMaterial = new LineBasicMaterial({
    color: 0x8f7eaf,
    transparent: true,
    opacity: 0.25,
    depthWrite: false,
  });
  const lines = new LineSegments(edgeGeometry, edgeMaterial);
  group.add(lines);
  let seed = 9127;
  const random = () => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };
  const starGeometry = new BufferGeometry();
  const starPositions = Array.from(
    { length: (innerWidth < 768 ? 130 : 400) * 3 },
    (_, i) => (random() - 0.5) * (i % 3 === 2 ? 700 : 1500),
  );
  starGeometry.setAttribute(
    'position',
    new Float32BufferAttribute(starPositions, 3),
  );
  const starMaterial = new PointsMaterial({
    color: 0xb2a2ff,
    size: 1.2,
    transparent: true,
    opacity: 0.36,
    depthWrite: false,
    blending: AdditiveBlending,
  });
  const stars = new Points(starGeometry, starMaterial);
  scene.add(stars);
  root.querySelectorAll<HTMLElement>(selector).forEach((element, index) => {
    const material = new MeshBasicMaterial({
      color: 0xb2a2ff,
      transparent: true,
      opacity: 0.7,
      wireframe: true,
    });
    const mesh = new Mesh(sharedGeometry, material);
    group.add(mesh);
    anchors.push({
      element,
      origin: new Vector3(),
      mesh,
      x: 0,
      y: 0,
      width: 0,
      height: 0,
    });
    element.addEventListener('pointerenter', () => {
      hovering = index;
      element.dataset.hovered = 'true';
      draw();
    });
    element.addEventListener('pointerleave', () => {
      hovering = -1;
      delete element.dataset.hovered;
      draw();
    });
    element.addEventListener('focus', () => {
      hovering = index;
      draw();
    });
    element.addEventListener('blur', () => {
      hovering = -1;
      draw();
    });
    element.addEventListener('click', () => {
      if (!home) {
        element.classList.add('is-selected');
        sessionStorage.setItem(
          'linkx-selected-company',
          element.dataset.slug || '',
        );
      } else requestAnimationFrame(size);
    });
  });
  const selected = sessionStorage.getItem('linkx-selected-company');
  if (selected)
    anchors
      .find((a) => a.element.dataset.slug === selected)
      ?.element.classList.add('is-selected');
  function size() {
    const box = stage.getBoundingClientRect();
    width = box.width;
    height = box.height;
    if (!width || !height) return;
    renderer.setPixelRatio(
      Math.min(
        devicePixelRatio,
        width < 768 ? 1 : 1.5,
        Math.sqrt(2500000 / (width * height)),
      ),
    );
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    const span = 2 * Math.tan((38 * Math.PI) / 360) * 1000;
    anchors.forEach((a, i) => {
      a.element.style.removeProperty('translate');
      a.element.style.removeProperty('scale');
      const rect = a.element.getBoundingClientRect();
      a.x = rect.left - box.left + rect.width / 2;
      a.y = rect.top - box.top + rect.height / 2;
      a.width = rect.width;
      a.height = rect.height;
      const z = ((i % 5) - 2) * 38;
      // Unproject the authored 2D position at a real z depth; initial framing is unchanged.
      const perspective = (1000 - z) / 1000;
      a.origin.set(
        (a.x / width - 0.5) * span * camera.aspect * perspective,
        (0.5 - a.y / height) * span * perspective,
        z,
      );
      a.mesh.position.copy(a.origin);
    });
    edges = [];
    anchors.forEach((a, i) => {
      anchors
        .map((b, j) => ({ j, d: a.origin.distanceTo(b.origin) }))
        .filter((x) => x.j !== i)
        .sort((a, b) => a.d - b.d)
        .slice(0, 2)
        .forEach(({ j }) => {
          if (!edges.some(([a, b]) => a === j && b === i)) edges.push([i, j]);
        });
    });
    edgeGeometry.dispose();
    edgeGeometry = new BufferGeometry();
    edgeGeometry.setAttribute(
      'position',
      new Float32BufferAttribute(
        edges.flatMap(([a, b]) => [
          ...anchors[a].origin.toArray(),
          ...anchors[b].origin.toArray(),
        ]),
        3,
      ),
    );
    edgeGeometry.setAttribute(
      'color',
      new Float32BufferAttribute(new Array(edges.length * 6).fill(0.5), 3),
    );
    edgeMaterial.vertexColors = true;
    lines.geometry = edgeGeometry;
    draw();
    sync();
  }
  const vector = new Vector3();
  function draw() {
    if (disposed) return;
    const staticMode = reduced.matches || width < 768 || paused;
    if (!staticMode) {
      group.rotation.y += (targetX * 0.12 - group.rotation.y) * 0.06;
      group.rotation.x += (targetY * 0.08 - group.rotation.x) * 0.06;
    } else group.rotation.set(0, 0, 0);
    group.updateMatrixWorld(true);
    anchors.forEach((a, i) => {
      const active =
        i === hovering ||
        a.element.getAttribute('aria-pressed') === 'true' ||
        a.element.classList.contains('is-selected');
      const size = active
        ? reduced.matches || paused
          ? 1.8
          : 1.7 + Math.sin(elapsed * 0.004) * 0.25
        : 1;
      a.mesh.scale.setScalar(size);
      a.mesh.rotation.z = active && !staticMode ? elapsed * 0.0004 : 0;
      a.mesh.material.color.setHex(active ? 0xe8dcff : 0x9d84bf);
      a.mesh.material.opacity = active ? 1 : 0.5;
      vector.copy(a.origin).applyMatrix4(group.matrixWorld).project(camera);
      if (!staticMode) {
        const x = ((vector.x + 1) * width) / 2 - a.x,
          y = ((1 - vector.y) * height) / 2 - a.y;
        a.element.style.translate = `${x.toFixed(2)}px ${y.toFixed(2)}px`;
      } else a.element.style.removeProperty('translate');
    });
    const colors = edgeGeometry.getAttribute('color');
    if (colors)
      edges.forEach(([a, b], i) => {
        const lit = a === hovering || b === hovering;
        for (let j = 0; j < 2; j++)
          colors.setXYZ(
            i * 2 + j,
            lit ? 1 : 0.4,
            lit ? 0.75 : 0.35,
            lit ? 1 : 0.5,
          );
      });
    if (colors) colors.needsUpdate = true;
    stars.rotation.y = staticMode ? 0 : Math.sin(elapsed * 0.00003) * 0.08;
    renderer.render(scene, camera);
    root.dataset.renderFrames = String(
      Number(root.dataset.renderFrames || 0) + 1,
    );
  }
  function tick(time: number) {
    frame = 0;
    if (!visible || paused || document.hidden || disposed || reduced.matches)
      return;
    if (time - last >= (width < 768 ? 40 : 25)) {
      elapsed += Math.min(time - last, 50);
      last = time;
      draw();
    }
    frame = requestAnimationFrame(tick);
  }
  function sync() {
    cancelAnimationFrame(frame);
    frame = 0;
    root.dataset.running = String(
      visible && !paused && !document.hidden && !reduced.matches,
    );
    if (root.dataset.running === 'true' && !disposed)
      frame = requestAnimationFrame(tick);
  }
  stage.addEventListener('pointermove', (event) => {
    if (event.pointerType !== 'mouse') return;
    const box = stage.getBoundingClientRect();
    targetX = (event.clientX - box.left) / width - 0.5;
    targetY = (event.clientY - box.top) / height - 0.5;
  });
  stage.addEventListener('pointerleave', () => {
    targetX = targetY = 0;
  });
  const visibility = new IntersectionObserver(
    (entries) => {
      visible = entries[0].isIntersecting;
      sync();
    },
    { threshold: 0.02 },
  );
  visibility.observe(stage);
  const resize = new ResizeObserver(size);
  resize.observe(stage);
  const toggle = root.querySelector<HTMLButtonElement>('[data-motion-toggle]');
  toggle?.addEventListener('click', () => {
    paused = !paused;
    toggle.setAttribute('aria-pressed', String(paused));
    toggle.textContent = paused
      ? toggle.dataset.resume!
      : toggle.dataset.pause!;
    sync();
  });
  const preferenceChange = () => {
    size();
    sync();
  };
  reduced.addEventListener('change', preferenceChange);
  document.addEventListener('visibilitychange', sync);
  canvas.addEventListener('webglcontextlost', (event) => {
    event.preventDefault();
    paused = true;
    root.dataset.renderer = 'static';
    canvas.hidden = true;
    anchors.forEach((a) => a.element.style.removeProperty('translate'));
    sync();
  });
  root.dataset.renderer = 'webgl';
  window.addEventListener(
    'pagehide',
    () => {
      disposed = true;
      cancelAnimationFrame(frame);
      visibility.disconnect();
      resize.disconnect();
      reduced.removeEventListener('change', preferenceChange);
      document.removeEventListener('visibilitychange', sync);
      edgeGeometry.dispose();
      edgeMaterial.dispose();
      sharedGeometry.dispose();
      anchors.forEach((a) => a.mesh.material.dispose());
      starGeometry.dispose();
      starMaterial.dispose();
      renderer.dispose();
    },
    { once: true },
  );
}

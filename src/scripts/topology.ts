import { TOPOLOGY_MOTION, TOUCH_LAYOUT } from './motion-policy';
import {
  Scene,
  PerspectiveCamera,
  WebGLRenderer,
  Group,
  BufferGeometry,
  Float32BufferAttribute,
  LineSegments,
  LineBasicMaterial,
  Vector3,
} from 'three';

type Anchor = {
  element: HTMLElement;
  key: string;
  sector: string;
  origin: Vector3;
  x: number;
  y: number;
};
const CYCLE_MS = 5200;
const BRANCH_MS = 620;

export function mountTopology(root: HTMLElement) {
  const canvas = root.querySelector<HTMLCanvasElement>('.topology-canvas')!;
  const motion = matchMedia(TOPOLOGY_MOTION);
  const touch = matchMedia(TOUCH_LAYOUT);
  const stage = root.querySelector<HTMLElement>('.constellation')!;
  let renderer: WebGLRenderer;
  try {
    renderer = new WebGLRenderer({
      canvas,
      alpha: true,
      antialias: true,
      powerPreference: 'low-power',
    });
  } catch {
    root.dataset.renderer = 'static';
    return;
  }
  const scene = new Scene();
  const camera = new PerspectiveCamera(38, 1, 1, 3000);
  const graph = new Group();
  camera.position.z = 1000;
  scene.add(graph);
  const anchors: Anchor[] = [
    ...root.querySelectorAll<HTMLElement>('[data-topology-anchor]'),
  ].map((element) => ({
    element,
    key: element.dataset.topologyAnchor!,
    sector: element.dataset.sector || element.dataset.focusSector || '',
    origin: new Vector3(),
    x: 0,
    y: 0,
  }));
  const sectors = anchors.filter((anchor) => !!anchor.element.dataset.sector);
  const hub = anchors.find((anchor) => anchor.key === 'hub')!;
  const baseGeometry = new BufferGeometry();
  const branchGeometry = new BufferGeometry();
  // Reuse GPU buffers across selections/resizes; automatic cycling must not
  // allocate a replacement buffer every five seconds for the page lifetime.
  baseGeometry.setAttribute(
    'position',
    new Float32BufferAttribute(new Float32Array(sectors.length * 6), 3),
  );
  branchGeometry.setAttribute(
    'position',
    new Float32BufferAttribute(new Float32Array(anchors.length * 6), 3),
  );
  const baseMaterial = new LineBasicMaterial({
    color: 0x8d7bb6,
    transparent: true,
    opacity: 0.12,
    depthWrite: false,
  });
  const branchMaterial = new LineBasicMaterial({
    color: 0xb2a2ee,
    transparent: true,
    opacity: 0.72,
    depthWrite: false,
  });
  const baseLines = new LineSegments(baseGeometry, baseMaterial);
  const branchLines = new LineSegments(branchGeometry, branchMaterial);
  baseLines.frustumCulled = branchLines.frustumCulled = false;
  graph.add(baseLines, branchLines);
  let active = sectors[0];
  let companies: Anchor[] = [];
  let width = 0,
    height = 0,
    frame = 0,
    last = 0;
  let visible = false,
    lost = false,
    disposed = false;
  let cycle = 0,
    orbit = 0,
    growth = 0;
  let dragging = false,
    pointer = -1,
    dragX = 0,
    dragY = 0;
  let yaw = 0,
    pitch = 0,
    yawVelocity = 0,
    pitchVelocity = 0;
  let correcting = false,
    targetYaw = 0,
    targetPitch = 0,
    frontHoldUntil = 0;
  const projected = new Vector3();
  const endpoint = new Vector3();
  const enabled = () => motion.matches && !lost && !disposed;
  const held = () =>
    root.dataset.focusHeld === 'true' || root.dataset.focusPinned === 'true';
  const clearProjection = () =>
    anchors.forEach(({ element }) => element.style.removeProperty('translate'));
  const correctView = () => {
    // Return to the closest canonical front view, avoiding a long reverse spin.
    targetYaw = Math.round(yaw / (Math.PI * 2)) * Math.PI * 2;
    targetPitch = 0;
    yawVelocity = pitchVelocity = 0;
    correcting = true;
    cycle = 0;
    root.dataset.cameraState = 'settling';
    sync();
  };

  function select() {
    active =
      sectors.find((anchor) => anchor.sector === root.dataset.focus) ||
      sectors[0];
    companies = anchors.filter(
      (anchor) => anchor.element.dataset.focusSector === active.sector,
    );
    cycle = 0;
    growth = 0;
    // The hub stays subdued; only the selected sector's company rays brighten.
    branchGeometry.setDrawRange(0, companies.length * 2);
    root.dataset.highlightedNode = active.key;
    root.dataset.highlightedKeys = [
      active.key,
      ...companies.map((anchor) => anchor.key),
    ].join(',');
    root.dataset.highlightedEdges = String(companies.length);
    draw();
    // A user selection can wake a tap-paused graph. During auto-cycling the
    // existing tick owns scheduling, so never create a second RAF chain.
    if (root.dataset.running === 'false') sync();
  }
  function size() {
    canvas.hidden = !enabled();
    root.dataset.renderer = enabled() ? 'webgl' : 'static';
    if (!enabled()) {
      clearProjection();
      sync();
      return;
    }
    const box = stage.getBoundingClientRect();
    width = box.width;
    height = box.height;
    if (!width || !height) return;
    renderer.setPixelRatio(
      Math.min(
        devicePixelRatio,
        touch.matches ? 1.25 : 1.5,
        Math.sqrt((touch.matches ? 900000 : 2500000) / (width * height)),
      ),
    );
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    camera.updateMatrixWorld();
    const span = 2 * Math.tan((38 * Math.PI) / 360) * 1000;
    const toWorld = (element: HTMLElement, target: Vector3) => {
      const x = touch.matches
        ? (Number(element.dataset.mx) * width) / 360
        : (Number(element.dataset.x) * width) / 1920;
      const y = touch.matches
        ? (Number(element.dataset.my) * height) / 560
        : (Number(element.dataset.y) * width) / 1920;
      const z = Number(touch.matches ? element.dataset.mz : element.dataset.z);
      const perspective = (1000 - z) / 1000;
      return target.set(
        (x / width - 0.5) * span * camera.aspect * perspective,
        (0.5 - y / height) * span * perspective,
        z,
      );
    };
    // Rotate around the graph's hub, not the centre of the whole page.
    toWorld(hub.element, graph.position);
    anchors.forEach((anchor) => {
      anchor.x = touch.matches
        ? (Number(anchor.element.dataset.mx) * width) / 360
        : (Number(anchor.element.dataset.x) * width) / 1920;
      anchor.y = touch.matches
        ? (Number(anchor.element.dataset.my) * height) / 560
        : (Number(anchor.element.dataset.y) * width) / 1920;
      toWorld(anchor.element, anchor.origin).sub(graph.position);
    });
    const positions = baseGeometry.getAttribute('position');
    sectors.forEach((anchor, index) => {
      positions.setXYZ(index * 2, hub.origin.x, hub.origin.y, hub.origin.z);
      positions.setXYZ(
        index * 2 + 1,
        anchor.origin.x,
        anchor.origin.y,
        anchor.origin.z,
      );
    });
    positions.needsUpdate = true;
    draw();
    sync();
  }
  function draw() {
    if (!enabled() || !width) return;
    graph.updateMatrixWorld(true);
    for (const anchor of anchors) {
      if (anchor.element.dataset.focusSector && anchor.sector !== active.sector)
        continue;
      projected
        .copy(anchor.origin)
        .applyMatrix4(graph.matrixWorld)
        .project(camera);
      let finalX = ((projected.x + 1) * width) / 2;
      let finalY = ((1 - projected.y) * height) / 2;
      if (!touch.matches) {
        const side = anchor.element.dataset.labelSide;
        const isCompany = !!anchor.element.dataset.focusSector;
        const reserve = isCompany ? Math.min(260, width * 0.16) : 210;
        finalX = Math.max(
          side === 'left' ? reserve : 28,
          Math.min(width - (side === 'left' ? 28 : reserve), finalX),
        );
        finalY = Math.max(42, Math.min(height - 48, finalY));
      }
      const x = finalX - anchor.x;
      const y = finalY - anchor.y;
      anchor.element.style.translate = `${x.toFixed(2)}px ${y.toFixed(2)}px`;
    }
    const positions = branchGeometry.getAttribute('position');
    if (positions) {
      const reveal = 1 - Math.pow(1 - growth, 3);
      companies.forEach((anchor, index) => {
        endpoint.copy(active.origin).lerp(anchor.origin, reveal);
        positions.setXYZ(
          index * 2,
          active.origin.x,
          active.origin.y,
          active.origin.z,
        );
        positions.setXYZ(index * 2 + 1, endpoint.x, endpoint.y, endpoint.z);
      });
      positions.needsUpdate = true;
    }
    renderer.render(scene, camera);
    root.dataset.rotation = `${graph.rotation.x.toFixed(3)},${graph.rotation.y.toFixed(3)}`;
    root.dataset.branchProgress = growth.toFixed(3);
    root.dataset.renderFrames = String(
      Number(root.dataset.renderFrames || 0) + 1,
    );
  }
  function tick(time: number) {
    frame = 0;
    if (!enabled() || !visible || document.hidden) return;
    if (time - last >= (touch.matches ? 40 : 30)) {
      const elapsed = time - last;
      const delta = Math.min(elapsed, 100);
      last = time;
      growth = Math.min(1, growth + elapsed / BRANCH_MS);
      if (correcting && !dragging) {
        const correction = 1 - Math.pow(0.001, delta / 520);
        yaw += (targetYaw - yaw) * correction;
        pitch += (targetPitch - pitch) * correction;
        graph.rotation.set(pitch, yaw, 0);
        if (
          Math.abs(targetYaw - yaw) < 0.001 &&
          Math.abs(targetPitch - pitch) < 0.001
        ) {
          yaw = targetYaw;
          pitch = targetPitch;
          graph.rotation.set(pitch, yaw, 0);
          correcting = false;
          frontHoldUntil = time + 900;
          root.dataset.cameraState = 'front';
        }
      } else if (time < frontHoldUntil && !dragging) {
        yaw = targetYaw;
        pitch = targetPitch;
        cycle = 0;
        graph.rotation.set(pitch, yaw, 0);
      } else if (!held() && !dragging) {
        cycle += elapsed;
        orbit += delta;
        yaw += yawVelocity;
        pitch = Math.max(-0.42, Math.min(0.42, pitch + pitchVelocity));
        yawVelocity *= 0.86;
        pitchVelocity *= 0.86;
        graph.rotation.set(
          pitch + Math.sin(orbit * 0.00012) * 0.1,
          yaw + Math.sin(orbit * 0.00018) * (touch.matches ? 0.25 : 0.58),
          0,
        );
        if (cycle >= CYCLE_MS) {
          const next = sectors[(sectors.indexOf(active) + 1) % sectors.length];
          root.dispatchEvent(
            new CustomEvent('focusselect', { detail: next.sector }),
          );
        }
      } else if (held()) {
        // A hover must stop the pose immediately, including residual drag inertia.
        yawVelocity = pitchVelocity = 0;
        cycle = 0;
      }
      root.dataset.focusMode =
        root.dataset.focusPinned === 'true'
          ? 'paused'
          : dragging
            ? 'drag'
            : correcting
              ? 'settling'
              : held()
                ? 'held'
                : 'auto';
      draw();
    }
    if (root.dataset.focusPinned === 'true' && growth === 1 && !correcting) {
      sync();
      return;
    }
    frame = requestAnimationFrame(tick);
  }
  function sync() {
    cancelAnimationFrame(frame);
    frame = 0;
    last = performance.now();
    const running =
      enabled() &&
      visible &&
      !document.hidden &&
      !(root.dataset.focusPinned === 'true' && growth === 1 && !correcting);
    root.dataset.running = String(running);
    if (running) frame = requestAnimationFrame(tick);
  }
  const beginDrag = (event: PointerEvent) => {
    const box = stage.getBoundingClientRect();
    if (
      !enabled() ||
      touch.matches ||
      event.button !== 0 ||
      event.pointerType !== 'mouse' ||
      (event.target as Element).closest('a,button') ||
      event.clientX < box.left + width * 0.45
    )
      return;
    event.preventDefault();
    dragging = true;
    pointer = event.pointerId;
    dragX = event.clientX;
    dragY = event.clientY;
    yawVelocity = pitchVelocity = 0;
    correcting = false;
    frontHoldUntil = 0;
    root.setPointerCapture(pointer);
    root.dataset.dragging = 'true';
  };
  const moveDrag = (event: PointerEvent) => {
    if (!dragging || event.pointerId !== pointer) return;
    const dx = ((event.clientX - dragX) / width) * Math.PI * 1.2;
    const dy = ((event.clientY - dragY) / height) * Math.PI * 0.8;
    dragX = event.clientX;
    dragY = event.clientY;
    yaw += dx;
    pitch = Math.max(-0.42, Math.min(0.42, pitch + dy));
    yawVelocity = dx * 0.2;
    pitchVelocity = dy * 0.2;
    graph.rotation.set(
      pitch + Math.sin(orbit * 0.00012) * 0.1,
      yaw + Math.sin(orbit * 0.00018) * (touch.matches ? 0.25 : 0.58),
      0,
    );
    draw();
  };
  const endDrag = (event: PointerEvent) => {
    if (!dragging || event.pointerId !== pointer) return;
    dragging = false;
    cycle = 0;
    root.dataset.dragging = 'false';
    root.dataset.dragged = 'true';
    if (root.hasPointerCapture(pointer)) root.releasePointerCapture(pointer);
    pointer = -1;
    correctView();
  };
  const clickToCorrect = (event: MouseEvent) => {
    if ((event.target as Element).closest('[data-sector]')) correctView();
  };
  root.addEventListener('pointerdown', beginDrag);
  root.addEventListener('pointermove', moveDrag);
  root.addEventListener('pointerup', endDrag);
  root.addEventListener('pointercancel', endDrag);
  root.addEventListener('click', clickToCorrect);
  root.addEventListener('focuschange', select);
  const visibility = new IntersectionObserver(
    ([entry]) => {
      visible = entry.isIntersecting;
      sync();
    },
    { threshold: 0.02 },
  );
  visibility.observe(stage);
  const resize = new ResizeObserver(size);
  resize.observe(stage);
  root.addEventListener('focushold', sync);
  touch.addEventListener('change', size);
  motion.addEventListener('change', size);
  document.addEventListener('visibilitychange', sync);
  canvas.addEventListener('webglcontextlost', (event) => {
    event.preventDefault();
    lost = true;
    size();
  });
  // The lightweight fallback remains interactive after a context loss; try recovery once restored.
  canvas.addEventListener('webglcontextrestored', () => {
    lost = false;
    size();
  });
  select();
  size();
  window.addEventListener('pagehide', (event) => {
    if (event.persisted) {
      visible = false;
      sync();
      return;
    }
    disposed = true;
    cancelAnimationFrame(frame);
    visibility.disconnect();
    resize.disconnect();
    motion.removeEventListener('change', size);
    touch.removeEventListener('change', size);
    root.removeEventListener('focushold', sync);
    document.removeEventListener('visibilitychange', sync);
    root.removeEventListener('focuschange', select);
    root.removeEventListener('pointerdown', beginDrag);
    root.removeEventListener('pointermove', moveDrag);
    root.removeEventListener('pointerup', endDrag);
    root.removeEventListener('pointercancel', endDrag);
    root.removeEventListener('click', clickToCorrect);
    baseGeometry.dispose();
    branchGeometry.dispose();
    baseMaterial.dispose();
    branchMaterial.dispose();
    renderer.dispose();
  });
  window.addEventListener('pageshow', (event) => {
    if (!event.persisted) return;
    const box = stage.getBoundingClientRect();
    visible = box.bottom > 0 && box.top < innerHeight;
    sync();
  });
}

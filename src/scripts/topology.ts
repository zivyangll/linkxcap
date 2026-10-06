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
  label: HTMLElement | null;
  key: string;
  sector: string;
  origin: Vector3;
  x: number;
  y: number;
};
const CYCLE_MS = 5200;
const BRANCH_MS = 620;
const FOCUS_DEPTH = 240;
const FOCUS_BRANCH_RADIUS_X = 340;
const FOCUS_BRANCH_RADIUS_Y = 270;
const branchPose = (index: number, count: number) => ({
  angle:
    -Math.PI / 2 +
    (index * Math.PI * 2) / count +
    Math.sin((index + 1) * 1.87) * 0.14,
  radiusX: 0.72 + ((index * 37) % 7) / 10,
  radiusY: 0.7 + ((index * 53) % 9) / 14,
});

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
    label: element.querySelector<HTMLElement>(
      '.star-label, .constellation-company-label',
    ),
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
  // A press on the selected node becomes a drag only after it moves, so a
  // plain click or tap on that node keeps its normal behaviour.
  let pending = false,
    startX = 0,
    startY = 0,
    suppressClick = false;
  const NODE_DRAG_THRESHOLD = 4;
  // While the selected node is the handle, the graph turns around that node:
  // its world position stays fixed under the pointer for the whole drag.
  let nodeDrag = false,
    pinnedReturn = false;
  const pivotWorld = new Vector3();
  const pivotLocal = new Vector3();
  let yaw = 0,
    pitch = 0,
    yawVelocity = 0,
    pitchVelocity = 0;
  let correcting = false,
    targetYaw = 0,
    targetPitch = 0,
    frontHoldUntil = 0;
  let focused = false;
  const homePosition = new Vector3();
  const targetPosition = new Vector3();
  const projected = new Vector3();
  const endpoint = new Vector3();
  const branchStart = new Vector3();
  const branchEnd = new Vector3();
  const enabled = () => motion.matches && !lost && !disposed;
  const held = () =>
    root.dataset.focusHeld === 'true' || root.dataset.focusPinned === 'true';
  const clearProjection = () =>
    anchors.forEach(({ element, label }) => {
      element.style.removeProperty('translate');
      label?.style.removeProperty('translate');
    });
  const updateFocusTarget = () => {
    // Keep the constellation facing the viewer instead of turning its mostly
    // planar layout edge-on. Pan around the selected sector and lift that node
    // on the z-axis so it becomes the scene's foreground anchor.
    targetYaw = Math.round(yaw / (Math.PI * 2)) * Math.PI * 2;
    targetPitch = 0;
    const frontZ = Math.max(active.origin.z, FOCUS_DEPTH);
    const perspective = (camera.position.z - frontZ) / camera.position.z;
    // The original hub coordinate is the visual centre of the right-hand 3D
    // region. Preserve that projection while the selected node moves forward;
    // the left-hand title and explanatory copy remain unobstructed.
    targetPosition.set(
      homePosition.x * perspective - active.origin.x,
      homePosition.y * perspective - active.origin.y,
      homePosition.z,
    );
  };
  const renderPoint = (anchor: Anchor, target: Vector3) => {
    target.copy(anchor.origin);
    if (!focused) return target;
    const frontZ = Math.max(active.origin.z, FOCUS_DEPTH);
    if (anchor === active) target.z = frontZ;
    else if (anchor.element.dataset.focusSector === active.sector && height) {
      const index = companies.indexOf(anchor);
      if (index >= 0) {
        const {
          angle,
          radiusX: spreadX,
          radiusY: spreadY,
        } = branchPose(index, companies.length);
        const visibleHeight =
          2 *
          Math.tan((camera.fov * Math.PI) / 360) *
          (camera.position.z - frontZ);
        const pixelsToWorld = visibleHeight / height;
        const radiusX = Math.min(FOCUS_BRANCH_RADIUS_X, width * 0.22);
        const radiusY = Math.min(FOCUS_BRANCH_RADIUS_Y, height * 0.32);
        target.set(
          active.origin.x + Math.cos(angle) * radiusX * spreadX * pixelsToWorld,
          active.origin.y - Math.sin(angle) * radiusY * spreadY * pixelsToWorld,
          frontZ,
        );
      }
    }
    return target;
  };
  const focusActive = (event?: Event) => {
    focused = true;
    updateFocusTarget();
    yawVelocity = pitchVelocity = 0;
    cycle = 0;
    const immediate = Boolean(
      (event as CustomEvent<{ immediate?: boolean }> | undefined)?.detail
        ?.immediate,
    );
    correcting = !immediate;
    root.dataset.cameraState = 'settling';
    if (immediate) {
      yaw = targetYaw;
      pitch = targetPitch;
      graph.rotation.set(pitch, yaw, 0);
      graph.position.copy(targetPosition);
      frontHoldUntil = performance.now() + 900;
      root.dataset.cameraState = 'front';
      draw();
    }
    sync();
  };

  function select() {
    active =
      sectors.find((anchor) => anchor.sector === root.dataset.focus) ||
      sectors[0];
    companies = anchors.filter(
      (anchor) => anchor.element.dataset.focusSector === active.sector,
    );
    companies.forEach((anchor, index) => {
      const { angle } = branchPose(index, companies.length);
      anchor.element.dataset.labelSide = Math.cos(angle) < 0 ? 'left' : 'right';
    });
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
    toWorld(hub.element, homePosition);
    graph.position.copy(homePosition);
    anchors.forEach((anchor) => {
      anchor.x = touch.matches
        ? (Number(anchor.element.dataset.mx) * width) / 360
        : (Number(anchor.element.dataset.x) * width) / 1920;
      anchor.y = touch.matches
        ? (Number(anchor.element.dataset.my) * height) / 560
        : (Number(anchor.element.dataset.y) * width) / 1920;
      toWorld(anchor.element, anchor.origin).sub(homePosition);
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
    if (focused) {
      updateFocusTarget();
      yaw = targetYaw;
      pitch = targetPitch;
      graph.rotation.set(pitch, yaw, 0);
      graph.position.copy(targetPosition);
    }
    draw();
    sync();
  }
  function draw() {
    if (!enabled() || !width) return;
    graph.updateMatrixWorld(true);
    for (const anchor of anchors) {
      if (anchor.element.dataset.focusSector && anchor.sector !== active.sector)
        continue;
      renderPoint(anchor, projected)
        .applyMatrix4(graph.matrixWorld)
        .project(camera);
      const finalX = ((projected.x + 1) * width) / 2;
      const finalY = ((1 - projected.y) * height) / 2;
      const x = finalX - anchor.x;
      const y = finalY - anchor.y;
      anchor.element.style.translate = `${x.toFixed(2)}px ${y.toFixed(2)}px`;
    }
    const bounds = stage.getBoundingClientRect();
    const labelInset = touch.matches ? 4 : 18;
    const labels = anchors.filter(
      (anchor) =>
        anchor.label &&
        (!anchor.element.dataset.focusSector ||
          anchor.sector === active.sector),
    );
    labels.forEach((anchor) => anchor.label!.style.removeProperty('translate'));
    type Rect = Pick<DOMRect, 'left' | 'right' | 'top' | 'bottom'>;
    const move = (box: Rect, x: number, y: number): Rect => ({
      left: box.left + x,
      right: box.right + x,
      top: box.top + y,
      bottom: box.bottom + y,
    });
    const gap = touch.matches ? 3 : 6;
    const overlaps = (
      a: Pick<DOMRect, 'left' | 'right' | 'top' | 'bottom'>,
      b: Pick<DOMRect, 'left' | 'right' | 'top' | 'bottom'>,
    ) =>
      Math.min(a.right, b.right) > Math.max(a.left, b.left) - gap &&
      Math.min(a.bottom, b.bottom) > Math.max(a.top, b.top) - gap;
    const placements = labels
      .map((anchor) => {
        const box = anchor.label!.getBoundingClientRect();
        const x =
          Math.max(bounds.left + labelInset - box.left, 0) +
          Math.min(bounds.right - labelInset - box.right, 0);
        const y =
          Math.max(bounds.top + labelInset - box.top, 0) +
          Math.min(bounds.bottom - labelInset - box.bottom, 0);
        return {
          anchor,
          box,
          x,
          y,
          priority:
            anchor === active ? 0 : anchor.element.dataset.sector ? 1 : 2,
        };
      })
      .sort((a, b) => a.priority - b.priority || a.box.top - b.box.top);
    const placed: Rect[] = [];
    for (const placement of placements) {
      const base = move(placement.box, placement.x, placement.y);
      const minimum = bounds.top + labelInset - base.top;
      const maximum = bounds.bottom - labelInset - base.bottom;
      const candidates = [
        0,
        ...placed.flatMap((other) => [
          other.bottom + gap - base.top,
          other.top - gap - base.bottom,
        ]),
      ]
        .filter((offset) => offset >= minimum && offset <= maximum)
        .sort((a, b) => Math.abs(a) - Math.abs(b));
      const offset =
        candidates.find((candidate) => {
          const candidateBox = move(base, 0, candidate);
          return placed.every((other) => !overlaps(candidateBox, other));
        }) || 0;
      placement.y += offset;
      const finalBox = move(placement.box, placement.x, placement.y);
      placed.push(finalBox);
      if (placement.x || placement.y)
        placement.anchor.label!.style.translate = `${placement.x}px ${placement.y}px`;
    }
    const basePositions = baseGeometry.getAttribute('position');
    if (basePositions) {
      sectors.forEach((anchor, index) => {
        basePositions.setXYZ(
          index * 2,
          hub.origin.x,
          hub.origin.y,
          hub.origin.z,
        );
        renderPoint(anchor, endpoint);
        basePositions.setXYZ(index * 2 + 1, endpoint.x, endpoint.y, endpoint.z);
      });
      basePositions.needsUpdate = true;
    }
    const branchPositions = branchGeometry.getAttribute('position');
    if (branchPositions) {
      const reveal = 1 - Math.pow(1 - growth, 3);
      renderPoint(active, branchStart);
      companies.forEach((anchor, index) => {
        renderPoint(anchor, branchEnd);
        endpoint.copy(branchStart).lerp(branchEnd, reveal);
        branchPositions.setXYZ(
          index * 2,
          branchStart.x,
          branchStart.y,
          branchStart.z,
        );
        branchPositions.setXYZ(
          index * 2 + 1,
          endpoint.x,
          endpoint.y,
          endpoint.z,
        );
      });
      branchPositions.needsUpdate = true;
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
        if (pinnedReturn) {
          // After a node drag only the rotation springs back; the node stays
          // exactly where it was released.
          renderPoint(active, pivotLocal).applyEuler(graph.rotation);
          graph.position.copy(pivotWorld).sub(pivotLocal);
        } else graph.position.lerp(targetPosition, correction);
        if (
          Math.abs(targetYaw - yaw) < 0.001 &&
          Math.abs(targetPitch - pitch) < 0.001 &&
          graph.position.distanceTo(targetPosition) < 0.05
        ) {
          yaw = targetYaw;
          pitch = targetPitch;
          graph.rotation.set(pitch, yaw, 0);
          graph.position.copy(targetPosition);
          correcting = pinnedReturn = false;
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
  const startDrag = (event: PointerEvent) => {
    dragging = true;
    pending = false;
    pointer = event.pointerId;
    dragX = event.clientX;
    dragY = event.clientY;
    yawVelocity = pitchVelocity = 0;
    correcting = false;
    frontHoldUntil = 0;
    root.setPointerCapture(pointer);
    root.dataset.dragging = 'true';
  };
  const beginDrag = (event: PointerEvent) => {
    if (!enabled() || event.button !== 0) return;
    const target = event.target as Element;
    // The selected node can be grabbed with mouse, pen or touch.
    if (target.closest('.sector-star.is-active')) {
      pending = true;
      pointer = event.pointerId;
      startX = event.clientX;
      startY = event.clientY;
      return;
    }
    const box = stage.getBoundingClientRect();
    if (
      touch.matches ||
      event.pointerType !== 'mouse' ||
      target.closest('a,button') ||
      event.clientX < box.left + width * 0.45
    )
      return;
    event.preventDefault();
    startDrag(event);
  };
  const moveDrag = (event: PointerEvent) => {
    if (pending && event.pointerId === pointer) {
      if (
        Math.hypot(event.clientX - startX, event.clientY - startY) <
        NODE_DRAG_THRESHOLD
      )
        return;
      suppressClick = true;
      startDrag(event);
      dragX = startX;
      dragY = startY;
      nodeDrag = true;
      graph.updateMatrixWorld();
      renderPoint(active, pivotWorld).applyMatrix4(graph.matrixWorld);
    }
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
    if (nodeDrag) {
      renderPoint(active, pivotLocal).applyEuler(graph.rotation);
      graph.position.copy(pivotWorld).sub(pivotLocal);
    }
    draw();
  };
  const endDrag = (event: PointerEvent) => {
    if (pending && event.pointerId === pointer) {
      pending = false;
      pointer = -1;
      return;
    }
    if (!dragging || event.pointerId !== pointer) return;
    dragging = false;
    const releasedNode = nodeDrag;
    nodeDrag = false;
    cycle = 0;
    root.dataset.dragging = 'false';
    root.dataset.dragged = 'true';
    if (root.hasPointerCapture(pointer)) root.releasePointerCapture(pointer);
    pointer = -1;
    focusActive();
    if (releasedNode) {
      // The front pose has no rotation, so the pinned node's resting place is
      // simply its released world position minus its local offset.
      pinnedReturn = true;
      targetPosition.copy(pivotWorld).sub(renderPoint(active, pivotLocal));
    }
  };
  // Releasing a node drag must not also count as a click on that node.
  const swallowClick = (event: MouseEvent) => {
    if (!suppressClick) return;
    suppressClick = false;
    event.preventDefault();
    event.stopPropagation();
  };
  root.addEventListener('click', swallowClick, true);
  root.addEventListener('pointerdown', beginDrag);
  root.addEventListener('pointermove', moveDrag);
  root.addEventListener('pointerup', endDrag);
  root.addEventListener('pointercancel', endDrag);
  root.addEventListener('focusfront', focusActive);
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
    root.removeEventListener('click', swallowClick, true);
    root.removeEventListener('pointerdown', beginDrag);
    root.removeEventListener('pointermove', moveDrag);
    root.removeEventListener('pointerup', endDrag);
    root.removeEventListener('pointercancel', endDrag);
    root.removeEventListener('focusfront', focusActive);
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

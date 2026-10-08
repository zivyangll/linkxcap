import { TOPOLOGY_MOTION, TOUCH_LAYOUT } from './motion-policy';
import {
  initialFocusSector,
  branchScale,
  clearOfLabel,
  clearRay,
} from '../lib/focus-layout';
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
  Euler,
} from 'three';

type Anchor = {
  element: HTMLElement;
  label: HTMLElement | null;
  key: string;
  sector: string;
  origin: Vector3;
  // Graph-local position that replaces `origin` while the node would
  // otherwise project outside the visible area.
  pin: Vector3 | null;
  x: number;
  y: number;
};
const CYCLE_MS = 5200;
const BRANCH_MS = 620;
const FOCUS_DEPTH = 240;
const FOCUS_BRANCH_RADIUS_X = 425;
const FOCUS_BRANCH_RADIUS_Y = 340;
// On desktop the selected node stays inside the right three quarters of the
// viewport, at least this far from either edge of that region.
const SAFE_AREA_MARGIN = 150;
// Long and short rays, read in a stride of 5 so neighbours rarely repeat a
// pattern; this keeps the fan from looking like an even starburst.
const BRANCH_RHYTHM = [1, 0.58, 1.3, 0.8, 1.14, 0.66, 1.38, 0.9];
const branchPose = (index: number, count: number) => {
  // Shift each ray by up to 0.38 of its slot: rays bunch into small groups
  // with open gaps between them, but never cross their neighbours.
  const slot = index + Math.sin(index * 2.4 + 0.6) * 0.38;
  // 0.8: every ray is drawn a fifth shorter than the rhythm's raw length.
  const reach =
    BRANCH_RHYTHM[(index * 5) % BRANCH_RHYTHM.length] *
    0.8 *
    branchScale(count);
  return {
    angle: clearOfLabel(-Math.PI / 2 + (slot * Math.PI * 2) / count),
    radiusX: reach * (0.92 + ((index * 37) % 5) / 25),
    radiusY: reach * (0.9 + ((index * 53) % 7) / 30),
  };
};

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
    pin: null,
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
    opacity: 0.46,
    depthWrite: false,
  });
  const baseLines = new LineSegments(baseGeometry, baseMaterial);
  const branchLines = new LineSegments(branchGeometry, branchMaterial);
  baseLines.frustumCulled = branchLines.frustumCulled = false;
  graph.add(baseLines, branchLines);
  const defaultSector =
    sectors.find((anchor) => anchor.sector === initialFocusSector) ||
    sectors[0];
  let active = defaultSector;
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
  // The first sector keeps its authored opening pose until the visitor reaches
  // Focus. Loading the graph near the viewport must not spend its first cycle.
  let initialPose = true;
  let entered = false;
  let readingInset = 0;
  const homePosition = new Vector3();
  const targetPosition = new Vector3();
  const projected = new Vector3();
  const endpoint = new Vector3();
  const branchStart = new Vector3();
  const branchEnd = new Vector3();
  const enabled = () => motion.matches && !lost && !disposed;
  const safePoint = new Vector3();
  const centreShift = new Vector3();
  const frontRotation = new Euler();
  const desktopNodeArea = () => {
    const bounds = stage.getBoundingClientRect();
    const left = Math.max(bounds.left, innerWidth / 4);
    const right = Math.min(bounds.right, innerWidth);
    const top = Math.max(
      bounds.top,
      document.querySelector<HTMLElement>('[data-header]')?.offsetHeight ?? 0,
    );
    const bottom = Math.min(bounds.bottom, innerHeight);
    // Short windows retain a usable core when two 150px margins cannot fit.
    const padX = Math.min(
      SAFE_AREA_MARGIN,
      Math.max(0, (right - left - 120) / 2),
    );
    const padY = Math.min(
      SAFE_AREA_MARGIN,
      Math.max(0, (bottom - top - 120) / 2),
    );
    return {
      left: left + padX,
      right: right - padX,
      top: top + padY,
      bottom: bottom - padY,
    };
  };
  // Shifts a graph position so the selected node, under the given rotation,
  // projects inside the desktop safe area: the right three quarters of the
  // window, 150px from each side of the visible container. Projection is
  // linear in world x and y at a fixed depth, so one correction is exact.
  const keepActiveInSafeArea = (position: Vector3, rotation: Euler) => {
    if (touch.matches || !width || !height) return;
    const bounds = stage.getBoundingClientRect();
    const area = desktopNodeArea();
    const minX = area.left - bounds.left;
    const maxX = area.right - bounds.left;
    const minY = area.top - bounds.top;
    const maxY = area.bottom - bounds.top;
    renderPoint(active, safePoint).applyEuler(rotation).add(position);
    const depth = camera.position.z - safePoint.z;
    if (depth <= 0) return;
    safePoint.project(camera);
    const x = ((safePoint.x + 1) * width) / 2;
    const y = ((1 - safePoint.y) * height) / 2;
    const dx = minX > maxX ? 0 : Math.min(maxX, Math.max(minX, x)) - x;
    const dy = minY > maxY ? 0 : Math.min(maxY, Math.max(minY, y)) - y;
    if (!dx && !dy) return;
    const pixelsToWorld =
      (2 * Math.tan((camera.fov * Math.PI) / 360) * depth) / height;
    position.x += dx * pixelsToWorld;
    position.y -= dy * pixelsToWorld;
  };
  // H5 keeps the selected sector at the hub, the centre of its canvas: the
  // offset that moves the active node there under the given pose.
  const centreTarget = new Vector3();
  const centreOffset = (position: Vector3, rotation: Euler, out: Vector3) => {
    out.set(0, 0, 0);
    renderPoint(active, safePoint).applyEuler(rotation).add(position);
    const depth = camera.position.z - safePoint.z;
    if (depth <= 0) return out;
    safePoint.project(camera);
    if (touch.matches) centreTarget.copy(homePosition).project(camera);
    else {
      const bounds = stage.getBoundingClientRect();
      const area = desktopNodeArea();
      centreTarget.set(
        (((area.left + area.right) / 2 - bounds.left) / width) * 2 - 1,
        1 - (((area.top + area.bottom) / 2 - bounds.top) / height) * 2,
        0,
      );
    }
    const halfHeight = Math.tan((camera.fov * Math.PI) / 360) * depth;
    return out.set(
      (centreTarget.x - safePoint.x) * halfHeight * camera.aspect,
      (centreTarget.y - safePoint.y) * halfHeight,
      0,
    );
  };
  const placeInitialSector = () => {
    if (touch.matches) {
      graph.position.add(
        centreOffset(graph.position, graph.rotation, centreShift),
      );
      return;
    }
    const bounds = stage.getBoundingClientRect();
    const top = Math.max(bounds.top, readingInset);
    const bottom = Math.min(bounds.bottom, innerHeight);
    const targetX = innerWidth * 0.75 - bounds.left;
    const targetY =
      bottom > top
        ? (top + bottom) / 2 - bounds.top
        : Math.min(height, innerHeight) / 2;
    renderPoint(active, safePoint)
      .applyEuler(graph.rotation)
      .add(graph.position);
    const depth = camera.position.z - safePoint.z;
    if (depth <= 0) return;
    safePoint.project(camera);
    const pixelsToWorld =
      (2 * Math.tan((camera.fov * Math.PI) / 360) * depth) / height;
    graph.position.x +=
      (targetX - ((safePoint.x + 1) * width) / 2) * pixelsToWorld;
    graph.position.y -=
      (targetY - ((1 - safePoint.y) * height) / 2) * pixelsToWorld;
  };
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
    // Horizontally the hub stays the visual centre of the right-hand 3D
    // region, keeping the left-hand copy clear. Vertically the selected node
    // goes to the middle of the stage (world y 0 projects there at any
    // depth), so its companies can use the space below it too.
    targetPosition.set(
      homePosition.x * perspective - active.origin.x,
      -active.origin.y,
      homePosition.z,
    );
    keepActiveInSafeArea(
      targetPosition,
      frontRotation.set(targetPitch, targetYaw, 0),
    );
  };
  // `pinned` swaps in the on-screen replacement of a node that would
  // otherwise leave the visible area; pose maths always uses the true point.
  const renderPoint = (anchor: Anchor, target: Vector3, pinned = false) => {
    if (pinned && anchor.pin) return target.copy(anchor.pin);
    target.copy(anchor.origin);
    // H5 always centres the selected sector, so its companies fan out around
    // it from the start rather than keeping the canvas-wide layout.
    if (!focused && !touch.matches) return target;
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
        // 25% larger than the first pass, so the fan fills the taller stage.
        const radiusX = Math.min(FOCUS_BRANCH_RADIUS_X, width * 0.275);
        const radiusY = Math.min(FOCUS_BRANCH_RADIUS_Y, height * 0.4);
        const [dx, dy] = clearRay(
          Math.cos(angle) * radiusX * spreadX,
          Math.sin(angle) * radiusY * spreadY,
        );
        target.set(
          active.origin.x + dx * pixelsToWorld,
          active.origin.y - dy * pixelsToWorld,
          frontZ,
        );
      }
    }
    return target;
  };
  const focusActive = (event?: Event) => {
    initialPose = false;
    entered = true;
    pinnedReturn = false;
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

  function select(event?: Event) {
    // Explicit selections and subsequent automatic cycles keep their existing
    // poses and transitions; only the first presentation is centred.
    const next =
      sectors.find((anchor) => anchor.sector === root.dataset.focus) ||
      defaultSector;
    // Controls can finish loading after WebGL on a restored scroll position.
    // Their identical initial selection must not discard the opening pose.
    if (event && (next !== active || held())) {
      initialPose = false;
      entered = true;
    }
    active = next;
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
    readingInset = Math.max(
      document.querySelector<HTMLElement>('[data-header]')?.offsetHeight ?? 0,
      parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop) ||
        0,
    );
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
    // The design is drawn at --u px per design pixel: width / 1920 up to a
    // 1920 wide window, a fixed 1px beyond it. DOM nodes sit at that origin.
    const unit =
      parseFloat(getComputedStyle(stage).getPropertyValue('--u')) ||
      width / 1920;
    const span = 2 * Math.tan((38 * Math.PI) / 360) * 1000;
    // The stage is taller than the 1080 design frame (at least half a screen
    // plus 777), so the frame is centred in it instead of hugging its top and
    // leaving the lower part empty. DOM nodes keep their CSS origin; the
    // projected translate absorbs this shift.
    const frameTop = touch.matches
      ? 0
      : Math.max(0, (height - 1080 * unit) / 2);
    const toWorld = (element: HTMLElement, target: Vector3) => {
      const x = touch.matches
        ? (Number(element.dataset.mx) * width) / 360
        : Number(element.dataset.x) * unit;
      const y = touch.matches
        ? (Number(element.dataset.my) * height) / 560
        : Number(element.dataset.y) * unit + frameTop;
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
        : Number(anchor.element.dataset.x) * unit;
      anchor.y = touch.matches
        ? (Number(anchor.element.dataset.my) * height) / 560
        : Number(anchor.element.dataset.y) * unit;
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
    if (initialPose) {
      placeInitialSector();
      if (
        !entered &&
        root.getBoundingClientRect().top <= readingInset + 1 &&
        stage.getBoundingClientRect().bottom > readingInset
      ) {
        entered = true;
        cycle = orbit = 0;
      }
    }
    if (!dragging) keepActiveInSafeArea(graph.position, graph.rotation);
    graph.updateMatrixWorld(true);
    const bounds = stage.getBoundingClientRect();
    const labelInset = touch.matches ? 4 : 18;
    // The part of the stage the viewer can currently see. Branch nodes and
    // labels stay inside it instead of spilling past the window edges or
    // hiding behind the fixed header.
    const headerBottom =
      document.querySelector<HTMLElement>('[data-header]')?.offsetHeight ?? 0;
    const seen = {
      left: Math.max(bounds.left, touch.matches ? 0 : innerWidth / 4),
      right: Math.min(bounds.right, innerWidth),
      top: Math.max(bounds.top, headerBottom),
      bottom: Math.min(bounds.bottom, innerHeight),
    };
    const hasView =
      seen.right - seen.left > 120 && seen.bottom - seen.top > 120;
    const view = hasView ? (touch.matches ? seen : desktopNodeArea()) : bounds;
    const nodeView = view;
    const sectorPositions: { x: number; y: number }[] = [];
    // Keep the selected node in place, then leave each other sector a clear
    // mouse target when several projected nodes meet the same padded edge.
    const projectionOrder = [
      active,
      ...sectors.filter((anchor) => anchor !== active),
      ...anchors.filter((anchor) => !anchor.element.dataset.sector),
    ];
    for (const anchor of projectionOrder) {
      if (anchor.element.dataset.focusSector && anchor.sector !== active.sector)
        continue;
      const isBranch = !!anchor.element.dataset.focusSector;
      const isSector = !!anchor.element.dataset.sector;
      anchor.pin = null;
      renderPoint(anchor, projected)
        .applyMatrix4(graph.matrixWorld)
        .project(camera);
      let finalX = ((projected.x + 1) * width) / 2;
      let finalY = ((1 - projected.y) * height) / 2;
      if (hasView && (isBranch || isSector || !touch.matches)) {
        // A sector star is a ~50px glyph; its label is placed separately.
        const labelWidth =
          isBranch && touch.matches ? anchor.label?.offsetWidth || 0 : 0;
        const labelHeight = isBranch
          ? touch.matches
            ? anchor.label?.offsetHeight || 0
            : 8
          : touch.matches
            ? 24
            : 52;
        const side = isBranch ? anchor.element.dataset.labelSide : '';
        const reach = labelWidth + (touch.matches ? 6 : 14);
        const halfWidth = isSector ? (touch.matches ? 12 : 26) : 0;
        const minX =
          nodeView.left -
          bounds.left +
          labelInset +
          halfWidth +
          (side === 'left' ? reach : 0);
        const maxX =
          nodeView.right -
          bounds.left -
          labelInset -
          halfWidth -
          (side === 'right' ? reach : 0);
        const minY = nodeView.top - bounds.top + labelInset + labelHeight / 2;
        const maxY =
          nodeView.bottom - bounds.top - labelInset - labelHeight / 2;
        let clampedX =
          minX > maxX ? finalX : Math.min(maxX, Math.max(minX, finalX));
        let clampedY =
          minY > maxY ? finalY : Math.min(maxY, Math.max(minY, finalY));
        if (isSector && !touch.matches) {
          const spacing = 56;
          const clear = (x: number, y: number) =>
            sectorPositions.every(
              (other) =>
                Math.abs(other.x - x) >= spacing ||
                Math.abs(other.y - y) >= spacing,
            );
          if (!clear(clampedX, clampedY)) {
            const xs = [
              clampedX,
              minX,
              maxX,
              ...sectorPositions.flatMap((other) => [
                other.x - spacing,
                other.x + spacing,
              ]),
            ];
            const ys = [
              clampedY,
              minY,
              maxY,
              ...sectorPositions.flatMap((other) => [
                other.y - spacing,
                other.y + spacing,
              ]),
            ];
            let distance = Infinity;
            let bestX = clampedX;
            let bestY = clampedY;
            for (const x of xs)
              for (const y of ys) {
                if (
                  x < minX ||
                  x > maxX ||
                  y < minY ||
                  y > maxY ||
                  !clear(x, y)
                )
                  continue;
                const next = (x - clampedX) ** 2 + (y - clampedY) ** 2;
                if (next < distance) {
                  distance = next;
                  bestX = x;
                  bestY = y;
                }
              }
            clampedX = bestX;
            clampedY = bestY;
          }
          sectorPositions.push({ x: clampedX, y: clampedY });
        }
        if (clampedX !== finalX || clampedY !== finalY) {
          finalX = clampedX;
          finalY = clampedY;
          projected.set(
            (finalX / width) * 2 - 1,
            1 - (finalY / height) * 2,
            projected.z,
          );
          projected.unproject(camera);
          anchor.pin = graph.worldToLocal(projected).clone();
        }
      }
      const x = finalX - anchor.x;
      const y = finalY - anchor.y;
      anchor.element.style.translate = `${x.toFixed(2)}px ${y.toFixed(2)}px`;
    }
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
          Math.max(view.left + labelInset - box.left, 0) +
          Math.min(view.right - labelInset - box.right, 0);
        const y =
          Math.max(view.top + labelInset - box.top, 0) +
          Math.min(view.bottom - labelInset - box.bottom, 0);
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
    const placed: Rect[] = touch.matches
      ? []
      : sectors.map(({ element }) => {
          const box = element.getBoundingClientRect();
          return {
            left: box.left - 16,
            right: box.right + 16,
            top: box.top - 16,
            bottom: box.bottom + 16,
          };
        });
    for (const placement of placements) {
      const base = move(placement.box, placement.x, placement.y);
      const minimum = view.top + labelInset - base.top;
      const maximum = view.bottom - labelInset - base.bottom;
      const candidates = [
        0,
        ...placed.flatMap((other) => [
          other.bottom + gap - base.top,
          other.top - gap - base.bottom,
        ]),
      ]
        .filter((offset) => offset >= minimum && offset <= maximum)
        .sort((a, b) => Math.abs(a) - Math.abs(b));
      const clear = (x: number, y: number) => {
        const candidateBox = move(base, x, y);
        return placed.every((other) => !overlaps(candidateBox, other));
      };
      let offsetX = 0;
      let offsetY = candidates.find((candidate) => clear(0, candidate));
      // A crowded branch can leave no free row; slide sideways as well.
      if (offsetY === undefined) {
        const left = view.left + labelInset - base.left;
        const right = view.right - labelInset - base.right;
        const sideways = [
          0,
          ...placed.flatMap((other) => [
            other.right + gap - base.left,
            other.left - gap - base.right,
          ]),
        ].filter((offset) => offset >= left && offset <= right);
        const best = sideways
          .flatMap((x) => [0, ...candidates].map((y) => ({ x, y })))
          .sort((a, b) => Math.hypot(a.x, a.y) - Math.hypot(b.x, b.y))
          .find(({ x, y }) => clear(x, y));
        offsetX = best?.x || 0;
        offsetY = best?.y || 0;
      }
      placement.x += offsetX;
      placement.y += offsetY;
      const finalBox = move(placement.box, placement.x, placement.y);
      placed.push(finalBox);
      if (placement.x || placement.y)
        placement.anchor.label!.style.translate = `${placement.x}px ${placement.y}px`;
    }
    const basePositions = baseGeometry.getAttribute('position');
    if (basePositions) {
      renderPoint(hub, branchStart, true);
      sectors.forEach((anchor, index) => {
        basePositions.setXYZ(
          index * 2,
          branchStart.x,
          branchStart.y,
          branchStart.z,
        );
        renderPoint(anchor, endpoint, true);
        basePositions.setXYZ(index * 2 + 1, endpoint.x, endpoint.y, endpoint.z);
      });
      basePositions.needsUpdate = true;
    }
    const branchPositions = branchGeometry.getAttribute('position');
    if (branchPositions) {
      const reveal = 1 - Math.pow(1 - growth, 3);
      renderPoint(active, branchStart, true);
      companies.forEach((anchor, index) => {
        renderPoint(anchor, branchEnd, true);
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
      } else if (initialPose && !entered && !dragging) {
        cycle = orbit = 0;
        graph.rotation.set(pitch, yaw, 0);
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
        // Ease each cycled sector towards its container's centre, keeping the
        // existing orbit and its timing.
        if (touch.matches || !initialPose)
          graph.position.add(
            centreOffset(
              graph.position,
              graph.rotation,
              centreShift,
            ).multiplyScalar(1 - Math.pow(0.001, delta / 900)),
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
    initialPose = false;
    entered = true;
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
      renderPoint(active, pivotWorld, true).applyMatrix4(graph.matrixWorld);
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
      keepActiveInSafeArea(
        targetPosition,
        frontRotation.set(targetPitch, targetYaw, 0),
      );
      renderPoint(active, pivotWorld)
        .applyEuler(frontRotation)
        .add(targetPosition);
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
      if (visible && initialPose && width) {
        draw();
      }
      sync();
    },
    { threshold: 0.02 },
  );
  visibility.observe(stage);
  const resize = new ResizeObserver(size);
  resize.observe(stage);
  // Nodes are kept inside the visible part of the stage, which moves with the
  // page; a paused graph has no frame loop, so redraw when the page scrolls.
  let scrollFrame = 0;
  const redrawOnScroll = () => {
    if (scrollFrame || !visible) return;
    scrollFrame = requestAnimationFrame(() => {
      scrollFrame = 0;
      draw();
    });
  };
  window.addEventListener('scroll', redrawOnScroll, { passive: true });
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
  // A hover or click before this module loaded already chose the sector;
  // bring it to the front now that the scene can respond.
  if (held()) focusActive();
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
    window.removeEventListener('scroll', redrawOnScroll);
    cancelAnimationFrame(scrollFrame);
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

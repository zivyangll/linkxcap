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
  key: string;
  role: 'node' | 'label';
  visible: boolean;
  x: number;
  y: number;
  width: number;
  height: number;
};
export function mountTopology(root: HTMLElement) {
  const canvas = root.querySelector<HTMLCanvasElement>('.topology-canvas')!;
  const stage = root.querySelector<HTMLElement>('.network-stage') || root;
  const home = root.dataset.topologyKind === 'home';
  const dragSurface = home
    ? root.querySelector<HTMLElement>('[data-topology-drag]')
    : null;
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
  const selector = home ? '[data-topology-anchor]' : '[data-node3d]';
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
  let dragPitch = 0,
    dragYaw = 0,
    pitchVelocity = 0,
    yawVelocity = 0,
    dragging = false,
    dragPointer = -1,
    dragX = 0,
    dragY = 0;
  let edges: number[][] = [];
  let edgeGeometry = new BufferGeometry();
  let highlightGeometry = new BufferGeometry();
  let hoverNode = -1;
  let highlightedKeys = new Set<string>();
  const edgeMaterial = new LineBasicMaterial({
    color: 0x8f7eaf,
    transparent: true,
    opacity: 0.25,
    depthWrite: false,
  });
  const lines = new LineSegments(edgeGeometry, edgeMaterial);
  const highlightMaterial = new LineBasicMaterial({
    color: 0xb2a2ff,
    transparent: true,
    opacity: 1,
    depthWrite: false,
  });
  const highlightLines = new LineSegments(highlightGeometry, highlightMaterial);
  highlightLines.visible = false;
  group.add(lines, highlightLines);
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
    const role = element.dataset.topologyRole === 'label' ? 'label' : 'node';
    mesh.visible = role === 'node';
    anchors.push({
      element,
      origin: new Vector3(),
      mesh,
      key:
        element.dataset.topologyAnchor ||
        element.dataset.slug ||
        `node-${index}`,
      role,
      visible: true,
      x: 0,
      y: 0,
      width: 0,
      height: 0,
    });
    element.addEventListener('pointerenter', () => {
      hovering = index;
      element.dataset.hovered = 'true';
      updateHighlight();
      draw();
      if (home) requestAnimationFrame(size);
    });
    element.addEventListener('pointerleave', () => {
      hovering = -1;
      delete element.dataset.hovered;
      updateHighlight();
      draw();
      if (home) requestAnimationFrame(size);
    });
    element.addEventListener('focus', () => {
      hovering = index;
      updateHighlight();
      draw();
      if (home) requestAnimationFrame(size);
    });
    element.addEventListener('blur', () => {
      hovering = -1;
      updateHighlight();
      draw();
      if (home) requestAnimationFrame(size);
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
      a.visible =
        rect.width > 0 &&
        rect.height > 0 &&
        !a.element.closest<HTMLElement>('[hidden]');
      a.mesh.visible = a.visible && a.role === 'node';
      if (!a.visible) return;
      a.x = rect.left - box.left + rect.width / 2;
      a.y = rect.top - box.top + rect.height / 2;
      a.width = rect.width;
      a.height = rect.height;
      const keyDepth = Array.from(a.key).reduce(
        (value, char) => (value * 31 + char.charCodeAt(0)) % 7,
        0,
      );
      const z = home ? (keyDepth - 3) * 48 : ((i % 5) - 2) * 38;
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
    const graphNodes = anchors
      .map((anchor, index) => ({ anchor, index }))
      .filter(({ anchor }) => anchor.visible && anchor.role === 'node');
    graphNodes.forEach(({ anchor, index }) => {
      graphNodes
        .map(({ anchor: candidate, index: candidateIndex }) => ({
          j: candidateIndex,
          d: anchor.origin.distanceTo(candidate.origin),
        }))
        .filter((candidate) => candidate.j !== index)
        .sort((a, b) => a.d - b.d)
        .slice(0, 2)
        .forEach(({ j }) => {
          if (!edges.some(([a, b]) => a === j && b === index))
            edges.push([index, j]);
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
    updateHighlight();
    draw();
    sync();
  }
  function updateHighlight() {
    hoverNode =
      hovering < 0
        ? -1
        : anchors[hovering]?.role === 'node'
          ? hovering
          : anchors.findIndex(
              (anchor) =>
                anchor.visible &&
                anchor.role === 'node' &&
                anchor.key === anchors[hovering]?.key,
            );
    const highlightedEdges =
      hoverNode < 0
        ? []
        : edges.filter(([a, b]) => a === hoverNode || b === hoverNode);
    const highlightedNodes = new Set<number>(
      highlightedEdges.flatMap(([a, b]) => [a, b]),
    );
    if (hoverNode >= 0) highlightedNodes.add(hoverNode);
    highlightedKeys = new Set(
      [...highlightedNodes].map((index) => anchors[index].key),
    );
    if (home) {
      anchors.forEach((anchor, index) => {
        const current =
          hoverNode >= 0 && anchor.key === anchors[hoverNode]?.key;
        const connected = hoverNode >= 0 && highlightedKeys.has(anchor.key);
        if (hoverNode < 0) delete anchor.element.dataset.topologyState;
        else
          anchor.element.dataset.topologyState = current
            ? 'current'
            : connected
              ? 'connected'
              : 'unrelated';
        if (anchor.element.matches('.sector-star')) {
          anchor.element.classList.toggle(
            'is-active',
            hoverNode >= 0
              ? index === hoverNode
              : anchor.element.getAttribute('aria-pressed') === 'true',
          );
        }
      });
    }
    highlightGeometry.dispose();
    highlightGeometry = new BufferGeometry();
    highlightGeometry.setAttribute(
      'position',
      new Float32BufferAttribute(
        highlightedEdges.flatMap(([a, b]) => [
          ...anchors[a].origin.toArray(),
          ...anchors[b].origin.toArray(),
        ]),
        3,
      ),
    );
    highlightLines.geometry = highlightGeometry;
    lines.visible = hoverNode < 0;
    highlightLines.visible = hoverNode >= 0 && highlightedEdges.length > 0;
    if (hoverNode >= 0) {
      root.dataset.highlightedNode = anchors[hoverNode].key;
      root.dataset.highlightedKeys = [...highlightedKeys].join(',');
      root.dataset.highlightedEdges = String(highlightedEdges.length);
    } else {
      delete root.dataset.highlightedNode;
      delete root.dataset.highlightedKeys;
      delete root.dataset.highlightedEdges;
    }
  }
  const vector = new Vector3();
  function draw() {
    if (disposed) return;
    const staticMode = reduced.matches || width < 768 || paused;
    if (!staticMode) {
      if (home) {
        if (!dragging) {
          dragYaw += yawVelocity;
          dragPitch = Math.max(
            -Math.PI / 3,
            Math.min(Math.PI / 3, dragPitch + pitchVelocity),
          );
          yawVelocity *= 0.92;
          pitchVelocity *= 0.92;
        }
        const desiredYaw = dragYaw + targetX * 0.08;
        const desiredPitch = dragPitch + targetY * 0.05;
        group.rotation.y += (desiredYaw - group.rotation.y) * 0.18;
        group.rotation.x += (desiredPitch - group.rotation.x) * 0.18;
      } else {
        group.rotation.y += (targetX * 0.12 - group.rotation.y) * 0.06;
        group.rotation.x += (targetY * 0.08 - group.rotation.x) * 0.06;
      }
    } else if (!paused) group.rotation.set(0, 0, 0);
    group.updateMatrixWorld(true);
    anchors.forEach((a) => {
      if (!a.visible) {
        a.element.style.removeProperty('translate');
        a.element.style.removeProperty('scale');
        return;
      }
      const current = hoverNode >= 0 && a.key === anchors[hoverNode]?.key;
      const connected = hoverNode >= 0 && highlightedKeys.has(a.key);
      const selected =
        a.element.getAttribute('aria-pressed') === 'true' ||
        a.element.classList.contains('is-selected');
      const active = current || (hoverNode < 0 && selected);
      const sector = a.key.startsWith('sector-');
      const size = active && sector ? 1.7023 : sector ? 0.8693 : 0.4;
      if (a.role === 'node') {
        a.mesh.scale.setScalar(size);
        a.mesh.rotation.z = active && !staticMode ? Math.PI / 4 : 0;
        a.mesh.material.color.setHex(
          current ? 0xffffff : connected ? 0xb2a2ff : 0xffffff,
        );
        a.mesh.material.opacity =
          hoverNode < 0 ? (selected ? 1 : 0.3) : connected ? 1 : 0.2;
      }
      vector.copy(a.origin).applyMatrix4(group.matrixWorld);
      const depthScale = Math.max(
        0.82,
        Math.min(1.22, 1000 / (1000 - vector.z)),
      );
      vector.project(camera);
      if (!staticMode) {
        const x = ((vector.x + 1) * width) / 2 - a.x,
          y = ((1 - vector.y) * height) / 2 - a.y;
        a.element.style.translate = `${x.toFixed(2)}px ${y.toFixed(2)}px`;
        a.element.style.scale = depthScale.toFixed(3);
      } else {
        a.element.style.removeProperty('translate');
        a.element.style.removeProperty('scale');
      }
    });
    stars.rotation.y = staticMode ? 0 : Math.sin(elapsed * 0.00003) * 0.08;
    renderer.render(scene, camera);
    if (home)
      root.dataset.rotation = `${group.rotation.x.toFixed(3)},${group.rotation.y.toFixed(3)}`;
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
    if (!dragging) targetX = targetY = 0;
  });
  const beginDrag = (event: PointerEvent) => {
    const box = stage.getBoundingClientRect();
    const interactive = (event.target as Element | null)?.closest('a, button');
    if (
      !home ||
      !dragSurface ||
      width < 768 ||
      reduced.matches ||
      paused ||
      event.button !== 0 ||
      interactive ||
      event.clientX < box.left + box.width * 0.45
    )
      return;
    event.preventDefault();
    dragging = true;
    dragPointer = event.pointerId;
    dragX = event.clientX;
    dragY = event.clientY;
    pitchVelocity = yawVelocity = 0;
    stage.setPointerCapture(event.pointerId);
    root.dataset.dragging = 'true';
  };
  const moveDrag = (event: PointerEvent) => {
    if (!dragging || event.pointerId !== dragPointer || !width || !height)
      return;
    event.preventDefault();
    const deltaX = event.clientX - dragX;
    const deltaY = event.clientY - dragY;
    dragX = event.clientX;
    dragY = event.clientY;
    const yawStep = (deltaX / width) * Math.PI * 1.2;
    const pitchStep = (deltaY / height) * Math.PI * 0.8;
    yawVelocity = yawStep * 0.35;
    pitchVelocity = pitchStep * 0.35;
    dragYaw += yawStep;
    dragPitch = Math.max(
      -Math.PI / 3,
      Math.min(Math.PI / 3, dragPitch + pitchStep),
    );
    draw();
  };
  const endDrag = (event: PointerEvent) => {
    if (!dragging || event.pointerId !== dragPointer) return;
    dragging = false;
    dragPointer = -1;
    root.dataset.dragging = 'false';
    root.dataset.dragged = 'true';
    if (stage.hasPointerCapture(event.pointerId))
      stage.releasePointerCapture(event.pointerId);
    sync();
  };
  stage.addEventListener('pointerdown', beginDrag);
  stage.addEventListener('pointermove', moveDrag);
  stage.addEventListener('pointerup', endDrag);
  stage.addEventListener('pointercancel', endDrag);
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
      stage.removeEventListener('pointerdown', beginDrag);
      stage.removeEventListener('pointermove', moveDrag);
      stage.removeEventListener('pointerup', endDrag);
      stage.removeEventListener('pointercancel', endDrag);
      edgeGeometry.dispose();
      highlightGeometry.dispose();
      edgeMaterial.dispose();
      highlightMaterial.dispose();
      sharedGeometry.dispose();
      anchors.forEach((a) => a.mesh.material.dispose());
      starGeometry.dispose();
      starMaterial.dispose();
      renderer.dispose();
    },
    { once: true },
  );
}

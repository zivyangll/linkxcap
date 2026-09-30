import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

const clamp = (value: number) => Math.max(0, Math.min(1, value));
const range = (value: number, start: number, end: number) =>
  clamp((value - start) / (end - start));
const smooth = (value: number) => value * value * (3 - 2 * value);
export const PHILOSOPHY_ARC = { start: 0.06, end: 0.54 };

const lerp = (from: number, to: number, progress: number) =>
  from + (to - from) * progress;

// Authored choreography between the static Figma frames, not exported
// keyframes. A single progress owns the camera, circle, point and copy.
// All positions are stage-local, so pinning/normal page flow cannot add a
// second vertical movement. Reverse scrolling reconstructs the same state.
export function mountPhilosophyMotion(
  home: HTMLElement,
  onHandoff: (active: boolean) => void,
) {
  const stage = home.querySelector<HTMLElement>('[data-philosophy-stage]')!;
  const canvas = stage.querySelector<HTMLCanvasElement>('canvas')!;
  const ctx = canvas.getContext('2d');
  if (!ctx) return () => {};
  const hero = stage.querySelector<HTMLElement>('.hero')!;
  const about = stage.querySelector<HTMLElement>('.about')!;
  const heroCopy = Array.from(
    stage.querySelectorAll<HTMLElement>('.hero-title'),
  );
  const orbitLabel = stage.querySelector<HTMLElement>('.orbit-label')!;
  const aboutLabel = stage.querySelector<HTMLElement>('.about-label')!;
  const aboutTitle = stage.querySelector<HTMLElement>('.about-title')!;
  const titleLines = Array.from(
    stage.querySelectorAll<HTMLElement>('.about-title span'),
  );
  const copy = stage.querySelector<HTMLElement>('.about-copy')!;
  const styled = [
    hero,
    about,
    ...heroCopy,
    orbitLabel,
    aboutLabel,
    ...titleLines,
    copy,
  ];
  const originalStyles = styled.map((el) => el.getAttribute('style'));
  const progress = { value: 0 };
  let width = 0,
    height = 0;
  let orbitLabelWidth = 0,
    aboutLabelWidth = 0;
  let activeHandoff = false;
  home.classList.add('has-philosophy-motion');

  const setPose = (
    element: HTMLElement,
    x: number,
    y: number,
    opacity: number,
  ) => {
    element.style.transform = `translate3d(${x.toFixed(3)}px,${y.toFixed(3)}px,0)`;
    element.style.opacity = String(opacity);
  };
  function draw() {
    if (!ctx || !width || !height) return;
    const p = progress.value;
    const u = width / 1920;
    const arc = smooth(range(p, PHILOSOPHY_ARC.start, PHILOSOPHY_ARC.end));
    const drop = smooth(range(p, 0.54, 0.68));
    const pan = smooth(range(p, 0.69, 0.88));
    const detail = smooth(range(p, 0.8, 0.92));
    // Finish the lateral move first, then preserve a readable hold before
    // the next scroll segment starts the vertical chapter handoff.
    const horizontalHandoff = smooth(range(p, 0.86, 0.92));
    const verticalHandoff = smooth(range(p, 0.96, 1));
    const branchActivation = smooth(range(p, 0.54, 0.7));
    const railActivation = smooth(range(p, 0.08, 0.68));
    const rayActivation = smooth(range(p, 0.82, 0.94));
    const aboutOffset = 100 * u * smooth(range(p, 0.49, 0.58));
    // Partnering is its own authored screen. It holds after entering, follows
    // the active point to the right, then clears before the About screen.
    const heroExit = smooth(range(p, 0.54, 0.7));
    const heroOpacity = 1 - heroExit;
    const heroCopyEntrance = smooth(range(p, 0, PHILOSOPHY_ARC.start));
    const heroCopyOpacity = heroCopyEntrance * heroOpacity;
    const titleOpacity = smooth(range(p, 0.7, 0.8));
    const start = { x: 467.485 * u, y: 99.485 * u };
    const circle = { x: 1640 * u, y: 37 * u };
    const radius = Math.hypot(start.x - circle.x, start.y - circle.y);
    const startAngle = Math.atan2(start.y - circle.y, start.x - circle.x);
    const angle = lerp(startAngle, Math.PI / 2, arc);
    const local = {
      x: circle.x + Math.cos(angle) * radius,
      y: circle.y + Math.sin(angle) * radius,
    };
    // The camera reveals the circle's underside while the tracked point
    // moves steadily down/right; it never climbs back up during the handoff.
    const arcPoint = {
      x: lerp(start.x, 960 * u, arc),
      // Keep the intermediate headline in its final reading band instead of
      // dropping it to y=644 and then lifting it back to y=384. The point
      // clears the headline before settling at Frame 515's y=454.
      y: lerp(start.y, 300 * u, arc),
    };
    const camera = {
      x: arcPoint.x - local.x - 322 * u * pan,
      y: arcPoint.y - local.y - 151 * u * pan,
    };
    const baseCenter = { x: circle.x + camera.x, y: circle.y + camera.y };
    const pointBeforeHandoff = {
      x: arcPoint.x - 322 * u * pan,
      y:
        p < PHILOSOPHY_ARC.start
          ? start.y * range(p, 0, PHILOSOPHY_ARC.start)
          : arcPoint.y + 50 * u * drop + 104 * u * pan + aboutOffset,
    };
    // The next chapter's axis is authored at x=324u. The handoff is strictly
    // two-stage: first the entire junction moves left, then the active marker
    // drops vertically without any remaining horizontal drift.
    const researchAxisX = 324 * u;
    const junctionX = lerp(
      pointBeforeHandoff.x,
      researchAxisX,
      horizontalHandoff,
    );
    const junctionY = pointBeforeHandoff.y;
    const point = {
      x: junctionX,
      y: lerp(junctionY, height, verticalHandoff),
    };
    const compositionOffsetX = junctionX - pointBeforeHandoff.x;
    const center = {
      x: baseCenter.x + compositionOffsetX,
      y: baseCenter.y,
    };
    const nodeColor = '#573c79';
    // The research chapter owns the destination marker. Retire this canvas'
    // marker at the instant it reaches the bottom handoff so it cannot be
    // clipped into a half-diamond and ride upward when the pin releases.
    const nodeOpacity = 1 - smooth(range(p, 0.99, 1));
    const hasTravellingNode = verticalHandoff > 0 && nodeOpacity > 0;
    const phase =
      p < PHILOSOPHY_ARC.start
        ? 'lead-in'
        : p < 0.54
          ? 'arc'
          : p < 0.69
            ? 'drop'
            : p < 0.88
              ? 'pan'
              : 'details';
    stage.dataset.motionPhase = phase;
    stage.dataset.motionProgress = p.toFixed(4);
    stage.dataset.guideProgress = range(p, 0.49, 0.54).toFixed(3);
    stage.dataset.ringProgress = smooth(range(p, 0.82, 0.94)).toFixed(3);
    stage.dataset.researchHandoff = verticalHandoff.toFixed(3);
    stage.dataset.horizontalHandoff = horizontalHandoff.toFixed(3);
    canvas.dataset.point = `${point.x.toFixed(2)},${point.y.toFixed(2)}`;
    canvas.dataset.junctionPoint = `${junctionX.toFixed(2)},${junctionY.toFixed(2)}`;
    canvas.dataset.markerShape = 'diamond';
    canvas.dataset.markerCount = hasTravellingNode ? '2' : '1';
    canvas.dataset.guideStyle = 'gradient-dashed';
    canvas.dataset.guideDash = '3,8';
    canvas.dataset.trailBaseColor = '#c9c9c9';
    canvas.dataset.trailActiveColor = '#573c79';
    canvas.dataset.trailProgress = arc.toFixed(3);
    canvas.dataset.nodeActivation = '1.000';
    canvas.dataset.nodeOpacity = nodeOpacity.toFixed(3);
    canvas.dataset.nodeColor = nodeColor;
    canvas.dataset.branchMarkerOpacity = '0.000';
    canvas.dataset.branchActivation = branchActivation.toFixed(3);
    canvas.dataset.railActivation = railActivation.toFixed(3);
    canvas.dataset.rayActivation = rayActivation.toFixed(3);
    hero.dataset.scrollProgress = arc.toFixed(3);
    about.dataset.scrollProgress = range(p, 0.54, 1).toFixed(3);

    setPose(hero, 0, 0, heroOpacity);
    setPose(about, 0, 0, 1);
    hero.inert = heroOpacity < 0.01;
    about.inert = titleOpacity < 0.01;
    // The locale-specific chapter heading follows the same rightward motion
    // as the active node. Its extra exit drift keeps the copy attached to the
    // route before both make room for the third screen.
    const heroFollowX = arcPoint.x - start.x + 72 * u * heroExit;
    heroCopy.forEach((el) => {
      setPose(
        el,
        heroFollowX,
        18 * u * (1 - heroCopyEntrance),
        heroCopyOpacity,
      );
      el.style.filter = `blur(${((1 - heroCopyEntrance) * 10).toFixed(2)}px)`;
    });
    // The label follows the same point; its original diamond is hidden.
    const nodeLabelGap = Math.max(28 * u, 20);
    orbitLabel.style.left = `${point.x - orbitLabelWidth - nodeLabelGap}px`;
    orbitLabel.style.top = `${point.y + 10 * u}px`;
    // The introductory label belongs to the top junction. Fade it before the
    // headline follows the moving node so the two text blocks never cross.
    setPose(orbitLabel, 0, 0, 1 - smooth(range(p, 0.18, 0.36)));
    titleLines.forEach((el, index) => {
      setPose(
        el,
        (index === 0 ? 109 : -52) * u * (1 - pan) + compositionOffsetX,
        -32 * u * (1 - drop),
        titleOpacity,
      );
      el.style.filter = `blur(${((1 - titleOpacity) * 14).toFixed(2)}px)`;
      el.style.letterSpacing = `${((1 - titleOpacity) * 0.09).toFixed(4)}em`;
    });
    // The label and node share one anchor throughout the move. A fixed gap
    // prevents the label from crossing the ring while the node changes axes.
    const aboutLabelLeft = junctionX - aboutLabelWidth - nodeLabelGap;
    const aboutLabelTop = junctionY - 24 * u;
    aboutLabel.style.left = `${aboutLabelLeft}px`;
    aboutLabel.style.top = `${aboutLabelTop}px`;
    aboutLabel.style.right = 'auto';
    setPose(aboutLabel, 0, 0, titleOpacity);
    const copyOpacity = detail;
    setPose(copy, 100 * u * (1 - detail) + compositionOffsetX, 0, copyOpacity);
    copy.style.filter = `blur(${((1 - copyOpacity) * 8).toFixed(2)}px)`;

    ctx.clearRect(0, 0, width, height);
    const stroke = (
      opacity: number,
      drawPath: () => void,
      sparse = false,
      color = '#573c79',
    ) => {
      ctx.globalAlpha = opacity;
      ctx.strokeStyle = color;
      ctx.lineWidth = Math.max(0.75, 0.9 * u);
      ctx.setLineDash(sparse ? [3 * u, 8 * u] : [2 * u, 4 * u]);
      ctx.beginPath();
      drawPath();
      ctx.stroke();
    };
    // Frame 510: faint vertical guide; the circle begins exactly at its dot.
    stroke(
      0.58 * heroOpacity,
      () => {
        ctx.moveTo(start.x + camera.x, 0);
        ctx.lineTo(start.x + camera.x, height);
      },
      true,
      '#c9c9c9',
    );
    // The complete arc is visible as a pale route from the beginning. As the
    // node advances, redraw the travelled arc in the active purple so the
    // right-hand side does not remain uniformly pale.
    stroke(
      0.58 * heroOpacity,
      () => ctx.arc(center.x, center.y, radius, startAngle, 0, true),
      false,
      '#c9c9c9',
    );
    if (arc > 0) {
      stroke(0.96 * heroOpacity, () =>
        ctx.arc(center.x, center.y, radius, startAngle, angle, true),
      );
    }
    // Frame 514: the full rail begins pale. The travelled section above the
    // descending node activates to the final purple.
    const guide = range(p, 0.49, 0.54);
    stroke(
      0.55,
      () => {
        ctx.moveTo(point.x, 0);
        ctx.lineTo(point.x, height);
      },
      true,
      '#c9c9c9',
    );
    stroke(0.94 * railActivation, () => {
      ctx.moveTo(point.x, 0);
      ctx.lineTo(point.x, p < 0.54 ? point.y * guide : point.y);
    });
    const tangent =
      smooth(range(p, 0.48, 0.54)) * (1 - smooth(range(p, 0.96, 1)) * 0.35);
    stroke(
      0.88 * tangent,
      () => {
        ctx.moveTo(0, 300 * u);
        ctx.lineTo(width, 300 * u);
      },
      true,
    );
    // Once the node reaches the junction, activate the untouched right-hand
    // branch as well. Curve, horizontal and vertical rails then share the
    // same finished colour.
    stroke(0.9 * branchActivation, () =>
      ctx.arc(center.x, center.y, radius, startAngle, 0, true),
    );
    // Frame 515: two diagonal rays plus the existing vertical ray, fading
    // toward the top. The circle and copy leave with the stage afterward.
    // The three outgoing rails (left ray, vertical rail, right ray) finish in
    // one solid active colour. A gradient here made the upper portions look
    // permanently disabled even after the node had arrived.
    ctx.globalAlpha = rayActivation;
    ctx.strokeStyle = '#573c79';
    ctx.setLineDash([3 * u, 4 * u]);
    for (const direction of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(junctionX, junctionY);
      ctx.lineTo(junctionX + direction * 655 * u, junctionY - 539 * u);
      ctx.stroke();
    }
    ctx.setLineDash([]);
    ctx.globalAlpha = rayActivation;
    ctx.strokeStyle = 'rgba(29,29,29,.72)';
    ctx.lineWidth = Math.max(0.75, 0.9 * u);
    ctx.beginPath();
    ctx.arc(junctionX, junctionY, 22 * u, 0, Math.PI * 2);
    ctx.stroke();
    const diamond = (x: number, y: number, color: string, opacity: number) => {
      ctx.save();
      ctx.globalAlpha = opacity;
      ctx.fillStyle = color;
      ctx.translate(x, y);
      ctx.rotate(Math.PI / 4);
      ctx.fillRect(-6 * u, -6 * u, 12 * u, 12 * u);
      ctx.restore();
    };
    // Once the handoff begins, the junction keeps its original marker and a
    // second marker travels down the vertical rail. The removed grey fork
    // marker is never restored.
    if (verticalHandoff > 0) {
      diamond(junctionX, junctionY, nodeColor, 1);
    }
    diamond(point.x, point.y, nodeColor, nodeOpacity);
    ctx.globalAlpha = 1;
  }
  function resize() {
    width = stage.clientWidth;
    height = stage.clientHeight;
    orbitLabelWidth = orbitLabel.getBoundingClientRect().width;
    aboutLabelWidth = aboutLabel.getBoundingClientRect().width;
    const dpr = Math.min(devicePixelRatio, 1.5);
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
    draw();
  }
  resize();
  const pin = ScrollTrigger.create({
    id: 'philosophy-stage-pin',
    trigger: stage,
    start: 'top top',
    end: () => `+=${innerHeight * 3.2}`,
    pin: true,
    anticipatePin: 1,
    invalidateOnRefresh: true,
  });
  const animation = gsap.to(progress, {
    value: 1,
    ease: 'none',
    onUpdate: draw,
    scrollTrigger: {
      id: 'philosophy-sequence',
      trigger: stage,
      start: 'top top',
      end: () => pin.end,
      // Direct scroll ownership prevents a trailing marker from remaining in
      // the viewport after the pin releases and appearing to rise with page.
      scrub: true,
      invalidateOnRefresh: true,
      onRefresh: resize,
      onUpdate: (self) => {
        const active = self.progress > 0;
        if (active !== activeHandoff) {
          activeHandoff = active;
          onHandoff(active);
        }
      },
    },
  });
  // Do not hide the About copy inside the pinned scene. Let it travel upward
  // naturally after the pin releases, then fade only across the final 200px
  // before the title reaches the top edge of the viewport.
  const aboutExitAnimation = gsap.fromTo(
    about,
    { opacity: 1 },
    {
      opacity: 0,
      ease: 'none',
      scrollTrigger: {
        id: 'philosophy-about-exit',
        start: () => pin.end + Math.max(0, aboutTitle.offsetTop - 200),
        end: () => pin.end + Math.max(200, aboutTitle.offsetTop),
        scrub: true,
        invalidateOnRefresh: true,
        onUpdate: (self) => {
          about.inert = self.progress > 0.99;
        },
      },
    },
  );
  const observer = new ResizeObserver(resize);
  observer.observe(stage);
  // #about now lives inside the pinned stage; target its readable state,
  // not the absolute section's (shared) top edge.
  const goToAbout = () =>
    window.scrollTo({
      top: pin.start + (pin.end - pin.start) * 0.94,
      behavior: 'smooth',
    });
  const navigate = (event: MouseEvent) => {
    const link = (event.target as Element | null)?.closest<HTMLAnchorElement>(
      'a[href="#about"]',
    );
    if (
      !link ||
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    )
      return;
    event.preventDefault();
    history.replaceState(null, '', '#about');
    goToAbout();
  };
  home.addEventListener('click', navigate);
  const initialNavigation = requestAnimationFrame(() => {
    if (location.hash === '#about') goToAbout();
  });
  return () => {
    cancelAnimationFrame(initialNavigation);
    home.removeEventListener('click', navigate);
    observer.disconnect();
    animation.scrollTrigger?.kill();
    animation.kill();
    aboutExitAnimation.scrollTrigger?.kill();
    aboutExitAnimation.kill();
    pin.kill();
    onHandoff(false);
    home.classList.remove('has-philosophy-motion');
    styled.forEach((el, i) => {
      if (originalStyles[i] === null) el.removeAttribute('style');
      else el.setAttribute('style', originalStyles[i]!);
    });
    hero.inert = about.inert = false;
    delete stage.dataset.motionPhase;
    delete stage.dataset.motionProgress;
    delete stage.dataset.guideProgress;
    delete stage.dataset.ringProgress;
    delete stage.dataset.researchHandoff;
    delete stage.dataset.horizontalHandoff;
    delete canvas.dataset.markerCount;
    delete canvas.dataset.junctionPoint;
    delete canvas.dataset.markerShape;
    delete canvas.dataset.guideStyle;
    delete canvas.dataset.guideDash;
    delete canvas.dataset.nodeActivation;
    delete canvas.dataset.nodeOpacity;
    delete canvas.dataset.nodeColor;
    delete canvas.dataset.branchMarkerOpacity;
    delete canvas.dataset.branchActivation;
    delete canvas.dataset.railActivation;
    delete canvas.dataset.rayActivation;
    ctx.clearRect(0, 0, width, height);
  };
}

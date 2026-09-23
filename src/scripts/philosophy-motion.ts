import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

const clamp = (value: number) => Math.max(0, Math.min(1, value));
const range = (value: number, start: number, end: number) =>
  clamp((value - start) / (end - start));
const smooth = (value: number) => value * value * (3 - 2 * value);
export const PHILOSOPHY_ARC = { start: 0.035, end: 0.54 };

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
    stage.querySelectorAll<HTMLElement>('.hero-title,.hero-zh'),
  );
  const orbitLabel = stage.querySelector<HTMLElement>('.orbit-label')!;
  const aboutLabel = stage.querySelector<HTMLElement>('.about-label')!;
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
    const detail = smooth(range(p, 0.82, 0.96));
    const sequenceDistance = Math.max(innerHeight * 2.6, 1);
    const leftStarFadeStart = PHILOSOPHY_ARC.start + 100 / sequenceDistance;
    const leftStarFadeEnd = leftStarFadeStart + 400 / sequenceDistance;
    const leftStarFadeProgress = range(p, leftStarFadeStart, leftStarFadeEnd);
    const leftStarOpacity =
      p < PHILOSOPHY_ARC.start
        ? 0
        : 1 - leftStarFadeProgress * leftStarFadeProgress;
    const aboutOffset = 100 * u * smooth(range(p, 0.49, 0.58));
    const heroOpacity = 1 - smooth(range(p, 0.4, 0.55));
    const titleOpacity = smooth(range(p, 0.54, 0.64));
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
    const leftStarY = lerp(
      start.y,
      height,
      smooth(range(p, PHILOSOPHY_ARC.start, PHILOSOPHY_ARC.end)),
    );
    const center = { x: circle.x + camera.x, y: circle.y + camera.y };
    const point = {
      x: arcPoint.x - 322 * u * pan,
      y:
        p < 0.035
          ? start.y * range(p, 0, 0.035)
          : arcPoint.y + 50 * u * drop + 104 * u * pan + aboutOffset,
    };
    const phase =
      p < 0.035
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
    canvas.dataset.point = `${point.x.toFixed(2)},${point.y.toFixed(2)}`;
    canvas.dataset.leftStarPoint = `${(start.x + camera.x).toFixed(2)},${leftStarY.toFixed(2)}`;
    canvas.dataset.leftStarOpacity = leftStarOpacity.toFixed(3);
    hero.dataset.scrollProgress = arc.toFixed(3);
    about.dataset.scrollProgress = range(p, 0.54, 1).toFixed(3);

    setPose(hero, 0, 0, heroOpacity);
    setPose(about, 0, 0, 1);
    hero.inert = heroOpacity < 0.01;
    about.inert = titleOpacity < 0.01;
    heroCopy.forEach((el) => setPose(el, camera.x, camera.y, 1));
    // The label follows the same point; its original diamond is hidden.
    orbitLabel.style.left = `${point.x - 115 * u}px`;
    orbitLabel.style.top = `${point.y + 10 * u}px`;
    // Let the travelling marker leave the composition instead of vanishing
    // when the pinned stage hands off to the next chapter.
    setPose(orbitLabel, 0, 0, 1 - smooth(range(p, 0.86, 0.97)));
    titleLines.forEach((el, index) => {
      setPose(
        el,
        (index === 0 ? 109 : -52) * u * (1 - pan),
        -32 * u * (1 - drop),
        titleOpacity,
      );
      el.style.filter = `blur(${((1 - titleOpacity) * 14).toFixed(2)}px)`;
      el.style.letterSpacing = `${((1 - titleOpacity) * 0.09).toFixed(4)}em`;
    });
    setPose(
      aboutLabel,
      lerp(point.x - 116 * u, 564 * u, pan) - 564 * u,
      lerp(point.y - 26 * u, 616 * u, pan) - 616 * u,
      titleOpacity,
    );
    setPose(copy, 100 * u * (1 - detail), 0, detail);
    copy.style.filter = `blur(${((1 - detail) * 8).toFixed(2)}px)`;

    ctx.clearRect(0, 0, width, height);
    const stroke = (opacity: number, drawPath: () => void, sparse = false) => {
      ctx.globalAlpha = opacity;
      ctx.strokeStyle = '#573c79';
      ctx.lineWidth = Math.max(0.65, u);
      ctx.setLineDash(sparse ? [4 * u, 9 * u] : [2 * u, 3 * u]);
      ctx.beginPath();
      drawPath();
      ctx.stroke();
    };
    // Frame 510: faint vertical guide; the circle begins exactly at its dot.
    stroke(
      0.22 * heroOpacity,
      () => {
        ctx.moveTo(start.x + camera.x, 0);
        ctx.lineTo(start.x + camera.x, height);
      },
      true,
    );
    // Keep the authored guide visible ahead of the point as in Frame 510.
    // This also preserves visual context while the headline leaves the stage.
    stroke(0.28, () =>
      ctx.arc(center.x, center.y, radius, startAngle, 0, true),
    );
    // Frame 514: the vertical guide grows top-to-bottom, then the very same
    // point continues below the arc. There is never a second moving dot.
    const guide = range(p, 0.49, 0.54);
    stroke(0.28, () => {
      ctx.moveTo(point.x, 0);
      ctx.lineTo(point.x, p < 0.54 ? point.y * guide : point.y);
    });
    const tangent = smooth(range(p, 0.48, 0.54)) * (1 - pan);
    stroke(
      0.18 * tangent,
      () => {
        ctx.moveTo(0, 300 * u);
        ctx.lineTo(width, 300 * u);
      },
      true,
    );
    // Frame 515: two diagonal rays plus the existing vertical ray, fading
    // toward the top. The circle and copy leave with the stage afterward.
    const rays = smooth(range(p, 0.82, 0.94));
    const gradient = ctx.createLinearGradient(0, 0, 0, point.y);
    gradient.addColorStop(0, 'rgba(29,29,29,0)');
    gradient.addColorStop(1, 'rgba(29,29,29,0.4)');
    ctx.globalAlpha = rays;
    ctx.strokeStyle = gradient;
    ctx.setLineDash([3 * u, 4 * u]);
    for (const direction of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(point.x, point.y);
      ctx.lineTo(point.x + direction * 655 * u, point.y - 539 * u);
      ctx.stroke();
    }
    ctx.setLineDash([]);
    ctx.globalAlpha = rays;
    ctx.strokeStyle = '#1d1d1d';
    ctx.beginPath();
    ctx.arc(point.x, point.y, 22 * u, 0, Math.PI * 2);
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
    // At the fork, the left point is fully solid. It holds for exactly 100px
    // of scroll, then completes its fade over a fixed 400px scroll distance.
    diamond(start.x + camera.x, leftStarY, '#a7a7a7', leftStarOpacity);
    diamond(
      point.x,
      point.y,
      p < 0.54 ? '#a7a7a7' : '#090909',
      1 - smooth(range(p, 0.94, 1)),
    );
    ctx.globalAlpha = 1;
  }
  function resize() {
    width = stage.clientWidth;
    height = stage.clientHeight;
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
    end: () => `+=${innerHeight * 2.6}`,
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
      scrub: 0.22,
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
  const observer = new ResizeObserver(resize);
  observer.observe(stage);
  // #about now lives inside the pinned stage; target its readable state,
  // not the absolute section's (shared) top edge.
  const goToAbout = () =>
    window.scrollTo({
      top: pin.start + (pin.end - pin.start) * 0.97,
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
    ctx.clearRect(0, 0, width, height);
  };
}

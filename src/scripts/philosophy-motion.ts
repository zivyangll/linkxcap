import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

const clamp = (value: number) => Math.max(0, Math.min(1, value));
const range = (value: number, start: number, end: number) =>
  clamp((value - start) / (end - start));
const smooth = (value: number) => value * value * (3 - 2 * value);
export const PHILOSOPHY_ARC = { start: 0.06, end: 0.54 };
// The opening's travelling node is an 8px square turned 45deg: 4px from its
// centre to each side, regardless of viewport width.
const OPENING_NODE_HALF_PX = 4;
// The opening rail fades to this colour at the bottom of its screen.
const OPENING_RAIL_END_COLOR = '#8c8a9e';

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
  const header = document.querySelector<HTMLElement>('.site-header');
  const hero = stage.querySelector<HTMLElement>('.hero')!;
  const about = stage.querySelector<HTMLElement>('.about')!;
  const heroCopy = Array.from(
    stage.querySelectorAll<HTMLElement>('.hero-title'),
  );
  const heroOrbit = stage.querySelector<HTMLElement>('.hero-orbit')!;
  const orbitLabel = stage.querySelector<HTMLElement>('.orbit-label')!;
  const aboutLabel = stage.querySelector<HTMLElement>('.about-label')!;
  const aboutArc = stage.querySelector<HTMLElement>('.about-arc')!;
  const titleLines = Array.from(
    stage.querySelectorAll<HTMLElement>('.about-title span'),
  );
  const copy = stage.querySelector<HTMLElement>('.about-copy')!;
  const zh = document.body.dataset.lang === 'zh';
  const styled = [
    hero,
    about,
    ...heroCopy,
    heroOrbit,
    orbitLabel,
    aboutLabel,
    aboutArc,
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
  // Poses are the 1920-wide Figma frames (zh 2001:501, en 2001:500):
  //   frame 2  hero: rail x 467.5, circle r 1173, node starts on the circle
  //            and travels to the purple "open signal" marker;
  //   frame 3  about label: node (959, 470.5), arc bottom and tangent y 359;
  //   frame 4  about title: the whole composition has risen by 284 and the
  //            node rests at (959, 186.5).
  // The circle's left edge is the rail: it touches x = railEnd.x at y =
  // circle.y with a vertical tangent, so rail and arc join without a corner.
  const R = 1173;
  const railX0 = 467.485;
  const circle = { x: railX0 + R, y: zh ? 107 : 37 };
  const startY = zh ? 185.485 : 122.485;
  const destination = zh
    ? { x: 765.485, y: 889.485 }
    : { x: 821.485, y: 877.485 };
  const railEnd = { x: railX0 };
  // The one route the node follows: straight down the rail to the tangent
  // point, then along the circle.
  const onRoute = (y: number) => ({
    x:
      y <= circle.y
        ? railEnd.x
        : circle.x - Math.sqrt(R * R - (y - circle.y) ** 2),
    y,
  });
  const angleAt = (x: number, y: number) =>
    Math.atan2(y - circle.y, x - circle.x);
  const startX = circle.x - Math.sqrt(R * R - (startY - circle.y) ** 2);
  const startAngle = angleAt(startX, startY);
  const node3 = { x: 959, y: 470.5 };
  const node4 = { x: 959, y: 186.5 };
  const RISE = node3.y - node4.y;
  function draw() {
    if (!ctx || !width || !height) return;
    const p = progress.value;
    // Past 1920px the page stops scaling (CSS --u is capped at 1px) and the
    // scene is centred in at most 2200px, so the canvas must do the same or
    // its rail and arc drift away from the DOM's.
    const u = Math.min(1, width / 1920);
    const ox = Math.max(0, (width - 2200) / 2);
    const arc = smooth(range(p, PHILOSOPHY_ARC.start, PHILOSOPHY_ARC.end));
    const heroExit = smooth(range(p, 0.54, 0.66));
    const toFrame3 = smooth(range(p, 0.54, 0.72));
    const aboutIn = smooth(range(p, 0.6, 0.66));
    // The rail is already there when the node enters from the top.
    const railIn = smooth(range(p, 0.54, 0.58));
    // Both ends of the label resolve last; it then holds until p 0.74 and is
    // gone before the title starts to appear, so the two never overlap.
    const labelSharp = smooth(range(p, 0.62, 0.72));
    const rise = smooth(range(p, 0.78, 0.88));
    const labelOut = smooth(range(p, 0.74, 0.79));
    const titleOpacity = smooth(range(p, 0.81, 0.87));
    const detail = smooth(range(p, 0.87, 0.93));
    // Frame 4 is the last pose of the stage: the node stays where it is drawn
    // (no sideways trip to the research axis) and leaves with the page.
    const horizontalHandoff = 0;
    const verticalHandoff = 0;
    const heroOpacity = 1 - heroExit;
    // The hero is already complete while the stage scrolls in, so there is
    // never an empty screen between the opening and frame 2.
    const heroCopyEntrance = 1;
    const heroCopyOpacity = heroCopyEntrance * heroOpacity;
    const railActivation = smooth(range(p, 0.08, 0.68));
    const rayActivation = detail;
    // The node slides along the arc through the "open signal" marker and out
    // of the bottom of the screen; the frame 3 node then comes down the rail
    // from the top, so the route reads as one continuous line.
    const bottomY = height / u + 24;
    const endAngle =
      Math.PI - Math.asin(Math.min(0.995, (bottomY - circle.y) / R));
    const angle = lerp(startAngle, endAngle, arc);
    // Lead-in: the opening's node ends centred on the seam, where the page
    // clips it to its upper half. The stage draws the matching lower half
    // from its own top edge, so the two read as one diamond, which then slides
    // down the rail to the start of the arc.
    const lead = smooth(range(p, 0, PHILOSOPHY_ARC.start));
    const leadPoint = onRoute(lerp(0, startY, lead));
    const heroNode =
      arc > 0
        ? {
            x: (circle.x + Math.cos(angle) * R) * u,
            y: (circle.y + Math.sin(angle) * R) * u,
          }
        : { x: leadPoint.x * u, y: leadPoint.y * u };
    const heroNodeSize = lerp(OPENING_NODE_HALF_PX / u, 6, lead);
    const frame3Node = {
      x: node3.x * u,
      y: lerp(-24 * u, node3.y * u, toFrame3) - RISE * u * rise,
    };
    const rawNode = p < 0.54 ? heroNode : frame3Node;
    const junctionX = rawNode.x;
    const junctionY = rawNode.y;
    const point = {
      x: junctionX,
      y: junctionY,
    };
    const nodeColor = '#000';
    const nodeOpacity = 1 - smooth(range(p, 0.99, 1));
    const hasTravellingNode = verticalHandoff > 0 && nodeOpacity > 0;
    const phase =
      p < PHILOSOPHY_ARC.start
        ? 'lead-in'
        : p < 0.54
          ? 'arc'
          : p < 0.72
            ? 'drop'
            : p < 0.88
              ? 'pan'
              : 'details';
    stage.dataset.motionPhase = phase;
    stage.dataset.motionProgress = p.toFixed(4);
    stage.dataset.guideProgress = aboutIn.toFixed(3);
    stage.dataset.ringProgress = detail.toFixed(3);
    stage.dataset.researchHandoff = verticalHandoff.toFixed(3);
    stage.dataset.horizontalHandoff = horizontalHandoff.toFixed(3);
    canvas.dataset.point = `${(point.x + ox).toFixed(2)},${point.y.toFixed(2)}`;
    canvas.dataset.junctionPoint = `${(junctionX + ox).toFixed(2)},${junctionY.toFixed(2)}`;
    canvas.dataset.markerShape = 'diamond';
    canvas.dataset.markerCount = hasTravellingNode ? '2' : '1';
    canvas.dataset.guideStyle = 'gradient-dashed';
    canvas.dataset.guideDash = '4,4';
    canvas.dataset.trailBaseColor = '#c9c9c9';
    canvas.dataset.trailActiveColor = '#573c79';
    canvas.dataset.trailProgress = arc.toFixed(3);
    canvas.dataset.nodeActivation = '1.000';
    canvas.dataset.nodeOpacity = nodeOpacity.toFixed(3);
    canvas.dataset.nodeColor = nodeColor;
    canvas.dataset.branchMarkerOpacity = '0.000';
    canvas.dataset.branchActivation = toFrame3.toFixed(3);
    canvas.dataset.railActivation = railActivation.toFixed(3);
    canvas.dataset.rayActivation = rayActivation.toFixed(3);
    hero.dataset.scrollProgress = arc.toFixed(3);
    about.dataset.scrollProgress = range(p, 0.54, 1).toFixed(3);

    setPose(hero, 0, 0, heroOpacity);
    setPose(about, 0, 0, 1);
    hero.inert = heroOpacity < 0.01;
    about.inert = titleOpacity < 0.01;
    // The hero copy rests on its frame position and lifts away with the arc.
    heroCopy.forEach((el) => {
      setPose(
        el,
        0,
        18 * u * (1 - heroCopyEntrance) - 36 * u * heroExit,
        heroCopyOpacity,
      );
      el.style.filter = `blur(${((1 - heroCopyEntrance) * 10).toFixed(2)}px)`;
    });
    // "open signal" sits beside its marker on the arc for the whole approach.
    setPose(orbitLabel, 0, 0, heroOpacity);
    heroOrbit.style.opacity = String(heroOpacity);
    // Frame 3: the blurred headline pair rises with the composition.
    setPose(aboutLabel, 0, -RISE * u * rise, aboutIn * (1 - labelOut));
    aboutLabel.style.setProperty(
      '--label-sharp',
      (labelSharp * 1.3).toFixed(3),
    );
    aboutLabel.style.setProperty('--label-soft', (1 - labelSharp).toFixed(3));
    aboutArc.style.opacity = String(aboutIn * (1 - rise));
    aboutArc.style.transform = `rotate(180deg) translate3d(0,${(RISE * u * rise).toFixed(3)}px,0)`;
    titleLines.forEach((el) => {
      setPose(el, 0, 20 * u * (1 - titleOpacity), titleOpacity);
      el.style.filter = `blur(${((1 - titleOpacity) * 14).toFixed(2)}px)`;
      el.style.letterSpacing = `${(-0.05 + (1 - titleOpacity) * 0.14).toFixed(4)}em`;
    });
    setPose(copy, 0, 0, detail);
    copy.style.filter = `blur(${((1 - detail) * 8).toFixed(2)}px)`;

    ctx.clearRect(0, 0, width, height);
    ctx.save();
    ctx.translate(ox, 0);
    const stroke = (
      opacity: number,
      drawPath: () => void,
      dash: number[],
      color: string | CanvasGradient = '#573c79',
    ) => {
      ctx.globalAlpha = opacity;
      ctx.strokeStyle = color;
      ctx.lineWidth = Math.max(0.75, 0.9 * u);
      ctx.setLineDash(dash.map((n) => n * u));
      ctx.beginPath();
      drawPath();
      ctx.stroke();
    };
    // Frame 2: the pale circle from its tangent point to where the node sets
    // off, then the travelled purple arc. The rail above the tangent point is
    // drawn separately below.
    const railX = railEnd.x * u;
    stroke(
      0.58 * heroOpacity,
      () =>
        ctx.arc(circle.x * u, circle.y * u, R * u, Math.PI, startAngle, true),
      [3, 8],
      '#c9c9c9',
    );
    // The rail from the seam to the arc's tangent point continues the
    // opening's line (same dash, same end colour); a pale one would all but
    // vanish between the opening's rail and the orbit's dashes.
    stroke(
      heroOpacity,
      () => {
        ctx.moveTo(railX, 0);
        ctx.lineTo(railX, circle.y * u);
      },
      [4, 4],
      OPENING_RAIL_END_COLOR,
    );
    // Figma 2014:1162 Vector 30: a faint straight rail on x 468 from y 70,
    // 1080 long, black to #9d9d9d from y 214.6, dashed 4 / 4 at 20%. It grows
    // down from its top while the node rides the arc.
    const heroRailGrow = smooth(range(p, PHILOSOPHY_ARC.start, 0.42));
    if (heroRailGrow > 0) {
      const top = 70 * u;
      const fade = ctx.createLinearGradient(0, 214.61 * u, 0, 1150 * u);
      fade.addColorStop(0, '#000');
      fade.addColorStop(1, '#9d9d9d');
      stroke(
        0.2 * heroOpacity,
        () => {
          ctx.moveTo(468 * u, top);
          ctx.lineTo(468 * u, top + 1080 * u * heroRailGrow);
        },
        [4, 4],
        fade,
      );
    }
    if (arc > 0) {
      stroke(
        0.96 * heroOpacity,
        () =>
          ctx.arc(circle.x * u, circle.y * u, R * u, startAngle, angle, true),
        [2, 4],
      );
    }
    const diamond = (
      x: number,
      y: number,
      color: string,
      opacity: number,
      size = 6,
    ) => {
      ctx.save();
      ctx.globalAlpha = opacity;
      ctx.fillStyle = color;
      ctx.translate(x, y);
      ctx.rotate(Math.PI / 4);
      ctx.fillRect(-size * u, -size * u, 2 * size * u, 2 * size * u);
      ctx.restore();
    };
    diamond(destination.x * u, destination.y * u, nodeColor, heroOpacity);
    // Frame 3 and 4: the rail from above, the tangent and the black node.
    if (railIn > 0) {
      const gradient = ctx.createLinearGradient(
        0,
        junctionY - 539 * u,
        0,
        junctionY + 10 * u,
      );
      gradient.addColorStop(0, '#c7c7c7');
      gradient.addColorStop(1, '#000');
      stroke(
        railIn,
        () => {
          ctx.moveTo(junctionX, 0);
          ctx.lineTo(junctionX, junctionY);
        },
        [4, 4],
        gradient,
      );
      const tangent = ctx.createLinearGradient(257 * u, 0, width, 0);
      tangent.addColorStop(0, '#000');
      tangent.addColorStop(1, '#9d9d9d');
      stroke(
        0.2 * aboutIn * (1 - rise),
        () => {
          const y = (359 - RISE * rise) * u;
          ctx.moveTo(-ox, y);
          ctx.lineTo(width, y);
        },
        [4, 4],
        tangent,
      );
    }
    // The marker that has travelled becomes the black node of frames 3 / 4;
    // every node on the route is black.
    if (p < 0.54) {
      // The lead-in starts under the fixed header. A diamond half hidden by
      // it reads as a stray triangle, so the node only fades in as it clears
      // the header's lower edge.
      const headerEdge =
        (header?.getBoundingClientRect().bottom ?? 0) -
        stage.getBoundingClientRect().top;
      const clear = clamp(
        (heroNode.y - headerEdge) / (heroNodeSize * u * Math.SQRT2),
      );
      diamond(heroNode.x, heroNode.y, '#000', clear, heroNodeSize);
    } else {
      if (verticalHandoff > 0) diamond(junctionX, junctionY, '#000', 1);
      diamond(point.x, point.y, '#000', nodeOpacity);
    }
    ctx.globalAlpha = 1;
    ctx.restore();
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
        // The last screen leaves late: it fades only once most of it has
        // scrolled away, while the research screen is already coming in.
        start: () => pin.end + innerHeight * 0.55,
        end: () => pin.end + innerHeight * 0.95,
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
  // Until the pin starts nothing redraws on scroll, yet the lead-in node fades
  // with its distance below the header. Without this the fade freezes at
  // whatever it was when the stage was last scrolled back up, and the node
  // stays invisible while the opening still draws its half.
  const redrawWhileEntering = () => {
    if (progress.value > 0) return;
    if (stage.getBoundingClientRect().top > innerHeight) return;
    draw();
  };
  window.addEventListener('scroll', redrawWhileEntering, { passive: true });
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
    window.removeEventListener('scroll', redrawWhileEntering);
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

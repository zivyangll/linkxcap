import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

const phase = (p: number, from: number, to: number) =>
  Math.max(0, Math.min(1, (p - from) / (to - from)));
const smooth = (p: number) => p * p * (3 - 2 * p);
const lerp = (a: number, b: number, p: number) => a + (b - a) * p;

/** Phone-only poses from Figma 275:5492, 275:5555 and 275:5610. */
export function mountH5HomeSequence(home: HTMLElement) {
  const stage = home.querySelector<HTMLElement>('[data-philosophy-stage]')!;
  const opening = home.querySelector<HTMLElement>('.opening')!;
  const hero = stage.querySelector<HTMLElement>('.hero')!;
  const north = stage.querySelector<HTMLElement>('.h5-north-star')!;
  const about = stage.querySelector<HTMLElement>('.about')!;
  const research = home.querySelector<HTMLElement>('.research')!;
  const focus = home.querySelector<HTMLElement>('.focus')!;
  const canvas = stage.querySelector<HTMLCanvasElement>('canvas')!;
  const openingCanvas = opening.querySelector<HTMLCanvasElement>('canvas')!;
  const ctx = canvas.getContext('2d');
  const openingCtx = openingCanvas.getContext('2d');
  if (!ctx || !openingCtx) return;

  const heroCopy = [
    ...hero.querySelectorAll<HTMLElement>('.hero-title, .h5-hero-title'),
  ];
  const heroArc = hero.querySelector<HTMLElement>('.h5-hero-arc')!;
  const heroGuides = [
    ...hero.querySelectorAll<HTMLElement>(
      '.h5-hero-guide, .h5-arc-markers, .h5-open-signal',
    ),
  ];
  const northArc = north.querySelector<HTMLElement>('.h5-bottom-arc')!;
  const northGuides = [
    ...north.querySelectorAll<HTMLElement>('.h5-drop-guide, .h5-tangent-guide'),
  ];
  const northLines = [...north.querySelectorAll<HTMLElement>('.h5-north-line')];
  const aboutLines = [
    ...about.querySelectorAll<HTMLElement>('.about-title span'),
  ];
  const aboutCopy = about.querySelector<HTMLElement>('.about-copy')!;
  const aboutGuide = about.querySelector<HTMLElement>('.h5-about-guide')!;
  const aboutExit = about.querySelector<HTMLElement>('.h5-about-exit')!;
  const styled = [
    hero,
    north,
    about,
    ...heroCopy,
    heroArc,
    ...heroGuides,
    northArc,
    ...northGuides,
    ...northLines,
    ...aboutLines,
    aboutCopy,
    aboutGuide,
    aboutExit,
  ];
  const originalStyles = styled.map((el) => el.getAttribute('style'));
  const progress = { value: 0 };
  const openingProgress = { value: 0 };
  let width = 0,
    height = 0,
    openingHeight = 0,
    unit = 0,
    inset = 0,
    openingRail = 0,
    openingStart = 0.362;
  let disposed = false;
  home.removeAttribute('data-mobile-static');
  home.classList.add('has-mobile-motion', 'has-h5-sequence');

  const pose = (el: HTMLElement, y: number, opacity: number) => {
    el.style.transform = `translate3d(0,${y.toFixed(3)}px,0)`;
    el.style.opacity = String(opacity);
  };
  const diamond = (
    context: CanvasRenderingContext2D,
    x: number,
    y: number,
    half: number,
  ) => {
    context.save();
    context.translate(x, y);
    context.rotate(Math.PI / 4);
    context.fillStyle = '#000';
    context.fillRect(-half, -half, half * 2, half * 2);
    context.restore();
  };
  const drawOpening = () => {
    const start = openingHeight * openingStart;
    const y = lerp(start, openingHeight, openingProgress.value);
    openingCtx.clearRect(0, 0, width, openingHeight);
    openingCtx.lineWidth = 1;
    openingCtx.setLineDash([3, 5]);
    openingCtx.beginPath();
    openingCtx.moveTo(openingRail, start);
    openingCtx.lineTo(openingRail, openingHeight);
    openingCtx.strokeStyle = 'rgba(87,60,121,.18)';
    openingCtx.stroke();
    openingCtx.beginPath();
    openingCtx.moveTo(openingRail, start);
    openingCtx.lineTo(openingRail, y);
    openingCtx.strokeStyle = 'rgba(87,60,121,.95)';
    openingCtx.stroke();
    diamond(openingCtx, openingRail, y, 3.5);
    openingCanvas.dataset.point = `${openingRail.toFixed(2)},${y.toFixed(2)}`;
    openingCanvas.dataset.trailProgress = openingProgress.value.toFixed(3);
    openingCanvas.dataset.trailBaseColor = 'rgba(87,60,121,.18)';
    openingCanvas.dataset.trailActiveColor = 'rgba(87,60,121,.95)';
  };

  const draw = () => {
    if (!unit || !height) return;
    const p = progress.value;
    const incoming = smooth(
      phase(
        height - stage.getBoundingClientRect().top,
        height * 0.12,
        height * 0.7,
      ),
    );
    const heroOut = smooth(phase(p, 0.3, 0.42));
    const arcCamera = smooth(phase(p, 0.3, 0.46));
    const radius = 1173 * unit;
    const originalCircle = { x: inset + 1216 * unit, y: 510 * unit };
    const circle = {
      x: lerp(originalCircle.x, width / 2, arcCamera),
      y: lerp(originalCircle.y, -614 * unit, arcCamera),
    };
    const startAngle = Math.atan2(78.485, 44.485 - 1216);
    const signalAngle = Math.atan2(782.485, 341.485 - 1216);
    const arcProgress = smooth(phase(p, 0.08, 0.28));
    const angle =
      p <= 0.3
        ? lerp(startAngle, signalAngle, arcProgress)
        : lerp(signalAngle, Math.PI / 2, smooth(phase(p, 0.3, 0.46)));
    const cameraY = height * smooth(phase(p, 0.68, 0.86));
    const excess = Math.max(0, about.offsetHeight - height);
    const copyPan = excess * smooth(phase(p, 0.91, 0.98));
    const panY = cameraY + copyPan;
    let point: { x: number; y: number };
    let worldY: number;
    if (p < 0.08) {
      const lead = smooth(phase(p, 0, 0.08));
      const y = 588.485 * unit * lead;
      const joinY =
        originalCircle.y -
        Math.sqrt(
          Math.max(0, radius ** 2 - (originalCircle.x - openingRail) ** 2),
        );
      point = {
        x:
          y <= joinY
            ? openingRail
            : originalCircle.x -
              Math.sqrt(Math.max(0, radius ** 2 - (y - originalCircle.y) ** 2)),
        y,
      };
      worldY = y;
    } else if (p < 0.46) {
      point = {
        x: circle.x + Math.cos(angle) * radius,
        y: circle.y + Math.sin(angle) * radius,
      };
      worldY = point.y;
    } else {
      worldY =
        p < 0.66
          ? lerp(559 * unit, 670.485 * unit, smooth(phase(p, 0.46, 0.59)))
          : lerp(
              670.485 * unit,
              height + 462.485 * unit,
              smooth(phase(p, 0.66, 0.86)),
            );
      point = { x: width / 2, y: worldY - panY };
    }

    heroCopy.forEach((el) => {
      pose(
        el,
        -120 * unit * heroOut + 24 * (1 - incoming),
        incoming * (1 - heroOut),
      );
      el.style.filter = `blur(${8 * (1 - incoming)}px)`;
    });
    heroArc.style.translate = `${circle.x - originalCircle.x}px ${circle.y - originalCircle.y}px`;
    heroArc.style.opacity = String(1 - smooth(phase(p, 0.42, 0.46)));
    heroGuides.forEach((el) => (el.style.opacity = String(1 - heroOut)));
    pose(north, -panY, 1);
    northArc.style.opacity = String(
      smooth(phase(p, 0.4, 0.46)) * (1 - smooth(phase(p, 0.7, 0.8))),
    );
    northGuides.forEach(
      (el) =>
        (el.style.opacity = String(
          smooth(phase(p, 0.4, 0.46)) * (1 - smooth(phase(p, 0.66, 0.72))),
        )),
    );
    northLines.forEach((el, i) => {
      // Keep the outgoing words below their node while the next screen enters.
      // The same gap in both Figma poses prevents the falling node crossing type.
      el.style.translate = `0 ${p >= 0.66 ? Math.max(0, worldY - 670.485 * unit) : 0}px`;
      el.style.opacity = String(
        smooth(phase(p, 0.42 + i * 0.025, 0.54 + i * 0.025)) *
          (1 - smooth(phase(p, 0.7, 0.79))),
      );
      el.style.setProperty(
        '--h5-label-sharp',
        String(smooth(phase(p, 0.46 + i * 0.03, 0.63 + i * 0.02))),
      );
    });
    pose(about, height - panY, 1);
    const titleIn = smooth(phase(p, 0.72, 0.85));
    aboutLines.forEach((el) => {
      pose(el, 20 * unit * (1 - titleIn), titleIn);
      el.style.filter = `blur(${10 * unit * (1 - titleIn)}px)`;
    });
    const details = smooth(phase(p, 0.79, 0.9));
    pose(aboutCopy, 16 * unit * (1 - details), details);
    aboutCopy.style.filter = `blur(${4 * unit * (1 - details)}px)`;
    aboutGuide.style.opacity = String(smooth(phase(p, 0.74, 0.86)));
    aboutExit.style.opacity = String(details);

    ctx.clearRect(0, 0, width, height);
    ctx.lineWidth = 1;
    ctx.setLineDash([2 * unit, 4 * unit]);
    if (p >= 0.66 && p < 0.86) {
      // The camera moves to the next screen; the node's world Y always grows.
      // Only this connecting segment is drawn dynamically. Figma supplies the
      // static arc, tangent and gradient rails in each settled pose.
      const gradient = ctx.createLinearGradient(
        0,
        -panY,
        0,
        Math.max(1, point.y),
      );
      gradient.addColorStop(0, 'rgba(0,0,0,0)');
      gradient.addColorStop(1, 'rgba(0,0,0,.5)');
      ctx.strokeStyle = gradient;
      ctx.beginPath();
      ctx.moveTo(width / 2, 559 * unit - panY);
      ctx.lineTo(width / 2, point.y);
      ctx.stroke();
    } else if (p < 0.08) {
      ctx.strokeStyle = 'rgba(87,60,121,.4)';
      ctx.beginPath();
      ctx.moveTo(openingRail, 0);
      ctx.lineTo(point.x, point.y);
      ctx.stroke();
    }
    ctx.setLineDash([]);
    diamond(
      ctx,
      point.x,
      point.y,
      p < 0.08 ? lerp(3.5, 6 * unit, smooth(phase(p, 0, 0.08))) : 6 * unit,
    );

    stage.dataset.motionProgress = p.toFixed(4);
    stage.dataset.motionPhase =
      p < 0.08
        ? 'lead-in'
        : p < 0.46
          ? 'arc'
          : p < 0.66
            ? 'drop'
            : p < 0.86
              ? 'pan'
              : 'details';
    stage.dataset.cameraY = panY.toFixed(2);
    canvas.dataset.point = `${point.x.toFixed(2)},${point.y.toFixed(2)}`;
    canvas.dataset.worldPoint = `${point.x.toFixed(2)},${worldY.toFixed(2)}`;
    canvas.dataset.arcBottom = `${circle.x.toFixed(2)},${(circle.y + radius).toFixed(2)}`;
    canvas.dataset.markerCount = '1';
    canvas.dataset.nodeColor = '#000';
    canvas.dataset.nodeOpacity = '1.000';
    canvas.dataset.nodeActivation = '1.000';
    canvas.dataset.branchMarkerOpacity = '0.000';
    canvas.dataset.trailProgress = phase(p, 0.08, 0.46).toFixed(3);
    hero.inert = p > 0.42;
    about.inert = titleIn < 0.01;
    north.inert = p < 0.4 || p > 0.8;
  };

  const pinOptions = (element: HTMLElement, distance: number) => ({
    trigger: element,
    start: () =>
      element.clientHeight > innerHeight + 1 ? 'bottom bottom' : 'top top',
    end: () => `+=${element.clientHeight * distance}`,
    pin: true,
    anticipatePin: 1,
    invalidateOnRefresh: true,
  });
  const resize = () => {
    width = stage.clientWidth;
    height = stage.clientHeight;
    unit = Math.min(width, 640) / 750;
    inset = Math.max(0, (width - 640) / 2);
    openingHeight = opening.clientHeight;
    const style = getComputedStyle(opening);
    openingRail = parseFloat(style.paddingLeft) - 24;
    openingStart =
      parseFloat(style.getPropertyValue('--h5-trail-start')) || 0.362;
    const dpr = Math.min(devicePixelRatio || 1, 1.5);
    for (const [node, context, h] of [
      [canvas, ctx, height],
      [openingCanvas, openingCtx, openingHeight],
    ] as const) {
      node.width = Math.round(width * dpr);
      node.height = Math.round(h * dpr);
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    drawOpening();
    draw();
  };

  const openingTimeline = gsap.timeline({
    scrollTrigger: {
      ...pinOptions(opening, 0.65),
      id: 'mobile-opening',
      scrub: 0.28,
    },
  });
  openingTimeline.to(
    openingProgress,
    { value: 1, duration: 1, ease: 'none', onUpdate: drawOpening },
    0,
  );
  const timeline = gsap.timeline({
    scrollTrigger: {
      ...pinOptions(stage, 4),
      id: 'mobile-philosophy',
      scrub: 0.28,
      onRefresh: () => resize(),
    },
  });
  timeline.to(
    progress,
    { value: 1, duration: 1, ease: 'none', onUpdate: draw },
    0,
  );
  ScrollTrigger.create({
    id: 'mobile-hero-entrance',
    trigger: stage,
    start: 'top 88%',
    end: 'top 30%',
    onUpdate: draw,
    onRefresh: draw,
  });
  resize();

  // Preserve the following research/focus chapters' existing touch reveals.
  const researchTimeline = gsap.timeline({
    scrollTrigger: {
      ...pinOptions(research, 0.8),
      id: 'mobile-research',
      scrub: 0.28,
    },
  });
  researchTimeline
    .fromTo(
      research.querySelectorAll('h2,.research-intro'),
      { opacity: 0.35, y: 16 },
      { opacity: 1, y: 0, duration: 0.3, stagger: 0.08 },
      0,
    )
    .fromTo(
      research.querySelectorAll('.research-stats > div'),
      { opacity: 0.15, y: 28 },
      { opacity: 1, y: 0, duration: 0.32, stagger: 0.1, ease: 'power1.out' },
      0.15,
    )
    .fromTo(
      research.querySelector('.research-marker'),
      { rotation: -90 },
      { rotation: 0, duration: 0.8, ease: 'power1.out' },
      0,
    );
  gsap.fromTo(
    focus.querySelectorAll('.focus-title,.constellation,.focus-panels'),
    { opacity: 0.25, y: 24 },
    {
      opacity: 1,
      y: 0,
      stagger: 0.08,
      ease: 'power1.out',
      scrollTrigger: {
        trigger: focus,
        start: 'top 75%',
        end: 'top top',
        scrub: 0.28,
      },
    },
  );
  const observer = new ResizeObserver(resize);
  observer.observe(stage);
  observer.observe(opening);
  observer.observe(about);
  document.fonts.ready.then(() => {
    if (!disposed) ScrollTrigger.refresh();
  });
  const goToAbout = (behavior: ScrollBehavior = 'smooth') => {
    const trigger = timeline.scrollTrigger!;
    window.scrollTo({
      top: trigger.start + (trigger.end - trigger.start) * 0.9,
      behavior,
    });
  };
  const hashChange = () => {
    if (location.hash === '#about') goToAbout();
  };
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
    const oldURL = location.href;
    history.replaceState(null, '', '#about');
    window.dispatchEvent(
      new HashChangeEvent('hashchange', { oldURL, newURL: location.href }),
    );
  };
  home.addEventListener('click', navigate);
  window.addEventListener('hashchange', hashChange);
  const navigation = requestAnimationFrame(() => {
    if (location.hash === '#about') goToAbout('instant');
  });
  return () => {
    disposed = true;
    cancelAnimationFrame(navigation);
    observer.disconnect();
    home.removeEventListener('click', navigate);
    window.removeEventListener('hashchange', hashChange);
    styled.forEach((el, i) =>
      originalStyles[i] === null
        ? el.removeAttribute('style')
        : el.setAttribute('style', originalStyles[i]!),
    );
    home.classList.remove('has-mobile-motion', 'has-h5-sequence');
    home.setAttribute('data-mobile-static', 'true');
    hero.inert = about.inert = north.inert = false;
    delete stage.dataset.motionProgress;
    delete stage.dataset.motionPhase;
    delete stage.dataset.cameraY;
    for (const key of [
      'point',
      'worldPoint',
      'arcBottom',
      'markerCount',
      'nodeColor',
      'nodeOpacity',
      'nodeActivation',
      'branchMarkerOpacity',
      'trailProgress',
    ])
      delete canvas.dataset[key];
    ctx.clearRect(0, 0, width, height);
    openingCtx.clearRect(0, 0, width, openingHeight);
  };
}

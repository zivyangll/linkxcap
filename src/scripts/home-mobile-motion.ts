import { MOBILE_MOTION } from './motion-policy';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { mountH5HomeSequence } from './home-h5-sequence';

const clamp = (value: number) => Math.max(0, Math.min(1, value));
const phase = (value: number, from: number, to: number) =>
  clamp((value - from) / (to - from));
const smooth = (value: number) => value * value * (3 - 2 * value);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** Separate H5 owner: no changes to the desktop timeline or coordinates. */
export function mountMobileHomeMotion(home: HTMLElement) {
  const media = gsap.matchMedia();
  media.add(
    {
      phone: '(max-width: 767px) and (min-height: 600px)',
      portrait: '(min-height: 600px)',
      short: '(max-height: 599px)',
    },
    ({ conditions }) => {
      if (conditions?.phone) return mountH5HomeSequence(home);
      if (!conditions?.portrait) {
        // No overlaid scenes on landscape/short screens: each paragraph must
        // remain in normal flow until it has been read.
        home.dataset.mobileMotion = 'natural';
        home
          .querySelectorAll<HTMLElement>(
            '.hero [data-reveal], .about [data-reveal], .research [data-reveal]',
          )
          .forEach((element) =>
            gsap.fromTo(
              element,
              { opacity: 0.6, y: 12 },
              {
                opacity: 1,
                y: 0,
                ease: 'power1.out',
                scrollTrigger: {
                  trigger: element,
                  start: 'top 95%',
                  end: 'top 65%',
                  scrub: 0.2,
                },
              },
            ),
          );
        let disposed = false;
        document.fonts.ready.then(() => {
          if (!disposed) ScrollTrigger.refresh();
        });
        return () => {
          disposed = true;
          delete home.dataset.mobileMotion;
        };
      }
      const stage = home.querySelector<HTMLElement>('[data-philosophy-stage]')!;
      const hero = stage.querySelector<HTMLElement>('.hero')!;
      const about = stage.querySelector<HTMLElement>('.about')!;
      const opening = home.querySelector<HTMLElement>('.opening')!;
      const research = home.querySelector<HTMLElement>('.research')!;
      const focus = home.querySelector<HTMLElement>('.focus')!;
      const canvas = stage.querySelector<HTMLCanvasElement>('canvas')!;
      const openingCanvas = opening.querySelector<HTMLCanvasElement>(
        'canvas.scroll-trail',
      )!;
      const ctx = canvas.getContext('2d');
      const openingCtx = openingCanvas.getContext('2d');
      if (!ctx || !openingCtx) return;

      home.removeAttribute('data-mobile-static');
      home.classList.add('has-mobile-motion');
      const heroCopy = [...hero.querySelectorAll<HTMLElement>('.hero-title')];
      const orbitLabel = hero.querySelector<HTMLElement>('.orbit-label')!;
      const progress = { value: 0 };
      const openingProgress = { value: 0 };
      let disposed = false;
      let width = 0,
        height = 0,
        openingHeight = 0,
        aboutTitleTop = 0,
        rail = 24,
        openingRail = 24,
        openingStart = 0.3;
      const observers: ResizeObserver[] = [];
      // Oversized content first scrolls naturally, then holds at its bottom.
      // End distances use stable layout heights, not the mobile URL bar height.
      const pinOptions = (element: HTMLElement, distance: number) => ({
        trigger: element,
        start: () =>
          element.clientHeight > innerHeight + 1 ? 'bottom bottom' : 'top top',
        end: () => `+=${element.clientHeight * distance}`,
        pin: !!conditions?.portrait,
        anticipatePin: 1,
        invalidateOnRefresh: true,
      });
      const diamond = (
        context: CanvasRenderingContext2D,
        x: number,
        y: number,
        color = '#000',
      ) => {
        context.save();
        context.translate(x, y);
        context.rotate(Math.PI / 4);
        context.fillStyle = color;
        context.fillRect(-3.5, -3.5, 7, 7);
        context.restore();
      };
      const drawOpening = () => {
        openingCtx.clearRect(0, 0, width, openingHeight);
        const startY = openingHeight * openingStart;
        const y = lerp(startY, openingHeight, openingProgress.value);
        openingCtx.setLineDash([3, 5]);
        openingCtx.beginPath();
        openingCtx.moveTo(openingRail, startY);
        openingCtx.lineTo(openingRail, openingHeight);
        openingCtx.strokeStyle = 'rgba(87,60,121,.18)';
        openingCtx.stroke();
        openingCtx.beginPath();
        openingCtx.moveTo(openingRail, startY);
        openingCtx.lineTo(openingRail, y);
        openingCtx.strokeStyle = 'rgba(87,60,121,.95)';
        openingCtx.stroke();
        diamond(openingCtx, openingRail, y);
        openingCanvas.dataset.trailProgress = openingProgress.value.toFixed(3);
        openingCanvas.dataset.trailBaseColor = 'rgba(87,60,121,.18)';
        openingCanvas.dataset.trailActiveColor = 'rgba(87,60,121,.95)';
      };
      const draw = () => {
        const p = progress.value;
        const arc = smooth(phase(p, 0.04, 0.5));
        const drop = smooth(phase(p, 0.5, 0.66));
        const pan = smooth(phase(p, 0.66, 0.86));
        const handoff = smooth(phase(p, 0.92, 1));
        const branchActivation = smooth(phase(p, 0.5, 0.7));
        // As on PC, the line comes straight down from the opening's node and
        // then turns into the orbit: the circle's leftmost point sits on the
        // opening's rail at y 0.1h, with the radius the orbit always had.
        const radius = Math.hypot(width * 1.28 - rail, height * 0.06);
        const circle = { x: openingRail + radius, y: height * 0.1 };
        const start = {
          x: circle.x - Math.sqrt(radius ** 2 - (height * 0.06) ** 2),
          y: height * 0.16,
        };
        const startAngle = Math.atan2(start.y - circle.y, start.x - circle.x);
        const angle = lerp(startAngle, Math.PI / 2, arc);
        const tracked = {
          x: lerp(start.x, width * 0.65, arc),
          y: lerp(start.y, height * 0.38, arc),
        };
        // About settles the node on a right-hand rail mirroring the left one and
        // lifts the arc above the title, so no line crosses the long copy. Both
        // follow About when its excess copy pans up into the viewport.
        const panShift = width * 0.65 - (width - rail);
        const contentShift = Number(gsap.getProperty(about, 'y')) || 0;
        const arcLift = Math.max(
          height * 0.08,
          height * 0.38 - (aboutTitleTop - 28),
        );
        const camera = {
          x: tracked.x - (circle.x + Math.cos(angle) * radius) - panShift * pan,
          y:
            tracked.y -
            (circle.y + Math.sin(angle) * radius) -
            arcLift * pan +
            contentShift,
        };
        const junction = {
          x: tracked.x - panShift * pan,
          y: tracked.y + height * (0.06 * drop + 0.19 * pan) + contentShift,
        };
        // The opening's rail sits further right than this one, so the line
        // enters at the opening's x and eases onto this rail by start.y; the
        // bend straightens out as the node leaves along the arc.
        // Above the start: straight down the rail to the tangent point, then
        // along the circle. The bend straightens out as the node leaves.
        const routeX = (y: number) =>
          y <= circle.y
            ? openingRail
            : circle.x - Math.sqrt(radius ** 2 - (y - circle.y) ** 2);
        const railX = (y: number) =>
          y >= start.y
            ? junction.x
            : junction.x + (routeX(y) - start.x) * (1 - arc);
        const pointY =
          p < 0.04
            ? start.y * phase(p, 0, 0.04)
            : lerp(junction.y, height, handoff);
        const point = { x: railX(pointY), y: pointY };
        const strokeRail = (to: number) => {
          ctx.beginPath();
          ctx.moveTo(railX(0), 0);
          for (let y = 4; y < Math.min(to, start.y); y += 4)
            ctx.lineTo(railX(y), y);
          ctx.lineTo(railX(to), to);
          ctx.stroke();
        };
        const nodeOpacity = 1 - smooth(phase(p, 0.99, 1));
        const hasTravellingNode = handoff > 0 && nodeOpacity > 0;
        heroCopy.forEach((element) => {
          element.style.translate = `${(tracked.x - start.x).toFixed(2)}px 0`;
        });
        orbitLabel.style.left = `${point.x + 14}px`;
        orbitLabel.style.top = `${point.y + 14}px`;
        orbitLabel.style.opacity = String(1 - smooth(phase(p, 0.16, 0.34)));
        ctx.clearRect(0, 0, width, height);
        ctx.lineWidth = 1;
        ctx.setLineDash([2, 4]);
        ctx.beginPath();
        ctx.arc(
          circle.x + camera.x,
          circle.y + camera.y,
          radius,
          startAngle,
          0,
          true,
        );
        ctx.strokeStyle = 'rgba(87,60,121,.18)';
        ctx.stroke();
        if (arc > 0) {
          ctx.beginPath();
          ctx.arc(
            circle.x + camera.x,
            circle.y + camera.y,
            radius,
            startAngle,
            angle,
            true,
          );
          ctx.strokeStyle = 'rgba(87,60,121,.95)';
          ctx.stroke();
        }
        if (branchActivation > 0) {
          ctx.beginPath();
          ctx.arc(
            circle.x + camera.x,
            circle.y + camera.y,
            radius,
            startAngle,
            0,
            true,
          );
          ctx.strokeStyle = `rgba(87,60,121,${0.9 * branchActivation})`;
          ctx.stroke();
        }
        ctx.strokeStyle = 'rgba(87,60,121,.18)';
        strokeRail(height);
        ctx.strokeStyle = `rgba(87,60,121,${0.94 * smooth(phase(p, 0.06, 0.68))})`;
        strokeRail(point.y);
        ctx.globalAlpha = smooth(phase(p, 0.76, 0.92));
        ctx.strokeStyle = 'rgba(87,60,121,.92)';
        ctx.beginPath();
        ctx.moveTo(junction.x, junction.y);
        ctx.lineTo(junction.x + width, junction.y - height * 0.45);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.beginPath();
        ctx.arc(junction.x, junction.y, 13, 0, Math.PI * 2);
        ctx.stroke();
        // Keep the original purple marker in the ring and create a second
        // purple marker only for the downward handoff.
        const nodeColor = '#000';
        if (handoff > 0) {
          ctx.globalAlpha = 1;
          diamond(ctx, junction.x, junction.y, nodeColor);
        }
        ctx.globalAlpha = nodeOpacity;
        diamond(ctx, point.x, point.y, nodeColor);
        ctx.globalAlpha = 1;
        stage.dataset.motionProgress = p.toFixed(4);
        stage.dataset.motionPhase =
          p < 0.5 ? 'arc' : p < 0.66 ? 'drop' : p < 0.86 ? 'pan' : 'details';
        canvas.dataset.point = `${point.x.toFixed(2)},${point.y.toFixed(2)}`;
        canvas.dataset.junctionPoint = `${junction.x.toFixed(2)},${junction.y.toFixed(2)}`;
        canvas.dataset.markerCount = hasTravellingNode ? '2' : '1';
        canvas.dataset.trailProgress = arc.toFixed(3);
        canvas.dataset.trailBaseColor = 'rgba(87,60,121,.18)';
        canvas.dataset.trailActiveColor = 'rgba(87,60,121,.95)';
        canvas.dataset.nodeActivation = '1.000';
        canvas.dataset.nodeOpacity = nodeOpacity.toFixed(3);
        canvas.dataset.nodeColor = nodeColor;
        canvas.dataset.branchMarkerOpacity = '0.000';
        hero.inert = p > 0.5;
        about.inert = p < 0.62;
      };
      const resize = () => {
        width = stage.clientWidth;
        height = stage.clientHeight;
        openingHeight = opening.clientHeight;
        aboutTitleTop =
          about.querySelector('.about-title')!.getBoundingClientRect().top -
          stage.getBoundingClientRect().top -
          (Number(gsap.getProperty(about, 'y')) || 0);
        // Each screen keeps its own rail: the opening's sits further right
        // than the philosophy arc's (Figma x 125 vs 44).
        rail = parseFloat(getComputedStyle(hero).paddingLeft) - 24;
        const openingStyle = getComputedStyle(opening);
        openingRail = parseFloat(openingStyle.paddingLeft) - 24;
        openingStart =
          parseFloat(openingStyle.getPropertyValue('--h5-trail-start')) || 0.3;
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
      resize();

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

      // The hero copy resolves while the stage scrolls up into view, so the
      // hand-off from the opening never rests on an empty screen.
      gsap.fromTo(
        heroCopy,
        { opacity: 0, y: 24, filter: 'blur(8px)' },
        {
          opacity: 1,
          y: 0,
          filter: 'blur(0px)',
          ease: 'power1.out',
          scrollTrigger: {
            id: 'mobile-hero-entrance',
            trigger: stage,
            start: 'top 88%',
            end: 'top 30%',
            scrub: 0.28,
            invalidateOnRefresh: true,
          },
        },
      );

      // Both chapters occupy the same grid cell. One scrubbed timeline owns
      // the only dot and every reveal; reverse scrolling is deterministic.
      const timeline = gsap.timeline({
        scrollTrigger: {
          ...pinOptions(stage, 3),
          id: 'mobile-philosophy',
          scrub: 0.28,
          onRefresh: resize,
        },
      });
      timeline
        .to(
          progress,
          { value: 1, duration: 1, ease: 'none', onUpdate: draw },
          0,
        )
        .to(
          hero,
          { opacity: 0, x: 32, duration: 0.18, ease: 'power1.inOut' },
          0.44,
        )
        .fromTo(
          about.querySelector('.about-label'),
          { opacity: 0, y: 12 },
          { opacity: 1, y: 0, duration: 0.13 },
          0.62,
        )
        .fromTo(
          about.querySelectorAll('.about-title span'),
          { opacity: 0, y: 24, filter: 'blur(8px)' },
          {
            opacity: 1,
            y: 0,
            filter: 'blur(0px)',
            duration: 0.16,
            stagger: 0.05,
            ease: 'power1.out',
          },
          0.64,
        )
        .fromTo(
          about.querySelector('.about-copy'),
          { opacity: 0, y: 20, filter: 'blur(5px)' },
          {
            opacity: 1,
            y: 0,
            filter: 'blur(0px)',
            duration: 0.18,
            ease: 'power1.out',
          },
          0.7,
        )
        .to(
          about,
          {
            // Read the heading first, then pan only the excess copy into the
            // same viewport. Never shrink type to force long English text in.
            y: () => -Math.max(0, about.offsetHeight - stage.clientHeight),
            duration: 0.14,
            ease: 'power1.inOut',
            onUpdate: draw,
          },
          0.74,
        );

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
          {
            opacity: 1,
            y: 0,
            duration: 0.32,
            stagger: 0.1,
            ease: 'power1.out',
          },
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
      observers.push(observer);
      document.fonts.ready.then(() => {
        if (!disposed) ScrollTrigger.refresh();
      });

      const goToAbout = (behavior: ScrollBehavior = 'smooth') => {
        const trigger = timeline.scrollTrigger!;
        window.scrollTo({
          top: trigger.start + (trigger.end - trigger.start) * 0.97,
          behavior,
        });
      };
      const navigate = (event: MouseEvent) => {
        const link = (
          event.target as Element | null
        )?.closest<HTMLAnchorElement>('a[href="#about"]');
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
        // Keep the existing language-switch listener in sync as well.
        window.dispatchEvent(
          new HashChangeEvent('hashchange', { oldURL, newURL: location.href }),
        );
      };
      const hashChange = () => {
        if (location.hash === '#about') goToAbout();
      };
      home.addEventListener('click', navigate);
      window.addEventListener('hashchange', hashChange);
      const navigation = requestAnimationFrame(() => {
        if (location.hash === '#about') goToAbout('instant');
      });
      return () => {
        disposed = true;
        cancelAnimationFrame(navigation);
        home.removeEventListener('click', navigate);
        window.removeEventListener('hashchange', hashChange);
        observers.forEach((item) => item.disconnect());
        home.classList.remove('has-mobile-motion');
        home.setAttribute('data-mobile-static', 'true');
        hero.inert = about.inert = false;
        heroCopy.forEach((element) =>
          element.style.removeProperty('translate'),
        );
        orbitLabel.style.removeProperty('left');
        orbitLabel.style.removeProperty('top');
        orbitLabel.style.removeProperty('opacity');
        delete stage.dataset.motionProgress;
        delete stage.dataset.motionPhase;
        delete canvas.dataset.point;
        delete canvas.dataset.junctionPoint;
        delete canvas.dataset.markerCount;
        delete canvas.dataset.nodeActivation;
        delete canvas.dataset.nodeOpacity;
        delete canvas.dataset.nodeColor;
        delete canvas.dataset.branchMarkerOpacity;
        ctx.clearRect(0, 0, width, height);
        openingCtx.clearRect(0, 0, width, openingHeight);
      };
    },
  );
  return () => media.revert();
}

export function initH5HomeLayout() {
  const media = gsap.matchMedia();
  media.add('(max-width: 767px)', () => {
    const home = document.querySelector<HTMLElement>('[data-home]')!;
    const elements = document.querySelectorAll<HTMLElement>(
      '[data-home] [data-h5-only]',
    );
    home.classList.add('has-h5-layout');
    elements.forEach((element) => (element.hidden = false));
    return () => {
      elements.forEach((element) => (element.hidden = true));
      home.classList.remove('has-h5-layout');
    };
  });
  window.addEventListener('pagehide', () => media.revert(), { once: true });
}

export function initMobileHome() {
  gsap.registerPlugin(ScrollTrigger);
  const media = gsap.matchMedia();
  media.add(MOBILE_MOTION, () =>
    mountMobileHomeMotion(document.querySelector<HTMLElement>('[data-home]')!),
  );
  window.addEventListener('pagehide', () => media.revert(), { once: true });
}

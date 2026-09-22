import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

const clamp = (value: number) => Math.max(0, Math.min(1, value));
const phase = (value: number, from: number, to: number) =>
  clamp((value - from) / (to - from));
const smooth = (value: number) => value * value * (3 - 2 * value);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** Separate H5 owner: no changes to the desktop timeline or coordinates. */
export function mountMobileHomeMotion(home: HTMLElement) {
  const media = gsap.matchMedia();
  media.add(
    { portrait: '(min-height: 600px)', short: '(max-height: 599px)' },
    ({ conditions }) => {
      if (!conditions?.portrait) {
        // No overlaid scenes on landscape/short screens: each paragraph must
        // remain in normal flow until it has been read.
        home.dataset.mobileMotion = 'natural';
        home.querySelectorAll<HTMLElement>('[data-reveal]').forEach((element) =>
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
      const openingCanvas = opening.querySelector<HTMLCanvasElement>('canvas')!;
      const ctx = canvas.getContext('2d');
      const openingCtx = openingCanvas.getContext('2d');
      if (!ctx || !openingCtx) return;

      home.removeAttribute('data-mobile-static');
      home.classList.add('has-mobile-motion');
      const progress = { value: 0 };
      const openingProgress = { value: 0 };
      let disposed = false;
      let width = 0,
        height = 0,
        openingHeight = 0,
        rail = 24;
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
      ) => {
        context.save();
        context.translate(x, y);
        context.rotate(Math.PI / 4);
        context.fillStyle = '#573c79';
        context.fillRect(-3.5, -3.5, 7, 7);
        context.restore();
      };
      const drawOpening = () => {
        openingCtx.clearRect(0, 0, width, openingHeight);
        const y = lerp(
          openingHeight * 0.3,
          openingHeight,
          openingProgress.value,
        );
        openingCtx.strokeStyle = 'rgba(87,60,121,.42)';
        openingCtx.setLineDash([3, 5]);
        openingCtx.beginPath();
        openingCtx.moveTo(rail, openingHeight * 0.3);
        openingCtx.lineTo(rail, y);
        openingCtx.stroke();
        diamond(openingCtx, rail, y);
      };
      const draw = () => {
        const p = progress.value;
        const arc = smooth(phase(p, 0.04, 0.5));
        const drop = smooth(phase(p, 0.5, 0.66));
        const pan = smooth(phase(p, 0.66, 0.86));
        const start = { x: rail, y: height * 0.16 };
        const circle = { x: width * 1.28, y: height * 0.1 };
        const radius = Math.hypot(start.x - circle.x, start.y - circle.y);
        const startAngle = Math.atan2(start.y - circle.y, start.x - circle.x);
        const angle = lerp(startAngle, Math.PI / 2, arc);
        const tracked = {
          x: lerp(start.x, width * 0.65, arc),
          y: lerp(start.y, height * 0.38, arc),
        };
        const camera = {
          x:
            tracked.x -
            (circle.x + Math.cos(angle) * radius) -
            (width * 0.65 - rail) * pan,
          y:
            tracked.y -
            (circle.y + Math.sin(angle) * radius) -
            height * 0.08 * pan,
        };
        const point = {
          x: tracked.x - (width * 0.65 - rail) * pan,
          y:
            p < 0.04
              ? start.y * phase(p, 0, 0.04)
              : tracked.y + height * (0.06 * drop + 0.19 * pan),
        };
        ctx.clearRect(0, 0, width, height);
        ctx.strokeStyle = 'rgba(87,60,121,.3)';
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
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(point.x, 0);
        ctx.lineTo(point.x, point.y);
        ctx.stroke();
        ctx.globalAlpha = smooth(phase(p, 0.76, 0.92));
        ctx.beginPath();
        ctx.moveTo(point.x, point.y);
        ctx.lineTo(point.x + width, point.y - height * 0.45);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.beginPath();
        ctx.arc(point.x, point.y, 13, 0, Math.PI * 2);
        ctx.stroke();
        ctx.globalAlpha = 1;
        diamond(ctx, point.x, point.y);
        stage.dataset.motionProgress = p.toFixed(4);
        stage.dataset.motionPhase =
          p < 0.5 ? 'arc' : p < 0.66 ? 'drop' : p < 0.86 ? 'pan' : 'details';
        canvas.dataset.point = `${point.x.toFixed(2)},${point.y.toFixed(2)}`;
        hero.inert = p > 0.5;
        about.inert = p < 0.5;
      };
      const resize = () => {
        width = stage.clientWidth;
        height = stage.clientHeight;
        openingHeight = opening.clientHeight;
        rail = parseFloat(getComputedStyle(opening).paddingLeft) - 24;
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
      openingTimeline
        .to(
          openingProgress,
          { value: 1, duration: 1, ease: 'none', onUpdate: drawOpening },
          0,
        )
        .fromTo(
          opening.querySelectorAll('[data-reveal]'),
          { opacity: 0.35, y: 18 },
          {
            opacity: 1,
            y: 0,
            duration: 0.35,
            stagger: 0.08,
            ease: 'power1.out',
          },
          0,
        );

      // Both chapters occupy the same grid cell. One scrubbed timeline owns
      // the only dot and every reveal; reverse scrolling is deterministic.
      const timeline = gsap.timeline({
        scrollTrigger: {
          ...pinOptions(stage, 2.4),
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
          { opacity: 0, y: -32, duration: 0.17, ease: 'power1.inOut' },
          0.34,
        )
        .fromTo(
          about.querySelector('.about-label'),
          { opacity: 0, y: 12 },
          { opacity: 1, y: 0, duration: 0.13 },
          0.51,
        )
        .fromTo(
          about.querySelectorAll('.about-title span'),
          { opacity: 0, y: 24 },
          {
            opacity: 1,
            y: 0,
            duration: 0.16,
            stagger: 0.05,
            ease: 'power1.out',
          },
          0.52,
        )
        .fromTo(
          about.querySelector('.about-copy'),
          { opacity: 0, y: 20 },
          { opacity: 1, y: 0, duration: 0.18, ease: 'power1.out' },
          0.72,
        )
        .to(
          about,
          {
            // Read the heading first, then pan only the excess copy into the
            // same viewport. Never shrink type to force long English text in.
            y: () => -Math.max(0, about.offsetHeight - stage.clientHeight),
            duration: 0.14,
            ease: 'power1.inOut',
          },
          0.82,
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
        delete stage.dataset.motionProgress;
        delete stage.dataset.motionPhase;
        delete canvas.dataset.point;
        ctx.clearRect(0, 0, width, height);
        openingCtx.clearRect(0, 0, width, openingHeight);
      };
    },
  );
  return () => media.revert();
}

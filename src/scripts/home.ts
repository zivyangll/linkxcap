import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

export function initHome() {
  gsap.registerPlugin(ScrollTrigger);
  const media = gsap.matchMedia();
  // Figma provides static states. This choreography follows the meeting brief;
  // durations are scroll distances, not claimed Figma keyframe values.
  media.add(
    {
      desktop: '(min-width: 1024px)',
      motion: '(prefers-reduced-motion: no-preference)',
    },
    (context) => {
      if (!context.conditions?.motion) return;
      const desktop = context.conditions.desktop;
      const home = document.querySelector<HTMLElement>('[data-home]');
      const sharedOrbit = home?.querySelector<HTMLElement>('.philosophy-orbit');
      const heroTrail = home?.querySelector<HTMLCanvasElement>(
        '[data-scroll-trail="hero"]',
      );
      const scenes = Array.from(
        document.querySelectorAll<HTMLElement>('.story-scene'),
      );
      const cleanup: (() => void)[] = [];
      if (desktop && home && sharedOrbit)
        home.classList.add('has-shared-orbit');
      scenes.slice(0, 4).forEach((scene, index) => {
        const progress = { value: 0 };
        const canvas =
          index === 1 && desktop && heroTrail
            ? heroTrail
            : scene.querySelector<HTMLCanvasElement>('[data-scroll-trail]');
        const trail = canvas ? createScrollTrail(canvas) : null;
        if (trail) {
          cleanup.push(trail.destroy);
          scene.classList.add('has-scroll-trail');
        }
        const timeline = gsap.timeline({
          scrollTrigger: {
            id: `chapter-${index + 1}`,
            trigger: scene,
            start: desktop ? 'top top' : 'top 65%',
            end: () =>
              desktop
                ? `+=${
                    innerHeight *
                    (index === 1 ? 1.15 : index === 2 ? 1.05 : 0.7)
                  }`
                : 'bottom 30%',
            pin: !!desktop,
            scrub: 0.45,
            invalidateOnRefresh: true,
            onUpdate: (self) => {
              scene.dataset.scrollProgress = self.progress.toFixed(3);
            },
          },
        });
        timeline.to(
          progress,
          {
            value: 1,
            duration: 1,
            ease: 'none',
            onUpdate: () => trail?.draw(progress.value),
          },
          0,
        );
        const reveal = scene.querySelectorAll(
          index === 1 && desktop
            ? '[data-reveal]:not(.hero-title):not(.hero-zh)'
            : index === 2
              ? '[data-reveal]:not(.about-title):not(.about-copy)'
              : '[data-reveal]',
        );
        if (reveal.length)
          timeline.fromTo(
            reveal,
            { opacity: index === 0 ? 0.25 : 0, y: desktop ? 28 : 16 },
            {
              opacity: 1,
              y: 0,
              duration: 0.4,
              stagger: 0.07,
              ease: 'power1.out',
            },
            0,
          );
        if (index === 1) {
          if (desktop && sharedOrbit) {
            const unitX = () => scene.clientWidth / 1920;
            const unitY = () => scene.clientHeight / 1080;
            const heroCopy = scene.querySelectorAll(
              '.hero-title,.hero-zh,.orbit-label',
            );
            const heroForeground = scene.querySelectorAll(
              '.hero-title,.hero-zh,.orbit-label,.hero-track',
            );
            timeline.fromTo(
              sharedOrbit,
              {
                opacity: 1,
                clipPath: 'inset(0 100% 0 0)',
                x: 0,
                y: 0,
              },
              {
                opacity: 1,
                clipPath: 'inset(0 0% 0 0)',
                x: () => -690 * unitX(),
                y: () => -861 * unitY(),
                duration: 1,
                ease: 'none',
              },
              0,
            );
            if (heroTrail)
              timeline.fromTo(
                heroTrail,
                { opacity: 0 },
                { opacity: 1, duration: 0.08, ease: 'none' },
                0,
              );
            timeline.to(
              heroForeground,
              {
                x: () => -690 * unitX(),
                y: () => -861 * unitY(),
                duration: 1,
                ease: 'none',
              },
              0,
            );
            timeline.fromTo(
              heroCopy,
              { opacity: 0 },
              { opacity: 1, duration: 0.18, ease: 'power1.out' },
              0,
            );
            timeline.to(
              heroCopy,
              {
                opacity: 0,
                duration: 0.18,
                ease: 'power1.in',
              },
              0.82,
            );
          } else {
            timeline.fromTo(
              '.hero-orbit',
              { clipPath: 'inset(0 100% 0 0)' },
              { clipPath: 'inset(0 0% 0 0)', duration: 0.7, ease: 'none' },
              0,
            );
          }
        }
        if (index === 2) {
          const rays = scene.querySelector('.about-rays');
          const rayBeams = scene.querySelectorAll('.about-rays span');
          const ring = scene.querySelector('.about-ring');
          const dot = scene.querySelector('.about-rays .diamond');
          const dropLine = scene.querySelector('.about-drop-line');
          const label = scene.querySelector('.about-label');
          const titleLines = scene.querySelectorAll('.about-title span');
          const copy = scene.querySelector('.about-copy');
          if (desktop) {
            const unitX = () => scene.clientWidth / 1920;
            const unitY = () => scene.clientHeight / 1080;
            if (sharedOrbit)
              timeline.fromTo(
                sharedOrbit,
                {
                  opacity: 1,
                  x: () => -690 * unitX(),
                  y: () => -861 * unitY(),
                },
                {
                  opacity: 1,
                  x: () => -1011 * unitX(),
                  y: () => -1071 * unitY(),
                  duration: 0.92,
                  ease: 'none',
                  immediateRender: false,
                },
                0,
              );
            if (heroTrail)
              timeline.to(
                heroTrail,
                {
                  opacity: 0,
                  duration: 0.04,
                  ease: 'none',
                },
                0,
              );
            timeline.fromTo(
              rays,
              { x: () => 322 * unitX(), y: () => -100 * unitY() },
              { x: 0, y: 0, duration: 0.92, ease: 'none' },
              0,
            );
            timeline.set(rayBeams, { opacity: 0 }, 0);
            timeline.set(ring, { opacity: 0 }, 0);
            timeline.to(dot, { opacity: 1, duration: 0.04, ease: 'none' }, 0);
            timeline.set(
              titleLines,
              {
                opacity: 0,
                x: (line) => (line === 0 ? 109 : -52) * unitX(),
                y: () => 260 * unitY(),
                filter: (line) => `blur(${line === 0 ? 10 : 4}px)`,
              },
              0,
            );
            timeline.set(
              label,
              {
                opacity: 0,
                x: () => 279 * unitX(),
                y: () => 81 * unitY(),
              },
              0,
            );
            timeline.set(
              copy,
              { opacity: 0, x: () => 160 * unitX(), y: 28 },
              0,
            );
            timeline.set(dropLine, { scaleY: 0, opacity: 0 }, 0);
            timeline.to(
              dot,
              {
                y: () => 255 * unitY(),
                duration: 0.42,
                ease: 'power1.in',
              },
              0.08,
            );
            timeline.to(
              dropLine,
              { scaleY: 1, opacity: 1, duration: 0.42, ease: 'none' },
              0.08,
            );
            timeline.to(
              titleLines,
              {
                opacity: 1,
                x: 0,
                y: 0,
                filter: 'blur(0px)',
                duration: 0.38,
                stagger: 0.04,
                ease: 'power2.out',
              },
              0.12,
            );
            timeline.to(
              label,
              { opacity: 1, duration: 0.18, ease: 'power1.out' },
              0.4,
            );
            timeline.to(
              dot,
              { y: 0, duration: 0.34, ease: 'power2.out' },
              0.62,
            );
            timeline.to(
              dropLine,
              { scaleY: 0, opacity: 0, duration: 0.3, ease: 'power1.out' },
              0.62,
            );
            timeline.to(
              rayBeams,
              { opacity: 1, duration: 0.28, ease: 'power1.out' },
              0.62,
            );
            timeline.to(
              ring,
              { opacity: 1, duration: 0.2, ease: 'power1.out' },
              0.68,
            );
            timeline.to(
              label,
              { x: 0, y: 0, duration: 0.34, ease: 'power2.out' },
              0.62,
            );
            timeline.to(
              copy,
              {
                opacity: 1,
                x: 0,
                y: 0,
                duration: 0.26,
                ease: 'power2.out',
              },
              0.72,
            );
          } else {
            timeline.fromTo(
              scene.querySelectorAll('.about-title,.about-copy'),
              { opacity: 0, y: 20 },
              {
                opacity: 1,
                y: 0,
                duration: 0.42,
                stagger: 0.08,
                ease: 'power1.out',
              },
              0.2,
            );
            timeline.fromTo(
              dot,
              { y: -70 },
              { y: 0, duration: 0.6, ease: 'none' },
              0.08,
            );
          }
        }
        if (index === 3) {
          if (desktop && sharedOrbit)
            timeline.to(
              sharedOrbit,
              { opacity: 0, duration: 0.12, ease: 'none' },
              0,
            );
          timeline.fromTo(
            '.research-stats > div',
            { opacity: 0, y: 36, clipPath: 'inset(100% 0 0)' },
            {
              opacity: 1,
              y: 0,
              clipPath: 'inset(0% 0 0)',
              stagger: 0.09,
              duration: 0.22,
            },
            0.2,
          );
          timeline.fromTo(
            '.research-marker',
            { x: () => -innerWidth * 0.35, rotation: -90 },
            { x: 0, rotation: 0, duration: 0.7, ease: 'power2.out' },
            0,
          );
        }
      });
      document.fonts.ready.then(() => ScrollTrigger.refresh());
      return () => {
        cleanup.forEach((fn) => fn());
        home?.classList.remove('has-shared-orbit');
        scenes.forEach((s) => {
          s.classList.remove('has-scroll-trail');
          delete s.dataset.scrollProgress;
        });
      };
    },
  );
  window.addEventListener('pagehide', () => media.revert(), { once: true });
  window.addEventListener('pageshow', (event) => {
    if (event.persisted) location.reload();
  });
}

function createScrollTrail(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext('2d');
  let width = 0,
    height = 0,
    value = 0;
  const hero = canvas.dataset.scrollTrail?.startsWith('hero');
  const point = (t: number, cameraProgress = t) => {
    const mobile = width < 1024;
    if (!hero)
      return {
        x: mobile ? 28 : (width * 467) / 1920,
        y: (mobile ? height * 0.14 : (width * 480) / 1920) + t * height * 0.63,
      };
    // Follow the left, lower quadrant of the exported hero orbit.
    const cameraX = mobile ? 0 : (-690 * width * cameraProgress) / 1920;
    const cameraY = mobile ? 0 : (-861 * width * cameraProgress) / 1920;
    const cx = width * (mobile ? 1.3 : 1650 / 1920) + cameraX,
      cy = (width * 47) / 1920 + cameraY;
    const r = width * (mobile ? 1.22 : 1173 / 1920);
    // Start at Frame 510's guide point and reach the circle's bottom at the
    // second-to-third-screen handoff. The camera pan is applied separately.
    const angle = Math.PI - 0.046 - t * (Math.PI / 2 - 0.046);
    return { x: cx + Math.cos(angle) * r, y: cy + Math.sin(angle) * r };
  };
  const draw = (progress: number) => {
    value = progress;
    if (!ctx) return;
    ctx.clearRect(0, 0, width, height);
    ctx.beginPath();
    for (let i = 0; i <= 100; i++) {
      const p = point((progress * i) / 100, progress);
      i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y);
    }
    ctx.strokeStyle = 'rgba(87,60,121,.4)';
    ctx.lineWidth = 1;
    ctx.stroke();
    const p = point(progress, progress);
    canvas.dataset.point = `${p.x.toFixed(1)},${p.y.toFixed(1)}`;
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(Math.PI / 4);
    ctx.fillStyle = '#573c79';
    ctx.shadowColor = 'rgba(87,60,121,.35)';
    ctx.shadowBlur = 10;
    ctx.fillRect(-4, -4, 8, 8);
    ctx.restore();
  };
  const resize = new ResizeObserver(() => {
    const rect = canvas.getBoundingClientRect();
    width = rect.width;
    height = rect.height;
    const dpr = Math.min(devicePixelRatio, 1.5);
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    ctx?.setTransform(dpr, 0, 0, dpr, 0, 0);
    draw(value);
  });
  resize.observe(canvas);
  return {
    draw,
    destroy: () => {
      resize.disconnect();
      ctx?.clearRect(0, 0, width, height);
    },
  };
}

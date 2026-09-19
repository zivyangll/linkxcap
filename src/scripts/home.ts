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
      const scenes = Array.from(
        document.querySelectorAll<HTMLElement>('.story-scene'),
      );
      const cleanup: (() => void)[] = [];
      scenes.slice(0, 4).forEach((scene, index) => {
        const progress = { value: 0 };
        const canvas = scene.querySelector<HTMLCanvasElement>(
          '[data-scroll-trail]',
        );
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
                ? `+=${innerHeight * (index === 1 ? 1.15 : 0.7)}`
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
        const reveal = scene.querySelectorAll('[data-reveal]');
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
          timeline.fromTo(
            '.hero-orbit',
            { clipPath: 'inset(0 100% 0 0)' },
            { clipPath: 'inset(0 0% 0 0)', duration: 0.7, ease: 'none' },
            0,
          );
          if (desktop)
            timeline.to(
              scene.querySelectorAll('.hero-title,.hero-zh,.orbit-label'),
              {
                x: () => -innerWidth * 0.75,
                opacity: 0,
                duration: 0.27,
                ease: 'power1.in',
              },
              0.73,
            );
        }
        if (index === 2) {
          timeline.fromTo(
            scene.querySelectorAll('.about-title,.about-copy'),
            { x: () => (desktop ? innerWidth * 0.25 : 0) },
            { x: 0, duration: 0.48, ease: 'power2.out' },
            0,
          );
          timeline.fromTo(
            '.about-rays .diamond',
            { y: -170 },
            { y: 0, duration: 0.6, ease: 'none' },
            0.12,
          );
        }
        if (index === 3) {
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
  const hero = canvas.dataset.scrollTrail === 'hero';
  const point = (t: number) => {
    const mobile = width < 1024;
    if (!hero)
      return {
        x: mobile ? 28 : (width * 467) / 1920,
        y: (mobile ? height * 0.14 : (width * 480) / 1920) + t * height * 0.63,
      };
    // Follow the left, lower quadrant of the exported hero orbit.
    const cx = width * (mobile ? 1.3 : 1640 / 1920),
      cy = (width * 37) / 1920;
    const r = width * (mobile ? 1.22 : 1173 / 1920);
    const angle = Math.PI - t * 0.8;
    return { x: cx + Math.cos(angle) * r, y: cy + Math.sin(angle) * r };
  };
  const draw = (progress: number) => {
    value = progress;
    if (!ctx) return;
    ctx.clearRect(0, 0, width, height);
    ctx.beginPath();
    for (let i = 0; i <= 100; i++) {
      const p = point((progress * i) / 100);
      i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y);
    }
    ctx.strokeStyle = 'rgba(87,60,121,.4)';
    ctx.lineWidth = 1;
    ctx.stroke();
    const p = point(progress);
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

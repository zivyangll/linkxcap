import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { mountPhilosophyMotion } from './philosophy-motion';

export function initHome() {
  gsap.registerPlugin(ScrollTrigger);
  const media = gsap.matchMedia();
  media.add(
    {
      desktop: '(min-width: 1024px)',
      motion: '(prefers-reduced-motion: no-preference)',
    },
    (context) => {
      if (!context.conditions?.motion) return;
      const desktop = !!context.conditions.desktop;
      const home = document.querySelector<HTMLElement>('[data-home]')!;
      const scenes = Array.from(
        home.querySelectorAll<HTMLElement>('.story-scene'),
      );
      const cleanup: (() => void)[] = [];
      let openingTrail: ReturnType<typeof createScrollTrail> | null = null;
      let handoff = false;
      scenes.slice(0, 4).forEach((scene, index) => {
        // Frames 510, 514 and 515 share one pinned stage and one animation
        // owner. No chapter/handoff timeline can write their transforms.
        if (desktop && index === 1) {
          cleanup.push(
            mountPhilosophyMotion(home, (active) => {
              handoff = active;
              openingTrail?.redraw();
            }),
          );
          return;
        }
        if (desktop && index === 2) return;
        const canvas = scene.querySelector<HTMLCanvasElement>(
          '[data-scroll-trail]',
        );
        const trail = canvas
          ? createScrollTrail(
              canvas,
              index === 0 && desktop ? () => !handoff : undefined,
            )
          : null;
        if (trail) {
          cleanup.push(trail.destroy);
          scene.classList.add('has-scroll-trail');
          if (index === 0) openingTrail = trail;
        }
        const progress = { value: 0 };
        const timeline = gsap.timeline({
          scrollTrigger: {
            id: `chapter-${index + 1}`,
            trigger: scene,
            start: desktop ? 'top top' : 'top 65%',
            end: () => (desktop ? `+=${innerHeight * 0.7}` : 'bottom 30%'),
            pin: desktop,
            scrub: 0.3,
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
          index === 2
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
        if (index === 1)
          timeline.fromTo(
            '.hero-orbit',
            { clipPath: 'inset(0 100% 0 0)' },
            { clipPath: 'inset(0 0% 0 0)', duration: 0.7, ease: 'none' },
            0,
          );
        if (index === 2) {
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
            scene.querySelector('.about-rays .diamond'),
            { y: -70 },
            { y: 0, duration: 0.6, ease: 'none' },
            0.08,
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
      let disposed = false;
      document.fonts.ready.then(() => {
        if (!disposed) ScrollTrigger.refresh();
      });
      return () => {
        disposed = true;
        cleanup.forEach((fn) => fn());
        scenes.forEach((scene) => {
          scene.classList.remove('has-scroll-trail');
          delete scene.dataset.scrollProgress;
        });
      };
    },
  );
  window.addEventListener('pagehide', () => media.revert(), { once: true });
  window.addEventListener('pageshow', (event) => {
    if (event.persisted) location.reload();
  });
}

function createScrollTrail(
  canvas: HTMLCanvasElement,
  shouldDrawPoint: () => boolean = () => true,
) {
  const ctx = canvas.getContext('2d');
  let width = 0,
    height = 0,
    value = 0;
  const hero = canvas.dataset.scrollTrail?.startsWith('hero');
  const point = (t: number) => {
    if (!hero)
      return {
        x: width < 1024 ? 28 : (width * 467) / 1920,
        y:
          (width < 1024 ? height * 0.14 : (width * 480) / 1920) +
          t * height * 0.556,
      };
    // The mobile chapter uses its original natural-scroll arc.
    const angle = Math.PI - 0.046 - t * (Math.PI / 2 - 0.046);
    return {
      x: width * 1.3 + Math.cos(angle) * width * 1.22,
      y: (width * 47) / 1920 + Math.sin(angle) * width * 1.22,
    };
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
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, 'rgba(87,60,121,.95)');
    gradient.addColorStop(1, 'rgba(140,138,158,.58)');
    ctx.strokeStyle = hero ? 'rgba(87,60,121,.42)' : gradient;
    ctx.lineWidth = 1;
    const dashUnit = Math.max(0.75, width / 1920);
    ctx.setLineDash([4 * dashUnit, 4 * dashUnit]);
    ctx.stroke();
    ctx.setLineDash([]);
    const p = point(progress);
    canvas.dataset.point = `${p.x.toFixed(1)},${p.y.toFixed(1)}`;
    if (!shouldDrawPoint()) return;
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
    redraw: () => draw(value),
    destroy: () => {
      resize.disconnect();
      ctx?.clearRect(0, 0, width, height);
    },
  };
}

import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { mountPhilosophyMotion } from './philosophy-motion';
import { DESKTOP_MOTION } from './motion-policy';
import { mountChapterSnap } from './chapter-snap';

export function initHome() {
  gsap.registerPlugin(ScrollTrigger);
  const media = gsap.matchMedia();
  media.add(DESKTOP_MOTION, () => {
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
      if (index === 1) {
        cleanup.push(
          mountPhilosophyMotion(home, (active) => {
            handoff = active;
            openingTrail?.redraw();
          }),
        );
        return;
      }
      if (index === 2) return;
      const canvas = scene.querySelector<HTMLCanvasElement>(
        '[data-scroll-trail]',
      );
      const trail = canvas
        ? createScrollTrail(canvas, index === 0 ? () => !handoff : undefined)
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
          start: 'top top',
          end: () => `+=${innerHeight * 0.7}`,
          pin: true,
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
      const reveal = scene.querySelectorAll('[data-reveal]');
      // The opening has a CSS entrance on initial paint, independent of scroll.
      if (reveal.length && index !== 0)
        timeline.fromTo(
          reveal,
          { opacity: 0, y: 28, filter: 'blur(12px)' },
          {
            opacity: 1,
            y: 0,
            filter: 'blur(0px)',
            duration: 0.4,
            stagger: 0.07,
            ease: 'power1.out',
          },
          0,
        );
      if (index === 3) {
        timeline.fromTo(
          '.research-stats > div',
          { opacity: 0, y: 36 },
          {
            opacity: 1,
            y: 0,
            stagger: 0.09,
            duration: 0.22,
          },
          0.2,
        );
        timeline.fromTo(
          '.research-marker',
          { opacity: 0, scale: 0.92, transformOrigin: 'center' },
          {
            opacity: 1,
            scale: 1,
            duration: 0.28,
            ease: 'power1.out',
          },
          0.18,
        );
      }
    });
    cleanup.push(mountChapterSnap(home));
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
  });
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
  const point = (t: number) => ({
    x: (width * 467) / 1920,
    y: (width * 480) / 1920 + t * height * 0.556,
  });
  const draw = (progress: number) => {
    value = progress;
    if (!ctx) return;
    ctx.clearRect(0, 0, width, height);

    const dashUnit = Math.max(0.75, width / 1920);
    ctx.lineWidth = 1;
    ctx.setLineDash([4 * dashUnit, 4 * dashUnit]);

    // The whole route exists from the first frame as a quiet guide. The
    // travelling node then "activates" the section it has already crossed.
    // Drawing both states on the same canvas prevents the static Figma asset
    // from making the untouched part look active too early.
    const origin = point(0);
    const end = point(1);
    ctx.beginPath();
    ctx.moveTo(origin.x, origin.y);
    ctx.lineTo(end.x, end.y);
    ctx.strokeStyle = 'rgba(87,60,121,.18)';
    ctx.stroke();

    ctx.beginPath();
    for (let i = 0; i <= 100; i++) {
      const p = point((progress * i) / 100);
      i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y);
    }
    ctx.strokeStyle = 'rgba(87,60,121,.95)';
    ctx.stroke();
    ctx.setLineDash([]);
    const p = point(progress);
    canvas.dataset.point = `${p.x.toFixed(1)},${p.y.toFixed(1)}`;
    canvas.dataset.trailProgress = progress.toFixed(3);
    canvas.dataset.trailBaseColor = 'rgba(87,60,121,.18)';
    canvas.dataset.trailActiveColor = 'rgba(87,60,121,.95)';
    canvas.dataset.nodeColor = '#573c79';
    if (!shouldDrawPoint()) return;
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(Math.PI / 4);
    ctx.fillStyle = '#573c79';
    ctx.shadowColor = 'rgba(90,90,90,.22)';
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

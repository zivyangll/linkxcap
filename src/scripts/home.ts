import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { mountPhilosophyMotion } from './philosophy-motion';
import { DESKTOP_MOTION } from './motion-policy';
import { mountChapterSnap } from './chapter-snap';

// Independent of chapter motion: one fixed backdrop, hidden and paused in Focus.
// Reduced motion keeps the first frame still on desktop and touch screens.
export function initHomeParticles() {
  const canvas = document.querySelector<HTMLCanvasElement>(
    '[data-home-particles]',
  );
  const layer = document.querySelector<HTMLElement>(
    '[data-home-particles-layer]',
  );
  const opening = document.querySelector<HTMLElement>('.opening');
  const focus = document.querySelector<HTMLElement>('#focus');
  const header = document.querySelector<HTMLElement>('[data-header]');
  if (!canvas || !layer || !opening || !focus) return;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const lifetime = new AbortController();
  let effect: {
    play: () => void;
    pause: () => void;
    destroy: () => void;
  } | null = null;
  let playing = false;
  let focusBoundary = 0;
  const syncVisibility = () => {
    // The star map covers the background as it enters; hide the whole field
    // when it reaches the reading area below the fixed header.
    layer.hidden = focus.getBoundingClientRect().top <= focusBoundary;
    const next = !layer.hidden && !reduced.matches;
    if (!effect || next === playing) return;
    playing = next;
    if (playing) effect.play();
    else effect.pause();
  };
  const resize = () => {
    // Anchor links stop at scroll-padding-top rather than the viewport edge.
    focusBoundary =
      Math.max(
        header?.offsetHeight ?? 0,
        parseFloat(
          getComputedStyle(document.documentElement).scrollPaddingTop,
        ) || 0,
      ) + 1;
    // Preserve the opening frame's existing desktop placement without tying
    // the field to its scrolling/pinned parent. Only layout size changes it.
    const bounds = opening.getBoundingClientRect();
    const unit = Math.min(innerWidth / 1920, 1);
    layer.style.setProperty(
      '--particle-left',
      `${bounds.left + bounds.width * 0.24375}px`,
    );
    layer.style.setProperty(
      '--particle-top',
      `${opening.clientHeight * 0.4416 + 6 * unit}px`,
    );
    syncVisibility();
  };
  const observer = new ResizeObserver(resize);
  observer.observe(opening);
  resize();
  window.addEventListener('scroll', syncVisibility, {
    passive: true,
    signal: lifetime.signal,
  });
  window.addEventListener('resize', resize, { signal: lifetime.signal });
  window.addEventListener('pageshow', resize, { signal: lifetime.signal });
  reduced.addEventListener('change', syncVisibility, {
    signal: lifetime.signal,
  });
  Promise.all([
    import('./particle-motion'),
    // Ambience only: queue behind everything the first screen needs.
    fetch(canvas.dataset.src || '', {
      priority: 'low',
      signal: lifetime.signal,
    }).then((response) => {
      if (!response.ok) throw new Error('Particle data is unavailable');
      return response.arrayBuffer();
    }),
  ])
    .then(([{ createParticleMotion }, buffer]) => {
      if (lifetime.signal.aborted) return;
      // 5 bytes per sample: x/y as uint16 (1/10000 of the frame), grey as uint8.
      const view = new DataView(buffer);
      const count = Math.floor(buffer.byteLength / 5);
      const data = new Uint16Array(count * 3);
      for (let i = 0; i < count; i++) {
        data[i * 3] = view.getUint16(i * 5, true);
        data[i * 3 + 1] = view.getUint16(i * 5 + 2, true);
        data[i * 3 + 2] = view.getUint8(i * 5 + 4);
      }
      document.body.classList.add('has-home-particles');
      effect = createParticleMotion(canvas, data, {
        color: '#202020',
        maxDpr: 1.5,
        autoplay: false,
      });
      syncVisibility();
    })
    .catch(() => {
      document.body.classList.remove('has-home-particles');
      // Keep the original paper texture if the optional particle field fails.
    });
  window.addEventListener('pagehide', (event) => {
    if (event.persisted) return;
    lifetime.abort();
    observer.disconnect();
    effect?.destroy();
  });
}

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
      // The research screen is shown as it scrolls in (before its pin starts),
      // so the page never rests on an empty screen.
      if (index === 3) {
        const entrance = gsap.timeline({
          scrollTrigger: {
            id: 'chapter-4-entrance',
            trigger: scene,
            start: 'top 92%',
            end: 'top 8%',
            scrub: 0.3,
            invalidateOnRefresh: true,
          },
        });
        if (reveal.length)
          entrance.fromTo(
            reveal,
            { opacity: 0, y: 28, filter: 'blur(12px)' },
            {
              opacity: 1,
              y: 0,
              filter: 'blur(0px)',
              duration: 0.5,
              stagger: 0.06,
              ease: 'power1.out',
            },
            0,
          );
        entrance.fromTo(
          '.research-stats > div',
          { opacity: 0, y: 36 },
          { opacity: 1, y: 0, stagger: 0.08, duration: 0.3 },
          0.2,
        );
        entrance.fromTo(
          '.research-marker',
          { opacity: 0, scale: 0.92, transformOrigin: 'center' },
          { opacity: 1, scale: 1, duration: 0.3, ease: 'power1.out' },
          0.15,
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
  const header = document.querySelector<HTMLElement>('.site-header');
  let width = 0,
    height = 0,
    value = 0;
  // Same scale as the CSS: --u stops growing at 1px past 1920px.
  const unit = () => Math.min(1, width / 1920);
  const point = (t: number) => ({
    // The travelling node starts exactly on the static diamond (Figma centre
    // 467.485, 485.5) and ends where the rail ends at y 1080.
    x: 467.485 * unit(),
    y: 485.5 * unit() + t * (height - 485.5 * unit()),
  });
  const draw = (progress: number) => {
    value = progress;
    if (!ctx) return;
    ctx.clearRect(0, 0, width, height);

    const dashUnit = Math.max(0.75, unit());
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
    // Figma 272:791: the rail is #573C79 down to y 569 and fades to #8C8A9E.
    const rail = ctx.createLinearGradient(0, 569 * unit(), 0, 1080 * unit());
    rail.addColorStop(0, '#573c79');
    rail.addColorStop(1, '#8c8a9e');
    ctx.strokeStyle = rail;
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
    canvas.dataset.trailBaseColor = 'linear-gradient(#573c79,#8c8a9e)';
    canvas.dataset.trailActiveColor = 'rgba(87,60,121,.95)';
    canvas.dataset.nodeColor = '#000';
    if (!shouldDrawPoint()) return;
    // Under the fixed header the node fades the same way the stage's half does
    // (see philosophy-motion), so the two halves of the seam diamond always
    // appear and vanish together and never leave a lone triangle.
    const clear = Math.max(
      0,
      Math.min(
        1,
        (canvas.getBoundingClientRect().top +
          p.y -
          (header?.getBoundingClientRect().bottom ?? 0)) /
          (4 * Math.SQRT2),
      ),
    );
    if (clear <= 0) return;
    ctx.save();
    ctx.globalAlpha = clear;
    ctx.translate(p.x, p.y);
    ctx.rotate(Math.PI / 4);
    ctx.fillStyle = '#000';
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
  // The node's fade depends on where the canvas sits under the header, which
  // changes on every scroll even after the trail's own progress has finished.
  const redrawNearHeader = () => {
    const { top, bottom } = canvas.getBoundingClientRect();
    if (bottom < 0 || top > innerHeight) return;
    draw(value);
  };
  window.addEventListener('scroll', redrawNearHeader, { passive: true });
  return {
    draw,
    redraw: () => draw(value),
    destroy: () => {
      window.removeEventListener('scroll', redrawNearHeader);
      resize.disconnect();
      ctx?.clearRect(0, 0, width, height);
    },
  };
}

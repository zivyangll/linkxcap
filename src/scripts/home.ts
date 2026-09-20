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
      let openingTrail: ReturnType<typeof createScrollTrail> | null = null;
      if (desktop && home && sharedOrbit)
        home.classList.add('has-shared-orbit');
      scenes.slice(0, 4).forEach((scene, index) => {
        const progress = { value: 0 };
        const orbitLabel =
          index === 1 && desktop
            ? scene.querySelector<HTMLElement>('.orbit-label')
            : null;
        const followHeroPoint = orbitLabel
          ? (point: { x: number; y: number }) => {
              const unit = scene.clientWidth / 1920;
              const sceneRect = scene.getBoundingClientRect();
              orbitLabel.style.left = `${point.x - sceneRect.left - 115 * unit}px`;
              orbitLabel.style.top = `${point.y - sceneRect.top - 1.485 * unit}px`;
            }
          : undefined;
        const canvas =
          index === 1 && desktop && heroTrail
            ? heroTrail
            : scene.querySelector<HTMLCanvasElement>('[data-scroll-trail]');
        const trail = canvas
          ? createScrollTrail(
              canvas,
              followHeroPoint,
              index === 1 && desktop
                ? () => {
                    const rect = scene.getBoundingClientRect();
                    return { x: rect.left, y: rect.top };
                  }
                : undefined,
              index === 0 && desktop
                ? () => !home?.classList.contains('is-hero-handoff')
                : undefined,
            )
          : null;
        if (trail) {
          cleanup.push(trail.destroy);
          scene.classList.add('has-scroll-trail');
          if (index === 0) openingTrail = trail;
        }
        if (orbitLabel)
          cleanup.push(() => {
            orbitLabel.style.removeProperty('left');
            orbitLabel.style.removeProperty('top');
          });
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
              if (index === 1)
                home?.classList.toggle(
                  'is-about-active',
                  self.progress >= 0.999,
                );
              if (index === 2 && self.progress > 0)
                home?.classList.add('is-about-active');
              if (index === 2)
                scene.dataset.motionPhase =
                  self.progress < 0.46
                    ? 'pan-left'
                    : self.progress < 0.7
                      ? 'focus'
                      : 'details';
            },
            onEnter: () => {
              if (index === 2) home?.classList.add('is-about-active');
            },
            onEnterBack: () => {
              if (index === 1) home?.classList.remove('is-about-active');
              if (index === 2) home?.classList.add('is-about-active');
            },
            onLeave: () => {
              if (index === 1) home?.classList.add('is-about-active');
            },
            onLeaveBack: () => {
              if (index === 2) home?.classList.remove('is-about-active');
            },
          },
        });
        timeline.to(
          progress,
          {
            value: 1,
            duration: 1,
            ease: 'none',
            onUpdate: () => {
              if (!(index === 1 && desktop)) trail?.draw(progress.value);
            },
          },
          0,
        );
        if (index === 1 && desktop && trail) {
          const setHandoffActive = (active: boolean) => {
            home?.classList.toggle('is-hero-handoff', active);
            openingTrail?.redraw();
          };
          const handoff = ScrollTrigger.create({
            id: 'hero-handoff',
            trigger: scene,
            start: 'top 90%',
            end: () => `+=${innerHeight * 2.05}`,
            scrub: 0.45,
            invalidateOnRefresh: true,
            onUpdate: (self) => {
              scene.dataset.handoffProgress = self.progress.toFixed(3);
              trail.draw(self.progress);
              setHandoffActive(self.progress > 0);
            },
            onEnter: () => setHandoffActive(true),
            onEnterBack: () => setHandoffActive(true),
            onLeaveBack: () => setHandoffActive(false),
          });
          cleanup.push(() => handoff.kill());
        }
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
            const heroCopy = scene.querySelectorAll('.hero-title,.hero-zh');
            const heroForeground = scene.querySelectorAll(
              '.hero-title,.hero-zh,.hero-track',
            );
            timeline.fromTo(
              sharedOrbit,
              {
                opacity: 0,
                clipPath: 'inset(0 100% 0 0)',
                x: 0,
                y: 0,
              },
              {
                opacity: 0,
                clipPath: 'inset(0 0% 0 0)',
                x: () => -690 * unitX(),
                y: () => -861 * unitY(),
                duration: 1,
                ease: 'none',
              },
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
            timeline.set(orbitLabel, { opacity: 1 }, 0);
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
            timeline.to(
              orbitLabel,
              { opacity: 0, duration: 0.18, ease: 'power1.in' },
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
          const tangentLine = scene.querySelector('.about-tangent-line');
          const label = scene.querySelector('.about-label');
          const titleLines = scene.querySelectorAll('.about-title span');
          const copy = scene.querySelector('.about-copy');
          if (desktop) {
            const unitX = () => scene.clientWidth / 1920;
            const unitY = () => scene.clientHeight / 1080;
            const focusOffset = () => 255 * unitY();
            gsap.set(rays, {
              x: () => 322 * unitX(),
              y: () => -1680 * unitY(),
            });
            gsap.set(dot, { opacity: 0, y: 0 });
            gsap.set(dropLine, { scaleY: 0, opacity: 0 });
            gsap.set(titleLines, {
              opacity: 0,
              x: (line) => (line === 0 ? 109 : -52) * unitX(),
              y: () => -1450 * unitY(),
              filter: (line) => `blur(${line === 0 ? 10 : 4}px)`,
            });
            const aboutHandoff = gsap.timeline({
              scrollTrigger: {
                id: 'about-handoff',
                trigger: scene,
                start: 'top 90%',
                end: 'top top',
                scrub: 0.45,
                invalidateOnRefresh: true,
                onUpdate: (self) => {
                  scene.dataset.handoffProgress = self.progress.toFixed(3);
                  scene.dataset.motionPhase =
                    self.progress < 0.18 ? 'line-drop' : 'point-drop';
                  if (self.progress > 0) home?.classList.add('is-about-active');
                },
                onEnter: () => home?.classList.add('is-about-active'),
                onEnterBack: () => home?.classList.add('is-about-active'),
                onLeaveBack: () => {
                  home?.classList.remove('is-about-active');
                  if (sharedOrbit) gsap.set(sharedOrbit, { opacity: 0 });
                },
              },
            });
            cleanup.push(() => aboutHandoff.kill());
            if (sharedOrbit)
              aboutHandoff.fromTo(
                sharedOrbit,
                {
                  opacity: 1,
                  x: () => -690 * unitX(),
                  y: () => -861 * unitY(),
                },
                {
                  opacity: 1,
                  x: () => -690 * unitX(),
                  y: () => -861 * unitY(),
                  duration: 1,
                  ease: 'none',
                  immediateRender: false,
                },
                0,
              );
            aboutHandoff.fromTo(
              rays,
              {
                x: () => 322 * unitX(),
                y: () => -1680 * unitY(),
              },
              {
                x: () => 322 * unitX(),
                y: () => -100 * unitY(),
                duration: 1,
                ease: 'none',
                immediateRender: false,
              },
              0,
            );
            aboutHandoff.fromTo(
              dot,
              { opacity: 0, y: 0 },
              {
                opacity: 1,
                y: () => 255 * unitY(),
                duration: 0.82,
                ease: 'none',
                immediateRender: false,
              },
              0.18,
            );
            aboutHandoff.fromTo(
              dropLine,
              { scaleY: 0, opacity: 0 },
              {
                scaleY: 1,
                opacity: 1,
                duration: 0.82,
                ease: 'none',
                immediateRender: false,
              },
              0.18,
            );
            aboutHandoff.fromTo(
              titleLines,
              {
                opacity: 0,
                x: (line) => (line === 0 ? 109 : -52) * unitX(),
                y: () => -1450 * unitY(),
                filter: (line) => `blur(${line === 0 ? 10 : 4}px)`,
              },
              {
                y: () => 260 * unitY(),
                filter: 'blur(0px)',
                duration: 0.82,
                ease: 'none',
                immediateRender: false,
              },
              0.18,
            );
            aboutHandoff.to(
              titleLines,
              {
                opacity: 1,
                duration: 0.58,
                ease: 'power1.inOut',
              },
              0.3,
            );
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
                  duration: 0.46,
                  ease: 'none',
                  immediateRender: false,
                },
                0,
              );
            timeline.fromTo(
              rays,
              { x: () => 322 * unitX(), y: () => -100 * unitY() },
              {
                x: 0,
                y: () => -255 * unitY(),
                duration: 0.46,
                ease: 'power1.inOut',
                immediateRender: false,
              },
              0,
            );
            timeline.fromTo(
              tangentLine,
              { opacity: 1 },
              {
                opacity: 0,
                duration: 0.18,
                ease: 'none',
                immediateRender: false,
              },
              0.32,
            );
            timeline.set(rayBeams, { opacity: 0, y: focusOffset }, 0);
            timeline.set(ring, { opacity: 0, y: focusOffset }, 0);
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
            timeline.fromTo(
              titleLines,
              {
                opacity: 1,
                x: (line) => (line === 0 ? 109 : -52) * unitX(),
                y: () => 260 * unitY(),
                filter: 'blur(0px)',
              },
              {
                opacity: 1,
                x: 0,
                y: 0,
                filter: 'blur(0px)',
                duration: 0.46,
                ease: 'power1.inOut',
                immediateRender: false,
              },
              0,
            );
            timeline.to(
              label,
              {
                opacity: 1,
                x: 0,
                y: 0,
                duration: 0.16,
                ease: 'power2.out',
              },
              0.58,
            );
            timeline.to(
              rayBeams,
              { opacity: 1, duration: 0.12, ease: 'power1.out' },
              0.6,
            );
            timeline.to(
              ring,
              { opacity: 1, duration: 0.1, ease: 'power1.out' },
              0.62,
            );
            timeline.to(
              copy,
              {
                opacity: 1,
                x: 0,
                y: 0,
                duration: 0.16,
                ease: 'power2.out',
              },
              0.7,
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
          if (desktop && sharedOrbit) {
            const unitX = () => scene.clientWidth / 1920;
            const unitY = () => scene.clientHeight / 1080;
            const researchHandoff = gsap.timeline({
              scrollTrigger: {
                id: 'research-handoff',
                trigger: scene,
                start: 'top 90%',
                end: 'top top',
                scrub: 0.45,
                invalidateOnRefresh: true,
                onUpdate: (self) => {
                  scene.dataset.handoffProgress = self.progress.toFixed(3);
                },
              },
            });
            researchHandoff.fromTo(
              sharedOrbit,
              {
                opacity: 1,
                x: () => -1011 * unitX(),
                y: () => -1071 * unitY(),
              },
              {
                opacity: 1,
                x: () => -1011 * unitX(),
                y: () => -2151 * unitY(),
                duration: 1,
                ease: 'none',
                immediateRender: false,
              },
              0,
            );
            cleanup.push(() => researchHandoff.kill());
            timeline.fromTo(
              sharedOrbit,
              {
                opacity: 1,
                x: () => -1011 * unitX(),
                y: () => -2151 * unitY(),
              },
              {
                opacity: 0,
                x: () => -1011 * unitX(),
                y: () => -2151 * unitY(),
                duration: 0.12,
                ease: 'none',
                immediateRender: false,
              },
              0,
            );
          }
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
        home?.classList.remove(
          'has-shared-orbit',
          'is-about-active',
          'is-hero-handoff',
        );
        scenes.forEach((s) => {
          s.classList.remove('has-scroll-trail');
          delete s.dataset.scrollProgress;
          delete s.dataset.motionPhase;
          delete s.dataset.handoffProgress;
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
  pointFollower?: (point: { x: number; y: number }) => void,
  viewportOffset?: () => { x: number; y: number },
  shouldDrawPoint?: () => boolean,
) {
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
        y: (mobile ? height * 0.14 : (width * 480) / 1920) + t * height * 0.556,
      };
    const offset = viewportOffset?.() ?? { x: 0, y: 0 };
    // Follow the left, lower quadrant of the exported hero orbit.
    const cameraX =
      offset.x + (mobile ? 0 : (-690 * width * cameraProgress) / 1920);
    const cameraY =
      offset.y + (mobile ? 0 : (-861 * width * cameraProgress) / 1920);
    const guidePoint = {
      x: (width * 467.485) / 1920 + cameraX,
      y: (width * 99.485) / 1920 + cameraY,
    };
    if (!mobile) {
      const verticalLead = 0.08;
      if (t <= verticalLead) {
        const lineProgress = t / verticalLead;
        return {
          x: guidePoint.x,
          y: offset.y + (guidePoint.y - offset.y) * lineProgress,
        };
      }
      t = (t - verticalLead) / (1 - verticalLead);
    }
    // Frame 510 has its own circle geometry. It is intentionally independent
    // from the larger shared orbit used by the following chapter.
    const cx = width * (mobile ? 1.3 : 1640 / 1920) + cameraX,
      cy = width * (mobile ? 47 / 1920 : 37 / 1920) + cameraY;
    const r = mobile
      ? width * 1.22
      : Math.hypot(guidePoint.x - cx, guidePoint.y - cy);
    if (!mobile) {
      const startAngle = Math.atan2(guidePoint.y - cy, guidePoint.x - cx);
      const angle = startAngle + t * (Math.PI / 2 - startAngle);
      return {
        x: cx + Math.cos(angle) * r,
        y: cy + Math.sin(angle) * r,
      };
    }
    const angle = Math.PI - 0.046 - t * (Math.PI / 2 - 0.046);
    const orbitPoint = {
      x: cx + Math.cos(angle) * r,
      y: cy + Math.sin(angle) * r,
    };
    return orbitPoint;
  };
  const draw = (progress: number) => {
    value = progress;
    if (!ctx) return;
    ctx.clearRect(0, 0, width, height);
    const cameraProgress =
      hero && width >= 1024
        ? Math.max(0, Math.min(1, (progress - 0.45) / 0.55))
        : progress;
    ctx.beginPath();
    for (let i = 0; i <= 100; i++) {
      const p = point((progress * i) / 100, cameraProgress);
      i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y);
    }
    if (hero) {
      ctx.strokeStyle = 'rgba(87,60,121,.42)';
    } else {
      const lineGradient = ctx.createLinearGradient(0, 0, 0, height);
      lineGradient.addColorStop(0, 'rgba(87,60,121,.95)');
      lineGradient.addColorStop(1, 'rgba(140,138,158,.58)');
      ctx.strokeStyle = lineGradient;
    }
    ctx.lineWidth = 1;
    const dashUnit = Math.max(0.75, width / 1920);
    ctx.setLineDash([4 * dashUnit, 4 * dashUnit]);
    ctx.stroke();
    ctx.setLineDash([]);
    const p = point(progress, cameraProgress);
    canvas.dataset.point = `${p.x.toFixed(1)},${p.y.toFixed(1)}`;
    if (pointFollower) {
      pointFollower(p);
      return;
    }
    if (shouldDrawPoint && !shouldDrawPoint()) return;
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

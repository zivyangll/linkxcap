import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { createParticleField } from './particles';

export function initHome() {
  gsap.registerPlugin(ScrollTrigger);
  const media = gsap.matchMedia();
  // These timings implement the approved proposal. Figma has no keyframes.
  media.add('(prefers-reduced-motion: no-preference)', () => {
    const reveals = gsap.utils.toArray<HTMLElement>('[data-reveal]');
    for (const element of reveals) {
      if (element.getBoundingClientRect().top < innerHeight) continue;
      gsap.from(element, {
        y: 18,
        opacity: 0.3,
        duration: 0.7,
        ease: 'power2.out',
        scrollTrigger: { trigger: element, start: 'top 90%', once: true },
        clearProps: 'transform,opacity',
      });
    }
    const orbit = document.querySelector('.hero-orbit');
    if (orbit)
      gsap.to(orbit, {
        y: () => (innerWidth > 767 ? 70 : 20),
        ease: 'none',
        scrollTrigger: {
          trigger: '.hero',
          start: 'top bottom',
          end: 'bottom top',
          scrub: 1,
        },
      });
    gsap.fromTo(
      '.next-signal h2',
      { '--fill': 0 },
      {
        '--fill': 1,
        duration: 0.7,
        scrollTrigger: {
          trigger: '.next-signal',
          start: 'top 45%',
          once: true,
        },
      },
    );
  });
  const stars = document.querySelectorAll<HTMLButtonElement>('[data-sector]');
  const panels = document.querySelectorAll<HTMLElement>('[data-sector-panel]');
  const select = (id: string) => {
    stars.forEach((star) => {
      const active = star.dataset.sector === id;
      star.classList.toggle('is-active', active);
      star.setAttribute('aria-pressed', String(active));
    });
    panels.forEach((panel) => {
      const active = panel.dataset.sectorPanel === id;
      panel.style.display = active ? 'block' : 'none';
      panel.classList.toggle('is-active', active);
      if (active && !matchMedia('(prefers-reduced-motion:reduce)').matches)
        gsap.fromTo(
          panel,
          { opacity: 0.4, y: 8 },
          { opacity: 1, y: 0, duration: 0.3, clearProps: 'transform,opacity' },
        );
    });
    document
      .querySelectorAll<HTMLElement>('.satellite,.star-links')
      .forEach((el) => {
        el.style.opacity = id === 'foundation' ? '1' : '.12';
      });
  };
  stars.forEach((star) =>
    star.addEventListener('click', () => select(star.dataset.sector!)),
  );
  const canvas = document.querySelector<HTMLCanvasElement>('[data-particles]');
  const field = canvas ? createParticleField(canvas) : undefined;
  const toggle = document.querySelector<HTMLButtonElement>(
    '[data-motion-toggle]',
  );
  if (toggle && field) {
    toggle.addEventListener('click', () => {
      const paused = toggle.getAttribute('aria-pressed') !== 'true';
      toggle.setAttribute('aria-pressed', String(paused));
      toggle.textContent = paused
        ? toggle.dataset.resume!
        : toggle.dataset.pause!;
      field.pause(paused);
    });
  }
  window.addEventListener(
    'pagehide',
    () => {
      media.revert();
      field?.destroy();
    },
    { once: true },
  );
  // BFCache restores the document after teardown; create exactly one new field.
  window.addEventListener(
    'pageshow',
    (event) => {
      if (event.persisted) location.reload();
    },
    { once: true },
  );
}

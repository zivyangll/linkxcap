import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { DESKTOP_MOTION } from './motion-policy';
export function initFellow() {
  gsap.registerPlugin(ScrollTrigger);
  if (!document.querySelector('[data-fellow-media]')) return;
  const media = gsap.matchMedia();
  media.add(DESKTOP_MOTION, () => {
    const intro = document.querySelector('.fellow-intro')!;
    const desktop = matchMedia('(min-width:1024px)').matches;
    const openingVertical = [
      ...intro.querySelectorAll<HTMLElement>(
        '.signal-guides--opening .signal-guide-v',
      ),
    ].sort((a, b) => a.offsetLeft - b.offsetLeft);
    const openingHorizontal = [
      ...intro.querySelectorAll<HTMLElement>(
        '.signal-guides--opening .signal-guide-h',
      ),
    ].sort((a, b) => a.offsetTop - b.offsetTop);
    const openingEntrance = gsap.timeline({ paused: true });
    openingEntrance.fromTo(
      openingVertical,
      { clipPath: 'inset(0 0 100% 0)' },
      {
        clipPath: 'inset(0 0 0% 0)',
        duration: 0.5,
        stagger: 0.07,
        ease: 'power1.out',
      },
    );
    openingEntrance.fromTo(
      openingHorizontal,
      { clipPath: 'inset(0 100% 0 0)' },
      {
        clipPath: 'inset(0 0% 0 0)',
        duration: 0.42,
        stagger: 0.045,
        ease: 'power1.out',
      },
      '>-0.02',
    );
    openingEntrance.to(
      '.fellow-intro .next-orbit',
      { opacity: 1, duration: 0.2 },
      '>-0.08',
    );
    let openingForced = false;
    const finishOpeningEntrance = () => {
      if (openingEntrance.progress() >= 1) return;
      openingForced = true;
      openingEntrance.progress(1).pause();
    };
    // The outline-to-solid title transition lasts 1.45 seconds. Start the
    // structural guides only after that entrance has completed so the page
    // reads as one deliberate sequence: text, verticals, centre lines.
    gsap.delayedCall(1.45, () => {
      if (!openingForced) openingEntrance.play(0);
    });
    const introTimeline = gsap.timeline({
      scrollTrigger: {
        trigger: intro,
        start: 'top top',
        end: desktop ? '+=80%' : 'bottom 40%',
        pin: desktop,
        scrub: 0.35,
        onUpdate: (self) => {
          if (self.progress > 0.02) finishOpeningEntrance();
        },
      },
    });
    if (desktop) {
      introTimeline.to(
        '.fellow-intro .next-title-fill, .fellow-intro .next-title-outline',
        {
          scale: 0.6615,
          y: () => (-innerWidth * 76) / 1920,
          transformOrigin: '50% 0%',
          duration: 0.45,
        },
        0.35,
      );
      introTimeline.to(
        '.fellow-intro .next-subtitle-fill, .fellow-intro .next-subtitle-outline',
        {
          scale: 0.802,
          y: () => (-innerWidth * 134) / 1920,
          transformOrigin: '50% 0%',
          duration: 0.45,
        },
        0.35,
      );
      introTimeline.to(
        '.fellow-intro .signal-guides--opening',
        { opacity: 0, duration: 0.18 },
        0.64,
      );
      introTimeline.to(
        '.fellow-intro .signal-guides--context',
        { opacity: 1, duration: 0.18 },
        0.64,
      );
      introTimeline.to(
        '.fellow-intro .next-orbit',
        { y: () => (-innerWidth * 467) / 1920, duration: 0.45 },
        0.35,
      );
      introTimeline.fromTo(
        '.fellow-context',
        { opacity: 0, y: 20 },
        { opacity: 1, y: 0, duration: 0.3 },
        0.65,
      );
    }
    const contactHero = document.querySelector<HTMLElement>('.contact-hero');
    if (contactHero) {
      const guides = [
        ...contactHero.querySelectorAll<HTMLElement>('.contact-guides img'),
      ].sort((a, b) => a.offsetLeft - b.offsetLeft);
      gsap.fromTo(
        guides,
        { clipPath: 'inset(0 0 100% 0)' },
        {
          clipPath: 'inset(0 0 0% 0)',
          duration: 0.58,
          stagger: 0.12,
          ease: 'power1.out',
          scrollTrigger: {
            trigger: contactHero,
            start: 'top 72%',
            once: true,
          },
        },
      );
    }
    document.fonts.ready.then(() => ScrollTrigger.refresh());
  });
  window.addEventListener(
    'pagehide',
    () => {
      media.revert();
    },
    { once: true },
  );
}

// Apple-style reveal on every device: the group portrait grows to its Figma
// size while it scrolls up into view, and shrinks again when scrolling back.
export function initFellowPortrait() {
  gsap.registerPlugin(ScrollTrigger);
  const figure = document.querySelector<HTMLElement>('.fellow-media-figure');
  if (!figure) return;
  const media = gsap.matchMedia();
  media.add('(prefers-reduced-motion: no-preference)', () => {
    gsap.fromTo(
      figure,
      { scale: 0.7 },
      {
        scale: 1,
        ease: 'none',
        transformOrigin: '50% 50%',
        scrollTrigger: {
          trigger: figure,
          start: 'top bottom',
          // Full size exactly when the screen matches the Figma frame.
          endTrigger: figure.closest('[data-fellow-media]') || figure,
          end: 'top top',
          scrub: 0.6,
          invalidateOnRefresh: true,
          // Measure after the pinned intro above, whose spacer moves this.
          refreshPriority: -1,
        },
      },
    );
  });
  window.addEventListener('pagehide', () => media.revert(), { once: true });
}

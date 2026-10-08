import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { DESKTOP_MOTION } from './motion-policy';
// The group portrait keeps growing past its Figma size while scrolling.
const PORTRAIT_MAX_SCALE = 1.6;
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
        end: desktop ? '+=130%' : 'bottom 40%',
        pin: desktop,
        scrub: 0.35,
        onUpdate: (self) => {
          if (self.progress > 0.02) finishOpeningEntrance();
        },
      },
    });
    if (desktop) {
      // Poses follow Figma frames 2 → 3: en shrinks both lines to 0.4897,
      // zh scales the title to 0.6519, enlarges the subtitle slightly and
      // lets the English kicker line fade out.
      const zh = document.body.dataset.lang === 'zh';
      const unit = () => innerWidth / 1920;
      introTimeline.to(
        '.fellow-intro .next-title-fill, .fellow-intro .next-title-outline',
        {
          scale: zh ? 0.6519 : 0.4897,
          // 30 design px higher than the Figma pose: the title now sits on the
          // 112px scale step and needs room above the subtitle.
          y: () => unit() * (zh ? -255.64 : -72),
          transformOrigin: '50% 0%',
          duration: 0.45,
        },
        0.35,
      );
      introTimeline.to(
        '.fellow-intro .next-subtitle-fill, .fellow-intro .next-subtitle-outline',
        {
          scale: zh ? 1.0794 : 0.4897,
          // 10 design px higher than the Figma pose so the portrait, which keeps
          // growing to 1.6x, does not run into the subtitle.
          y: () => unit() * (zh ? -291 : -125),
          transformOrigin: '50% 0%',
          duration: 0.45,
        },
        0.35,
      );
      if (zh) {
        introTimeline.to(
          '.fellow-intro .next-kicker-group',
          { opacity: 0, duration: 0.3 },
          0.35,
        );
      }
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
        { y: () => (-innerWidth * 582) / 1920, duration: 0.45 },
        0.35,
      );
      // The group portrait arrives inside the pinned scene, so the finished
      // pose (title, arc, portrait, marker) is a single screen.
      introTimeline.fromTo(
        '.fellow-intro-figure',
        { opacity: 0, scale: 0.7, transformOrigin: '50% 50%' },
        { opacity: 1, scale: 1, ease: 'none', duration: 0.4 },
        0.55,
      );
      // Keep enlarging for the rest of the pinned scroll.
      introTimeline.to(
        '.fellow-intro-figure',
        { scale: PORTRAIT_MAX_SCALE, ease: 'none', duration: 0.6 },
        0.95,
      );
      introTimeline.fromTo(
        '.fellow-context',
        { opacity: 0, y: 20 },
        { opacity: 1, y: 0, duration: 0.3 },
        0.65,
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
    const section =
      figure.closest<HTMLElement>('[data-fellow-media]') || figure;
    const growth = gsap.timeline({
      defaults: { ease: 'none' },
      scrollTrigger: {
        trigger: figure,
        start: 'top bottom',
        // Reaches full size exactly when the screen matches the Figma frame,
        // then keeps enlarging as the section scrolls away.
        endTrigger: section,
        end: () => `top -${Math.round(innerHeight * 0.6)}`,
        scrub: 0.6,
        invalidateOnRefresh: true,
        // Measure after the pinned intro above, whose spacer moves this.
        refreshPriority: -1,
      },
    });
    growth.fromTo(
      figure,
      { scale: 0.7, transformOrigin: '50% 50%' },
      { scale: 1, duration: 1 },
    );
    growth.to(figure, { scale: PORTRAIT_MAX_SCALE, duration: 0.6 });
  });
  window.addEventListener('pagehide', () => media.revert(), { once: true });
}

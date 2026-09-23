import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { DESKTOP_MOTION } from './motion-policy';
export function initFellow() {
  gsap.registerPlugin(ScrollTrigger);
  const root = document.querySelector<HTMLElement>('[data-fellow-media]');
  if (!root) return;
  const media = gsap.matchMedia();
  media.add(DESKTOP_MOTION, () => {
    const intro = document.querySelector('.fellow-intro')!;
    const desktop = matchMedia('(min-width:1024px)').matches;
    const introTimeline = gsap.timeline({
      scrollTrigger: {
        trigger: intro,
        start: 'top top',
        end: desktop ? '+=80%' : 'bottom 40%',
        pin: desktop,
        scrub: 0.35,
      },
    });
    introTimeline.to(
      '.fellow-intro .next-orbit',
      { opacity: 1, duration: 0.18 },
      0.22,
    );
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
    const timeline = gsap.timeline({
      scrollTrigger: {
        trigger: root,
        start: desktop ? 'top top' : 'top 30%',
        end: desktop ? '+=110%' : 'bottom 25%',
        pin: desktop,
        scrub: 0.4,
        invalidateOnRefresh: true,
        onUpdate: (self) => {
          root.dataset.mediaProgress = self.progress.toFixed(3);
        },
      },
    });
    timeline.to(
      '.fellow-video-shell',
      {
        width: desktop ? '80.8854167%' : '100%',
        top: desktop ? () => (root.clientWidth * 201) / 1920 : undefined,
        height: desktop ? () => (root.clientWidth * 771) / 1920 : 'auto',
        duration: 1,
        ease: 'none',
      },
      0,
    );
    if (desktop)
      timeline.to(
        '.fellow-media-title',
        { opacity: 0, y: -60, duration: 0.25 },
        0.45,
      );
    if (desktop)
      timeline.to('.fellow-media-orbit', { opacity: 0, duration: 0.35 }, 0.55);
    timeline.fromTo(
      '.fellow-media-caption',
      { opacity: 0 },
      { opacity: 1, duration: 0.2 },
      0.8,
    );
    document.fonts.ready.then(() => ScrollTrigger.refresh());
  });
  window.addEventListener('pagehide', () => media.revert(), { once: true });
}

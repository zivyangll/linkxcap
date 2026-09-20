import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
export function initFellow() {
  gsap.registerPlugin(ScrollTrigger);
  const root = document.querySelector<HTMLElement>('[data-fellow-media]');
  if (!root) return;
  const video = root.querySelector<HTMLVideoElement>('[data-fellow-video]');
  const play = root.querySelector<HTMLButtonElement>('[data-video-play]');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let inView = false,
    expanded = false,
    pausedByUser = false,
    requestingPlay = false;
  const syncVideo = async (manual = false) => {
    if (!video) return;
    if (
      document.hidden ||
      !inView ||
      (!manual && (!expanded || reduced.matches || pausedByUser))
    ) {
      video.pause();
      return;
    }
    if (requestingPlay || !video.paused) return;
    try {
      requestingPlay = true;
      await video.play();
      if (play) play.hidden = true;
    } catch {
      if (play) play.hidden = false;
    } finally {
      requestingPlay = false;
    }
  };
  video?.addEventListener('play', () => {
    pausedByUser = false;
  });
  video?.addEventListener('pause', () => {
    if (expanded && inView && !document.hidden && !requestingPlay)
      pausedByUser = true;
  });
  play?.addEventListener('click', () => {
    pausedByUser = false;
    syncVideo(true);
  });
  const media = gsap.matchMedia();
  media.add('(prefers-reduced-motion: no-preference)', () => {
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
    introTimeline
      .to(
        '.fellow-intro .next-title-outline',
        { opacity: 0, duration: 0.28 },
        0,
      )
      .to('.fellow-intro .next-title-fill', { opacity: 1, duration: 0.28 }, 0)
      .to('.fellow-intro .next-zh-outline', { opacity: 0, duration: 0.28 }, 0)
      .to('.fellow-intro .next-zh-fill', { opacity: 1, duration: 0.28 }, 0)
      .to('.fellow-intro .next-orbit', { opacity: 1, duration: 0.18 }, 0.22);
    if (desktop) {
      introTimeline.to(
        '.fellow-intro .next-title-fill',
        {
          scale: 0.6615,
          y: () => (-innerWidth * 76) / 1920,
          transformOrigin: '50% 0%',
          duration: 0.45,
        },
        0.35,
      );
      introTimeline.to(
        '.fellow-intro .next-zh-fill',
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
          expanded = self.progress > 0.38;
          root.dataset.mediaProgress = self.progress.toFixed(3);
          syncVideo();
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
  const videoVisibility = new IntersectionObserver(
    (entries) => {
      inView = entries[0].isIntersecting;
      syncVideo();
    },
    { threshold: 0.3 },
  );
  videoVisibility.observe(root);
  const onVisibility = () => {
    syncVideo();
  };
  document.addEventListener('visibilitychange', onVisibility);
  window.addEventListener(
    'pagehide',
    () => {
      media.revert();
      videoVisibility.disconnect();
      video?.pause();
      document.removeEventListener('visibilitychange', onVisibility);
    },
    { once: true },
  );
}

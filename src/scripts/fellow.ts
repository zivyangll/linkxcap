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
    const point = document.querySelector<HTMLElement>('.fellow-orbit-point');
    const swing = { phase: -0.42 };
    const paintPoint = () => {
      if (!point) return;
      const parent = point.parentElement!;
      const arc = parent.querySelector('.next-orbit')!.getBoundingClientRect();
      const box = parent.getBoundingClientRect();
      const radius = (arc.width * 1173) / 1920;
      point.style.left = `${parent.clientWidth / 2 + Math.sin(swing.phase) * radius}px`;
      point.style.top = `${arc.top - box.top + (arc.width * 30) / 1920 + (1 - Math.cos(swing.phase)) * radius}px`;
    };
    const swingTween = gsap.to(swing, {
      phase: 0.42,
      duration: 3.5,
      repeat: -1,
      yoyo: true,
      ease: 'sine.inOut',
      paused: true,
      onUpdate: paintPoint,
    });
    const intro = document.querySelector('.fellow-intro')!;
    let introVisible = false;
    const syncSwing = () => {
      if (introVisible && !document.hidden) swingTween.resume();
      else swingTween.pause();
    };
    const observer = new IntersectionObserver((entries) => {
      introVisible = entries[0].isIntersecting;
      syncSwing();
    });
    observer.observe(intro);
    document.addEventListener('visibilitychange', syncSwing);
    const resize = new ResizeObserver(paintPoint);
    resize.observe(intro);
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
    introTimeline.fromTo(
      '.fellow-intro h1',
      { '--signal-fill': '0%' },
      { '--signal-fill': '100%', duration: 0.35, ease: 'none' },
      0,
    );
    if (desktop) {
      introTimeline.to(
        '.fellow-intro h1',
        {
          scale: 0.6615,
          y: () => (-innerWidth * 76) / 1920,
          transformOrigin: '50% 0%',
          duration: 0.45,
        },
        0.35,
      );
      introTimeline.to(
        '.fellow-intro .next-outline',
        {
          scale: 0.802,
          y: () => (-innerWidth * 134) / 1920,
          transformOrigin: '50% 0%',
          duration: 0.45,
        },
        0.35,
      );
      introTimeline.to(
        '.fellow-intro .next-orbit',
        { y: () => (-innerWidth * 497) / 1920, duration: 0.45 },
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
        width: desktop ? '100%' : '100%',
        y: desktop ? () => -root.clientWidth * 0.16 : 0,
        height: desktop ? 'calc(100% - 180px)' : 'auto',
        duration: 1,
        ease: 'none',
      },
      0,
    );
    if (desktop)
      timeline.to(
        '.fellow-media-title',
        { opacity: 0, y: -60, duration: 0.35 },
        0,
      );
    timeline.fromTo(
      '.fellow-media-caption',
      { opacity: 0 },
      { opacity: 1, duration: 0.2 },
      0.8,
    );
    document.fonts.ready.then(() => ScrollTrigger.refresh());
    return () => {
      observer.disconnect();
      resize.disconnect();
      document.removeEventListener('visibilitychange', syncSwing);
      swingTween.kill();
    };
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

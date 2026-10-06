import { TOPOLOGY_MOTION } from './motion-policy';

// The designer's looping star layer over the Focus backdrop. It loads only
// near the viewport and plays while visible; otherwise the poster frame stays.
export function initFocusStars() {
  const video = document.querySelector<HTMLVideoElement>('[data-focus-stars]');
  const src = video?.dataset.src;
  if (!video || !src) return;
  const motion = matchMedia(TOPOLOGY_MOTION);
  const device = navigator as Navigator & {
    connection?: { saveData?: boolean };
  };
  let visible = false;
  const sync = () => {
    const allowed = motion.matches && !device.connection?.saveData;
    if (!allowed || !visible || document.hidden) {
      video.pause();
      return;
    }
    if (!video.getAttribute('src')) {
      video.src = src;
      video.preload = 'auto';
    }
    video.play().catch(() => {
      /* The poster remains when playback is refused. */
    });
  };
  const observer = new IntersectionObserver(
    ([entry]) => {
      visible = entry.isIntersecting;
      sync();
    },
    { rootMargin: '200px' },
  );
  observer.observe(video.closest('.focus') || video);
  motion.addEventListener('change', sync);
  document.addEventListener('visibilitychange', sync);
  window.addEventListener('pageshow', (event) => {
    if (event.persisted) sync();
  });
}

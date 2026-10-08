import { TOPOLOGY_MOTION, TOUCH_LAYOUT } from './motion-policy';
const motion = matchMedia(TOPOLOGY_MOTION);
const touch = matchMedia(TOUCH_LAYOUT);
const device = navigator as Navigator & {
  deviceMemory?: number;
  connection?: { saveData?: boolean };
};
for (const root of document.querySelectorAll<HTMLElement>('[data-topology]')) {
  let started = false;
  let observer: IntersectionObserver | undefined;
  const load = () => {
    observer?.disconnect();
    if (started) return;
    const allowed =
      motion.matches &&
      !(root.querySelector('[data-h5-focus]') && touch.matches) &&
      !device.connection?.saveData &&
      (device.deviceMemory ?? 8) >= 4;
    root.dataset.renderer = 'static';
    if (!allowed) return;
    observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        observer?.disconnect();
        started = true;
        root.dataset.starfield = 'loading';
        import('./starfield-lottie')
          .then((module) => module.mountStarfield(root))
          .catch(() => {
            root.dataset.starfield = 'error';
          });
        import('./topology')
          .then((module) => {
            module.mountTopology(root);
          })
          .catch(() => {
            started = false;
            root.dataset.renderer = 'static';
          });
      },
      { rootMargin: '120px' },
    );
    observer.observe(root);
  };
  load();
  motion.addEventListener('change', load);
  touch.addEventListener('change', load);
  window.addEventListener(
    'pagehide',
    () => {
      observer?.disconnect();
      motion.removeEventListener('change', load);
      touch.removeEventListener('change', load);
    },
    { once: true },
  );
}

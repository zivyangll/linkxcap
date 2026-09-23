import { TOPOLOGY_MOTION } from './motion-policy';
const motion = matchMedia(TOPOLOGY_MOTION);
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
      !device.connection?.saveData &&
      (device.deviceMemory ?? 8) >= 4;
    root.dataset.renderer = 'static';
    if (!allowed) return;
    observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        observer?.disconnect();
        started = true;
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
  window.addEventListener(
    'pagehide',
    () => {
      observer?.disconnect();
      motion.removeEventListener('change', load);
    },
    { once: true },
  );
}

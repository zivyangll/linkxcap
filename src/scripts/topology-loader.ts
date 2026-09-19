export {};
const motion = matchMedia('(prefers-reduced-motion: reduce)');
const device = navigator as Navigator & {
  deviceMemory?: number;
  connection?: { saveData?: boolean };
};
for (const root of document.querySelectorAll<HTMLElement>('[data-topology]')) {
  // All labels, links and hover states are server-rendered. WebGL is optional.
  if (
    motion.matches ||
    device.connection?.saveData ||
    (device.deviceMemory ?? 8) < 4
  ) {
    root.dataset.renderer = 'static';
    root.querySelector('[data-motion-toggle]')?.setAttribute('hidden', '');
    continue;
  }
  const observer = new IntersectionObserver(
    (entries) => {
      if (!entries.some((e) => e.isIntersecting)) return;
      observer.disconnect();
      import('./topology')
        .then((module) => module.mountTopology(root))
        .catch(() => {
          root.dataset.renderer = 'static';
          root
            .querySelector('[data-motion-toggle]')
            ?.setAttribute('hidden', '');
        });
    },
    { rootMargin: '120px' },
  );
  observer.observe(root);
}

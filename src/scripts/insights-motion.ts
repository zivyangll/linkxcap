const orbit = document.querySelector<HTMLElement>('.insights-orbit');
if (orbit) {
  const motion = matchMedia('(prefers-reduced-motion: no-preference)');
  let visible = false;
  const update = () => {
    orbit.dataset.orbitRunning = String(
      visible && motion.matches && !document.hidden,
    );
  };
  const observer = new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    update();
  });
  observer.observe(orbit);
  motion.addEventListener('change', update);
  document.addEventListener('visibilitychange', update);
  window.addEventListener('pagehide', (event) => {
    orbit.dataset.orbitRunning = 'false';
    if (event.persisted) return;
    observer.disconnect();
    motion.removeEventListener('change', update);
    document.removeEventListener('visibilitychange', update);
  });
  window.addEventListener('pageshow', update);
}
export {};

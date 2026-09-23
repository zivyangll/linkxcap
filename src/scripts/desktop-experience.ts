import { DESKTOP_MOTION } from './motion-policy';

export function initDesktopExperience() {
  const media = matchMedia(DESKTOP_MOTION);
  let cleanup = () => {};
  const update = () => {
    cleanup();
    if (!media.matches) return;
    const source = document.querySelector<HTMLImageElement>(
      '.portfolio-card .card-arrow img',
    );
    if (!source) return;
    const cursor = document.createElement('span');
    cursor.className = 'live-cursor';
    cursor.setAttribute('aria-hidden', 'true');
    // Use the original portfolio arrow asset inside its original circular frame.
    cursor.append(source.cloneNode(true));
    document.body.append(cursor);
    let frame = 0,
      x = 0,
      y = 0;
    const hide = () => {
      document.documentElement.classList.remove('has-live-cursor');
      cursor.hidden = true;
      cancelAnimationFrame(frame);
      frame = 0;
    };
    hide();
    const move = (event: PointerEvent) => {
      if (event.pointerType !== 'mouse') return hide();
      const target = event.target as Element | null;
      if (!target?.closest('.portfolio-card')) return hide();
      x = event.clientX;
      y = event.clientY;
      cursor.hidden = false;
      document.documentElement.classList.add('has-live-cursor');
      if (!frame)
        frame = requestAnimationFrame(() => {
          cursor.style.transform = `translate3d(${x}px,${y}px,0) translate(-50%, -50%)`;
          frame = 0;
        });
    };
    document.addEventListener('pointermove', move, { passive: true });
    document.documentElement.addEventListener('pointerleave', hide);
    window.addEventListener('blur', hide);
    window.addEventListener('scroll', hide, { passive: true });
    document.addEventListener('visibilitychange', hide);
    document.addEventListener('keydown', hide);
    cleanup = () => {
      hide();
      cursor.remove();
      document.removeEventListener('pointermove', move);
      document.documentElement.removeEventListener('pointerleave', hide);
      window.removeEventListener('blur', hide);
      window.removeEventListener('scroll', hide);
      document.removeEventListener('visibilitychange', hide);
      document.removeEventListener('keydown', hide);
    };
  };
  update();
  media.addEventListener('change', update);
  window.addEventListener(
    'pagehide',
    () => {
      cleanup();
      media.removeEventListener('change', update);
    },
    { once: true },
  );
}

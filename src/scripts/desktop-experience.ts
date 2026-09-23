import { DESKTOP_MOTION } from './motion-policy';

export function initDesktopExperience() {
  const media = matchMedia(DESKTOP_MOTION);
  let cleanup = () => {};
  let suspend = () => {};
  const update = () => {
    cleanup();
    suspend = () => {};
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
    document.documentElement.classList.add('has-live-cursor-ready');
    let frame = 0,
      currentX = 0,
      currentY = 0,
      targetX = 0,
      targetY = 0,
      visible = false;
    const paint = () => {
      if (!visible) {
        frame = 0;
        return;
      }
      currentX += (targetX - currentX) * 0.3;
      currentY += (targetY - currentY) * 0.3;
      if (
        Math.abs(targetX - currentX) < 0.1 &&
        Math.abs(targetY - currentY) < 0.1
      ) {
        currentX = targetX;
        currentY = targetY;
      }
      cursor.style.transform = `translate3d(${currentX.toFixed(2)}px,${currentY.toFixed(2)}px,0) translate(-50%, -50%)`;
      if (currentX === targetX && currentY === targetY) frame = 0;
      else frame = requestAnimationFrame(paint);
    };
    const hide = () => {
      visible = false;
      document.documentElement.classList.remove('has-live-cursor');
      cursor.classList.remove('is-visible');
      cancelAnimationFrame(frame);
      frame = 0;
    };
    hide();
    const move = (event: PointerEvent) => {
      if (event.pointerType !== 'mouse') return hide();
      const target = event.target as Element | null;
      const card = target?.closest<HTMLElement>('.portfolio-card');
      if (!card) return hide();
      targetX = event.clientX;
      targetY = event.clientY;
      if (!visible) {
        currentX = targetX;
        currentY = targetY;
        cursor.style.transform = `translate3d(${currentX}px,${currentY}px,0) translate(-50%, -50%)`;
      }
      visible = true;
      cursor.classList.add('is-visible');
      document.documentElement.classList.add('has-live-cursor');
      if (!frame) frame = requestAnimationFrame(paint);
    };
    document.addEventListener('pointermove', move, { passive: true });
    document.documentElement.addEventListener('pointerleave', hide);
    window.addEventListener('blur', hide);
    window.addEventListener('scroll', hide, { passive: true });
    document.addEventListener('visibilitychange', hide);
    document.addEventListener('keydown', hide);
    document.addEventListener('click', hide);
    window.addEventListener('pageshow', hide);
    suspend = hide;
    cleanup = () => {
      hide();
      cursor.remove();
      document.documentElement.classList.remove('has-live-cursor-ready');
      document.removeEventListener('pointermove', move);
      document.documentElement.removeEventListener('pointerleave', hide);
      window.removeEventListener('blur', hide);
      window.removeEventListener('scroll', hide);
      document.removeEventListener('visibilitychange', hide);
      document.removeEventListener('keydown', hide);
      document.removeEventListener('click', hide);
      window.removeEventListener('pageshow', hide);
    };
  };
  update();
  media.addEventListener('change', update);
  // Keep the listeners and cursor in the browser's back-forward cache. Only
  // clear the visible state so returning cannot expose the card's fixed arrow.
  window.addEventListener('pagehide', () => suspend());
}

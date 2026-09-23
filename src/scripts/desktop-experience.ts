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
    const avoidLogo = (card: HTMLElement) => {
      const logo = card.querySelector<HTMLElement>('.company-logo');
      if (!logo) return { x, y };
      const logoBox = logo.getBoundingClientRect();
      const cardBox = card.getBoundingClientRect();
      const radius = cursor.offsetWidth / 2;
      const gap = Math.max(6, radius * 0.16);
      const overlaps =
        x + radius > logoBox.left - gap &&
        x - radius < logoBox.right + gap &&
        y + radius > logoBox.top - gap &&
        y - radius < logoBox.bottom + gap;
      if (!overlaps) return { x, y };
      const left = logoBox.left - gap - radius;
      const right = logoBox.right + gap + radius;
      const leftFits = left - radius >= cardBox.left + gap;
      const rightFits = right + radius <= cardBox.right - gap;
      if (leftFits && rightFits)
        return { x: x <= (logoBox.left + logoBox.right) / 2 ? left : right, y };
      if (leftFits) return { x: left, y };
      if (rightFits) return { x: right, y };
      return { x: x < cardBox.left + cardBox.width / 2 ? left : right, y };
    };
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
      const card = target?.closest<HTMLElement>('.portfolio-card');
      if (!card) return hide();
      x = event.clientX;
      y = event.clientY;
      cursor.hidden = false;
      document.documentElement.classList.add('has-live-cursor');
      if (!frame)
        frame = requestAnimationFrame(() => {
          const position = avoidLogo(card);
          cursor.style.transform = `translate3d(${position.x}px,${position.y}px,0) translate(-50%, -50%)`;
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

import { gsap } from 'gsap';
import { MOBILE_MOTION } from './motion-policy';

/** Settle the full H5 screen; its authored inset clears the fixed header. */
export function mountH5FocusSnap(root: HTMLElement) {
  const frame = root.querySelector<HTMLElement>('.h5-focus-frame');
  const header = document.querySelector<HTMLElement>('[data-header]');
  if (!frame || !header) return () => {};
  const media = gsap.matchMedia();
  media.add(MOBILE_MOTION, () => {
    const lifetime = new AbortController();
    const options = { signal: lifetime.signal, passive: true };
    let timer = 0;
    let wheelTimer = 0;
    let holdTimer = 0;
    let holdY: number | undefined;
    let touching = false;
    let touchCaptured = false;
    let wheelCaptured = false;
    let touchY = 0;
    let previousY = scrollY;
    let settled = false;
    let tween: gsap.core.Tween | undefined;

    const cancel = () => {
      clearTimeout(timer);
      clearTimeout(wheelTimer);
      clearTimeout(holdTimer);
      tween?.kill();
      tween = undefined;
      holdY = undefined;
      touchCaptured = wheelCaptured = false;
      delete root.dataset.h5Snapping;
    };
    const releaseWhenIdle = () => {
      clearTimeout(holdTimer);
      if (!touching && !tween)
        holdTimer = window.setTimeout(() => {
          holdY = undefined;
          delete root.dataset.h5Snapping;
        }, 180);
    };
    const canSnap = () =>
      !settled &&
      !tween &&
      !document.hidden &&
      !document.body.classList.contains('menu-open') &&
      !document.querySelector('dialog[open]');
    const approach = () =>
      header.getBoundingClientRect().bottom +
      Math.min(80, Math.max(48, innerHeight * 0.08));
    const startSnap = () => {
      if (!canSnap()) return;
      clearTimeout(timer);
      const top = frame.getBoundingClientRect().top;
      settled = true;
      touchCaptured = touching;
      if (Math.abs(top) < 1) return;
      const position = { y: scrollY };
      holdY = Math.max(0, scrollY + top);
      root.dataset.h5Snapping = 'true';
      tween = gsap.to(position, {
        y: holdY,
        duration: 0.42,
        ease: 'power2.out',
        onUpdate: () => scrollTo({ top: position.y, behavior: 'instant' }),
        onComplete: () => {
          tween = undefined;
          releaseWhenIdle();
        },
      });
    };
    const settle = () => {
      if (touching || !canSnap()) return;
      const top = frame.getBoundingClientRect().top;
      const boundary = header.getBoundingClientRect().bottom;
      if (Math.abs(top - boundary) <= approach() - boundary) startSnap();
    };
    const schedule = () => {
      clearTimeout(timer);
      if (!touching && !settled) timer = window.setTimeout(settle, 140);
    };
    const onScroll = () => {
      const delta = scrollY - previousY;
      previousY = scrollY;
      if (tween) return;
      if (holdY !== undefined) {
        // Native fling inertia can outlive the tween. Keep this gesture on
        // its reading stop until scrolling is quiet or a new gesture starts.
        if (Math.abs(scrollY - holdY) >= 1)
          scrollTo({ top: holdY, behavior: 'instant' });
        releaseWhenIdle();
        return;
      }
      const bounds = frame.getBoundingClientRect();
      // Re-arm only after leaving the screen, so the next gesture can exit.
      if (
        bounds.top > innerHeight ||
        bounds.bottom < header.getBoundingClientRect().bottom
      )
        settled = false;
      // A fling may cross the entire approach zone between scroll events.
      if (
        canSnap() &&
        delta > 0 &&
        bounds.top <= approach() &&
        bounds.top + delta > approach()
      ) {
        startSnap();
        return;
      }
      schedule();
    };
    const shouldCapture = (delta: number) => {
      const top = frame.getBoundingClientRect().top;
      return canSnap() && delta > 0 && top > 0 && top - delta <= approach();
    };
    const touchStart = (event: TouchEvent) => {
      cancel();
      touching = true;
      touchY = event.touches[0]?.clientY ?? 0;
    };
    const touchMove = (event: TouchEvent) => {
      if (event.touches.length !== 1) return;
      const nextY = event.touches[0].clientY;
      const delta = touchY - nextY;
      touchY = nextY;
      if (shouldCapture(delta)) startSnap();
      if (touchCaptured || tween) {
        touchCaptured = true;
        if (event.cancelable) event.preventDefault();
      }
    };
    const touchEnd = (event: TouchEvent) => {
      touching = event.touches.length > 0;
      if (!touching) touchCaptured = false;
      if (holdY !== undefined) releaseWhenIdle();
      schedule();
    };
    const wheel = (event: WheelEvent) => {
      if (event.ctrlKey) return;
      if (!wheelCaptured && !tween && holdY !== undefined) cancel();
      if (event.deltaY < 0) {
        cancel();
        return;
      }
      if (shouldCapture(event.deltaY)) startSnap();
      if (wheelCaptured || tween) {
        event.preventDefault();
        wheelCaptured = true;
        clearTimeout(wheelTimer);
        // Ignore the remaining packets of this gesture, then allow the next.
        wheelTimer = window.setTimeout(() => (wheelCaptured = false), 140);
      }
    };
    const pointerDown = (event: PointerEvent) => {
      cancel();
      const target = event.target as Element | null;
      if (target && root.contains(target) && target.closest('a, button'))
        settled = true;
    };
    const keyDown = (event: KeyboardEvent) => {
      if (
        [
          'ArrowUp',
          'ArrowDown',
          'PageUp',
          'PageDown',
          'Home',
          'End',
          ' ',
        ].includes(event.key)
      )
        cancel();
    };
    window.addEventListener('scroll', onScroll, options);
    window.addEventListener('touchstart', touchStart, options);
    window.addEventListener('touchmove', touchMove, {
      ...options,
      passive: false,
    });
    window.addEventListener('touchend', touchEnd, options);
    window.addEventListener('touchcancel', touchEnd, options);
    window.addEventListener('pointerdown', pointerDown, options);
    window.addEventListener('wheel', wheel, { ...options, passive: false });
    window.addEventListener('keydown', keyDown, options);
    window.addEventListener('resize', cancel, options);
    window.addEventListener('blur', cancel, options);
    return () => {
      cancel();
      lifetime.abort();
    };
  });
  return () => media.revert();
}

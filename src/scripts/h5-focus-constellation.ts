import { TOUCH_LAYOUT } from './motion-policy';
import { mountH5FocusSnap } from './h5-focus-snap';

export function mountH5FocusConstellation(root: HTMLElement) {
  const touch = matchMedia(TOUCH_LAYOUT);
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const buttons = [
    ...root.querySelectorAll<HTMLButtonElement>('[data-h5-sector]'),
  ];
  const results = [...root.querySelectorAll<HTMLElement>('[data-h5-result]')];
  const overflow = [
    ...root.querySelectorAll<HTMLElement>('[data-h5-overflow]'),
  ];
  const section = root.closest<HTMLElement>('#focus')!;
  const lifetime = new AbortController();
  const options = { signal: lifetime.signal };
  const stopSnap = mountH5FocusSnap(root);
  let visible = false;

  const sync = () => {
    root.hidden = !touch.matches;
    section.setAttribute(
      'aria-labelledby',
      touch.matches ? 'h5-focus-title' : 'focus-title',
    );
    root.dataset.h5Animating = String(
      touch.matches && visible && !document.hidden && !reduced.matches,
    );
    if (!touch.matches || reduced.matches)
      root.getAnimations({ subtree: true }).forEach((animation) => {
        if (!(animation instanceof CSSAnimation)) animation.cancel();
      });
  };
  const select = (button: HTMLButtonElement) => {
    if (!touch.matches || button.getAttribute('aria-pressed') === 'true')
      return;
    const id = button.dataset.h5Sector!;
    const previous = buttons.find(
      (item) => item.getAttribute('aria-pressed') === 'true',
    )!;
    // The chosen diamond comes down to the reading slot; the previous one
    // occupies its old position. Every other target stays still and tappable.
    previous.dataset.h5Slot = button.dataset.h5Slot;
    button.dataset.h5Slot = '5';
    root.dataset.h5Selection = id;
    buttons.forEach((item) =>
      item.setAttribute('aria-pressed', String(item === button)),
    );
    results.forEach((result) => {
      result.getAnimations({ subtree: true }).forEach((animation) => {
        if (!(animation instanceof CSSAnimation)) animation.cancel();
      });
      result.hidden = result.dataset.h5Result !== id;
      if (!result.hidden && !reduced.matches) {
        result.querySelector('.h5-focus-details')?.animate(
          [
            { opacity: 0, transform: 'translateY(12px)' },
            { opacity: 1, transform: 'translateY(0)' },
          ],
          { duration: 380, easing: 'ease-out' },
        );
        result.querySelectorAll('.h5-focus-branch').forEach((branch, index) =>
          branch.animate([{ opacity: 0 }, { opacity: 1 }], {
            duration: 500,
            delay: index * 22,
            easing: 'ease-out',
            fill: 'backwards',
          }),
        );
      }
    });
    overflow.forEach((list) => {
      list.hidden = list.dataset.h5Overflow !== id;
    });
    const extra = root.querySelector<HTMLElement>('.h5-focus-overflow');
    if (extra) extra.hidden = !overflow.some((list) => !list.hidden);
  };
  buttons.forEach((button) =>
    button.addEventListener('click', () => select(button), options),
  );
  const observer = new IntersectionObserver(
    ([entry]) => {
      visible = entry.isIntersecting;
      sync();
    },
    { rootMargin: '120px' },
  );
  observer.observe(root);
  touch.addEventListener('change', sync, options);
  reduced.addEventListener('change', sync, options);
  document.addEventListener('visibilitychange', sync, options);
  window.addEventListener('pageshow', sync, options);
  window.addEventListener(
    'pagehide',
    (event) => {
      if (event.persisted) return;
      stopSnap();
      observer.disconnect();
      lifetime.abort();
    },
    options,
  );
  sync();
}

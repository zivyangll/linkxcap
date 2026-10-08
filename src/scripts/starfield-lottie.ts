import lottie from 'lottie-web/build/player/lottie_light';
import { TOUCH_LAYOUT } from './motion-policy';

export function mountStarfield(root: HTMLElement) {
  const container = root.querySelector<HTMLElement>('.focus-starfield');
  const path = container?.dataset.lottieSrc;
  if (!container || !path) return;

  const animation = lottie.loadAnimation({
    container,
    renderer: 'svg',
    loop: true,
    autoplay: false,
    path,
    rendererSettings: {
      preserveAspectRatio: 'xMidYMid slice',
      progressiveLoad: false,
      hideOnTransparent: false,
    },
  });
  animation.setSubframe(true);

  let visible = false;
  let disposed = false;
  const touch = matchMedia(TOUCH_LAYOUT);
  const sync = () => {
    if (disposed) return;
    if (
      visible &&
      !document.hidden &&
      !(touch.matches && root.querySelector('[data-h5-focus]'))
    )
      animation.play();
    else animation.pause();
  };
  const observer = new IntersectionObserver(
    ([entry]) => {
      visible = entry.isIntersecting;
      sync();
    },
    { threshold: 0.01 },
  );
  observer.observe(root);
  animation.addEventListener('DOMLoaded', () => {
    root.dataset.starfield = 'ready';
    sync();
  });
  animation.addEventListener('data_failed', () => {
    root.dataset.starfield = 'error';
  });
  document.addEventListener('visibilitychange', sync);
  touch.addEventListener('change', sync);
  window.addEventListener('pagehide', (event) => {
    if (event.persisted) {
      animation.pause();
      return;
    }
    disposed = true;
    observer.disconnect();
    document.removeEventListener('visibilitychange', sync);
    touch.removeEventListener('change', sync);
    animation.destroy();
  });
  window.addEventListener('pageshow', (event) => {
    if (event.persisted) sync();
  });
}

import { DESKTOP_MOTION } from './motion-policy';

// Reserve the image box while decoding; errors leave a visible, labelled
// fallback instead of an endless shimmer or a collapsed layout.
document
  .querySelectorAll<HTMLElement>('[data-image-holder]')
  .forEach((holder) => {
    const img = holder.querySelector('img');
    if (!img) return;
    const update = () => {
      holder.dataset.imageState = img.naturalWidth ? 'ready' : 'error';
      holder.removeAttribute('aria-busy');
    };
    const loading = () => {
      holder.dataset.imageState = 'loading';
      holder.setAttribute('aria-busy', 'true');
      if (img.complete) update();
    };
    img.addEventListener('load', update);
    img.addEventListener('error', update);
    const observer = new MutationObserver(loading);
    observer.observe(img, { attributes: true, attributeFilter: ['src'] });
    loading();
    window.addEventListener('pagehide', () => observer.disconnect(), {
      once: true,
    });
  });

const desktop = matchMedia(DESKTOP_MOTION);
let loaded = false;
const enhance = () => {
  if (!desktop.matches || loaded || !document.querySelector('.portfolio-card'))
    return;
  loaded = true;
  import('./desktop-experience')
    .then((module) => module.initDesktopExperience())
    .catch(() => {
      loaded = false;
    });
};
enhance();
desktop.addEventListener('change', enhance);

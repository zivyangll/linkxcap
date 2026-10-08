// Fit Chinese ink to both guides and align the Latin baseline to the lower
// guide. Keep the existing type sizes; Latin descenders extend below the line.
export function fitFellowTitle() {
  const titles = [
    ...document.querySelectorAll<HTMLElement>(
      '.fellow-intro .next-title-fill, .fellow-intro .next-title-outline--text',
    ),
  ];
  const title = document.querySelector<HTMLElement>(
    '.fellow-intro .next-title-fill',
  );
  const parts = title?.querySelectorAll<HTMLElement>('.next-title-part');
  if (!parts?.length) return;
  const context = document.createElement('canvas').getContext('2d');
  if (!context) return;
  const desktop = matchMedia('(min-width: 1024px)');
  const fit = () => {
    if (!desktop.matches) return;
    // The desktop composition caps its design unit on wide windows.
    const unit =
      parseFloat(getComputedStyle(titles[titles.length - 1]).height) / 128.97;
    parts.forEach((part, index) => {
      const text = part.textContent!.trim();
      const style = getComputedStyle(part);
      context.font = `${style.fontWeight} 100px ${style.fontFamily}`;
      const metrics = context.measureText(text);
      const height =
        metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent;
      if (!height) return;
      const size = (128.97 * 100) / height;
      part.style.setProperty('--title-ink-size', String(size));
      part.style.setProperty('--title-ink-y', '0');
      const fitted = getComputedStyle(part);
      context.font = `${fitted.fontWeight} ${fitted.fontSize} ${fitted.fontFamily}`;
      const probe = document.createElement('span');
      probe.style.cssText = 'display:inline-block;width:0;height:0';
      part.prepend(probe);
      const box = part.getBoundingClientRect();
      const scale = box.height / parseFloat(getComputedStyle(part).height);
      const baseline = (probe.getBoundingClientRect().top - box.top) / scale;
      const target =
        part.dataset.titleScript === 'en'
          ? 128.97 * unit
          : context.measureText(text).actualBoundingBoxAscent;
      const offset = (target - baseline) / unit;
      probe.remove();
      for (const title of titles) {
        const twin =
          title.querySelectorAll<HTMLElement>('.next-title-part')[index];
        twin.style.setProperty('--title-ink-size', String(size));
        twin.style.setProperty('--title-ink-y', String(offset));
      }
    });
  };
  let frame = 0;
  const resize = () => {
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(fit);
  };
  document.fonts.ready.then(fit);
  window.addEventListener('resize', resize);
  window.addEventListener(
    'pagehide',
    () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('resize', resize);
    },
    { once: true },
  );
}

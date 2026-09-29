import { TOPOLOGY_MOTION, TOUCH_LAYOUT } from './motion-policy';

// HTML remains the source of accessible content, including without WebGL.
export function mountFocusControls(root: HTMLElement) {
  const stars = [...root.querySelectorAll<HTMLButtonElement>('[data-sector]')];
  const panels = [...root.querySelectorAll<HTMLElement>('[data-sector-panel]')];
  const scenes = [
    ...root.querySelectorAll<HTMLElement>('[data-constellation]'),
  ];
  const motion = matchMedia(TOPOLOGY_MOTION);
  const touch = matchMedia(TOUCH_LAYOUT);
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');
  let current = '';
  let pointer: HTMLElement | null = null;
  let keyboard: HTMLElement | null = null;
  let release = 0;
  const hold = () => {
    clearTimeout(release);
    if (pointer || keyboard) root.dataset.focusHeld = 'true';
    else {
      // Leave enough time to move from a diamond to one of its company links.
      release = window.setTimeout(() => {
        root.dataset.focusHeld = 'false';
      }, 650);
    }
  };
  const select = (id: string) => {
    if (id === current || !stars.some((star) => star.dataset.sector === id))
      return;
    current = id;
    root.dataset.focus = id;
    stars.forEach((star) => {
      const active = star.dataset.sector === id;
      star.classList.toggle('is-active', active);
      star.setAttribute('aria-pressed', String(active));
      star.dataset.topologyState = active ? 'current' : 'unrelated';
    });
    panels.forEach((panel) => {
      const active = panel.dataset.sectorPanel === id;
      panel.style.display = active ? 'block' : 'none';
      panel.classList.toggle('is-active', active);
      panel.getAnimations().forEach((animation) => animation.cancel());
      if (active && motion.matches)
        panel.animate(
          [
            { opacity: 0, transform: 'translateY(6px)' },
            { opacity: 1, transform: 'translateY(0)' },
          ],
          { duration: 380, easing: 'ease-out' },
        );
    });
    scenes.forEach((scene) => {
      scene.hidden = scene.dataset.constellation !== id;
      scene
        .querySelectorAll<HTMLElement>('[data-topology-anchor]')
        .forEach((anchor) => {
          anchor.dataset.topologyState = scene.hidden
            ? 'unrelated'
            : 'connected';
        });
    });
    root.dispatchEvent(new Event('focuschange'));
  };
  root
    .querySelectorAll<HTMLElement>('[data-sector], [data-focus-sector]')
    .forEach((target) => {
      const id = target.dataset.sector || target.dataset.focusSector!;
      target.addEventListener('pointerenter', (event) => {
        if (
          touch.matches ||
          event.pointerType !== 'mouse' ||
          !matchMedia('(hover: hover) and (pointer: fine)').matches
        )
          return;
        pointer = target;
        target.dataset.hovered = 'true';
        hold();
        select(id);
        if (target.dataset.sector)
          root.dispatchEvent(
            new CustomEvent('focusfront', {
              detail: { immediate: reduceMotion.matches },
            }),
          );
      });
      target.addEventListener('pointerleave', () => {
        delete target.dataset.hovered;
        // Bringing a hovered sector to the foreground moves the element away
        // from the stationary cursor. Keep that intentional hover selection
        // held; the delegated pointermove below releases it only after the
        // person actually moves into the scene background.
        if (
          pointer === target &&
          target.dataset.sector &&
          ['settling', 'front'].includes(root.dataset.cameraState || '')
        )
          return;
        if (pointer === target) pointer = null;
        hold();
      });
      target.addEventListener('focus', () => {
        if (!target.matches(':focus-visible')) return;
        keyboard = target;
        hold();
        select(id);
      });
      target.addEventListener('blur', () => {
        if (keyboard === target) keyboard = null;
        hold();
      });
      if (target.dataset.sector)
        target.addEventListener('click', () => {
          const resume = root.dataset.focusPinned === 'true' && current === id;
          root.dataset.focusPinned = String(!resume);
          root.dataset.focusMode = resume ? 'auto' : 'paused';
          pointer = keyboard = null;
          clearTimeout(release);
          root.dataset.focusHeld = 'false';
          select(id);
          root.dispatchEvent(new Event('focushold'));
          // Keep the document fixed. The WebGL scene owns the transition that
          // brings the selected sector to the front and centre of its canvas.
          root.dispatchEvent(
            new CustomEvent('focusfront', {
              detail: { immediate: reduceMotion.matches },
            }),
          );
        });
    });
  const releaseBackgroundHover = (event: PointerEvent) => {
    if (
      !pointer ||
      touch.matches ||
      event.pointerType !== 'mouse' ||
      (event.target as Element).closest('[data-sector],[data-focus-sector]')
    )
      return;
    pointer = null;
    hold();
  };
  root.addEventListener('pointermove', releaseBackgroundHover);
  root.addEventListener('focusselect', (event) =>
    select((event as CustomEvent<string>).detail),
  );
  // Clear stale pointer/focus holds when switching between PC and touch layouts.
  touch.addEventListener('change', () => {
    pointer = keyboard = null;
    clearTimeout(release);
    root.dataset.focusHeld = 'false';
    root.dataset.focusPinned = 'false';
    root.dispatchEvent(new Event('focushold'));
  });
  select(stars[0]?.dataset.sector || '');
  window.addEventListener(
    'pagehide',
    () => {
      clearTimeout(release);
      root.removeEventListener('pointermove', releaseBackgroundHover);
    },
    { once: true },
  );
}

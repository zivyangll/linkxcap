export function initInlineVideo() {
  const video = document.querySelector<HTMLVideoElement>('[data-fellow-video]');
  const shell = video?.closest<HTMLElement>('[data-video-shell]');
  if (!video || !shell) return;
  const section = shell.closest<HTMLElement>('[data-fellow-media]');
  const desktopFinePointer = matchMedia(
    '(min-width: 1024px) and (hover: hover) and (pointer: fine)',
  );
  let request = 0;
  let visible = false;
  let expanded = section?.dataset.mediaExpanded === 'true';
  let pointerStarted = false;
  let manuallyPaused = false;
  const state = (value: string) => {
    shell.dataset.videoState = value;
    shell.setAttribute('aria-busy', String(value === 'loading'));
    video.setAttribute('aria-pressed', String(value === 'playing'));
  };
  const start = async () => {
    const current = ++request;
    state('loading');
    try {
      if (video.error) video.load();
      await video.play();
      if (current !== request || document.hidden) video.pause();
      else state('playing');
    } catch {
      if (current === request) state('error');
    }
  };
  const pause = () => {
    request++;
    video.pause();
    state('idle');
  };
  const syncAutoPlayback = () => {
    const shouldPlay =
      visible &&
      !document.hidden &&
      (expanded || !desktopFinePointer.matches || pointerStarted);
    if (shouldPlay && !manuallyPaused && video.paused) void start();
    else if ((!shouldPlay || manuallyPaused) && !video.paused) pause();
  };
  state('idle');
  const toggle = () => {
    if (!video.paused || shell.dataset.videoState === 'loading') {
      manuallyPaused = true;
      pause();
    } else {
      manuallyPaused = false;
      pointerStarted = true;
      void start();
    }
  };
  video.addEventListener('click', toggle);
  video.addEventListener('pointerenter', (event) => {
    if (event.pointerType !== 'mouse' || document.hidden) return;
    pointerStarted = true;
    manuallyPaused = false;
    if (video.paused) void start();
  });
  video.addEventListener('keydown', (event) => {
    if (!['Enter', ' '].includes(event.key)) return;
    event.preventDefault();
    toggle();
  });
  video.addEventListener('playing', () => state('playing'));
  video.addEventListener('waiting', () => state('loading'));
  video.addEventListener('error', () => state('error'));
  video.addEventListener('pause', () => state('idle'));
  video.addEventListener('ended', () => state('idle'));
  // Observe the actual video, not its very tall pinned section.
  const visibility = new IntersectionObserver(
    ([entry]) => {
      visible = entry.isIntersecting && entry.intersectionRatio >= 0.35;
      if (!visible) {
        pointerStarted = false;
        manuallyPaused = false;
      }
      syncAutoPlayback();
    },
    { threshold: [0, 0.35, 0.7] },
  );
  visibility.observe(video);
  const mediaChange = (event: Event) => {
    expanded = Boolean(
      (event as CustomEvent<{ expanded?: boolean }>).detail?.expanded,
    );
    syncAutoPlayback();
  };
  section?.addEventListener('fellowmediachange', mediaChange);
  const hide = () => {
    syncAutoPlayback();
  };
  document.addEventListener('visibilitychange', hide);
  window.addEventListener(
    'pagehide',
    () => {
      pause();
      visibility.disconnect();
      section?.removeEventListener('fellowmediachange', mediaChange);
      document.removeEventListener('visibilitychange', hide);
    },
    { once: true },
  );
}

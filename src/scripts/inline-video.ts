export function initInlineVideo() {
  const video = document.querySelector<HTMLVideoElement>('[data-fellow-video]');
  const shell = video?.closest<HTMLElement>('[data-video-shell]');
  const play = shell?.querySelector<HTMLButtonElement>('[data-video-play]');
  if (!video || !shell || !play) return;
  const section = shell.closest<HTMLElement>('[data-fellow-media]');
  let request = 0;
  let visible = false;
  let expanded = section?.dataset.mediaExpanded === 'true';
  const state = (value: string) => {
    shell.dataset.videoState = value;
    shell.setAttribute('aria-busy', String(value === 'loading'));
    play.hidden = value === 'playing';
    play.textContent =
      value === 'error' ? play.dataset.retry! : play.dataset.play!;
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
    if (expanded && visible && !document.hidden && video.paused) void start();
    else if ((!expanded || !visible || document.hidden) && !video.paused)
      pause();
  };
  state('idle');
  play.addEventListener('click', start);
  video.addEventListener('playing', () => state('playing'));
  video.addEventListener('waiting', () => state('loading'));
  video.addEventListener('error', () => state('error'));
  video.addEventListener('pause', () => state('idle'));
  video.addEventListener('ended', () => state('idle'));
  // Observe the actual video, not its very tall pinned section.
  const visibility = new IntersectionObserver(
    ([entry]) => {
      visible = entry.isIntersecting && entry.intersectionRatio >= 0.35;
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

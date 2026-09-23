export function initInlineVideo() {
  const video = document.querySelector<HTMLVideoElement>('[data-fellow-video]');
  const shell = video?.closest<HTMLElement>('[data-video-shell]');
  const play = shell?.querySelector<HTMLButtonElement>('[data-video-play]');
  if (!video || !shell || !play) return;
  let request = 0;
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
  state('idle');
  play.addEventListener('click', start);
  video.addEventListener('playing', () => state('playing'));
  video.addEventListener('waiting', () => state('loading'));
  video.addEventListener('error', () => state('error'));
  video.addEventListener('pause', () => state('idle'));
  video.addEventListener('ended', () => state('idle'));
  // Observe the actual video, not its very tall pinned section.
  const visibility = new IntersectionObserver(([entry]) => {
    if (!entry.isIntersecting) {
      request++;
      video.pause();
      state('idle');
    }
  });
  visibility.observe(video);
  const hide = () => {
    if (document.hidden) {
      request++;
      video.pause();
      state('idle');
    }
  };
  document.addEventListener('visibilitychange', hide);
  window.addEventListener(
    'pagehide',
    () => {
      request++;
      video.pause();
      visibility.disconnect();
      document.removeEventListener('visibilitychange', hide);
    },
    { once: true },
  );
}

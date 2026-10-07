// Transparent canvas particle backdrop (design hand-off: particle-motion-transparent).

/** Transparent Canvas 2D particle animation. The parent must have a width. */
export function createParticleMotion(
  canvas: HTMLCanvasElement,
  data: ArrayLike<number>,
  options: {
    speed?: number;
    spread?: number;
    color?: string;
    opacity?: number;
    maxDpr?: number;
    autoplay?: boolean;
  } = {},
) {
  const context = canvas.getContext('2d', { alpha: true });
  if (!context) throw new Error('Canvas 2D is unavailable');
  const ctx: CanvasRenderingContext2D = context;
  const settings = {
    speed: 2,
    spread: 0.7,
    color: '#202020',
    opacity: 1,
    maxDpr: 2,
    ...options,
  };
  let playing =
    options.autoplay ?? !matchMedia('(prefers-reduced-motion: reduce)').matches;
  let time = 0,
    last = 0,
    width = 0,
    height = 0,
    frame = 0,
    destroyed = false;
  canvas.style.background = 'transparent';
  canvas.style.display = 'block';
  canvas.style.width = '100%';
  canvas.style.aspectRatio = '4164 / 3662';
  function render() {
    ctx.globalAlpha = 1;
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = settings.color;
    const a = settings.spread,
      cycle = Math.sin(time * 0.7);
    const breath = 1 + cycle * 0.055 * a;
    const angle = Math.sin(time * 0.14) * 0.035,
      co = Math.cos(angle),
      si = Math.sin(angle);
    for (let i = 0; i < data.length; i += 3) {
      const x = data[i] / 10000 - 0.5,
        y = data[i + 1] / 10000 - 0.5,
        d = data[i + 2] / 255;
      const phase = i * 2.39996,
        loosen = 0.8 + 0.3 * cycle,
        mobility = 0.65 + 0.35 * (1 - d);
      const fx =
        (Math.sin(time * 0.55 + phase) * 0.01 +
          Math.sin(time * 0.27 + phase * 0.73) * 0.005) *
          a *
          loosen *
          mobility +
        Math.sin(y * 10 + time * 0.32) * 0.01 * a;
      const fy =
        (Math.cos(time * 0.45 + phase) * 0.01 +
          Math.sin(time * 0.31 + phase * 1.13) * 0.005) *
          a *
          loosen *
          mobility +
        Math.cos(x * 12 + time * 0.38) * 0.01 * a;
      const px = (0.5 + (x * co - y * si) * breath + fx) * width;
      const py = (0.5 + (x * si + y * co) * breath + fy) * height;
      ctx.globalAlpha =
        Math.min(0.8, 0.13 + d * 0.62) *
        (0.87 + 0.13 * Math.sin(time + phase)) *
        settings.opacity;
      const r = ((0.42 + d * 0.55) * width) / 736;
      ctx.fillRect(px, py, r, r);
    }
    ctx.globalAlpha = 1;
  }
  function tick(now: number) {
    frame = 0;
    if (destroyed || !playing || document.hidden) return;
    if (last) time += Math.min((now - last) / 1000, 0.05) * settings.speed;
    last = now;
    render();
    frame = requestAnimationFrame(tick);
  }
  function schedule() {
    if (!destroyed && playing && !document.hidden && !frame)
      frame = requestAnimationFrame(tick);
  }
  function resize() {
    width = canvas.clientWidth;
    height = (width * 3662) / 4164;
    const dpr = Math.min(devicePixelRatio || 1, settings.maxDpr);
    canvas.width = Math.max(1, Math.round(width * dpr));
    canvas.height = Math.max(1, Math.round(height * dpr));
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    render();
  }
  function visibility() {
    cancelAnimationFrame(frame);
    frame = 0;
    last = 0;
    schedule();
  }
  const observer = new ResizeObserver(resize);
  observer.observe(canvas);
  document.addEventListener('visibilitychange', visibility);
  resize();
  schedule();
  return {
    play() {
      if (destroyed) return;
      playing = true;
      last = 0;
      schedule();
    },
    pause() {
      playing = false;
      cancelAnimationFrame(frame);
      frame = 0;
      last = 0;
    },
    setOptions(next: { [key: string]: number | string | undefined }) {
      if (destroyed) return;
      for (const key of ['speed', 'spread', 'opacity', 'maxDpr'] as const) {
        const value = next[key];
        if (typeof value === 'number' && Number.isFinite(value))
          settings[key] = Math.max(key === 'maxDpr' ? 0.5 : 0, value);
      }
      settings.opacity = Math.min(1, settings.opacity);
      if (typeof next.color === 'string') settings.color = next.color;
      resize();
    },
    destroy() {
      destroyed = true;
      playing = false;
      cancelAnimationFrame(frame);
      observer.disconnect();
      document.removeEventListener('visibilitychange', visibility);
      ctx.clearRect(0, 0, width, height);
    },
  };
}

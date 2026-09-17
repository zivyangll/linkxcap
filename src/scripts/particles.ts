type Dot = { x: number; y: number; r: number; phase: number; speed: number };
export function createParticleField(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext('2d', { alpha: true });
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let frame = 0,
    width = 0,
    height = 0,
    last = 0,
    visible = false,
    paused = false,
    destroyed = false,
    count = 0,
    slow = 0;
  let dots: Dot[] = [];
  const device = navigator as Navigator & {
    deviceMemory?: number;
    connection?: { saveData?: boolean };
  };
  function size() {
    const box = canvas.getBoundingClientRect();
    width = box.width;
    height = box.height;
    const mobile = box.width < 768;
    const limited =
      (device.deviceMemory ?? 8) < 4 || device.connection?.saveData;
    const dpr = Math.min(
      devicePixelRatio,
      mobile ? 1.5 : 1.75,
      Math.sqrt((mobile ? 2e6 : 4e6) / Math.max(1, width * height)),
    );
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    ctx?.setTransform(dpr, 0, 0, dpr, 0, 0);
    count = reduced.matches ? 0 : limited ? 50 : mobile ? 95 : 360;
    // Deterministic seed prevents distracting flashes on resize and makes QA repeatable.
    let seed = 7321;
    const random = () => {
      seed = (seed * 16807) % 2147483647;
      return seed / 2147483647;
    };
    dots = Array.from({ length: count }, () => ({
      x: random() * width,
      y: random() * height,
      r: 0.35 + random() * 0.7,
      phase: random() * 6.28,
      speed: 0.1 + random() * 0.3,
    }));
    draw(0);
    sync();
  }
  function draw(time: number) {
    if (!ctx) return;
    ctx.clearRect(0, 0, width, height);
    for (let i = 0; i < count; i++) {
      const d = dots[i];
      const x = d.x + Math.sin(time * 0.00008 + d.phase) * 10;
      const y = d.y + Math.cos(time * 0.00005 * d.speed + d.phase) * 12;
      ctx.fillStyle = `rgba(178,162,255,${0.12 + 0.22 * (0.5 + Math.sin(d.phase + time * 0.0002) * 0.5)})`;
      ctx.fillRect(x, y, d.r, d.r);
    }
  }
  function tick(time: number) {
    frame = 0;
    if (!visible || paused || reduced.matches || document.hidden || destroyed)
      return;
    if (time - last >= 32) {
      const before = performance.now();
      draw(time);
      const elapsed = performance.now() - before;
      if (elapsed > 6) slow++;
      else slow = Math.max(0, slow - 1);
      if (slow > 15) {
        count = Math.max(25, Math.floor(count * 0.6));
        slow = 0;
      }
      last = time;
    }
    frame = requestAnimationFrame(tick);
  }
  function sync() {
    cancelAnimationFrame(frame);
    frame = 0;
    if (
      ctx &&
      visible &&
      !paused &&
      !reduced.matches &&
      !document.hidden &&
      !destroyed
    )
      frame = requestAnimationFrame(tick);
  }
  const io = new IntersectionObserver(
    (entries) => {
      visible = entries[0].isIntersecting;
      sync();
    },
    { threshold: 0.02 },
  );
  io.observe(canvas);
  const resize = new ResizeObserver(size);
  resize.observe(canvas);
  document.addEventListener('visibilitychange', sync);
  reduced.addEventListener('change', size);
  return {
    pause(value: boolean) {
      paused = value;
      sync();
    },
    destroy() {
      destroyed = true;
      cancelAnimationFrame(frame);
      io.disconnect();
      resize.disconnect();
      document.removeEventListener('visibilitychange', sync);
      reduced.removeEventListener('change', size);
      canvas.width = 0;
      canvas.height = 0;
      dots = [];
    },
  };
}

import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { PHILOSOPHY_ARC } from './philosophy-motion';

// Native scrolling stays enabled until a chapter threshold is crossed. Every
// stop uses the same measured settle so no chapter suddenly accelerates past
// the new intermediate Partnering screen.
export function mountChapterSnap(home: HTMLElement) {
  let anchors: number[] = [];
  let timer = 0;
  let direction = 1;
  let armed = false;
  let firstThreshold = 0;
  let tween: gsap.core.Tween | undefined;
  let previousBehavior = '';
  const finish = () => {
    if (home.dataset.snapping) {
      document.documentElement.style.scrollBehavior = previousBehavior;
      delete home.dataset.snapping;
    }
    tween = undefined;
    armed = false;
  };
  const cancel = () => {
    clearTimeout(timer);
    tween?.kill();
    finish();
  };
  const startSnap = (destination: number, y: number) => {
    if (tween || Math.abs(destination - y) < 2) return;
    const position = { y };
    previousBehavior = document.documentElement.style.scrollBehavior;
    document.documentElement.style.scrollBehavior = 'auto';
    home.dataset.snapping = 'true';
    const distance = Math.abs(destination - y);
    tween = gsap.to(position, {
      y: destination,
      // Every chapter uses the same calm settling speed. There is no special
      // accelerated orbit completion; the intermediate Partnering frame is a
      // real reading stop controlled by the user's scroll gesture.
      duration: gsap.utils.clamp(0.72, 1.35, 0.55 + distance / 1600),
      ease: 'sine.out',
      lazy: false,
      onUpdate: () => window.scrollTo(0, position.y),
      onComplete: finish,
    });
  };
  const settle = () => {
    if (
      !armed ||
      tween ||
      !anchors.length ||
      document.querySelector('dialog[open]')
    )
      return;
    const y = scrollY;
    if (y < anchors[0] || y > anchors.at(-1)! + 2) return;
    const lowerIndex = Math.max(
      0,
      anchors.findLastIndex((p) => p <= y),
    );
    const lower = anchors[lowerIndex];
    const upper = anchors[lowerIndex + 1];
    if (upper === undefined) return;
    let destination: number;
    if (direction > 0) {
      const threshold =
        lowerIndex === 0 ? firstThreshold : lower + (upper - lower) * 0.75;
      if (y < threshold) return;
      // The opening point clears the copy and settles on the Partnering
      // chapter. Each later gesture advances exactly one authored stop.
      destination = upper;
    } else {
      if ((upper - y) / (upper - lower) < 0.75) return;
      destination = lower;
    }
    startSnap(destination, y);
  };
  const navigate = (event: WheelEvent | KeyboardEvent) => {
    // While a chapter is settling, additional trackpad packets do not start a
    // competing transition.
    if (tween) return;
    cancel();
    if (document.querySelector('dialog[open]')) return;
    const target = event.target as Element | null;
    if (target?.closest('input, textarea, select, button, [contenteditable]'))
      return;
    if (event instanceof WheelEvent) {
      if (event.ctrlKey || Math.abs(event.deltaY) < 2) return;
      direction = Math.sign(event.deltaY);
    } else {
      if (
        !['ArrowDown', 'ArrowUp', 'PageDown', 'PageUp', ' '].includes(event.key)
      )
        return;
      direction =
        ['ArrowUp', 'PageUp'].includes(event.key) || event.shiftKey ? -1 : 1;
    }
    armed = true;
    timer = window.setTimeout(settle, 90);
  };
  const measure = ScrollTrigger.create({
    id: 'home-chapter-snap',
    trigger: home,
    start: 'top top',
    end: 'bottom bottom',
    onRefresh(self) {
      cancel();
      const philosophy = ScrollTrigger.getById('philosophy-stage-pin');
      const research = ScrollTrigger.getById('chapter-4');
      const focus = home.querySelector<HTMLElement>('.focus')!;
      if (!philosophy || !research) return;
      anchors = [
        self.start,
        philosophy.start +
          (philosophy.end - philosophy.start) * PHILOSOPHY_ARC.start,
        // The about label pose (frame 3) is the second reading stop.
        philosophy.start + (philosophy.end - philosophy.start) * 0.75,
        // The About stop is the completed junction pose: copy fully sharp,
        // active node centered in the ring, and no retired branch marker.
        // The downward handoff only starts after the next scroll gesture.
        philosophy.start + (philosophy.end - philosophy.start) * 0.94,
        research.start + (research.end - research.start) * 0.72,
        focus.getBoundingClientRect().top + scrollY,
      ].map((y) => Math.round(Math.max(self.start, Math.min(self.end, y))));
      const opening = home.querySelector<HTMLElement>('.opening')!;
      const copy = opening.querySelector<HTMLElement>('.opening-copy')!;
      const openingTrigger = ScrollTrigger.getById('chapter-1')!;
      const trailStart = (opening.clientWidth * 485.5) / 1920;
      const trailLength = opening.clientHeight - trailStart;
      const progress = gsap.utils.clamp(
        0.05,
        0.95,
        (copy.offsetTop + copy.offsetHeight - trailStart) / trailLength,
      );
      firstThreshold = Math.round(
        openingTrigger.start +
          (openingTrigger.end - openingTrigger.start) * progress,
      );
      home.dataset.snapStops = anchors.join(',');
      home.dataset.snapThresholds = anchors
        .slice(0, -1)
        .map((y, index) =>
          index === 0
            ? firstThreshold
            : Math.round(y + (anchors[index + 1] - y) * 0.75),
        )
        .join(',');
    },
  });
  const onScroll = () => {
    settle();
  };
  // While a chapter settles, the tween owns scrollY. Letting trackpad or key
  // scrolling through would fight its per-frame scrollTo and visibly jitter.
  const holdWhileSnapping = (event: WheelEvent | KeyboardEvent) => {
    if (!tween || event.defaultPrevented) return;
    if (event instanceof WheelEvent) {
      if (!event.ctrlKey) event.preventDefault();
      return;
    }
    if (
      [
        'ArrowDown',
        'ArrowUp',
        'PageDown',
        'PageUp',
        ' ',
        'Home',
        'End',
      ].includes(event.key) &&
      !(event.target as Element | null)?.closest(
        'input, textarea, select, [contenteditable]',
      )
    )
      event.preventDefault();
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('wheel', holdWhileSnapping, { passive: false });
  window.addEventListener('keydown', holdWhileSnapping);
  window.addEventListener('wheel', navigate, { passive: true });
  window.addEventListener('keydown', navigate);
  window.addEventListener('pointerdown', cancel, { passive: true });
  window.addEventListener('blur', cancel);
  return () => {
    cancel();
    measure.kill();
    window.removeEventListener('scroll', onScroll);
    window.removeEventListener('wheel', holdWhileSnapping);
    window.removeEventListener('keydown', holdWhileSnapping);
    window.removeEventListener('wheel', navigate);
    window.removeEventListener('keydown', navigate);
    window.removeEventListener('pointerdown', cancel);
    window.removeEventListener('blur', cancel);
    delete home.dataset.snapStops;
    delete home.dataset.snapThresholds;
  };
}

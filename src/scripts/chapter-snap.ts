import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { PHILOSOPHY_ARC } from './philosophy-motion';

// Native scrolling stays enabled until a chapter threshold is crossed. The
// orbit's one-third hand-off is detected during scrolling so a trackpad does
// not have to become idle before the remaining two thirds can complete.
export function mountChapterSnap(home: HTMLElement) {
  let anchors: number[] = [];
  let timer = 0;
  let direction = 1;
  let armed = false;
  let firstThreshold = 0;
  let arcThreshold = 0;
  let tween: gsap.core.Tween | undefined;
  let completingArc = false;
  let lastScrollY = scrollY;
  let previousBehavior = '';
  const finish = () => {
    if (home.dataset.snapping) {
      document.documentElement.style.scrollBehavior = previousBehavior;
      delete home.dataset.snapping;
    }
    if (completingArc) delete home.dataset.arcSnapActive;
    completingArc = false;
    tween = undefined;
    armed = false;
  };
  const cancel = () => {
    clearTimeout(timer);
    tween?.kill();
    finish();
  };
  const startSnap = (destination: number, y: number, arc = false) => {
    if (tween || Math.abs(destination - y) < 2) return;
    const position = { y };
    completingArc = arc;
    if (arc) home.dataset.arcSnapActive = 'true';
    previousBehavior = document.documentElement.style.scrollBehavior;
    document.documentElement.style.scrollBehavior = 'auto';
    home.dataset.snapping = 'true';
    const distance = Math.abs(destination - y);
    tween = gsap.to(position, {
      y: destination,
      // Begin with the user's existing scroll direction, then decelerate into
      // the chapter stop. The old in/out curve paused before accelerating,
      // which made the hand-off feel like a sudden grab.
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
        lowerIndex === 0
          ? firstThreshold
          : lowerIndex === 1
            ? arcThreshold
            : lower + (upper - lower) * 0.75;
      if (y < threshold) return;
      // The opening point clears the copy and settles on the AGI chapter.
      // The next gesture settles first at the About Us node, before its full copy.
      destination = upper;
    } else {
      if ((upper - y) / (upper - lower) < 0.75) return;
      destination = lower;
    }
    startSnap(destination, y);
  };
  const navigate = (event: WheelEvent | KeyboardEvent) => {
    // Once the orbit reaches one third, continued trackpad packets must not
    // cancel the automatic completion that is already in progress.
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
        philosophy.start + (philosophy.end - philosophy.start) * 0.06,
        philosophy.start + (philosophy.end - philosophy.start) * 0.58,
        philosophy.start + (philosophy.end - philosophy.start) * 0.97,
        research.start + (research.end - research.start) * 0.72,
        focus.getBoundingClientRect().top + scrollY,
      ].map((y) => Math.round(Math.max(self.start, Math.min(self.end, y))));
      const opening = home.querySelector<HTMLElement>('.opening')!;
      const copy = opening.querySelector<HTMLElement>('.opening-copy')!;
      const openingTrigger = ScrollTrigger.getById('chapter-1')!;
      const trailStart = (opening.clientWidth * 480) / 1920;
      const trailLength = opening.clientHeight * 0.556;
      const progress = gsap.utils.clamp(
        0.05,
        0.95,
        (copy.offsetTop + copy.offsetHeight - trailStart) / trailLength,
      );
      firstThreshold = Math.round(
        openingTrigger.start +
          (openingTrigger.end - openingTrigger.start) * progress,
      );
      // Invert the arc's smoothstep easing: hand off after one third of
      // the actual orbit distance, then finish the remaining two thirds.
      const oneThird = 0.5 - Math.sin(Math.asin(1 - 2 / 3) / 3);
      const arcProgress =
        PHILOSOPHY_ARC.start +
        (PHILOSOPHY_ARC.end - PHILOSOPHY_ARC.start) * oneThird;
      arcThreshold = Math.round(
        philosophy.start + (philosophy.end - philosophy.start) * arcProgress,
      );
      lastScrollY = scrollY;
      home.dataset.snapStops = anchors.join(',');
      home.dataset.snapThresholds = anchors
        .slice(0, -1)
        .map((y, index) =>
          index === 0
            ? firstThreshold
            : index === 1
              ? arcThreshold
              : Math.round(y + (anchors[index + 1] - y) * 0.75),
        )
        .join(',');
    },
  });
  const onScroll = () => {
    const y = scrollY;
    const movingDown = y > lastScrollY + 0.5;
    lastScrollY = y;
    if (
      armed &&
      direction > 0 &&
      movingDown &&
      !tween &&
      anchors.length > 2 &&
      y >= arcThreshold &&
      y < anchors[2] - 2 &&
      !document.querySelector('dialog[open]')
    ) {
      clearTimeout(timer);
      armed = true;
      direction = 1;
      startSnap(anchors[2], y, true);
      return;
    }
    settle();
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('wheel', navigate, { passive: true });
  window.addEventListener('keydown', navigate);
  window.addEventListener('pointerdown', cancel, { passive: true });
  window.addEventListener('blur', cancel);
  return () => {
    cancel();
    measure.kill();
    window.removeEventListener('scroll', onScroll);
    window.removeEventListener('wheel', navigate);
    window.removeEventListener('keydown', navigate);
    window.removeEventListener('pointerdown', cancel);
    window.removeEventListener('blur', cancel);
    delete home.dataset.snapStops;
    delete home.dataset.snapThresholds;
    delete home.dataset.arcSnapActive;
  };
}

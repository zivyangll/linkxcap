// PC and touch choreography have separate lifetimes and never own the same pose.
export const DESKTOP_MOTION =
  '(min-width: 1024px) and (hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)';
export const MOBILE_MOTION =
  '(max-width: 1023px) and (prefers-reduced-motion: no-preference), (hover: none) and (prefers-reduced-motion: no-preference), (pointer: coarse) and (prefers-reduced-motion: no-preference)';

export const TOPOLOGY_MOTION = '(prefers-reduced-motion: no-preference)';
export const TOUCH_LAYOUT =
  '(max-width: 1023px), (hover: none), (pointer: coarse)';

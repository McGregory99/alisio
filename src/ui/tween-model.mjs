// Pure number tween: exponential approach, frame-rate independent. No DOM.
/** Move `current` toward `target` over `dt` seconds with time constant `tau`; snaps once within `epsilon`. */
export function approach(current, target, dt, { tau = 0.22, epsilon = 0.005 } = {}) {
  if (current === target || dt <= 0) return current;
  const next = target + (current - target) * Math.exp(-dt / tau);
  return Math.abs(next - target) <= epsilon ? target : next;
}

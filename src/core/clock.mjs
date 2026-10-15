// Simulation clock: sim = anchorSim + (real - anchorReal) * rate. All time-dependent logic reads this.
export const RATES = Object.freeze([1, 10, 60, 600]);

/** @param {{realNow?: () => number, simStart?: number}} opts realNow returns epoch ms; simStart defaults to realNow() (live). */
export function createSimClock({ realNow = Date.now, simStart } = {}) {
  let anchorReal = realNow();
  let anchorSim = simStart ?? anchorReal;
  let rate = 1;
  let paused = false;
  let live = simStart === undefined;

  const now = () => (paused ? anchorSim : anchorSim + (realNow() - anchorReal) * rate);
  const reanchor = (sim = now()) => { anchorSim = sim; anchorReal = realNow(); };

  return {
    now,
    rate: () => rate,
    isPaused: () => paused,
    isLive: () => live && rate === 1 && !paused,
    setRate(r) {
      if (!RATES.includes(r)) throw new RangeError(`rate must be one of ${RATES.join(', ')}`);
      reanchor();
      rate = r;
      live = false;
    },
    pause() { reanchor(); paused = true; live = false; },
    resume() { reanchor(); paused = false; },
    seek(sim) { reanchor(sim); live = false; },
    goLive() { anchorReal = realNow(); anchorSim = anchorReal; rate = 1; paused = false; live = true; },
  };
}

/**
 * Authentic Hotel & Restaurant Service Desk Bell Synthesizer (Web Audio API)
 * Models the inharmonic modal partials, clapper attack transient, and warm brass decay
 * of a real spun-brass concierge / kitchen service bell — zero external network dependency.
 */

let sharedAudioCtx = null;
let unlockListenersAttached = false;

const getAudioContext = () => {
  if (typeof window === 'undefined') return null;
  const AudioCtx = window.AudioContext || window['webkitAudioContext'];
  if (!AudioCtx) return null;

  if (!sharedAudioCtx || sharedAudioCtx.state === 'closed') {
    sharedAudioCtx = new AudioCtx();
  }
  return sharedAudioCtx;
};

/** Unlock AudioContext on first user gesture so live waiter alerts never get muted by autoplay policy */
export const unlockHotelBellAudio = () => {
  if (typeof window === 'undefined' || unlockListenersAttached) return;
  unlockListenersAttached = true;

  const resume = () => {
    const ctx = getAudioContext();
    if (ctx && ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }
  };

  window.addEventListener('pointerdown', resume, { passive: true });
  window.addEventListener('keydown', resume, { passive: true });
};

/** Schedule one spun-brass desk bell strike at `startTime` */
const scheduleBrassBellStrike = (ctx, destination, startTime, gainScale = 1) => {
  // Fundamental around E6 (1318.51 Hz) — signature bright hotel concierge & kitchen pass bell pitch
  const f0 = 1318.51;

  // 1. Crisp metallic clapper strike transient (~18ms)
  const strikeOsc = ctx.createOscillator();
  const strikeGain = ctx.createGain();
  strikeOsc.type = 'triangle';
  strikeOsc.frequency.setValueAtTime(4350, startTime);
  strikeOsc.frequency.exponentialRampToValueAtTime(2400, startTime + 0.018);

  strikeGain.gain.setValueAtTime(0.0001, startTime);
  strikeGain.gain.linearRampToValueAtTime(0.28 * gainScale, startTime + 0.0015);
  strikeGain.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.024);

  strikeOsc.connect(strikeGain);
  strikeGain.connect(destination);
  strikeOsc.start(startTime);
  strikeOsc.stop(startTime + 0.03);

  // 2. Spun-brass dome modal partials (including the classic ~2.404x inharmonic minor-third bell partial)
  const partials = [
    { freq: f0 * 0.5, amp: 0.11, decay: 0.95 }, // Warm hollow hum
    { freq: f0, amp: 0.44, decay: 1.85 }, // Primary dome resonance
    { freq: f0 + 1.9, amp: 0.17, decay: 1.65 }, // Natural metallic shimmer beating
    { freq: f0 * 2.0, amp: 0.25, decay: 1.15 }, // Bright octave overtone
    { freq: f0 * 2.404, amp: 0.19, decay: 0.85 }, // Signature brass bell minor-third partial
    { freq: f0 * 3.0, amp: 0.12, decay: 0.52 }, // Twelfth brilliance
    { freq: f0 * 4.018, amp: 0.06, decay: 0.28 }, // High brass sparkle
  ];

  partials.forEach(({ freq, amp, decay }) => {
    const osc = ctx.createOscillator();
    const env = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, startTime);

    env.gain.setValueAtTime(0.0001, startTime);
    env.gain.linearRampToValueAtTime(amp * gainScale, startTime + 0.003);
    env.gain.exponentialRampToValueAtTime(0.0001, startTime + decay);

    osc.connect(env);
    env.connect(destination);
    osc.start(startTime);
    osc.stop(startTime + decay + 0.04);
  });
};

/**
 * Play realistic Hotel & Restaurant Service Bell ("Ding-Ding!")
 * @param {Object} [options]
 * @param {number} [options.strikes=2] Number of crisp bell taps (1 or 2)
 * @param {number} [options.volume=0.72] Output gain multiplier (0.0 - 1.0)
 */
export const playHotelServiceBell = async ({ strikes = 2, volume = 0.72 } = {}) => {
  try {
    const ctx = getAudioContext();
    if (!ctx) return false;

    if (ctx.state === 'suspended') {
      await ctx.resume().catch(() => {});
    }

    const compressor = ctx.createDynamicsCompressor();
    compressor.threshold.setValueAtTime(-12, ctx.currentTime);
    compressor.knee.setValueAtTime(8, ctx.currentTime);
    compressor.ratio.setValueAtTime(4, ctx.currentTime);
    compressor.attack.setValueAtTime(0.002, ctx.currentTime);
    compressor.release.setValueAtTime(0.25, ctx.currentTime);

    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(Math.max(0.05, Math.min(1, volume)), ctx.currentTime);

    compressor.connect(masterGain);
    masterGain.connect(ctx.destination);

    const now = ctx.currentTime + 0.01;
    if (strikes <= 1) {
      scheduleBrassBellStrike(ctx, compressor, now, 1.0);
    } else {
      // Classic hotel concierge double-ring ("Ding — Ding!")
      scheduleBrassBellStrike(ctx, compressor, now, 0.92);
      scheduleBrassBellStrike(ctx, compressor, now + 0.23, 1.0);
    }

    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      try {
        navigator.vibrate([80, 45, 130]);
      } catch {}
    }
    return true;
  } catch (err) {
    return false;
  }
};

// Synthesised sound, no audio files: an engine hum that follows
// the throttle, a two-note chime when a ring clears, a thud for a
// hard arrival and a beep for warnings. Everything is guarded, so
// a browser without audio still plays the game in silence.

export function createAudio() {
  let ctx = null;
  let master = null;
  let engineOsc = null;
  let engineGain = null;
  let engineFilter = null;

  function ensure() {
    if (ctx) return true;
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return false;
      ctx = new AudioCtx();
      master = ctx.createGain();
      master.gain.value = 0.4;
      master.connect(ctx.destination);
      engineOsc = ctx.createOscillator();
      engineOsc.type = 'sawtooth';
      engineOsc.frequency.value = 55;
      engineFilter = ctx.createBiquadFilter();
      engineFilter.type = 'lowpass';
      engineFilter.frequency.value = 420;
      engineGain = ctx.createGain();
      engineGain.gain.value = 0;
      engineOsc.connect(engineFilter);
      engineFilter.connect(engineGain);
      engineGain.connect(master);
      engineOsc.start();
      return true;
    } catch {
      return false;
    }
  }

  function tone(freq, dur, type, vol, when = 0) {
    if (!ctx) return;
    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.value = freq;
      const t = ctx.currentTime + when;
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(vol, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
      osc.connect(gain);
      gain.connect(master);
      osc.start(t);
      osc.stop(t + dur + 0.05);
    } catch {
      // Silence is always an acceptable fallback.
    }
  }

  return {
    /** Create the context on a user gesture, as browsers require. */
    unlock() {
      if (ensure() && ctx.state === 'suspended') ctx.resume().catch(() => {});
    },
    /** The engine follows throttle and speed; call every frame. */
    setEngine(throttle, speed) {
      if (!ctx) return;
      try {
        const t = ctx.currentTime;
        engineOsc.frequency.setTargetAtTime(48 + throttle * 75 + speed * 0.25, t, 0.12);
        engineGain.gain.setTargetAtTime(0.015 + throttle * 0.05, t, 0.12);
      } catch {
        // Keep flying even if the audio graph breaks.
      }
    },
    /** Two bright notes when a ring clears. */
    chime() {
      if (!ensure()) return;
      tone(880, 0.35, 'sine', 0.22);
      tone(1318, 0.5, 'sine', 0.18, 0.09);
    },
    /** A low thud for a hard landing or a crash. */
    thud() {
      if (!ensure()) return;
      try {
        const len = Math.floor(ctx.sampleRate * 0.25);
        const buffer = ctx.createBuffer(1, len, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < len; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
        const src = ctx.createBufferSource();
        src.buffer = buffer;
        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 220;
        const gain = ctx.createGain();
        gain.gain.value = 0.5;
        src.connect(filter);
        filter.connect(gain);
        gain.connect(master);
        src.start();
      } catch {
        // Silence is always an acceptable fallback.
      }
    },
    /** A short warning beep. */
    beep() {
      if (!ensure()) return;
      tone(440, 0.18, 'square', 0.1);
    },
  };
}

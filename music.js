export function createMusic(initiallyEnabled) {
  let enabled = initiallyEnabled;
  let context;
  let output;
  let softNoise;

  function arm() {
    if (!enabled) return;
    try {
      if (!context) {
        const Audio = window.AudioContext || window.webkitAudioContext;
        if (!Audio) return;
        context = new Audio();
        output = context.createGain();
        output.gain.value = 0.45;
        const compressor = context.createDynamicsCompressor();
        output.connect(compressor).connect(context.destination);
        const length = Math.floor(context.sampleRate * 0.1);
        softNoise = context.createBuffer(1, length, context.sampleRate);
        const samples = softNoise.getChannelData(0);
        for (let i = 0; i < length; i += 1) samples[i] = Math.random() * 2 - 1;
      }
      if (context.state !== "running") context.resume().catch(() => {});
      volume(0.45);
    } catch {
      // The visual rhythm and touch controls work when audio is unavailable.
    }
  }

  function volume(level) {
    if (!output) return;
    output.gain.cancelScheduledValues(context.currentTime);
    output.gain.setTargetAtTime(level, context.currentTime, 0.045);
  }

  function connectVoice(source, start, duration, peak) {
    const envelope = context.createGain();
    envelope.gain.setValueAtTime(0.0001, start);
    envelope.gain.exponentialRampToValueAtTime(peak, start + 0.012);
    envelope.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    source.connect(envelope).connect(output);
    source.start(start);
    source.stop(start + duration + 0.015);
    source.onended = () => {
      source.disconnect();
      envelope.disconnect();
    };
  }

  function tone(frequency, offset, duration, peak, shape = "sine", endFrequency = frequency) {
    if (!enabled || !output || context.state !== "running") return;
    const start = context.currentTime + offset;
    const oscillator = context.createOscillator();
    oscillator.type = shape;
    oscillator.frequency.setValueAtTime(frequency, start);
    oscillator.frequency.exponentialRampToValueAtTime(endFrequency, start + duration);
    connectVoice(oscillator, start, duration, peak);
  }

  function note(track, dancer, offset = 0) {
    const pitch = track.notes[dancer];
    tone(pitch, offset, 0.38, 0.18, "triangle");
    tone(pitch * 2, offset, 0.13, 0.042);
  }

  function sparkle(track) {
    const root = track.notes[0];
    [1, 1.5, 2].forEach((ratio, index) => tone(root * ratio, index * 0.074, 0.29, 0.105));
  }

  function hat(offset) {
    if (!enabled || !softNoise || context.state !== "running") return;
    const source = context.createBufferSource();
    source.buffer = softNoise;
    const filter = context.createBiquadFilter();
    filter.type = "highpass";
    filter.frequency.value = 4750;
    const envelope = context.createGain();
    const start = context.currentTime + offset;
    envelope.gain.setValueAtTime(0.09, start);
    envelope.gain.exponentialRampToValueAtTime(0.0001, start + 0.08);
    source.connect(filter).connect(envelope).connect(output);
    source.start(start);
    source.onended = () => { source.disconnect(); filter.disconnect(); envelope.disconnect(); };
  }

  function party(track, dancers) {
    const halfBeat = 30 / track.tempo;
    dancers.forEach((dancer, index) => {
      const offset = index * halfBeat;
      note(track, dancer, offset);
      if (index % 2 === 0) {
        tone(112, offset, 0.22, 0.20, "sine", 42);
        tone(track.notes[index % 4 === 0 ? 0 : 2] / 4, offset + 0.025, 0.37, 0.13, "triangle");
      } else {
        hat(offset);
      }
    });
    [0, 1, 2].forEach((dancer, index) => tone(track.notes[dancer], dancers.length * halfBeat, 0.75, 0.076 - index * 0.011));
  }

  return {
    arm, note, sparkle, party,
    nudge(track) { tone(track.notes[0] / 2, 0, 0.29, 0.09); },
    quiet() { volume(0); },
    get enabled() { return enabled; },
    toggle() { enabled = !enabled; if (enabled) arm(); else volume(0); },
  };
}

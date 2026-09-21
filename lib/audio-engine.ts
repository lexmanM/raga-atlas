import { centsFor, type Swara } from './ragas';

export type Voice = 'veena' | 'chitravina' | 'swarmandal' | 'harmonium';
export type Temperament = 'just' | 'equal';
export type PlaybackHandle = { stop: () => void };

let context: AudioContext | null = null;
let reverb: ConvolverNode | null = null;
let analyser: AnalyserNode | null = null;
const stringBuffers = new Map<string, AudioBuffer>();

// WebKit runs Web Audio through the ambient audio session, which the ring/silent
// switch mutes, so an iPhone on silent plays nothing while the page looks fine.
// Asking for the playback session opts into sounding like a media player.
// Safari 16.4+; absent elsewhere, where the switch does not apply anyway.
type AudioSessionNavigator = Navigator & { audioSession?: { type: string } };

const getContext = () => {
  const { audioSession } = navigator as AudioSessionNavigator;
  if (audioSession) audioSession.type = 'playback';
  // No forced sample rate: iOS resamples the whole graph when it disagrees with
  // the hardware. Every buffer below is built from ctx.sampleRate regardless.
  context ??= new AudioContext();
  if (!analyser) {
    analyser = context.createAnalyser();
    analyser.fftSize = 4096;
    analyser.smoothingTimeConstant = 0.78;
    analyser.connect(context.destination);
  }
  if (context.state === 'suspended') void context.resume();
  return context;
};

export function getAudioAnalyser() {
  return analyser;
}

function impulse(ctx: AudioContext) {
  if (reverb) return reverb;
  const length = Math.floor(ctx.sampleRate * 2.6);
  const buffer = ctx.createBuffer(2, length, ctx.sampleRate);
  for (let channel = 0; channel < 2; channel++) {
    const data = buffer.getChannelData(channel);
    for (let i = 0; i < length; i++) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, 2.4);
  }
  reverb = ctx.createConvolver(); reverb.buffer = buffer; reverb.connect(ctx.destination);
  return reverb;
}

function karplusBuffer(ctx: AudioContext, frequency: number, seconds = 3.4) {
  const key = `${frequency.toFixed(3)}:${seconds}`;
  const cached = stringBuffers.get(key); if (cached) return cached;
  const length = Math.floor(ctx.sampleRate * seconds); const delay = Math.max(2, Math.round(ctx.sampleRate / frequency));
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate); const data = buffer.getChannelData(0);
  for (let i = 0; i < delay; i++) data[i] = Math.random() * 2 - 1;
  for (let i = delay; i < length; i++) data[i] = 0.4985 * (data[i - delay] + data[Math.max(0, i - delay - 1)]);
  for (let i = 0; i < length; i++) data[i] *= Math.min(1, (length - i) / (ctx.sampleRate * .3));
  stringBuffers.set(key, buffer); return buffer;
}

function wetAndDry(ctx: AudioContext, source: AudioNode, output: GainNode, wet = .34) {
  source.connect(output); const send = ctx.createGain(); send.gain.value = wet; source.connect(send); send.connect(impulse(ctx));
}

function scheduleVeena(ctx: AudioContext, frequency: number, start: number, duration: number, output: GainNode) {
  const source = ctx.createBufferSource(); source.buffer = karplusBuffer(ctx, frequency, Math.max(3.4, duration + .5)); const peak = ctx.createBiquadFilter(); peak.type = 'peaking'; peak.frequency.value = 440; peak.Q.value = 2.2; peak.gain.value = 5; const lowpass = ctx.createBiquadFilter(); lowpass.type = 'lowpass'; lowpass.frequency.value = 5200;
  // A plucked string is damped, not cut: let it ring to the beat, then fade.
  const release = .22; const gain = ctx.createGain(); gain.gain.setValueAtTime(.5, start); gain.gain.setValueAtTime(.5, start + duration); gain.gain.exponentialRampToValueAtTime(.0001, start + duration + release);
  source.connect(peak); peak.connect(lowpass); wetAndDry(ctx, lowpass, gain); gain.connect(output); source.start(start); source.stop(start + duration + release);
}

function scheduleChitravina(ctx: AudioContext, frequency: number, previous: number, start: number, duration: number, output: GainNode, kampita: boolean, fixed: boolean) {
  // Fretless slide string: one pluck, then the pitch is carried into place by the slide rather than re-attacked.
  const source = ctx.createBufferSource(); source.buffer = karplusBuffer(ctx, frequency, Math.max(3.4, duration + .6));
  const glide = 1200 * Math.log2(Math.max(1, previous) / frequency); source.detune.setValueAtTime(glide, start); source.detune.linearRampToValueAtTime(0, start + Math.min(.16, duration * .35));
  const vibrato = ctx.createOscillator(); const vibratoGain = ctx.createGain(); vibrato.frequency.value = 5.4; vibratoGain.gain.setValueAtTime(0, start); vibratoGain.gain.linearRampToValueAtTime(kampita && !fixed ? 38 : 0, start + duration * .5); vibrato.connect(vibratoGain); vibratoGain.connect(source.detune);
  const body = ctx.createBiquadFilter(); body.type = 'peaking'; body.frequency.value = 300; body.Q.value = 1.6; body.gain.value = 4; const lowpass = ctx.createBiquadFilter(); lowpass.type = 'lowpass'; lowpass.frequency.value = 3400;
  const release = .3; const gain = ctx.createGain(); gain.gain.setValueAtTime(.5, start); gain.gain.setValueAtTime(.5, start + duration); gain.gain.exponentialRampToValueAtTime(.0001, start + duration + release);
  source.connect(body); body.connect(lowpass); wetAndDry(ctx, lowpass, gain, .4); gain.connect(output); vibrato.start(start); vibrato.stop(start + duration + release); source.start(start); source.stop(start + duration + release);
}

function scheduleSwarmandal(ctx: AudioContext, frequency: number, start: number, duration: number, output: GainNode) {
  // Open harp strings: bright fundamental with a quiet octave shimmer, damped short so runs stay legible.
  const mix = ctx.createGain();
  [[frequency, .5], [frequency * 2, .16]].forEach(([hz, level]) => { const source = ctx.createBufferSource(); source.buffer = karplusBuffer(ctx, hz, Math.max(3.4, duration + .5)); const amp = ctx.createGain(); amp.gain.value = level; source.connect(amp); amp.connect(mix); source.start(start); source.stop(start + duration + .34); });
  const highpass = ctx.createBiquadFilter(); highpass.type = 'highpass'; highpass.frequency.value = 180; const lowpass = ctx.createBiquadFilter(); lowpass.type = 'lowpass'; lowpass.frequency.value = 7200;
  const release = .32; const gain = ctx.createGain(); gain.gain.setValueAtTime(.5, start); gain.gain.setValueAtTime(.5, start + duration * .8); gain.gain.exponentialRampToValueAtTime(.0001, start + duration + release);
  mix.connect(highpass); highpass.connect(lowpass); wetAndDry(ctx, lowpass, gain, .28); gain.connect(output);
}

// A harmonium is a free reed: it sustains for as long as the bellows feed it and
// has no pluck to model, so this voice is sampled rather than synthesised. The
// takes are one octave of a single instrument with the coupled stop drawn —
// see public/audio/harmonium/README.md. Each `hz` is that sample's MEASURED
// fundamental, not its nominal pitch: the reeds are filed by hand and sit a few
// cents sharp, and dividing by the measured value cancels that drift so Just and
// Equal both land exactly. Do not round these to equal-temperament values.
type HarmoniumSample = { file: string; hz: number; loopStart: number; loopEnd: number };
const HARMONIUM_SAMPLES: readonly HarmoniumSample[] = [
  { file: 'coupled_C3.wav', hz: 130.85, loopStart: 0.54998, loopEnd: 1.62689 },
  { file: 'coupled_D3.wav', hz: 147.35, loopStart: 0.54998, loopEnd: 1.75810 },
  { file: 'coupled_E3.wav', hz: 165.35, loopStart: 0.54998, loopEnd: 1.76512 },
  { file: 'coupled_Fs3.wav', hz: 185.65, loopStart: 0.54998, loopEnd: 1.57918 },
  { file: 'coupled_Gs3.wav', hz: 208.30, loopStart: 0.54998, loopEnd: 1.58249 },
  { file: 'coupled_As3.wav', hz: 234.05, loopStart: 0.54998, loopEnd: 1.65673 },
  { file: 'coupled_B3.wav', hz: 248.35, loopStart: 0.54998, loopEnd: 1.71823 },
];

const harmoniumBuffers = new Map<string, AudioBuffer>();
let harmoniumLoad: Promise<void> | null = null;

/** Fetch and decode the harmonium takes. Safe to call repeatedly; the UI calls
 *  this as soon as the voice is picked so playback never waits on the network. */
export function loadHarmonium(): Promise<void> {
  harmoniumLoad ??= (async () => {
    const ctx = getContext();
    // Vite rewrites BASE_URL for the GitHub Pages subpath; never hardcode '/'.
    const base = import.meta.env.BASE_URL;
    await Promise.all(HARMONIUM_SAMPLES.map(async (sample) => {
      const response = await fetch(`${base}audio/harmonium/${sample.file}`);
      if (!response.ok) throw new Error(`harmonium sample ${sample.file}: HTTP ${response.status}`);
      harmoniumBuffers.set(sample.file, await ctx.decodeAudioData(await response.arrayBuffer()));
    }));
  })().catch((error: unknown) => { harmoniumLoad = null; throw error; });
  return harmoniumLoad;
}

function harmoniumSampleFor(frequency: number) {
  let best = HARMONIUM_SAMPLES[0]; let closest = Infinity;
  for (const sample of HARMONIUM_SAMPLES) {
    const distance = Math.abs(Math.log2(frequency / sample.hz));
    if (distance < closest) { closest = distance; best = sample; }
  }
  return best;
}

function scheduleHarmonium(ctx: AudioContext, frequency: number, start: number, duration: number, output: GainNode) {
  const sample = harmoniumSampleFor(frequency);
  const buffer = harmoniumBuffers.get(sample.file);
  if (!buffer) return;
  const source = ctx.createBufferSource(); source.buffer = buffer;
  source.playbackRate.value = frequency / sample.hz;
  source.loop = true; source.loopStart = sample.loopStart; source.loopEnd = sample.loopEnd;
  // The take carries the reed's own attack, so the envelope only opens far enough
  // to avoid a click; and a reed stops when the air does, so it never rings out.
  const release = .16; const level = .46;
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(.0001, start); gain.gain.exponentialRampToValueAtTime(level, start + .012);
  gain.gain.setValueAtTime(level, start + duration); gain.gain.exponentialRampToValueAtTime(.0001, start + duration + release);
  // Send after the envelope, not before: this source loops, so a pre-envelope
  // send would keep feeding the reverb for the whole buffer.
  source.connect(gain); gain.connect(output);
  const send = ctx.createGain(); send.gain.value = .1; gain.connect(send); send.connect(impulse(ctx));
  source.start(start); source.stop(start + duration + release + .02);
}

export function playRaga(options: { sequence: Swara[]; sruti: number; temperament: Temperament; voice?: Voice; kampita: boolean; tempo?: number; onSwara: (swara: Swara | null, index: number) => void }): PlaybackHandle {
  const ctx = getContext(); const output = ctx.createGain(); output.gain.value = .64; output.connect(analyser ?? ctx.destination); const voice = options.voice ?? 'veena'; const beat = .72 / (options.tempo ?? 1); const schedule = options.sequence;
  // The last note of the descent is held so the phrase lands rather than stops.
  const lengthOf = (index: number) => index === schedule.length - 1 ? beat * 1.6 : beat;
  const starts: number[] = []; let finish = Number.POSITIVE_INFINITY; let stopped = false;
  const begin = () => {
    if (stopped) return;
    let cursor = ctx.currentTime + .08;
    for (let index = 0; index < schedule.length; index++) { starts[index] = cursor; cursor += lengthOf(index); }
    finish = cursor + .25;
    schedule.forEach((swara, index) => { const frequency = options.sruti * Math.pow(2, centsFor(swara.semitones, options.temperament) / 1200); const prev = index === 0 ? frequency : options.sruti * Math.pow(2, centsFor(schedule[index - 1].semitones, options.temperament) / 1200); const fixed = swara.semitones % 12 === 0 || swara.semitones === 7; if (voice === 'chitravina') scheduleChitravina(ctx, frequency, prev, starts[index], lengthOf(index), output, options.kampita, fixed); else if (voice === 'swarmandal') scheduleSwarmandal(ctx, frequency, starts[index], lengthOf(index), output); else if (voice === 'harmonium') scheduleHarmonium(ctx, frequency, starts[index], lengthOf(index), output); else scheduleVeena(ctx, frequency, starts[index], lengthOf(index), output); });
  };
  // Harmonium is sampled, so the phrase waits for the takes to decode rather than
  // starting silently. Every other voice is synthesised and can start at once.
  if (voice === 'harmonium') void loadHarmonium().then(begin, () => { finish = ctx.currentTime; });
  else begin();
  let raf = 0; const tick = () => { const now = ctx.currentTime; let at = -1; for (let index = 0; index < starts.length; index++) if (now >= starts[index] && now < starts[index] + lengthOf(index)) at = index; options.onSwara(at < 0 ? null : schedule[at], at); if (now < finish) raf = requestAnimationFrame(tick); else options.onSwara(null, -1); }; raf = requestAnimationFrame(tick);
  return { stop: () => { stopped = true; cancelAnimationFrame(raf); output.gain.cancelScheduledValues(ctx.currentTime); output.gain.setTargetAtTime(0, ctx.currentTime, .02); options.onSwara(null, -1); } };
}

export function startDrone(sruti: number): PlaybackHandle {
  const ctx = getContext(); const output = ctx.createGain(); output.gain.value = .22; output.connect(analyser ?? ctx.destination); const frequencies = [sruti * .75, sruti, sruti, sruti / 2]; const sources: AudioBufferSourceNode[] = [];
  for (let i = 0; i < 48; i++) { const frequency = frequencies[i % 4]; const source = ctx.createBufferSource(); source.buffer = karplusBuffer(ctx, frequency, 2.6); source.connect(output); source.start(ctx.currentTime + .04 + i * .64); sources.push(source); }
  return { stop: () => { output.gain.setTargetAtTime(0, ctx.currentTime, .03); sources.forEach((source) => { try { source.stop(ctx.currentTime + .2); } catch {} }); } };
}

export function playSustainedNote(options: { frequency: number; voice?: Voice; temperament?: Temperament; sruti?: number; kampita?: boolean }): PlaybackHandle {
  const ctx = getContext();
  const output = ctx.createGain();
  output.gain.value = .64;
  output.connect(analyser ?? ctx.destination);
  const voice = options.voice ?? 'veena';
  const start = ctx.currentTime;
  const longDuration = 60; // 60 seconds; interrupted by stop()

  const frequency = options.frequency;
  const fixed = frequency % 130.81 === 0; // rough check for fixed notes (Sa frequency)

  let stopped = false;
  const begin = () => {
    if (stopped) return;
    // A deferred start cannot use the captured `start`, which is already in the past.
    const at = Math.max(start, ctx.currentTime);
    if (voice === 'chitravina') {
      scheduleChitravina(ctx, frequency, frequency, at, longDuration, output, options.kampita ?? false, fixed);
    } else if (voice === 'swarmandal') {
      scheduleSwarmandal(ctx, frequency, at, longDuration, output);
    } else if (voice === 'harmonium') {
      scheduleHarmonium(ctx, frequency, at, longDuration, output);
    } else {
      scheduleVeena(ctx, frequency, at, longDuration, output);
    }
  };
  if (voice === 'harmonium') void loadHarmonium().then(begin, () => {});
  else begin();

  return {
    stop: () => {
      stopped = true;
      output.gain.cancelScheduledValues(ctx.currentTime);
      output.gain.setTargetAtTime(0, ctx.currentTime, .12); // fade out over ~350ms
    }
  };
}

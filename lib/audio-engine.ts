import { centsFor, type Swara } from './ragas';

export type Voice = 'veena' | 'chitravina' | 'swarmandal';
export type Temperament = 'just' | 'equal';
export type PlaybackHandle = { stop: () => void };

let context: AudioContext | null = null;
let reverb: ConvolverNode | null = null;
let analyser: AnalyserNode | null = null;
const stringBuffers = new Map<string, AudioBuffer>();

const getContext = () => {
  context ??= new AudioContext({ sampleRate: 48000 });
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

export function playRaga(options: { sequence: Swara[]; sruti: number; temperament: Temperament; voice?: Voice; kampita: boolean; tempo?: number; onSwara: (swara: Swara | null, index: number) => void }): PlaybackHandle {
  const ctx = getContext(); const output = ctx.createGain(); output.gain.value = .64; output.connect(analyser ?? ctx.destination); const voice = options.voice ?? 'veena'; const beat = .72 / (options.tempo ?? 1); const schedule = options.sequence;
  // The last note of the descent is held so the phrase lands rather than stops.
  const lengthOf = (index: number) => index === schedule.length - 1 ? beat * 1.6 : beat;
  const starts: number[] = []; let cursor = ctx.currentTime + .08;
  for (let index = 0; index < schedule.length; index++) { starts.push(cursor); cursor += lengthOf(index); }
  const finish = cursor + .25;
  schedule.forEach((swara, index) => { const frequency = options.sruti * Math.pow(2, centsFor(swara.semitones, options.temperament) / 1200); const prev = index === 0 ? frequency : options.sruti * Math.pow(2, centsFor(schedule[index - 1].semitones, options.temperament) / 1200); const fixed = swara.semitones % 12 === 0 || swara.semitones === 7; if (voice === 'chitravina') scheduleChitravina(ctx, frequency, prev, starts[index], lengthOf(index), output, options.kampita, fixed); else if (voice === 'swarmandal') scheduleSwarmandal(ctx, frequency, starts[index], lengthOf(index), output); else scheduleVeena(ctx, frequency, starts[index], lengthOf(index), output); });
  let raf = 0; const tick = () => { const now = ctx.currentTime; let at = -1; for (let index = 0; index < schedule.length; index++) if (now >= starts[index] && now < starts[index] + lengthOf(index)) at = index; options.onSwara(at < 0 ? null : schedule[at], at); if (now < finish) raf = requestAnimationFrame(tick); else options.onSwara(null, -1); }; raf = requestAnimationFrame(tick);
  return { stop: () => { cancelAnimationFrame(raf); output.gain.cancelScheduledValues(ctx.currentTime); output.gain.setTargetAtTime(0, ctx.currentTime, .02); options.onSwara(null, -1); } };
}

export function startDrone(sruti: number): PlaybackHandle {
  const ctx = getContext(); const output = ctx.createGain(); output.gain.value = .22; output.connect(analyser ?? ctx.destination); const frequencies = [sruti * .75, sruti, sruti, sruti / 2]; const sources: AudioBufferSourceNode[] = [];
  for (let i = 0; i < 48; i++) { const frequency = frequencies[i % 4]; const source = ctx.createBufferSource(); source.buffer = karplusBuffer(ctx, frequency, 2.6); source.connect(output); source.start(ctx.currentTime + .04 + i * .64); sources.push(source); }
  return { stop: () => { output.gain.setTargetAtTime(0, ctx.currentTime, .03); sources.forEach((source) => { try { source.stop(ctx.currentTime + .2); } catch {} }); } };
}

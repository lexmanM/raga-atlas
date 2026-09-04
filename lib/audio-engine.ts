import { centsFor, type Swara } from './ragas';

export type Voice = 'bowed' | 'veena';
export type Temperament = 'just' | 'equal';
export type PlaybackHandle = { stop: () => void };

let context: AudioContext | null = null;
let reverb: ConvolverNode | null = null;
const stringBuffers = new Map<string, AudioBuffer>();

const getContext = () => {
  context ??= new AudioContext({ sampleRate: 48000 });
  if (context.state === 'suspended') void context.resume();
  return context;
};

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

function scheduleBowed(ctx: AudioContext, frequency: number, previous: number, start: number, duration: number, output: GainNode, kampita: boolean, fixed: boolean) {
  const osc = ctx.createOscillator(); osc.type = 'sawtooth'; osc.frequency.setValueAtTime(Math.max(1, previous), start); osc.frequency.exponentialRampToValueAtTime(frequency, start + .09);
  const amplitude = ctx.createGain(); amplitude.gain.setValueAtTime(.0001, start); amplitude.gain.exponentialRampToValueAtTime(.13, start + .13); amplitude.gain.setValueAtTime(.13, start + duration - .09); amplitude.gain.exponentialRampToValueAtTime(.0001, start + duration);
  const vibrato = ctx.createOscillator(); const vibratoGain = ctx.createGain(); vibrato.frequency.value = 5.9; vibratoGain.gain.setValueAtTime(0, start); vibratoGain.gain.linearRampToValueAtTime(kampita && !fixed ? 45 : 14, start + duration * .4); vibrato.connect(vibratoGain); vibratoGain.connect(osc.detune);
  const mix = ctx.createGain(); const lowpass = ctx.createBiquadFilter(); lowpass.type = 'lowpass'; lowpass.frequency.value = 4600; const lowGain = ctx.createGain(); lowGain.gain.value = .45; osc.connect(lowpass); lowpass.connect(lowGain); lowGain.connect(mix);
  [[320,4,1],[620,6,.62],[1180,7,.34],[2400,5,.18]].forEach(([freq,q,gain]) => { const filter = ctx.createBiquadFilter(); const g = ctx.createGain(); filter.type = 'bandpass'; filter.frequency.value = freq; filter.Q.value = q; g.gain.value = gain; osc.connect(filter); filter.connect(g); g.connect(mix); });
  const noiseBuffer = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * .28), ctx.sampleRate); const noiseData = noiseBuffer.getChannelData(0); for (let i = 0; i < noiseData.length; i++) noiseData[i] = Math.random() * 2 - 1;
  const noise = ctx.createBufferSource(); noise.buffer = noiseBuffer; const noiseFilter = ctx.createBiquadFilter(); noiseFilter.type = 'bandpass'; noiseFilter.frequency.value = 2600; noiseFilter.Q.value = 2; const noiseGain = ctx.createGain(); noiseGain.gain.setValueAtTime(.045, start); noiseGain.gain.exponentialRampToValueAtTime(.0001, start + .24); noise.connect(noiseFilter); noiseFilter.connect(noiseGain); noiseGain.connect(mix);
  wetAndDry(ctx, mix, amplitude); amplitude.connect(output); osc.start(start); vibrato.start(start); noise.start(start); osc.stop(start + duration); vibrato.stop(start + duration); noise.stop(start + .28);
}

function scheduleVeena(ctx: AudioContext, frequency: number, start: number, duration: number, output: GainNode) {
  const source = ctx.createBufferSource(); source.buffer = karplusBuffer(ctx, frequency, Math.max(3.4, duration + .3)); const peak = ctx.createBiquadFilter(); peak.type = 'peaking'; peak.frequency.value = 440; peak.Q.value = 2.2; peak.gain.value = 5; const lowpass = ctx.createBiquadFilter(); lowpass.type = 'lowpass'; lowpass.frequency.value = 5200; const gain = ctx.createGain(); gain.gain.value = .5; source.connect(peak); peak.connect(lowpass); wetAndDry(ctx, lowpass, gain); gain.connect(output); source.start(start); source.stop(start + duration);
}

export function playRaga(options: { sequence: Swara[]; sruti: number; temperament: Temperament; voice: Voice; kampita: boolean; onSwara: (swara: Swara | null) => void }): PlaybackHandle {
  const ctx = getContext(); const output = ctx.createGain(); output.gain.value = .64; output.connect(ctx.destination); const noteDuration = .72; const base = ctx.currentTime + .08; const schedule = options.sequence;
  schedule.forEach((swara, index) => { const start = base + index * noteDuration; const frequency = options.sruti * Math.pow(2, centsFor(swara.semitones, options.temperament) / 1200); const prev = index === 0 ? frequency : options.sruti * Math.pow(2, centsFor(schedule[index - 1].semitones, options.temperament) / 1200); const fixed = swara.label === 'S' || swara.label === 'P'; if (options.voice === 'bowed') scheduleBowed(ctx, frequency, prev, start, noteDuration, output, options.kampita, fixed); else scheduleVeena(ctx, frequency, start, noteDuration, output); });
  let raf = 0; const tick = () => { const index = Math.floor((ctx.currentTime - base) / noteDuration); options.onSwara(index >= 0 && index < schedule.length ? schedule[index] : null); if (index <= schedule.length) raf = requestAnimationFrame(tick); }; raf = requestAnimationFrame(tick);
  return { stop: () => { cancelAnimationFrame(raf); output.gain.cancelScheduledValues(ctx.currentTime); output.gain.setTargetAtTime(0, ctx.currentTime, .02); options.onSwara(null); } };
}

export function startDrone(sruti: number): PlaybackHandle {
  const ctx = getContext(); const output = ctx.createGain(); output.gain.value = .22; output.connect(ctx.destination); const frequencies = [sruti * .75, sruti, sruti, sruti / 2]; const sources: AudioBufferSourceNode[] = [];
  for (let i = 0; i < 48; i++) { const frequency = frequencies[i % 4]; const source = ctx.createBufferSource(); source.buffer = karplusBuffer(ctx, frequency, 2.6); source.connect(output); source.start(ctx.currentTime + .04 + i * .64); sources.push(source); }
  return { stop: () => { output.gain.setTargetAtTime(0, ctx.currentTime, .03); sources.forEach((source) => { try { source.stop(ctx.currentTime + .2); } catch {} }); } };
}

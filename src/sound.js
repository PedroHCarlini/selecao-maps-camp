// Sons do veto. Toca ban.mp3, pick.mp3 e reveal.mp3 de public/sounds/ se existirem; sem eles, usa os sons sintetizados abaixo.
const PREF_KEY = 'veto-sound-enabled';
const VOLUME = { ban: 0.1, pick: 0.1, reveal: 0.2 };

// Momento da animação em que cada arquivo começa: o corte do ban e a abertura do pick.
const FILE_DELAY_S = { ban: 0.68, pick: 0.1, reveal: 0 };
const SOUND_OF_ACTION = { ban: 'ban', pick: 'pick', decider: 'pick' };

let context = null;
let filesLoading = null;
const fileBuffers = {};

function noiseSource(ctx, seconds) {
  const buffer = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * seconds), ctx.sampleRate);
  const samples = buffer.getChannelData(0);
  for (let i = 0; i < samples.length; i += 1) samples[i] = Math.random() * 2 - 1;
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  return source;
}

function tone(ctx, out, { type, from, to = from, start, sweep = 0, peak, attack = 0.005, decay }) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(from, start);
  if (sweep) osc.frequency.exponentialRampToValueAtTime(to, start + sweep);
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(peak, start + attack);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + attack + decay);
  osc.connect(gain).connect(out);
  osc.start(start);
  osc.stop(start + attack + decay + 0.02);
}

function filteredNoise(ctx, out, { filter, fromHz, toHz, q = 1, start, peak, attack, decay }) {
  const source = noiseSource(ctx, attack + decay + 0.02);
  const band = ctx.createBiquadFilter();
  const gain = ctx.createGain();
  band.type = filter;
  band.Q.value = q;
  band.frequency.setValueAtTime(fromHz, start);
  band.frequency.exponentialRampToValueAtTime(toHz, start + attack + decay);
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(peak, start + attack);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + attack + decay);
  source.connect(band).connect(gain).connect(out);
  source.start(start);
}

// Serras desafinadas passando por um filtro que fecha: é o que dá o peso de metais graves.
function brass(ctx, out, { notes, start, fromHz, toHz, q = 4, peak, attack, decay }) {
  const filter = ctx.createBiquadFilter();
  const gain = ctx.createGain();
  const end = start + attack + decay;
  filter.type = 'lowpass';
  filter.Q.value = q;
  filter.frequency.setValueAtTime(fromHz, start);
  filter.frequency.exponentialRampToValueAtTime(toHz, end);
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(peak, start + attack);
  gain.gain.exponentialRampToValueAtTime(0.0001, end);
  filter.connect(gain).connect(out);
  notes.forEach((frequency) => {
    [-9, 9].forEach((detune) => {
      const osc = ctx.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.value = frequency;
      osc.detune.value = detune;
      osc.connect(filter);
      osc.start(start);
      osc.stop(end + 0.02);
    });
  });
}

// Satura tudo junto: cria os harmônicos que fazem o grave aparecer em caixas de som pequenas e segura os picos.
function saturatedBus(ctx, out, drive) {
  const input = ctx.createGain();
  const shaper = ctx.createWaveShaper();
  const curve = new Float32Array(2048);
  for (let i = 0; i < curve.length; i += 1) {
    const x = (i / (curve.length - 1)) * 2 - 1;
    curve[i] = Math.tanh(x * drive) / Math.tanh(drive);
  }
  input.gain.value = 0.45;
  shaper.curve = curve;
  shaper.oversample = '4x';
  input.connect(shaper).connect(out);
  return input;
}

const BAN_HIT_S = 0.94;
const BAN_AFTERSHOCK_S = 1.36;
const PICK_HIT_S = 0.62;

export const SYNTH = {
  // Tensão crescendo durante o corte, um instante de silêncio e o golpe quando o mapa se parte.
  ban(ctx, out, t) {
    const bus = saturatedBus(ctx, out, 3);
    const hit = t + BAN_HIT_S;
    const aftershock = t + BAN_AFTERSHOCK_S;

    filteredNoise(ctx, bus, { filter: 'bandpass', fromHz: 250, toHz: 3000, q: 3, start: t + 0.3, peak: 0.5, attack: 0.6, decay: 0.02 });
    brass(ctx, bus, { notes: [41.2, 43.65], start: t + 0.3, fromHz: 150, toHz: 900, q: 2, peak: 0.35, attack: 0.6, decay: 0.02 });
    filteredNoise(ctx, bus, { filter: 'bandpass', fromHz: 2500, toHz: 7000, q: 6, start: t + 0.66, peak: 0.5, attack: 0.2, decay: 0.05 });

    tone(ctx, bus, { type: 'sine', from: 180, to: 45, start: hit, sweep: 0.07, peak: 1, attack: 0.002, decay: 0.2 });
    tone(ctx, bus, { type: 'sine', from: 62, to: 30, start: hit, sweep: 1.3, peak: 1, attack: 0.008, decay: 1.25 });
    brass(ctx, bus, { notes: [41.2, 43.65, 61.74, 87.31], start: hit, fromHz: 2400, toHz: 140, q: 5, peak: 0.55, attack: 0.012, decay: 1.2 });
    filteredNoise(ctx, bus, { filter: 'lowpass', fromHz: 3000, toHz: 150, start: hit, peak: 0.8, attack: 0.003, decay: 0.22 });
    [417, 643, 1093, 1571].forEach((from, index) => {
      tone(ctx, bus, { type: 'sine', from, start: hit, peak: 0.14, attack: 0.002, decay: 1 - index * 0.15 });
    });

    tone(ctx, bus, { type: 'sine', from: 50, to: 28, start: aftershock, sweep: 0.75, peak: 0.85, attack: 0.008, decay: 0.75 });
    brass(ctx, bus, { notes: [36.71, 38.89], start: aftershock, fromHz: 900, toHz: 100, q: 4, peak: 0.4, attack: 0.01, decay: 0.75 });
  },
  // Sobe enquanto o mapa abre e termina num acorde grave e estável: pesado, mas sem soar como desastre.
  pick(ctx, out, t) {
    const bus = saturatedBus(ctx, out, 2);
    const hit = t + PICK_HIT_S;

    brass(ctx, bus, { notes: [55, 82.41], start: t + 0.1, fromHz: 200, toHz: 1200, q: 2, peak: 0.3, attack: 0.5, decay: 0.03 });
    tone(ctx, bus, { type: 'sine', from: 82, to: 49, start: hit, sweep: 0.25, peak: 1, attack: 0.004, decay: 0.8 });
    brass(ctx, bus, { notes: [55, 82.41, 110], start: hit, fromHz: 1800, toHz: 200, q: 2, peak: 0.55, attack: 0.01, decay: 0.8 });
    tone(ctx, bus, { type: 'triangle', from: 329.63, start: hit, peak: 0.25, attack: 0.004, decay: 0.5 });
  },
  // O "TUM" de cada mapa da série: curto, para um não embolar no outro.
  reveal(ctx, out, t) {
    const bus = saturatedBus(ctx, out, 2.5);
    tone(ctx, bus, { type: 'sine', from: 105, to: 44, start: t, sweep: 0.16, peak: 1, attack: 0.003, decay: 0.48 });
    brass(ctx, bus, { notes: [44, 66], start: t, fromHz: 1100, toHz: 120, q: 2, peak: 0.4, attack: 0.004, decay: 0.3 });
    filteredNoise(ctx, bus, { filter: 'lowpass', fromHz: 2200, toHz: 200, start: t, peak: 0.4, attack: 0.002, decay: 0.05 });
  },
};

function loadSoundFiles(ctx) {
  filesLoading ??= Promise.all(
    Object.keys(SYNTH).map(async (name) => {
      try {
        const response = await fetch(`/sounds/${name}.mp3`);
        if (!response.ok) return;
        fileBuffers[name] = await ctx.decodeAudioData(await response.arrayBuffer());
      } catch {
        // Sem arquivo válido, continua com o som sintetizado.
      }
    }),
  );
  return filesLoading;
}

export function isAudioUnlocked() {
  return context?.state === 'running';
}

// O navegador só libera áudio depois de um clique na página.
export async function unlockAudio() {
  const AudioContextClass = window.AudioContext;
  if (!AudioContextClass) return false;
  context ??= new AudioContextClass();
  if (context.state === 'suspended') await context.resume();
  loadSoundFiles(context);
  return context.state === 'running';
}

export function readSoundEnabled() {
  try {
    return localStorage.getItem(PREF_KEY) !== 'off';
  } catch {
    return true;
  }
}

let enabled = readSoundEnabled();

export function setSoundEnabled(value) {
  enabled = value;
  try {
    localStorage.setItem(PREF_KEY, value ? 'on' : 'off');
  } catch {
    // Sem armazenamento, a preferência vale só até recarregar a página.
  }
}

function createOutput(name) {
  const output = context.createGain();
  output.gain.value = VOLUME[name];
  output.connect(context.destination);
  return output;
}

function startSound(name, output, at) {
  const buffer = fileBuffers[name];
  if (buffer) {
    const source = context.createBufferSource();
    source.buffer = buffer;
    source.connect(output);
    source.start(at + FILE_DELAY_S[name]);
  } else {
    SYNTH[name](context, output, at);
  }
}

export function playActionSound(actionType) {
  const name = SOUND_OF_ACTION[actionType];
  if (!name || !enabled || !isAudioUnlocked()) return;
  startSound(name, createOutput(name), context.currentTime);
}

// Agenda um "TUM" para cada mapa da série e devolve a função que cancela os que ainda não tocaram.
export function playRevealHits(delaysMs) {
  if (!enabled || !isAudioUnlocked()) return () => {};
  const output = createOutput('reveal');
  const now = context.currentTime;
  delaysMs.forEach((delay) => startSound('reveal', output, now + delay / 1000));
  return () => output.disconnect();
}

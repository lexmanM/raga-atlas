# Harmonium samples — "coupled stop"

Seven recorded notes of one Indian harmonium (peti), used by the `harmonium` voice in
`lib/audio-engine.ts`. A free reed sustains for as long as the bellows feed it, so this
voice is sampled rather than synthesised like the veena, chitravina and swarmandal.

## Source

Freesound 330410, "Harmonium Samples - All Keys and Drones" by *donyaquick*. The recording is
a single continuous chromatic run. Its first sweep (0–116 s) covers C3–B3 with a richer
registration — more reed banks drawn — than the second sweep, and that first sweep is what
these samples are cut from. Measured harmonics: strong 3rd and 5th, which is where the buzz
comes from.

## How they were prepared

- Cut at each note's own onset, so the reed's attack transient is real, not enveloped.
- Looped through the sustain. The loop end was chosen by correlating against the audio just
  before the loop start, then crossfaded — reeds are filed by hand and drift, so snapping to
  the nominal period leaves an audible click.
- Downsampled to 22.05 kHz. The source has effectively no energy above 8 kHz, so this is
  transparent and halves the payload.
- Normalised to a common RMS.

## Why the frequencies are not round numbers

`HARMONIUM_SAMPLES` in `lib/audio-engine.ts` stores each sample's **measured** fundamental,
not its nominal equal-temperament pitch. This instrument sits about +7 cents sharp and drifts
note to note. Playback rate is computed as `target / measured`, so the drift cancels out and
both Just and Equal intonation land exactly. Do not "correct" these numbers to nominal values.

## Coverage

C3–B3, every second semitone plus B3. Nothing inside that octave stretches more than one
semitone. Above B3 the voice pitches up — at the highest tonic (G) the top of an ārohana
stretches about eight semitones, which thins the tone.

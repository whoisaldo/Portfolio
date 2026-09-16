// src/lib/cues.js: the song's timeline, in seconds of the audio file.
//
// The intro is choreographed to the track at public/audio/ambient.m4a rather
// than to a stopwatch, so every visual beat below is a measurement of that
// file, not a guess. They were read off the waveform on 2026-09-16 (full-band
// and bass RMS at 10ms resolution, see the note at the bottom) and if the
// track is ever replaced, every number here has to be measured again.
//
// One file, all the numbers. The cinematic, the synthesised car sounds and
// the volume duck all import from here, so moving a cue moves everything that
// hangs off it.

/** Where playback begins on a first visit. A new phrase of the arpeggio
 *  starts at 9.0s; starting a hair early and fading in over 0.4s avoids a
 *  click on the downbeat. */
export const SONG_START = 8.9;

/** Where playback begins on a repeat visit in the same tab: one bar of the
 *  quiet before the drums, then straight into the drift. */
export const SHORT_START = 28.9;

/** The three lines of voice, each on a vocal or synth entry of the intro. */
export const VOICE_AT = [16.75, 20.5, 24.6];

/** The measured readout slides in on the quiet phrase after the first swell. */
export const READOUT_AT = 12.0;

/** A synth swell at 26.0s. Headlights, engine, and the moon scene starts to
 *  recede. Everything between here and the drop is tension. */
export const IGNITION = 26.1;

/** The drums enter at 30.10s. The car launches on this frame. */
export const DROP = 30.1;

/** The first kick lands at 30.85s: hazard flash and the hardest shake. */
export const KICK = 30.85;

/** The car has slid to its apex and launches out of frame; the overlay
 *  starts tearing away behind it. */
export const WIPE_START = 31.5;

/** The hero starts its entrance. Slightly before the overlay is gone, so the
 *  name is still resolving out of noise as the last of the black tears off it
 *  rather than sitting there finished. */
export const HERO_IN = 33.15;

/** The overlay is gone and the site is live. */
export const REVEAL = 33.6;

/** The car is fully off screen. Slightly after REVEAL so the exit is never
 *  cut. */
export const CAR_GONE = 33.9;

/** The chorus, for anyone who wants to time something to it later. */
export const CHORUS = 61.07;

/** Playback gain multipliers on top of the reader's own volume. The intro
 *  runs hot; once the site is up the track drops to being a bed. The reader's
 *  volume default (0.55) times CRUISE_GAIN is exactly the level the site
 *  played at before the intro existed. */
export const INTRO_GAIN = 1.5;
export const CRUISE_GAIN = 1.0;

/** How long the duck takes after the reveal. */
export const DUCK_SECONDS = 2.5;

// Measurement notes, so they do not have to be redone from scratch:
//   full-band RMS steps from -26 dB to -15 dB at 30.10s (hats and snare in),
//   bass steps to -14 dB at 30.85s (first kick), bass exceeds -10 dB at
//   61.07s (chorus), and the big second drop lands at 100.12s after a rest
//   whose floor is at 98.73s. The intro phrases swell at 1.25, 9.0, 16.75 and
//   24.6s. Drums enter mid-phrase, which is the song's own idea.

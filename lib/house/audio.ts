"use client";

import { Howl, Howler } from "howler";
import { AMBIENCE_VOLUME, musicVolume, VOICE_START_MS } from "./timeline";

// Three channels per Memory (TECHNICAL.md §3.1): song, ambience, family voice. Any
// channel that fails to load is simply silent: sound problems never show on screen.

/** Must run inside the first tap handler: Safari/iPad keep audio locked until then. */
export function unlockAudio(): void {
  try {
    void Howler.ctx?.resume();
  } catch {
    // No audio context (old browser): the House still plays, silently.
  }
}

const FADE_MS = 400;

export type MemoryAudioUrls = { songUrl?: string; ambienceUrl?: string; voiceUrl?: string };

export class MemoryAudio {
  private song?: Howl;
  private ambience?: Howl;
  private voice?: Howl;
  private voiceTimer?: ReturnType<typeof setTimeout>;
  private voiceDone = false;
  private voicePlaying = false;
  private videoSound = false;

  constructor(urls: MemoryAudioUrls) {
    const make = (src: string | undefined, options: { loop: boolean; volume: number }) =>
      src
        ? new Howl({ src: [src], ...options, onloaderror: () => {}, onplayerror: () => {} })
        : undefined;
    this.song = make(urls.songUrl, { loop: true, volume: musicVolume(false) });
    this.ambience = make(urls.ambienceUrl, { loop: true, volume: AMBIENCE_VOLUME });
    this.voice = make(urls.voiceUrl, { loop: false, volume: 1 });
    this.voice?.on("play", () => {
      this.voicePlaying = true;
      this.applyDuck();
    });
    this.voice?.on("end", () => {
      this.voicePlaying = false;
      this.voiceDone = true;
      this.applyDuck();
    });
  }

  private applyDuck(): void {
    const target = musicVolume(this.voicePlaying || this.videoSound);
    if (this.song) this.song.fade(this.song.volume(), target, FADE_MS);
  }

  start(): void {
    this.song?.play();
    this.ambience?.play();
    this.scheduleVoice(VOICE_START_MS);
  }

  private scheduleVoice(delay: number): void {
    if (!this.voice || this.voiceDone) return;
    this.voiceTimer = setTimeout(() => {
      // The voice plays once per Memory.
      if (this.voice && !this.voice.playing()) this.voice.play();
    }, delay);
  }

  pause(): void {
    clearTimeout(this.voiceTimer);
    this.song?.pause();
    this.ambience?.pause();
    this.voice?.pause();
  }

  resume(): void {
    this.song?.play();
    this.ambience?.play();
    // A paused voice continues where it stopped; one not started yet starts soon.
    if (this.voice && !this.voiceDone) {
      if (this.voice.seek() > 0) this.voice.play();
      else this.scheduleVoice(300);
    }
  }

  /** A real family video plays its own sound: duck the music meanwhile. */
  setVideoSound(on: boolean): void {
    this.videoSound = on;
    this.applyDuck();
  }

  stop(): void {
    clearTimeout(this.voiceTimer);
    for (const howl of [this.song, this.ambience, this.voice]) {
      if (!howl) continue;
      howl.fade(howl.volume(), 0, FADE_MS);
      setTimeout(() => howl.unload(), FADE_MS + 50);
    }
  }
}

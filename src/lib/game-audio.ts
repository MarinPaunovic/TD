export type GameSound =
  | "attack"
  | "hit"
  | "kill"
  | "fusion"
  | "upgrade"
  | "waveStart"
  | "waveClear"
  | "boss"
  | "lifeLost"
  | "button";

const tones: Record<GameSound, [number, number, number]> = {
  attack: [420, 0.025, 0.035],
  hit: [190, 0.035, 0.025],
  kill: [720, 0.07, 0.06],
  fusion: [300, 0.22, 0.12],
  upgrade: [610, 0.12, 0.08],
  waveStart: [360, 0.15, 0.08],
  waveClear: [780, 0.24, 0.12],
  boss: [90, 0.36, 0.16],
  lifeLost: [125, 0.18, 0.1],
  button: [520, 0.025, 0.025],
};

/** Lightweight Web Audio feedback. It creates no assets and fails silently on older webviews. */
export class GameAudio {
  private context: AudioContext | null = null;
  private enabled = true;

  constructor(enabled = true) {
    this.enabled = enabled;
  }
  setEnabled(enabled: boolean) {
    this.enabled = enabled;
  }

  play(sound: GameSound) {
    if (!this.enabled || typeof window === "undefined") return;
    try {
      const Ctor = window.AudioContext || window.webkitAudioContext;
      if (!Ctor) return;
      this.context ??= new Ctor();
      if (this.context.state === "suspended") void this.context.resume();
      const [frequency, duration, volume] = tones[sound];
      const oscillator = this.context.createOscillator();
      const gain = this.context.createGain();
      oscillator.type = sound === "boss" || sound === "lifeLost" ? "sawtooth" : "sine";
      oscillator.frequency.setValueAtTime(frequency, this.context.currentTime);
      if (sound === "fusion" || sound === "waveClear")
        oscillator.frequency.exponentialRampToValueAtTime(
          frequency * 1.7,
          this.context.currentTime + duration,
        );
      gain.gain.setValueAtTime(volume, this.context.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.context.currentTime + duration);
      oscillator.connect(gain).connect(this.context.destination);
      oscillator.start();
      oscillator.stop(this.context.currentTime + duration);
    } catch {
      /* Audio is optional: Capacitor/webview policy must never interrupt gameplay. */
    }
  }
}

declare global {
  interface Window {
    webkitAudioContext?: typeof AudioContext;
  }
}

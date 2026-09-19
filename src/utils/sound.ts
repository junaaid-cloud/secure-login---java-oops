/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

class SoundSynthesizer {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;

  private initCtx() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (this.ctx.state === "suspended") {
      this.ctx.resume();
    }
    return this.ctx;
  }

  public toggleMute() {
    this.isMuted = !this.isMuted;
    return this.isMuted;
  }

  public getMutedStatus() {
    return this.isMuted;
  }

  /**
   * Neutral beep feedback when clicking keys or toggling options
   */
  public playClick() {
    if (this.isMuted) return;
    try {
      const ac = this.initCtx();
      const osc = ac.createOscillator();
      const gain = ac.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(600, ac.currentTime);
      
      gain.gain.setValueAtTime(0.08, ac.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.08);

      osc.connect(gain);
      gain.connect(ac.destination);

      osc.start();
      osc.stop(ac.currentTime + 0.08);
    } catch (e) {
      console.warn("Audio Context block:", e);
    }
  }

  /**
   * Arpeggio chime on success verification
   */
  public playSuccess() {
    if (this.isMuted) return;
    try {
      const ac = this.initCtx();
      const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
      
      notes.forEach((freq, idx) => {
        const osc = ac.createOscillator();
        const gain = ac.createGain();
        const startTime = ac.currentTime + idx * 0.12;

        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, startTime);

        gain.gain.setValueAtTime(0, startTime);
        gain.gain.linearRampToValueAtTime(0.06, startTime + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.35);

        osc.connect(gain);
        gain.connect(ac.destination);

        osc.start(startTime);
        osc.stop(startTime + 0.4);
      });
    } catch (e) {
      console.warn(e);
    }
  }

  /**
   * Harsh warning drone for access denies
   */
  public playAccessDenied() {
    if (this.isMuted) return;
    try {
      const ac = this.initCtx();
      
      // We trigger a rapid series of 2 low-pitched square waves
      const startTimes = [ac.currentTime, ac.currentTime + 0.14];
      
      startTimes.forEach((time) => {
        const osc = ac.createOscillator();
        const gain = ac.createGain();

        osc.type = "sawtooth";
        // Low and muddy
        osc.frequency.setValueAtTime(140, time);
        
        gain.gain.setValueAtTime(0.12, time);
        gain.gain.exponentialRampToValueAtTime(0.001, time + 0.11);

        // Filter out harsh highs for better acoustic feeling
        const filter = ac.createBiquadFilter();
        filter.type = "lowpass";
        filter.frequency.setValueAtTime(400, time);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(ac.destination);

        osc.start(time);
        osc.stop(time + 0.12);
      });
    } catch (e) {
      console.warn(e);
    }
  }

  /**
   * Continuous sweeping siren triggered upon lockout alerts
   */
  public playSirenAlert() {
    if (this.isMuted) return;
    try {
      const ac = this.initCtx();
      const osc = ac.createOscillator();
      const gain = ac.createGain();

      osc.type = "triangle";
      
      // Sweep frequency up and down for a high-security lock feeling
      const now = ac.currentTime;
      osc.frequency.setValueAtTime(400, now);
      osc.frequency.linearRampToValueAtTime(900, now + 0.25);
      osc.frequency.linearRampToValueAtTime(350, now + 0.5);
      osc.frequency.linearRampToValueAtTime(800, now + 0.75);
      osc.frequency.linearRampToValueAtTime(400, now + 1.00);

      gain.gain.setValueAtTime(0.15, now);
      gain.gain.linearRampToValueAtTime(0.15, now + 0.85);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 1.05);

      osc.connect(gain);
      gain.connect(ac.destination);

      osc.start(now);
      osc.stop(now + 1.1);
    } catch (e) {
      console.warn(e);
    }
  }
}

export const synth = new SoundSynthesizer();

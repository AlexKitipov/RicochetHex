import { useCallback, useState, useRef, useEffect } from 'react';

type SoundType = 'select' | 'move' | 'ricochet' | 'capture' | 'victory' | 'chat' | 'yourTurn' | 'rematch';

// Simple audio synthesis for game sounds
const createOscillator = (
  audioContext: AudioContext,
  frequency: number,
  duration: number,
  type: OscillatorType = 'sine',
  volume: number = 0.3
) => {
  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();
  
  oscillator.connect(gainNode);
  gainNode.connect(audioContext.destination);
  
  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime);
  
  gainNode.gain.setValueAtTime(volume, audioContext.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration);
  
  oscillator.start(audioContext.currentTime);
  oscillator.stop(audioContext.currentTime + duration);
};

const soundConfigs: Record<SoundType, (ctx: AudioContext) => void> = {
  select: (ctx) => {
    createOscillator(ctx, 600, 0.1, 'sine', 0.2);
  },
  move: (ctx) => {
    createOscillator(ctx, 200, 0.15, 'triangle', 0.3);
    setTimeout(() => createOscillator(ctx, 150, 0.1, 'triangle', 0.2), 50);
  },
  ricochet: (ctx) => {
    createOscillator(ctx, 800, 0.1, 'square', 0.15);
    setTimeout(() => createOscillator(ctx, 600, 0.1, 'square', 0.2), 80);
    setTimeout(() => createOscillator(ctx, 400, 0.15, 'square', 0.15), 160);
  },
  capture: (ctx) => {
    createOscillator(ctx, 150, 0.3, 'sawtooth', 0.25);
    createOscillator(ctx, 100, 0.4, 'triangle', 0.2);
  },
  victory: (ctx) => {
    const notes = [523, 659, 784, 1047]; // C5, E5, G5, C6
    notes.forEach((freq, i) => {
      setTimeout(() => createOscillator(ctx, freq, 0.3, 'sine', 0.25), i * 150);
    });
  },
  chat: (ctx) => {
    createOscillator(ctx, 880, 0.08, 'sine', 0.15);
    setTimeout(() => createOscillator(ctx, 1100, 0.1, 'sine', 0.12), 60);
  },
  yourTurn: (ctx) => {
    createOscillator(ctx, 440, 0.12, 'triangle', 0.2);
    setTimeout(() => createOscillator(ctx, 660, 0.12, 'triangle', 0.25), 120);
    setTimeout(() => createOscillator(ctx, 880, 0.15, 'triangle', 0.2), 240);
  },
  rematch: (ctx) => {
    createOscillator(ctx, 523, 0.15, 'sine', 0.2);
    setTimeout(() => createOscillator(ctx, 659, 0.15, 'sine', 0.2), 100);
    setTimeout(() => createOscillator(ctx, 784, 0.2, 'sine', 0.25), 200);
  }
};

export function useSoundEffects() {
  const [soundEnabled, setSoundEnabled] = useState(true);
  const audioContextRef = useRef<AudioContext | null>(null);

  const getAudioContext = useCallback(() => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    return audioContextRef.current;
  }, []);

  const playSound = useCallback((type: SoundType) => {
    if (!soundEnabled) return;
    
    try {
      const ctx = getAudioContext();
      if (ctx.state === 'suspended') {
        ctx.resume();
      }
      soundConfigs[type](ctx);
    } catch (error) {
      console.warn('Audio playback failed:', error);
    }
  }, [soundEnabled, getAudioContext]);

  const toggleSound = useCallback(() => {
    setSoundEnabled(prev => !prev);
  }, []);

  return {
    playSound,
    soundEnabled,
    toggleSound
  };
}

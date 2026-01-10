
import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';

type SoundType = 'click' | 'hover' | 'success' | 'copy' | 'on' | 'off';

interface SoundContextType {
  isEnabled: boolean;
  volume: number;
  toggleSound: () => void;
  setVolume: (volume: number) => void;
  playSound: (type: SoundType) => void;
}

const SoundContext = createContext<SoundContextType | undefined>(undefined);

export const SoundProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isEnabled, setIsEnabled] = useState(true);
  const [volume, setVolumeState] = useState(0.5); // Default volume 50%
  const [audioContext, setAudioContext] = useState<AudioContext | null>(null);

  useEffect(() => {
    const savedEnabled = localStorage.getItem('vibes_sound_enabled');
    const savedVolume = localStorage.getItem('vibes_sound_volume');
    
    if (savedEnabled !== null) {
      setIsEnabled(JSON.parse(savedEnabled));
    }
    if (savedVolume !== null) {
      setVolumeState(parseFloat(savedVolume));
    }

    // Initialize AudioContext on first user interaction to bypass browser autoplay policy
    const initAudio = () => {
      if (!audioContext) {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        setAudioContext(new AudioCtx());
      }
    };
    
    window.addEventListener('click', initAudio, { once: true });
    return () => window.removeEventListener('click', initAudio);
  }, [audioContext]);

  const toggleSound = () => {
    setIsEnabled(prev => {
      const newVal = !prev;
      localStorage.setItem('vibes_sound_enabled', JSON.stringify(newVal));
      if (newVal) playSound('on'); 
      return newVal;
    });
  };

  const setVolume = (val: number) => {
    const clamped = Math.max(0, Math.min(1, val));
    setVolumeState(clamped);
    localStorage.setItem('vibes_sound_volume', clamped.toString());
    if (clamped > 0 && !isEnabled) {
        setIsEnabled(true);
    }
  };

  const playSound = useCallback((type: SoundType) => {
    if (!isEnabled || !audioContext || volume === 0) return;

    // Resume context if suspended (common browser behavior)
    if (audioContext.state === 'suspended') {
      audioContext.resume();
    }

    const osc = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    osc.connect(gainNode);
    gainNode.connect(audioContext.destination);

    const now = audioContext.currentTime;
    const masterGain = volume; // Apply global volume multiplier

    // Sound Design: "Light, pleasant, glass-like"
    if (type === 'click') {
      // Soft high tick
      osc.type = 'sine';
      osc.frequency.setValueAtTime(800, now);
      osc.frequency.exponentialRampToValueAtTime(1200, now + 0.05);
      gainNode.gain.setValueAtTime(0.05 * masterGain, now);
      gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
      osc.start(now);
      osc.stop(now + 0.05);
    } 
    else if (type === 'hover') {
      // Very faint high blip
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1200, now);
      gainNode.gain.setValueAtTime(0.01 * masterGain, now);
      gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.03);
      osc.start(now);
      osc.stop(now + 0.03);
    }
    else if (type === 'copy') {
      // "Ding" - pleasant high ping
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1100, now);
      gainNode.gain.setValueAtTime(0.08 * masterGain, now);
      gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
      osc.start(now);
      osc.stop(now + 0.3);
      
      // Add a slight harmonic
      const osc2 = audioContext.createOscillator();
      const gain2 = audioContext.createGain();
      osc2.connect(gain2);
      gain2.connect(audioContext.destination);
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(1650, now); // Perfect 5th
      gain2.gain.setValueAtTime(0.04 * masterGain, now);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
      osc2.start(now);
      osc2.stop(now + 0.3);
    }
    else if (type === 'success' || type === 'on') {
      // Ascending major arpeggio (quick)
      const notes = [880, 1108, 1318]; // A5, C#6, E6
      notes.forEach((freq, i) => {
        const o = audioContext.createOscillator();
        const g = audioContext.createGain();
        o.connect(g);
        g.connect(audioContext.destination);
        o.type = 'sine';
        o.frequency.value = freq;
        const startTime = now + i * 0.06;
        g.gain.setValueAtTime(0, startTime);
        g.gain.linearRampToValueAtTime(0.08 * masterGain, startTime + 0.02);
        g.gain.exponentialRampToValueAtTime(0.001, startTime + 0.4);
        o.start(startTime);
        o.stop(startTime + 0.4);
      });
    }
    else if (type === 'off') {
        // Descending tone
        osc.type = 'sine';
        osc.frequency.setValueAtTime(400, now);
        gainNode.gain.setValueAtTime(0.05 * masterGain, now);
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
        osc.start(now);
        osc.stop(now + 0.2);
    }

  }, [isEnabled, volume, audioContext]);

  return (
    <SoundContext.Provider value={{ isEnabled, volume, toggleSound, setVolume, playSound }}>
      {children}
    </SoundContext.Provider>
  );
};

export const useSound = () => {
  const context = useContext(SoundContext);
  if (context === undefined) {
    throw new Error('useSound must be used within a SoundProvider');
  }
  return context;
};

import { useRef, useEffect, useState, useCallback } from 'react';

/**
 * useWakeWord — Siri/Alexa-style wake word detection for the browser.
 * 
 * Uses Web Audio API (lightweight, no flicker) to continuously monitor
 * mic volume. Only starts the heavy SpeechRecognition engine when voice
 * activity is detected. Checks for wake word in the transcript.
 * 
 * Returns:
 *  - isReady: mic permission granted and monitoring
 *  - isListening: SpeechRecognition is actively transcribing
 *  - isNovaActive: wake word was detected
 *  - transcript: current interim transcript
 *  - startManual(): manually trigger listening (button click)
 *  - stopManual(): manually stop listening
 */
export default function useWakeWord({ onCommand, wakeWords = ['hey nova', 'nova', 'innova'] }) {
  const [isReady, setIsReady] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isNovaActive, setIsNovaActive] = useState(false);
  const [transcript, setTranscript] = useState('');

  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const streamRef = useRef(null);
  const recognitionRef = useRef(null);
  const rafRef = useRef(null);
  const cooldownRef = useRef(false);
  const manualModeRef = useRef(false);
  const isListeningRef = useRef(false);
  const onCommandRef = useRef(onCommand);

  // Keep onCommand ref current
  useEffect(() => {
    onCommandRef.current = onCommand;
  }, [onCommand]);

  // Build wake word regex
  const wakeWordRegex = new RegExp(`\\b(${wakeWords.join('|')})\\b`, 'i');

  // Initialize microphone + audio monitoring
  useEffect(() => {
    let mounted = true;

    const init = async () => {
      try {
        // 1. Get microphone stream
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        if (!mounted) { stream.getTracks().forEach(t => t.stop()); return; }
        streamRef.current = stream;

        // 2. Set up AudioContext for volume monitoring
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const source = audioContext.createMediaStreamSource(stream);
        const analyser = audioContext.createAnalyser();
        analyser.fftSize = 512;
        analyser.smoothingTimeConstant = 0.8;
        source.connect(analyser);
        // Don't connect to destination (no feedback)

        audioContextRef.current = audioContext;
        analyserRef.current = analyser;

        // 3. Set up SpeechRecognition
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (SpeechRecognition) {
          const recognition = new SpeechRecognition();
          recognition.continuous = true;
          recognition.interimResults = true;
          recognition.lang = 'en-US';

          recognition.onstart = () => {
            isListeningRef.current = true;
            setIsListening(true);
          };

          recognition.onresult = (event) => {
            let interim = '';
            let final = '';
            for (let i = event.resultIndex; i < event.results.length; ++i) {
              if (event.results[i].isFinal) {
                final += event.results[i][0].transcript;
              } else {
                interim += event.results[i][0].transcript;
              }
            }

            if (final) {
              const query = final.trim();
              
              if (manualModeRef.current) {
                // Manual mode: send everything directly (no wake word needed)
                setTranscript('');
                if (query.length > 0) {
                  onCommandRef.current(query);
                  setIsNovaActive(false); // Reset active state after command
                }
                manualModeRef.current = false;
              } else {
                // Background mode: check for wake word
                const lower = query.toLowerCase();
                if (wakeWordRegex.test(lower)) {
                  setIsNovaActive(true);
                  const stripped = lower.replace(wakeWordRegex, '').replace(/^[\s,]+/, '').trim();
                  setTranscript('');
                  if (stripped.length > 0) {
                    onCommandRef.current(stripped);
                    setTimeout(() => setIsNovaActive(false), 2000);
                  } else {
                    // Enter active listening mode so the next phrase is caught as a command
                    manualModeRef.current = true;
                  }
                } else {
                  // No wake word, discard silently
                  setTranscript('');
                }
              }
            } else {
              // Show interim transcription
              if (manualModeRef.current || wakeWordRegex.test(interim.toLowerCase())) {
                setTranscript(interim);
              }
            }
          };

          recognition.onerror = (event) => {
            if (event.error !== 'no-speech' && event.error !== 'aborted') {
              console.error('Speech error:', event.error);
              manualModeRef.current = false;
              setIsNovaActive(false);
            }
            isListeningRef.current = false;
            setIsListening(false);
          };

          recognition.onend = () => {
            isListeningRef.current = false;
            setIsListening(false);
            
            if (manualModeRef.current) {
              // If we are in active mode waiting for a command, restart smoothly
              setTimeout(() => {
                if (!isListeningRef.current && recognitionRef.current) {
                  try {
                    isListeningRef.current = true;
                    recognitionRef.current.start();
                  } catch(e) {
                    isListeningRef.current = false;
                  }
                }
              }, 400);
            } else {
              // Otherwise, apply cooldown to prevent rapid restarts from background noise
              setTimeout(() => setIsNovaActive(false), 1500);
              cooldownRef.current = true;
              setTimeout(() => { cooldownRef.current = false; }, 1500);
            }
          };

          recognitionRef.current = recognition;
        }

        setIsReady(true);

        // 4. Start volume monitoring loop
        const dataArray = new Uint8Array(analyser.frequencyBinCount);
        let voiceFrames = 0;
        const VOICE_THRESHOLD = 35; // Volume threshold (0-255)
        const FRAMES_TO_TRIGGER = 8; // ~8 frames of voice activity before starting recognition

        const monitorVolume = () => {
          if (!mounted) return;
          analyser.getByteFrequencyData(dataArray);
          
          // Calculate average volume
          let sum = 0;
          for (let i = 0; i < dataArray.length; i++) {
            sum += dataArray[i];
          }
          const avgVolume = sum / dataArray.length;

          if (avgVolume > VOICE_THRESHOLD && !isListeningRef.current && !cooldownRef.current) {
            voiceFrames++;
            if (voiceFrames >= FRAMES_TO_TRIGGER && recognitionRef.current) {
              try {
                isListeningRef.current = true;
                recognitionRef.current.start();
                voiceFrames = 0;
              } catch (e) {
                // Already running or other error, reset
                isListeningRef.current = false;
                voiceFrames = 0;
              }
            }
          } else {
            voiceFrames = Math.max(0, voiceFrames - 1); // Decay slowly
          }

          rafRef.current = requestAnimationFrame(monitorVolume);
        };

        monitorVolume();

      } catch (err) {
        console.warn('Microphone access denied or unavailable:', err);
      }
    };

    init();

    return () => {
      mounted = false;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch(e){}
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
      }
    };
  }, []);

  const startManual = useCallback(() => {
    if (!recognitionRef.current) return;
    manualModeRef.current = true;
    setTranscript('');
    try { 
      if (!isListeningRef.current) {
        isListeningRef.current = true;
        recognitionRef.current.start(); 
      }
    } catch(e) {
      isListeningRef.current = false;
    }
  }, []);

  const stopManual = useCallback(() => {
    if (!recognitionRef.current) return;
    manualModeRef.current = false;
    try { 
      isListeningRef.current = false;
      recognitionRef.current.stop(); 
    } catch(e){}
  }, []);

  return {
    isReady,
    isListening,
    isNovaActive,
    setIsNovaActive,
    transcript,
    startManual,
    stopManual,
  };
}

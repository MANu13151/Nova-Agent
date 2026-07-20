import { useRef, useEffect, useState, useCallback } from 'react';

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
  const silenceTimerRef = useRef(null);
  const onCommandRef = useRef(onCommand);

  // Keep onCommand ref current
  useEffect(() => {
    onCommandRef.current = onCommand;
  }, [onCommand]);

  // Build wake word regex
  const wakeWordRegex = new RegExp(`\\b(${wakeWords.join('|')})\\b`, 'i');

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        if (!mounted) { stream.getTracks().forEach(t => t.stop()); return; }
        streamRef.current = stream;

        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const source = audioContext.createMediaStreamSource(stream);
        const analyser = audioContext.createAnalyser();
        analyser.fftSize = 512;
        analyser.smoothingTimeConstant = 0.8;
        source.connect(analyser);

        audioContextRef.current = audioContext;
        analyserRef.current = analyser;

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
              if (silenceTimerRef.current) { clearTimeout(silenceTimerRef.current); silenceTimerRef.current = null; }
              
              if (manualModeRef.current) {
                setTranscript('');
                if (query.length > 0) {
                  onCommandRef.current(query);
                }
                // ALWAYS clear active state when exiting manual mode
                setIsNovaActive(false);
                manualModeRef.current = false;
              } else {
                const lower = query.toLowerCase();
                if (wakeWordRegex.test(lower)) {
                  setIsNovaActive(true);
                  const stripped = lower.replace(wakeWordRegex, '').replace(/^[\s,]+/, '').trim();
                  setTranscript('');
                  if (stripped.length > 0) {
                    onCommandRef.current(stripped);
                    setIsNovaActive(false); // Instantly turn off active UI state, backend is now processing
                  } else {
                    manualModeRef.current = true;
                    silenceTimerRef.current = setTimeout(() => {
                      manualModeRef.current = false;
                      setIsNovaActive(false);
                      setTranscript('');
                      try { recognitionRef.current?.stop(); } catch(e) {}
                    }, 3500); // 3.5 seconds to speak after saying just 'Hey Nova'
                  }
                } else {
                  setTranscript('');
                }
              }
            } else {
              if (manualModeRef.current || wakeWordRegex.test(interim.toLowerCase())) {
                setTranscript(interim);
                if (manualModeRef.current && silenceTimerRef.current) {
                  clearTimeout(silenceTimerRef.current);
                  silenceTimerRef.current = setTimeout(() => {
                    manualModeRef.current = false;
                    setIsNovaActive(false);
                    setTranscript('');
                    try { recognitionRef.current?.stop(); } catch(e) {}
                  }, 4000); // Reduce from 5s to 4s
                }
              }
            }
          };

          recognition.onerror = (event) => {
            if (event.error !== 'no-speech' && event.error !== 'aborted') {
              console.error('Speech error:', event.error);
            }
            if (silenceTimerRef.current) { clearTimeout(silenceTimerRef.current); silenceTimerRef.current = null; }
            manualModeRef.current = false;
            setIsNovaActive(false);
            isListeningRef.current = false;
            setIsListening(false);
          };

          recognition.onend = () => {
            isListeningRef.current = false;
            setIsListening(false);
            
            if (manualModeRef.current) {
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
              cooldownRef.current = true;
              setTimeout(() => { cooldownRef.current = false; }, 1500);
            }
          };

          recognitionRef.current = recognition;
        }

        setIsReady(true);

        // RESTORED VOLUME MONITOR to prevent Chrome from killing the engine,
        // but drastically reduced FRAMES_TO_TRIGGER to prevent wake word clipping!
        const dataArray = new Uint8Array(analyser.frequencyBinCount);
        let voiceFrames = 0;
        const VOICE_THRESHOLD = 20; // Lowered from 35 to wake up on quieter sounds
        const FRAMES_TO_TRIGGER = 2; // Lowered from 8 for almost instant wake up

        const monitorVolume = () => {
          if (!mounted) return;
          analyser.getByteFrequencyData(dataArray);
          
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
                isListeningRef.current = false;
                voiceFrames = 0;
              }
            }
          } else {
            voiceFrames = Math.max(0, voiceFrames - 1);
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
    setIsNovaActive(true);
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
    setIsNovaActive(false);
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

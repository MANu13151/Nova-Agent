import os
import threading
import time
import json
import queue

import sounddevice as sd
from vosk import Model, KaldiRecognizer

# The event that gets triggered when the wake word is detected
wake_word_event = threading.Event()

# Global flag to control the listening loop
_is_listening = True

# Global flag to pause wake word detection while processing a command
_is_paused = False

def set_paused(paused: bool):
    global _is_paused
    _is_paused = paused
    if paused:
        print("[WakeWord] Paused listening for wake word.")
    else:
        print("[WakeWord] Resumed listening for wake word.")

def listen_for_wake_word():
    global _is_listening
    
    # We are using Vosk speech recognition as our wake word engine!
    # It requires zero training and runs completely offline.
    model_path = os.path.join(os.path.dirname(__file__), "vosk-model")
    if not os.path.exists(model_path):
        print(f"[WakeWord] Error: Vosk model not found at {model_path}")
        return
        
    print("[WakeWord] Loading Vosk speech recognition model...")
    # Suppress Vosk logs to avoid cluttering the terminal
    from vosk import SetLogLevel
    SetLogLevel(-1) 
    
    model = Model(model_path)
    
    SAMPLE_RATE = 16000
    # We restrict the vocabulary so it strongly prefers "hey nova"
    # This prevents it from hallucinating random words and vastly improves wake word accuracy
    rec = KaldiRecognizer(model, SAMPLE_RATE, '["hey nova", "[unk]"]')
    
    q = queue.Queue()

    def audio_callback(indata, frames, time_info, status):
        if status:
            pass # Ignore minor overflow warnings
        if _is_paused or wake_word_event.is_set():
            return
        q.put(bytes(indata))

    print("[WakeWord] Listening for 'Hey Nova'...")
    
    try:
        with sd.RawInputStream(
            samplerate=SAMPLE_RATE,
            channels=1,
            dtype="int16",
            blocksize=4000,
            callback=audio_callback
        ):
            while _is_listening:
                data = q.get()
                if rec.AcceptWaveform(data):
                    res = json.loads(rec.Result())
                    text = res.get("text", "")
                    if text:
                        print(f"[WakeWord] Heard: '{text}'")
                    if "hey nova" in text:
                        print("[WakeWord] 'Hey Nova' detected!")
                        wake_word_event.set()
                else:
                    res = json.loads(rec.PartialResult())
                    text = res.get("partial", "")
                    if text:
                        print(f"[WakeWord] Partial: '{text}'")
                    if "hey nova" in text:
                        print("[WakeWord] 'Hey Nova' detected!")
                        wake_word_event.set()
                        # Reset recognizer state to prevent multiple triggers
                        rec.Reset()
                
    except Exception as e:
        print(f"[WakeWord] Audio stream error: {e}")
    finally:
        print("[WakeWord] Stopped.")

def start_wake_word_thread():
    t = threading.Thread(target=listen_for_wake_word, daemon=True)
    t.start()
    return t

if __name__ == "__main__":
    print("Testing wake word detection...")
    start_wake_word_thread()
    try:
        while True:
            if wake_word_event.is_set():
                print("Event was triggered!")
                wake_word_event.clear()
            time.sleep(0.1)
    except KeyboardInterrupt:
        _is_listening = False

import sounddevice as sd
import numpy as np
from scipy.io.wavfile import write
import webrtcvad
import time

SAMPLE_RATE = 16000  # samples per second (Whisper likes 16000)
FRAME_DURATION_MS = 30
FRAME_SIZE = int(SAMPLE_RATE * (FRAME_DURATION_MS / 1000.0))  # 480 samples

# Voice Activity Detection settings
SILENCE_DURATION_TO_STOP_SEC = 1.5  # Stop after 1.5 seconds of silence
MAX_SILENCE_FRAMES = int((SILENCE_DURATION_TO_STOP_SEC * 1000) / FRAME_DURATION_MS)

# Globals used by the audio callback
recorded_chunks = []
vad = webrtcvad.Vad(2)  # Aggressiveness: 0 (least) to 3 (most)
silence_frames_count = 0
has_spoken = False

def _callback(indata, frames, time_info, status):
    global recorded_chunks, silence_frames_count, has_spoken
    
    if status:
        print(f"Audio status: {status}")

    # Webrtcvad needs bytes
    audio_data = indata.tobytes()
    
    # Check if the frame contains speech
    is_speech = False
    try:
        is_speech = vad.is_speech(audio_data, SAMPLE_RATE)
    except Exception as e:
        pass
        
    recorded_chunks.append(indata.copy())

    if is_speech:
        has_spoken = True
        silence_frames_count = 0
    else:
        if has_spoken:
            silence_frames_count += 1
            
    # Stop if user has spoken and then went silent for the max duration
    if has_spoken and silence_frames_count >= MAX_SILENCE_FRAMES:
        raise sd.CallbackStop()

def record_audio(filename="output.wav", duration=None):
    """
    Starts recording. 
    If `duration` is provided, records for that fixed duration.
    Otherwise, uses VAD to dynamically stop when silence is detected.
    Saves everything into a .wav file.
    """
    global recorded_chunks, silence_frames_count, has_spoken
    recorded_chunks = []
    silence_frames_count = 0
    has_spoken = False
 
    if duration:
        print(f"Recording for {duration} seconds (Fixed)...")
        # For fixed duration, we don't use the VAD stop logic
        def fixed_callback(indata, frames, time_info, status):
            recorded_chunks.append(indata.copy())
            
        with sd.InputStream(samplerate=SAMPLE_RATE, channels=1, dtype="int16", callback=fixed_callback):
            time.sleep(duration)
    else:
        print("Recording... speak now. Waiting for silence to stop.")
        # Open stream with specific blocksize for VAD
        try:
            with sd.InputStream(
                samplerate=SAMPLE_RATE, 
                channels=1, 
                dtype="int16", 
                blocksize=FRAME_SIZE, 
                callback=_callback
            ):
                # The stream will block and keep running until `raise sd.CallbackStop()` is called in the callback
                while silence_frames_count < MAX_SILENCE_FRAMES or not has_spoken:
                    time.sleep(0.1)
        except sd.CallbackStop:
            pass  # Expected when silence is reached
 
    print("Recording stopped.")
 
    # Combine all the small chunks into one audio clip
    if recorded_chunks:
        audio = np.concatenate(recorded_chunks, axis=0)
        write(filename, SAMPLE_RATE, audio)
        print(f"Saved recording to {filename}")
    
    return filename
 
if __name__ == "__main__":
    record_audio("output.wav")
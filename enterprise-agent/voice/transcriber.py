from faster_whisper import WhisperModel
 
# "tiny" and "base" are small, fast, and work fine on CPU
MODEL_SIZE = "base"
 
 
def transcribe_audio(filename="output.wav"):
    """
    Loads the Whisper model and converts the given audio file into text.
    """
    print("Loading model...")
    model = WhisperModel(MODEL_SIZE, device="cpu", compute_type="int8")
 
    print("Transcribing...")
    segments, info = model.transcribe(filename)
 
    # Combine all the small text pieces (segments) into one full text
    text = ""
    for segment in segments:
        text += segment.text + " "
 
    text = text.strip()
    return text
 
 
if __name__ == "__main__":
    result = transcribe_audio("output.wav")
    print("\nTranscribed Text:")
    print(result)
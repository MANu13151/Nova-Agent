import os
from io import BytesIO

try:
    from gtts import gTTS
    GTTS_AVAILABLE = True
except ImportError:
    GTTS_AVAILABLE = False

def text_to_speech_mp3(text: str) -> BytesIO:
    """
    Converts text to MP3 audio bytes using gTTS.
    Returns a BytesIO stream containing the audio data.
    """
    if not GTTS_AVAILABLE:
        raise RuntimeError(
            "Text-To-Speech service is unavailable because the 'gTTS' library is not installed.\n"
            "Please run: pip install gTTS"
        )
    
    mp3_fp = BytesIO()
    # Create the TTS object and write to the file pointer
    tts = gTTS(text=text, lang='en', slow=False)
    tts.write_to_fp(mp3_fp)
    mp3_fp.seek(0)
    return mp3_fp

if __name__ == "__main__":
    if GTTS_AVAILABLE:
        print("gTTS is installed! Generating test speech...")
        audio = text_to_speech_mp3("Hello and welcome! This is the Enterprise Voice AI Agent.")
        print(f"Generated {len(audio.getvalue())} bytes of MP3 audio.")
    else:
        print("gTTS is not installed. Run 'pip install gTTS' to enable TTS.")

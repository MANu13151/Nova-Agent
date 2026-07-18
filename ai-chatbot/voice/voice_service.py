from voice.stt import transcribe_audio_bytes
from voice.tts import text_to_speech_mp3, GTTS_AVAILABLE
from ai.orchestrator import orchestrate_message
import base64

def process_voice_input(audio_bytes: bytes, session_id: str) -> dict:
    """
    Orchestrates the full voice loop:
    1. Audio Bytes -> STT (Transcribe to Text)
    2. User Text -> Orchestrator (Intent + DB Query + Analytics)
    3. Assistant Response Text -> TTS (Synthesize response audio, excluding markdown tables)
    
    Returns a unified dict containing transcription, response text, charts, and base64-encoded audio response.
    """
    # 1. Transcribe the incoming voice input
    user_text = transcribe_audio_bytes(audio_bytes)
    if not user_text:
        return {
            "user_text": "",
            "response": "I couldn't hear you clearly. Could you please repeat that?",
            "sql": None,
            "chart": None,
            "audio_b64": None,
            "error": "Empty transcription"
        }

    # 2. Query the main orchestrator
    result = orchestrate_message(user_text, session_id)
    
    # 3. Synthesize the voice response (TTS)
    audio_b64 = None
    response_text = result.get("response", "")
    
    if response_text and GTTS_AVAILABLE:
        try:
            # Smart extraction: remove markdown table parts so TTS only reads out the narrative
            verbal_text = response_text
            if "\n\n|" in response_text:
                verbal_text = response_text.split("\n\n|")[0].strip()
            elif "\n|" in response_text:
                verbal_text = response_text.split("\n|")[0].strip()
                
            # Strip out formatting characters for cleaner audio
            verbal_text = verbal_text.replace("*", "").replace("`", "").strip()
            
            # Generate TTS
            audio_stream = text_to_speech_mp3(verbal_text)
            audio_bytes = audio_stream.getvalue()
            # Encode as base64 for transport over JSON APIs/WebSockets
            audio_b64 = base64.b64encode(audio_bytes).decode("utf-8")
        except Exception as e:
            print(f"[Voice Service] TTS synthesis failed: {str(e)}")

    return {
        "user_text": user_text,
        "response": response_text,
        "sql": result.get("sql"),
        "chart": result.get("chart"),
        "audio_b64": audio_b64,
        "error": result.get("error")
    }

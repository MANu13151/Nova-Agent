import os
import time
from dotenv import load_dotenv
from groq import Groq

load_dotenv()

GROQ_API_KEY = os.getenv("GROQ_API_KEY")

if not GROQ_API_KEY:
    print("[WARNING] GROQ_API_KEY not found in environment. LLM calls will fail.")

client = Groq(api_key=GROQ_API_KEY)

# Primary model and fallbacks
PRIMARY_MODEL = "llama-3.3-70b-versatile"
FALLBACK_MODELS = [
    "llama-3.1-70b-versatile",
    "llama-3.1-8b-instant",
    "gemma2-9b-it",
]


def get_model_sequence() -> list:
    """Returns list of models to try in order."""
    return [PRIMARY_MODEL] + FALLBACK_MODELS


def call_llm(prompt: str, system_instruction: str = None, json_mode: bool = False, temperature: float = 0.7) -> str:
    """
    Sends a single prompt to Groq and returns the text response.
    Includes auto-retry for rate limits and falls back to alternative models.
    
    This function matches the interface of the ai-chatbot's call_gemini().
    """
    if not GROQ_API_KEY:
        raise ValueError("Groq API key not found. Please add GROQ_API_KEY to your .env file.")

    models = get_model_sequence()
    
    messages = []
    if system_instruction:
        messages.append({"role": "system", "content": system_instruction})
    messages.append({"role": "user", "content": prompt})
    
    last_exception = None
    
    for model in models:
        max_retries = 3
        
        for attempt in range(max_retries):
            try:
                kwargs = {
                    "messages": messages,
                    "model": model,
                    "temperature": temperature,
                    "max_tokens": 2048,
                }
                
                if json_mode:
                    kwargs["response_format"] = {"type": "json_object"}
                
                response = client.chat.completions.create(**kwargs)
                text = response.choices[0].message.content
                
                if text:
                    return text.strip()
                else:
                    raise RuntimeError("Groq API returned an empty response.")
                    
            except Exception as e:
                error_str = str(e)
                
                # Rate limit — retry with backoff
                if "rate_limit" in error_str.lower() or "429" in error_str:
                    wait_time = (attempt + 1) * 2.0
                    if attempt < max_retries - 1:
                        print(f"[Groq Client] Rate limited on {model}. Retrying in {wait_time}s (Attempt {attempt+1}/{max_retries})...")
                        time.sleep(wait_time)
                        continue
                    else:
                        print(f"[Groq Client] Rate limit exhausted for {model}. Trying next model...")
                        last_exception = e
                        break
                
                # Model not available — try next
                if "model_not_found" in error_str.lower() or "not_found" in error_str.lower():
                    print(f"[Groq Client] Model {model} not available. Trying next model...")
                    last_exception = e
                    break
                
                # Other transient errors — retry
                if attempt < max_retries - 1:
                    wait_time = (attempt + 1) * 1.5
                    print(f"[Groq Client] Error on {model}: {error_str}. Retrying in {wait_time}s...")
                    time.sleep(wait_time)
                else:
                    last_exception = e
    
    if last_exception:
        raise RuntimeError(f"All Groq models failed. Last error: {last_exception}")
    raise RuntimeError("Groq API call failed with all attempted models.")


def call_llm_chat(history: list, system_instruction: str = None, json_mode: bool = False, temperature: float = 0.7) -> str:
    """
    Sends a full conversation history to Groq and returns the text response.
    Includes auto-retry and model fallback.
    
    This function matches the interface of the ai-chatbot's call_gemini_chat().
    """
    if not GROQ_API_KEY:
        raise ValueError("Groq API key not found. Please add GROQ_API_KEY to your .env file.")

    models = get_model_sequence()
    
    messages = []
    if system_instruction:
        messages.append({"role": "system", "content": system_instruction})
    
    # Groq uses 'assistant' role directly (same as OpenAI format)
    for msg in history:
        messages.append({
            "role": msg["role"],
            "content": msg["content"]
        })
    
    last_exception = None
    
    for model in models:
        max_retries = 3
        
        for attempt in range(max_retries):
            try:
                kwargs = {
                    "messages": messages,
                    "model": model,
                    "temperature": temperature,
                    "max_tokens": 2048,
                }
                
                if json_mode:
                    kwargs["response_format"] = {"type": "json_object"}
                
                response = client.chat.completions.create(**kwargs)
                text = response.choices[0].message.content
                
                if text:
                    return text.strip()
                else:
                    raise RuntimeError("Groq API returned an empty response.")
                    
            except Exception as e:
                error_str = str(e)
                
                if "rate_limit" in error_str.lower() or "429" in error_str:
                    wait_time = (attempt + 1) * 2.0
                    if attempt < max_retries - 1:
                        print(f"[Groq Client] Rate limited on {model}. Retrying in {wait_time}s...")
                        time.sleep(wait_time)
                        continue
                    else:
                        last_exception = e
                        break
                
                if "model_not_found" in error_str.lower() or "not_found" in error_str.lower():
                    last_exception = e
                    break
                
                if attempt < max_retries - 1:
                    wait_time = (attempt + 1) * 1.5
                    print(f"[Groq Client] Error on {model}: {error_str}. Retrying...")
                    time.sleep(wait_time)
                else:
                    last_exception = e
    
    if last_exception:
        raise RuntimeError(f"All Groq models failed. Last error: {last_exception}")
    raise RuntimeError("Groq API call failed with all attempted models.")


if __name__ == "__main__":
    try:
        res = call_llm("Hello! Tell me a one-line joke.", system_instruction="You are a funny assistant.")
        print("Test Response:", res)
    except Exception as err:
        print("API Test Failed:", err)

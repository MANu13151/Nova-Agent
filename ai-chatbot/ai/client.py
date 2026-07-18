import httpx
import time
import re
from backend.config import GEMINI_API_KEY, GEMINI_MODEL

def get_model_sequence(primary_model: str) -> list:
    """
    Returns a list of models to try in sequence for robustness.
    """
    sequence = [primary_model]
    for fallback in ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-2.5-flash-lite", "gemini-3.5-flash"]:
        if fallback not in sequence:
            sequence.append(fallback)
    return sequence

def call_gemini(prompt: str, system_instruction: str = None, json_mode: bool = False, temperature: float = 0.7) -> str:
    """
    Sends a query to Google Gemini model and returns the text response.
    Includes auto-retry for 429 (Rate Limit) and 503 (High Demand/Service Unavailable),
    and falls back to alternative models if the primary model hits quota limits.
    """
    if not GEMINI_API_KEY:
        raise ValueError("Gemini API key not found. Please add REACT_APP_GEMINI_API_KEY to your .env file.")

    models_to_try = get_model_sequence(GEMINI_MODEL)
    
    # Construct request payload
    body = {
        "contents": [
            {
                "parts": [{"text": prompt}]
            }
        ],
        "generationConfig": {
            "temperature": temperature,
            "topP": 0.95,
            "maxOutputTokens": 2048,
        }
    }
    
    if system_instruction:
        body["systemInstruction"] = {
            "parts": [{"text": system_instruction}]
        }
        
    if json_mode:
        body["generationConfig"]["responseMimeType"] = "application/json"

    headers = {"Content-Type": "application/json"}
    
    last_exception = None
    
    for model in models_to_try:
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={GEMINI_API_KEY}"
        max_retries = 3
        
        for attempt in range(max_retries):
            try:
                with httpx.Client(timeout=30.0) as client:
                    response = client.post(url, json=body, headers=headers)
                    
                    if response.status_code == 200:
                        data = response.json()
                        try:
                            candidates = data.get("candidates", [])
                            if not candidates:
                                raise RuntimeError("Gemini API returned no candidates.")
                            
                            parts = candidates[0].get("content", {}).get("parts", [])
                            if not parts:
                                raise RuntimeError("Gemini API returned an empty response. It may have been filtered.")
                                
                            text = parts[0].get("text", "")
                            return text.strip()
                        except (KeyError, IndexError) as e:
                            raise RuntimeError(f"Failed to parse Gemini response: {str(e)}. Raw data: {data}")
                    
                    # Handle rate limit (429) or high demand (503)
                    if response.status_code in [429, 503]:
                        error_msg = ""
                        try:
                            error_msg = response.json().get("error", {}).get("message", response.text)
                        except Exception:
                            error_msg = response.text
                            
                        # If it is 429, parse the exact retry time if available
                        wait_time = (attempt + 1) * 2.0
                        should_fallback = False
                        
                        if response.status_code == 429:
                            match = re.search(r"Please retry in ([\d\.]+)s", error_msg)
                            if match:
                                retry_after = float(match.group(1))
                                # If the wait time is small, we sleep and retry on this model
                                if retry_after <= 5.0:
                                    wait_time = retry_after + 0.5
                                else:
                                    # Wait time is too long, we should immediately fallback to next model
                                    print(f"[Gemini Client] HTTP 429: Quota exceeded for model {model}. Wait time {retry_after}s is too long. Trying next model...")
                                    should_fallback = True
                            else:
                                print(f"[Gemini Client] HTTP 429: Quota exceeded for model {model}. No wait time found. Trying next model...")
                                should_fallback = True
                        
                        if should_fallback:
                            last_exception = RuntimeError(f"Gemini API returned error (HTTP {response.status_code}) for model {model}: {error_msg}")
                            break # break inner retry loop to try next model
                            
                        if attempt < max_retries - 1:
                            print(f"[Gemini Client] HTTP {response.status_code} received for model {model}. Retrying in {wait_time:.2f}s (Attempt {attempt+1}/{max_retries})...")
                            time.sleep(wait_time)
                            continue
                        else:
                            last_exception = RuntimeError(f"Gemini API returned error (HTTP {response.status_code}) for model {model}: {error_msg}")
                            
                    else:
                        # Other non-retryable status codes
                        try:
                            error_msg = response.json().get("error", {}).get("message", response.text)
                        except Exception:
                            error_msg = response.text
                        raise RuntimeError(f"Gemini API returned error (HTTP {response.status_code}) for model {model}: {error_msg}")
                        
            except httpx.RequestError as e:
                if attempt < max_retries - 1:
                    wait_time = (attempt + 1) * 2.0
                    print(f"[Gemini Client] Request failed for model {model}: {str(e)}. Retrying in {wait_time}s (Attempt {attempt+1}/{max_retries})...")
                    time.sleep(wait_time)
                else:
                    last_exception = RuntimeError(f"Gemini API connection failed for model {model}: {str(e)}")
                    
    # If all models failed
    if last_exception:
        raise last_exception
    raise RuntimeError("Gemini API call failed with all attempted models.")

def call_gemini_chat(history: list, system_instruction: str = None, json_mode: bool = False, temperature: float = 0.7) -> str:
    """
    Sends a full conversation history to Google Gemini and returns the text response.
    Includes auto-retry for 429 and 503 status codes, and falls back to alternative models.
    """
    if not GEMINI_API_KEY:
        raise ValueError("Gemini API key not found. Please add REACT_APP_GEMINI_API_KEY to your .env file.")

    models_to_try = get_model_sequence(GEMINI_MODEL)
    
    # Map roles to model-compatible roles (Gemini expects 'model' instead of 'assistant')
    contents = []
    for msg in history:
        role = "model" if msg["role"] == "assistant" else "user"
        contents.append({
            "role": role,
            "parts": [{"text": msg["content"]}]
        })
        
    body = {
        "contents": contents,
        "generationConfig": {
            "temperature": temperature,
            "topP": 0.95,
            "maxOutputTokens": 2048,
        }
    }
    
    if system_instruction:
        body["systemInstruction"] = {
            "parts": [{"text": system_instruction}]
        }
        
    if json_mode:
        body["generationConfig"]["responseMimeType"] = "application/json"

    headers = {"Content-Type": "application/json"}
    
    last_exception = None
    
    for model in models_to_try:
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={GEMINI_API_KEY}"
        max_retries = 3
        
        for attempt in range(max_retries):
            try:
                with httpx.Client(timeout=30.0) as client:
                    response = client.post(url, json=body, headers=headers)
                    
                    if response.status_code == 200:
                        data = response.json()
                        try:
                            candidates = data.get("candidates", [])
                            if not candidates:
                                raise RuntimeError("Gemini API returned no candidates.")
                            
                            parts = candidates[0].get("content", {}).get("parts", [])
                            if not parts:
                                raise RuntimeError("Gemini API returned an empty response.")
                                
                            text = parts[0].get("text", "")
                            return text.strip()
                        except (KeyError, IndexError) as e:
                            raise RuntimeError(f"Failed to parse Gemini response: {str(e)}")
                    
                    # Handle rate limit (429) or high demand (503)
                    if response.status_code in [429, 503]:
                        error_msg = ""
                        try:
                            error_msg = response.json().get("error", {}).get("message", response.text)
                        except Exception:
                            error_msg = response.text
                            
                        # If it is 429, parse the exact retry time if available
                        wait_time = (attempt + 1) * 2.0
                        should_fallback = False
                        
                        if response.status_code == 429:
                            match = re.search(r"Please retry in ([\d\.]+)s", error_msg)
                            if match:
                                retry_after = float(match.group(1))
                                # If the wait time is small, we sleep and retry on this model
                                if retry_after <= 5.0:
                                    wait_time = retry_after + 0.5
                                else:
                                    # Wait time is too long, we should immediately fallback to next model
                                    print(f"[Gemini Client] HTTP 429: Quota exceeded for model {model}. Wait time {retry_after}s is too long. Trying next model...")
                                    should_fallback = True
                            else:
                                print(f"[Gemini Client] HTTP 429: Quota exceeded for model {model}. No wait time found. Trying next model...")
                                should_fallback = True
                                
                        if should_fallback:
                            last_exception = RuntimeError(f"Gemini API returned error (HTTP {response.status_code}) for model {model}: {error_msg}")
                            break # break inner retry loop to try next model
                            
                        if attempt < max_retries - 1:
                            print(f"[Gemini Client] HTTP {response.status_code} received for model {model}. Retrying in {wait_time:.2f}s (Attempt {attempt+1}/{max_retries})...")
                            time.sleep(wait_time)
                            continue
                        else:
                            last_exception = RuntimeError(f"Gemini API returned error (HTTP {response.status_code}) for model {model}: {error_msg}")
                            
                    else:
                        # Other non-retryable status codes
                        try:
                            error_msg = response.json().get("error", {}).get("message", response.text)
                        except Exception:
                            error_msg = response.text
                        raise RuntimeError(f"Gemini API returned error (HTTP {response.status_code}) for model {model}: {error_msg}")
                        
            except httpx.RequestError as e:
                if attempt < max_retries - 1:
                    wait_time = (attempt + 1) * 2.0
                    print(f"[Gemini Client] Request failed for model {model}: {str(e)}. Retrying in {wait_time}s (Attempt {attempt+1}/{max_retries})...")
                    time.sleep(wait_time)
                else:
                    last_exception = RuntimeError(f"Gemini API connection failed for model {model}: {str(e)}")
                    
    # If all models failed
    if last_exception:
        raise last_exception
    raise RuntimeError("Gemini API call failed with all attempted models.")

if __name__ == "__main__":
    # Test call
    try:
        res = call_gemini("Hello Gemini! Tell me a one-line joke.", system_instruction="You are a funny assistant.")
        print("Test Response:", res)
    except Exception as err:
        print("API Test Failed:", err)

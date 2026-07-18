import json
from ai.client import call_llm
from ai.prompts import INTENT_ROUTER_PROMPT

def route_intent(user_input: str) -> dict:
    """
    Classifies the user input into: 'db_query', 'voice_control', or 'general_chat'.
    Returns a dict with 'intent' and 'reason'.
    """
    prompt = INTENT_ROUTER_PROMPT.format(user_input=user_input)
    
    try:
        response_text = call_llm(
            prompt=prompt,
            system_instruction="You are the routing component of an enterprise voice agent. You output JSON only.",
            json_mode=True,
            temperature=0.1
        )
        
        # Parse the JSON response
        data = json.loads(response_text)
        intent = data.get("intent", "general_chat")
        reason = data.get("reason", "")
        
        # Normalize
        if intent not in ["db_query", "voice_control", "general_chat"]:
            intent = "general_chat"
            
        return {
            "intent": intent,
            "reason": reason
        }
    except Exception as e:
        # Fallback to general_chat if routing fails
        return {
            "intent": "general_chat",
            "reason": f"Fallback due to routing error: {str(e)}"
        }

if __name__ == "__main__":
    tests = [
        "How much sales did Bob make in 2025?",
        "Can you please mute the volume",
        "Hello there, what is the capital of France?",
        "Show a bar chart of the departments and their average salaries"
    ]
    for test in tests:
        res = route_intent(test)
        print(f"Input: {test}\nRouted: {res}\n")

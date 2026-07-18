import re
from ai.router import route_intent
from ai.memory import memory_manager
from ai.client import call_llm, call_llm_chat
from ai.prompts import SQL_GENERATOR_PROMPT, RESPONSE_FORMATTER_PROMPT
from sql.schema import get_schema_prompt_text
from sql.executor import execute_query
from analytics.formatter import format_sql_results_table
from analytics.charts import generate_chart_config

def clean_sql_query(raw_sql: str) -> str:
    """Cleans markdown syntax or block quotes from the generated SQL string."""
    cleaned = raw_sql.strip()
    
    # Remove markdown code blocks if present
    if cleaned.startswith("```"):
        # Match ```sql ... ``` or ``` ... ```
        match = re.search(r"```(?:sql)?\n(.*?)```", cleaned, re.DOTALL | re.IGNORECASE)
        if match:
            cleaned = match.group(1).strip()
        else:
            # Fallback removal
            cleaned = re.sub(r"^```(?:sql)?\n", "", cleaned)
            cleaned = re.sub(r"\n```$", "", cleaned).strip()
            
    # Remove single line block format or trailing/leading quotes
    cleaned = cleaned.replace("`", "")
    
    # Clean any semicolons if present at the end
    if cleaned.endswith(";"):
        cleaned = cleaned[:-1].strip()
        
    return cleaned

def orchestrate_message(user_message: str, session_id: str, user_name: str = "User") -> dict:
    """
    Main Orchestrator loop. Routes, acts on tools, queries database, formats, and updates memory.
    """
    # 1. Route Intent
    routing_result = route_intent(user_message)
    intent = routing_result.get("intent", "general_chat")
    reason = routing_result.get("reason", "")
    
    # 2. Get history
    history = memory_manager.get_history(session_id)
    
    # Add user message to memory immediately for context
    memory_manager.add_message(session_id, "user", user_message)
    
    response_payload = {
        "intent": intent,
        "response": "",
        "sql": None,
        "chart": None,
        "error": None
    }
    
    if intent == "voice_control":
        # Handle voice control command directly
        system_inst = "You are a voice controller assistant. Be very short, direct, and confirm the action."
        try:
            response_text = call_llm(
                prompt=f"The user wants to control the system or voice: '{user_message}'. Formulate a 1-sentence confirmation response.",
                system_instruction=system_inst,
                temperature=0.3
            )
        except Exception:
            response_text = f"Action received: {user_message}."
            
        response_payload["response"] = response_text
        memory_manager.add_message(session_id, "assistant", response_text)
        
    elif intent == "db_query":
        # Database query path
        schema_text = get_schema_prompt_text()
        
        # Format conversation history for context
        history_text = "\n".join([f"{msg['role'].capitalize()}: {msg['content']}" for msg in history[-6:]]) if history else "No previous history."
        
        sql_gen_prompt = SQL_GENERATOR_PROMPT.format(
            schema_text=schema_text, 
            chat_history=history_text,
            user_input=user_message
        )
        
        try:
            # Generate SQL query
            raw_sql = call_llm(
                prompt=sql_gen_prompt,
                system_instruction="You generate SQLite SELECT queries based on a schema. Output the query only, no explanations, no code block markers.",
                temperature=0.1
            )
            
            sql_query = clean_sql_query(raw_sql)
            response_payload["sql"] = sql_query
            
            # Execute query
            execution_res = execute_query(sql_query)
            
            if execution_res["status"] == "success":
                columns = execution_res["columns"]
                rows = execution_res["rows"]
                
                # Format tabular representation
                table_md = format_sql_results_table(columns, rows)
                
                # Check for chart compatibility
                chart_config = generate_chart_config(columns, rows, sql_query)
                response_payload["chart"] = chart_config
                
                # Ask LLM to summarize verbally
                formatter_prompt = RESPONSE_FORMATTER_PROMPT.format(
                    user_input=user_message,
                    sql_query=sql_query,
                    sql_results=str(rows[:10]) # Send a sample of rows
                )
                
                verbal_summary = call_llm(
                    prompt=formatter_prompt,
                    system_instruction=f"You summarize database query results in a clear, spoken-friendly, professional manner. You MUST greet the user by their name ('{user_name}') and briefly state the command you are responding to.",
                    temperature=0.5
                )
                
                # Build final response text (summary + markdown table)
                final_response = f"{verbal_summary}\n\n{table_md}"
                response_payload["response"] = final_response
                memory_manager.add_message(session_id, "assistant", final_response)
                
            else:
                # Execution error (security block or DB error)
                error_msg = execution_res.get("error_message", "Unknown database error.")
                response_payload["error"] = error_msg
                
                error_response = f"I encountered an issue executing the database query: {error_msg}"
                response_payload["response"] = error_response
                memory_manager.add_message(session_id, "assistant", error_response)
                
        except Exception as e:
            # General generation or client exception
            error_response = f"Sorry, I failed to process your database request: {str(e)}"
            response_payload["error"] = str(e)
            response_payload["response"] = error_response
            memory_manager.add_message(session_id, "assistant", error_response)
            
    else:  # general_chat
        # Send full history to LLM
        system_instruction = (
            f"You are Nova, an expert Enterprise Voice AI Assistant. You help users with business analytics. "
            f"The current user you are talking to is {user_name}. Greet them by name when appropriate. "
            f"You can answer general questions, but remember that you also have access to the enterprise "
            f"database. If the user asks for sales figures, employees, customers, or reports, let them "
            f"know they can ask you directly and you will query it. Keep responses professional, helpful, "
            f"and concise (suited for text-to-speech feedback)."
        )
        
        try:
            # We get the updated history which includes the user's latest query
            updated_history = memory_manager.get_history(session_id)
            
            chat_response = call_llm_chat(
                history=updated_history,
                system_instruction=system_instruction,
                temperature=0.7
            )
            
            response_payload["response"] = chat_response
            memory_manager.add_message(session_id, "assistant", chat_response)
        except Exception as e:
            error_response = f"Sorry, I had trouble communicating with the AI service: {str(e)}"
            response_payload["error"] = str(e)
            response_payload["response"] = error_response
            memory_manager.add_message(session_id, "assistant", error_response)
            
    return response_payload

if __name__ == "__main__":
    # Test orchestrator
    test_session = "test_run_1"
    print("Sending greeting:")
    r1 = orchestrate_message("Hello there! What's your name and what can you do?", test_session)
    print("Response:\n", r1["response"])
    print("-" * 40)
    
    print("Sending sales query:")
    r2 = orchestrate_message("Show me total sales group by product category", test_session)
    print("SQL Generated:\n", r2["sql"])
    print("Response:\n", r2["response"])
    print("Chart Config:\n", r2["chart"])
    print("-" * 40)

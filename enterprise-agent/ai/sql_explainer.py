from ai.client import call_llm
from sql.schema import get_schema_prompt_text

EXPLAIN_PROMPT = """
You are an expert Data Analyst and SQL Translator for an Enterprise Data system.
Your task is to take a raw SQL query and explain what it does in simple, non-technical English. 
Do not explain the SQL syntax (e.g. "it uses a LEFT JOIN"), instead explain the business logic (e.g. "it matches employees with their department").

Here is the Database Schema for context:
{schema_text}

Raw SQL Query to explain:
{sql_query}

Explanation (1-3 sentences, plain English):
"""

def explain_sql(sql_query: str) -> str:
    """
    Takes a raw SQL query and returns a plain English explanation of what data it retrieves.
    """
    if not sql_query or not sql_query.strip():
        return "No SQL query provided to explain."
        
    schema_text = get_schema_prompt_text()
    prompt = EXPLAIN_PROMPT.format(schema_text=schema_text, sql_query=sql_query)
    
    try:
        explanation = call_llm(
            prompt=prompt,
            system_instruction="You explain SQL queries in plain English for business users. Keep it short and non-technical.",
            temperature=0.3
        )
        return explanation.strip()
    except Exception as e:
        return f"Failed to generate explanation: {str(e)}"
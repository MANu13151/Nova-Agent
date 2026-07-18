from ai.llm_client import generate_sql
from sql.schema_loader import load_schema


def correct_sql(question, wrong_sql, error):

    schema = load_schema()

    prompt = f"""
You are an expert PostgreSQL SQL assistant.

The previous SQL query failed.

DATABASE SCHEMA:

{schema}

User Question:
{question}

Generated SQL:
{wrong_sql}

Database Error:
{error}

Correct the SQL.

Rules:
- Return ONLY SQL.
- Do not explain.
- Do not use markdown.
"""

    return generate_sql(prompt)
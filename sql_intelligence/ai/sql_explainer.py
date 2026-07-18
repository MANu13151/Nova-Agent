from ai.gemini_client import generate_sql


def explain_sql(sql):

    prompt = f"""
You are an SQL tutor.

Explain this SQL query in 2-3 simple sentences.

Do not explain line by line.

Keep the explanation concise and easy to understand.

SQL:

{sql}
"""

    return generate_sql(prompt)
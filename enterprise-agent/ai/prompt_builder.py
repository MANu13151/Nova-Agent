from sql.schema_loader import load_schema


def schema_to_text(schema: dict) -> str:
    """
    Convert schema dictionary into readable text for the LLM.
    """

    schema_text = ""

    for table, columns in schema.items():
        schema_text += f"Table: {table}\n"
        schema_text += "Columns:\n"

        for column in columns:
            schema_text += f"- {column}\n"

        schema_text += "\n"

    return schema_text


def build_prompt(user_question: str) -> str:
    """
    Build the final prompt for Gemini.
    """

    schema = load_schema()

    schema_text = schema_to_text(schema)

    prompt = f"""
You are an expert SQLite SQL assistant.

Rules:
1. Return ONLY SQL.
2. Do not explain anything.
3. Never generate DELETE, UPDATE, INSERT, DROP or ALTER.
4. Use only the tables and columns given below.
5. IMPORTANT: Use case-insensitive text comparisons (e.g., LOWER(column) = LOWER('value')) since data casing is unknown. (Do not use ILIKE as this is SQLite).

DATABASE SCHEMA

{schema_text}

User Question:
{user_question}

SQL:
"""

    return prompt


if __name__ == "__main__":

    question = "Show top 5 customers by freight."

    print(build_prompt(question))
import re

def clean_sql(sql: str) -> str:
    """
    Remove markdown formatting from LLM output.
    """

    sql = re.sub(r"```sql", "", sql, flags=re.IGNORECASE)
    sql = sql.replace("```", "")

    return sql.strip()
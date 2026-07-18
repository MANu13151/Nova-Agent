import sqlparse

FORBIDDEN_KEYWORDS = {
    "insert", "update", "delete", "drop", "alter", "create", "replace", 
    "truncate", "rename", "grant", "revoke", "pragma", "attach", "detach", 
    "exec", "execute", "into", "union"
}

def validate_sql(sql_query: str) -> tuple[bool, str]:
    """
    Validates that a SQL query is a single read-only SELECT statement.
    Returns (is_valid, error_message_or_success_message).
    """
    cleaned = sql_query.strip()
    if not cleaned:
        return False, "Query is empty."

    # Remove any trailing semicolon if it's the very last character
    if cleaned.endswith(";"):
        cleaned = cleaned[:-1].strip()

    # Reject if there are still semicolons in the query (prevents multi-statements)
    if ";" in cleaned:
        return False, "Multiple SQL statements separated by semicolons are not allowed."

    try:
        parsed = sqlparse.parse(cleaned)
    except Exception as e:
        return False, f"SQL Parsing Error: {str(e)}"

    if not parsed:
        return False, "Invalid SQL syntax."

    if len(parsed) > 1:
        return False, "Multiple SQL statements are not allowed."

    statement = parsed[0]
    
    # Check type of statement
    if statement.get_type() != "SELECT":
        return False, f"Only SELECT statements are allowed. Statement type '{statement.get_type()}' is blocked."

    # Scan tokens for forbidden keywords
    for token in statement.flatten():
        token_str = token.value.lower().strip()
        if token_str in FORBIDDEN_KEYWORDS:
            return False, f"Unsafe SQL detected: Keyword '{token.value}' is forbidden."

    return True, "Query is safe."

if __name__ == "__main__":
    # Test cases
    tests = [
        "SELECT * FROM employees",
        "SELECT name, salary FROM employees WHERE salary > 60000; ",
        "SELECT name FROM employees; DROP TABLE employees;",
        "INSERT INTO employees (name) VALUES ('Hacker')",
        "SELECT * FROM employees WHERE name = 'Alice' UNION SELECT * FROM customers", # union is blocked in forbidden keywords
        "UPDATE employees SET salary = 100000",
    ]
    for test in tests:
        valid, msg = validate_sql(test)
        print(f"Query: {test}\nValid: {valid} | Message: {msg}\n")

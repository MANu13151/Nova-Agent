import sqlparse
from sqlparse.tokens import Keyword, DML, DDL

FORBIDDEN_KEYWORDS = {
    'DELETE', 'DROP', 'ALTER', 'TRUNCATE', 'UPDATE', 'INSERT', 'CREATE', 'REPLACE', 
    'GRANT', 'REVOKE', 'EXEC', 'EXECUTE', 'CALL', 'ATTACH', 'DETACH', 'PRAGMA', 
    'RENAME', 'INTO', 'UNION'
}

def validate_sql(sql_query: str) -> tuple[bool, str]:
    """
    AST-level SQL validation. Parses the SQL and inspects tokens,
    allowing keywords inside string literals but blocking them as verbs.
    
    Returns (is_valid, error_message_or_success_message).
    """
    cleaned = sql_query.strip()
    if not cleaned:
        return False, "Query is empty."

    # Remove any trailing semicolon if it's the very last character
    if cleaned.endswith(";"):
        cleaned = cleaned[:-1].strip()

    # Reject if there are multiple statements separated by semicolons
    # (Checking parsed statements)
    try:
        parsed = sqlparse.parse(cleaned)
    except Exception as e:
        return False, f"SQL Parsing Error: {str(e)}"

    if not parsed:
        return False, "Invalid SQL syntax."

    if len(parsed) > 1:
        return False, "Multiple SQL statements are not allowed."

    statement = parsed[0]
    
    # Find the first non-whitespace token to enforce SELECT or WITH (CTE)
    first_token = None
    for token in statement.tokens:
        if not token.is_whitespace:
            first_token = token
            break
            
    if not first_token:
        return False, "No valid SQL tokens found."
        
    first_val = first_token.value.upper().strip()
    if first_val not in ("SELECT", "WITH"):
        return False, f"Only SELECT or WITH (CTE) statements are allowed. Got: '{first_val}'"

    # AST check: flat-scan tokens for forbidden keywords
    for token in statement.flatten():
        # Check if it's a keyword, DML or DDL token
        # sqlparse classifies comments or string literals as separate types (Comment, Literal.String)
        # token.is_keyword checks if it's a keyword. 
        if token.is_keyword or token.ttype in (Keyword, DML, DDL):
            word = token.value.upper().strip()
            if word in FORBIDDEN_KEYWORDS:
                return False, f"Unsafe SQL operation: Keyword '{token.value}' is forbidden."

    return True, "Query is safe."

if __name__ == "__main__":
    # Test cases
    tests = [
        "SELECT * FROM employees",
        "SELECT name, salary FROM employees WHERE salary > 60000; ",
        "SELECT name FROM employees WHERE name = 'DELETE'", # should pass (keyword inside string literal)
        "SELECT name FROM employees; DROP TABLE employees;", # should fail
        "INSERT INTO employees (name) VALUES ('Hacker')", # should fail
        "SELECT * FROM employees WHERE name = 'Alice' UNION SELECT * FROM customers", # should fail (UNION is forbidden)
        "WITH sales_cte AS (SELECT * FROM sales) SELECT * FROM sales_cte", # should pass (CTE starting with WITH)
        "DROP TABLE employees;--", # should fail
    ]
    for test in tests:
        valid, msg = validate_sql(test)
        print(f"Query: {test}\nValid: {valid} | Message: {msg}\n")

from backend.database import get_db_connection
from sql.validator import validate_sql

def execute_query(sql_query: str) -> dict:
    """
    Validates and executes a SQL query on the SQLite database.
    
    Returns a dict with:
      - status: "success" or "error"
      - columns: list of column names (on success)
      - rows: list of rows as lists (on success)
      - row_count: number of rows returned (on success)
      - error_message: details of the error (on security check or DB failure)
    """
    # 1. Security check
    is_safe, validation_msg = validate_sql(sql_query)
    if not is_safe:
        return {
            "status": "error",
            "error_type": "security_violation",
            "error_message": validation_msg
        }

    conn = None
    try:
        # 2. Connection and execution
        conn = get_db_connection()
        # Set to read-only mode for safety (in SQLite, we can set query timeout and open in RO mode if we wanted, 
        # but the validator is already protecting us from write verbs).
        cursor = conn.cursor()
        cursor.execute(sql_query)
        
        # 3. Process results
        description = cursor.description
        columns = [desc[0] for desc in description] if description else []
        
        rows = cursor.fetchall()
        result_rows = [list(row) for row in rows]
        
        return {
            "status": "success",
            "columns": columns,
            "rows": result_rows,
            "row_count": len(result_rows)
        }
        
    except Exception as e:
        return {
            "status": "error",
            "error_type": "database_error",
            "error_message": f"Database execution failed: {str(e)}"
        }
    finally:
        if conn:
            conn.close()

if __name__ == "__main__":
    # Test execution
    res1 = execute_query("SELECT name, role, department FROM employees WHERE salary > 70000")
    print("Success Test:", res1)
    
    res2 = execute_query("DELETE FROM employees")
    print("Failure Test (Safety Check):", res2)

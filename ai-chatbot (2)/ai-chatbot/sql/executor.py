import sqlite3
import pathlib
import os
from backend.database import DATABASE_PATH
from sql.validator import validate_sql

def get_readonly_connection():
    """
    Returns a read-only sqlite3 connection using URI connection mode.
    """
    db_uri = pathlib.Path(DATABASE_PATH).as_uri() + "?mode=ro"
    conn = sqlite3.connect(db_uri, uri=True, timeout=5.0)
    conn.row_factory = sqlite3.Row
    return conn

def execute_query(sql_query: str) -> dict:
    """
    Validates and executes a SQL query on the SQLite database.
    Ensures execution is read-only, limited to 500 rows, and times out after 5 seconds.
    
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
        # 2. Connection and execution in read-only mode
        conn = get_readonly_connection()
        cursor = conn.cursor()
        cursor.execute(sql_query)
        
        # 3. Process results, limiting to 500 rows
        description = cursor.description
        columns = [desc[0] for desc in description] if description else []
        
        # Restrict rows to maximum of 500 to prevent memory blowups
        rows = cursor.fetchmany(500)
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
    print("Testing safe query:")
    res1 = execute_query("SELECT name, role FROM employees WHERE salary > 90000")
    print(res1)
    
    print("\nTesting write operation attempt (should fail at validator level):")
    res2 = execute_query("DELETE FROM employees")
    print(res2)

    print("\nTesting write operation attempt directly bypassing validator (simulated):")
    # We bypass validate_sql in execute_query to prove connection-level read-only safety works!
    try:
        conn = get_readonly_connection()
        c = conn.cursor()
        c.execute("UPDATE employees SET salary = salary + 10")
        conn.commit()
    except Exception as e:
        print("Bypass write caught by connection-level read-only constraint:", str(e))

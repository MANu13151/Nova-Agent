from backend.database import get_db_connection

def load_schema():
    """Loads schema information from the database."""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Query all user-defined tables
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'")
    tables = [row[0] for row in cursor.fetchall()]
    
    schema_info = {}
    for table in tables:
        cursor.execute(f"PRAGMA table_info({table})")
        columns = cursor.fetchall()
        schema_info[table] = [
            {
                "name": col[1],
                "type": col[2],
                "notnull": bool(col[3]),
                "pk": bool(col[5])
            }
            for col in columns
        ]
    conn.close()
    return schema_info

def get_schema_prompt_text():
    """Returns a textual description of the schema, suitable for an LLM prompt."""
    schema = load_schema()
    lines = []
    for table_name, columns in schema.items():
        lines.append(f"Table: {table_name}")
        for col in columns:
            pk_str = " (PRIMARY KEY)" if col["pk"] else ""
            not_null_str = " NOT NULL" if col["notnull"] else ""
            lines.append(f"  - {col['name']} ({col['type']}){pk_str}{not_null_str}")
    return "\n".join(lines)

if __name__ == "__main__":
    print("Database Schema Summary:")
    print(get_schema_prompt_text())

from backend.database import get_db_connection

# Module level caches
_cached_schema = None
_cached_prompt_text = None

def load_schema(use_cache: bool = True) -> dict:
    """
    Loads schema details (columns, types, primary/foreign keys, and sample data) from the database.
    """
    global _cached_schema
    if use_cache and _cached_schema is not None:
        return _cached_schema

    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Get all tables
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'")
    tables = [row[0] for row in cursor.fetchall()]
    
    schema_info = {}
    for table in tables:
        # Get column info
        cursor.execute(f"PRAGMA table_info({table})")
        columns = cursor.fetchall()
        
        # Get foreign key info
        cursor.execute(f"PRAGMA foreign_key_list({table})")
        fk_list = cursor.fetchall()
        # fk_list contains rows with fields: id, seq, table, from, to, on_update, on_delete, match
        foreign_keys = {}
        for fk in fk_list:
            from_col = fk[3]
            to_table = fk[2]
            to_col = fk[4]
            foreign_keys[from_col] = f"REFERENCES {to_table}({to_col})"

        # Get 3 sample rows
        sample_rows = []
        try:
            cursor.execute(f"SELECT * FROM {table} LIMIT 3")
            rows = cursor.fetchall()
            sample_rows = [list(row) for row in rows]
        except Exception as e:
            print(f"[Schema] Error fetching sample rows for table {table}: {e}")

        schema_info[table] = {
            "columns": [
                {
                    "name": col[1],
                    "type": col[2],
                    "notnull": bool(col[3]),
                    "pk": bool(col[5]),
                    "fk_info": foreign_keys.get(col[1], "")
                }
                for col in columns
            ],
            "sample_rows": sample_rows
        }

    conn.close()
    _cached_schema = schema_info
    return schema_info

def get_schema_prompt_text(use_cache: bool = True) -> str:
    """
    Formats the schema and sample data into a comprehensive description for the LLM prompt.
    """
    global _cached_prompt_text
    if use_cache and _cached_prompt_text is not None:
        return _cached_prompt_text

    schema = load_schema(use_cache=use_cache)
    lines = []
    
    for table_name, details in schema.items():
        lines.append(f"Table: {table_name}")
        for col in details["columns"]:
            pk_str = " (PRIMARY KEY)" if col["pk"] else ""
            not_null_str = " NOT NULL" if col["notnull"] else ""
            fk_str = f" {col['fk_info']}" if col["fk_info"] else ""
            lines.append(f"  - {col['name']} ({col['type']}){pk_str}{not_null_str}{fk_str}")
        
        if details["sample_rows"]:
            lines.append("  Sample Rows:")
            for row in details["sample_rows"]:
                # Convert values to strings for formatting
                row_str = ", ".join(repr(v) for v in row)
                lines.append(f"    ({row_str})")
        lines.append("") # Spacer line
        
    prompt_text = "\n".join(lines).strip()
    _cached_prompt_text = prompt_text
    return prompt_text

def reload_schema():
    """
    Invalidates the schema cache and reloads it fresh.
    """
    global _cached_schema, _cached_prompt_text
    _cached_schema = None
    _cached_prompt_text = None
    return load_schema(use_cache=False)

if __name__ == "__main__":
    print("Database Schema Summary (Fresh Load):")
    print(get_schema_prompt_text(use_cache=False))

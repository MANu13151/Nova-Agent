from fastapi import APIRouter, Query, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from ai.orchestrator import orchestrate_message
from ai.memory import memory_manager
from sql.schema import get_schema_prompt_text
from voice.tts import text_to_speech_mp3
from backend.database import get_db_connection
import urllib.parse
import json

router = APIRouter(prefix="/api")

# --- AUTH & SAVED QUERIES ---

class LoginRequest(BaseModel):
    username: str
    password: str

@router.post("/auth/login")
async def login(req: LoginRequest):
    conn = get_db_connection()
    user = conn.execute("SELECT * FROM users WHERE username = ? AND password = ?", (req.username, req.password)).fetchone()
    conn.close()
    if user:
        return {"token": f"mock-jwt-token-{user['id']}", "user": dict(user)}
    raise HTTPException(status_code=401, detail="Invalid username or password")

class SavedQuery(BaseModel):
    id: str
    query: str
    sql: str = None

@router.get("/saved-queries")
async def get_saved_queries():
    conn = get_db_connection()
    queries = conn.execute("SELECT * FROM saved_queries ORDER BY timestamp DESC").fetchall()
    conn.close()
    return [dict(q) for q in queries]

@router.post("/saved-queries")
async def save_query(q: SavedQuery):
    conn = get_db_connection()
    try:
        conn.execute("INSERT INTO saved_queries (id, query, sql) VALUES (?, ?, ?)", (q.id, q.query, q.sql))
        conn.commit()
    except Exception as e:
        conn.close()
        raise HTTPException(status_code=400, detail=str(e))
    conn.close()
    return {"status": "success"}

@router.delete("/saved-queries/{query_id}")
async def delete_saved_query(query_id: str):
    conn = get_db_connection()
    conn.execute("DELETE FROM saved_queries WHERE id = ?", (query_id,))
    conn.commit()
    conn.close()
    return {"status": "success"}

# -----------------------------

class ChatRequest(BaseModel):
    message: str
    session_id: str = "default"
    user_name: str = "User"

@router.post("/chat")
async def chat_endpoint(req: ChatRequest):
    """
    HTTP POST Chat endpoint. Accepts query message and session ID, returning AI explanation,
    raw SQL data, chart configurations, and a TTS streaming URL.
    """
    try:
        result = orchestrate_message(req.message, req.session_id, req.user_name)
        
        # Build verbal text for native frontend TTS (strip tables/markdown)
        if result.get("response"):
            verbal_text = result["response"]
            if "\n\n|" in verbal_text:
                verbal_text = verbal_text.split("\n\n|")[0].strip()
            elif "\n|" in verbal_text:
                verbal_text = verbal_text.split("\n|")[0].strip()
            
            verbal_text = verbal_text.replace("*", "").replace("`", "").strip()
            result["verbal_text"] = verbal_text
            
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

class ExplainRequest(BaseModel):
    sql: str

@router.post("/explain")
async def explain_endpoint(req: ExplainRequest):
    """
    Takes a raw SQL query and returns a natural language explanation.
    """
    try:
        from ai.sql_explainer import explain_sql
        explanation = explain_sql(req.sql)
        return {"explanation": explanation}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/tts")
async def tts_endpoint(text: str = Query(..., description="Text to convert to speech")):
    """
    Streams the TTS synthesized speech (MPEG/MP3) for a given text.
    """
    try:
        mp3_stream = text_to_speech_mp3(text)
        return StreamingResponse(mp3_stream, media_type="audio/mpeg")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

class ColumnDefinition(BaseModel):
    name: str
    type: str

class TableDefinition(BaseModel):
    name: str
    columns: list[ColumnDefinition]
    rows: list[list[str]] = []

class CreateTablesRequest(BaseModel):
    tables: list[TableDefinition]

@router.post("/tables")
async def create_tables_endpoint(req: CreateTablesRequest):
    """
    Creates multiple tables in the database with optional seed data.
    """
    if not req.tables:
        raise HTTPException(status_code=400, detail="No tables provided.")

    import re
    def is_valid_identifier(name: str) -> bool:
        return bool(re.match(r'^[a-zA-Z_][a-zA-Z0-9_]*$', name))

    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        for table in req.tables:
            # 1. Validate Table Name
            if not is_valid_identifier(table.name):
                raise HTTPException(status_code=400, detail=f"Invalid table name: {table.name}")
            
            # 2. Validate and build columns
            col_defs = []
            valid_types = {"TEXT", "INTEGER", "REAL", "NUMERIC", "BLOB"}
            
            for col in table.columns:
                if not is_valid_identifier(col.name):
                    raise HTTPException(status_code=400, detail=f"Invalid column name '{col.name}' in table '{table.name}'")
                
                col_type = col.type.upper()
                if col_type not in valid_types:
                    raise HTTPException(status_code=400, detail=f"Unsupported column type '{col.type}' for column '{col.name}'")
                
                col_defs.append(f"{col.name} {col_type}")

            # 3. Create Table Query
            create_sql = f"CREATE TABLE IF NOT EXISTS {table.name} ({', '.join(col_defs)})"
            cursor.execute(create_sql)

            # 4. Insert optional rows
            if table.rows:
                placeholders = ", ".join(["?"] * len(table.columns))
                insert_sql = f"INSERT INTO {table.name} ({', '.join(c.name for c in table.columns)}) VALUES ({placeholders})"
                
                processed_rows = []
                for idx, row in enumerate(table.rows):
                    if len(row) != len(table.columns):
                        raise HTTPException(
                            status_code=400, 
                            detail=f"Row {idx} in table '{table.name}' has {len(row)} values, expected {len(table.columns)}."
                        )
                    
                    typed_row = []
                    for col_idx, col in enumerate(table.columns):
                        val = row[col_idx]
                        col_type = col.type.upper()
                        if val is None or val == "":
                            typed_row.append(None)
                        elif col_type == "INTEGER":
                            try:
                                typed_row.append(int(val))
                            except ValueError:
                                raise HTTPException(status_code=400, detail=f"Row {idx} value '{val}' is not a valid INTEGER for column '{col.name}'")
                        elif col_type in ("REAL", "NUMERIC"):
                            try:
                                typed_row.append(float(val))
                            except ValueError:
                                raise HTTPException(status_code=400, detail=f"Row {idx} value '{val}' is not a valid REAL/NUMERIC for column '{col.name}'")
                        else:
                            typed_row.append(str(val))
                    processed_rows.append(typed_row)

                cursor.executemany(insert_sql, processed_rows)
        
        conn.commit()
        return {"status": "success", "message": f"Successfully created/seeded {len(req.tables)} table(s)."}
    except HTTPException as he:
        conn.rollback()
        raise he
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Database schema update failed: {str(e)}")
    finally:
        conn.close()

class RawSqlRequest(BaseModel):
    sql: str

@router.post("/tables/raw")
async def create_tables_raw_endpoint(req: RawSqlRequest):
    """
    Executes raw SQL DDL script to create/seed tables directly.
    """
    if not req.sql.strip():
        raise HTTPException(status_code=400, detail="SQL script is empty.")

    import sqlparse
    try:
        statements = sqlparse.parse(req.sql)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to parse SQL: {str(e)}")

    allowed_verbs = {"CREATE", "INSERT"}
    for statement in statements:
        if not statement.get_type() and not statement.value.strip():
            continue
            
        stmt_type = statement.get_type()
        if stmt_type not in allowed_verbs:
            raise HTTPException(
                status_code=400, 
                detail=f"Only CREATE TABLE and INSERT statements are allowed in DDL. Action '{stmt_type or 'UNKNOWN'}' is blocked."
            )
            
        for token in statement.flatten():
            token_str = token.value.lower().strip()
            if token.is_keyword and token_str in {"drop", "delete", "update", "alter", "truncate", "pragma", "grant", "revoke"}:
                raise HTTPException(
                    status_code=400, 
                    detail=f"Unsafe SQL detected: Keyword '{token.value}' is not allowed in table definitions."
                )

    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        cursor.executescript(req.sql)
        conn.commit()
        return {"status": "success", "message": "SQL script executed successfully and tables registered."}
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"SQL script execution failed: {str(e)}")
    finally:
        conn.close()

@router.get("/schema")
async def schema_endpoint():
    """
    Returns the database schema for the frontend's information.
    """
    try:
        return {"schema": get_schema_prompt_text()}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/tables/list")
async def list_tables_endpoint():
    """
    Lists all tables with their column info and a preview of rows.
    """
    conn = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Get all table names
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name")
        tables = [row[0] for row in cursor.fetchall()]
        
        result = []
        for table_name in tables:
            # Get column info
            cursor.execute(f"PRAGMA table_info({table_name})")
            columns = [{"name": row[1], "type": row[2]} for row in cursor.fetchall()]
            
            # Get row count
            cursor.execute(f"SELECT COUNT(*) FROM {table_name}")
            row_count = cursor.fetchone()[0]
            
            # Get preview rows (first 20)
            col_names = [c["name"] for c in columns]
            cursor.execute(f"SELECT * FROM {table_name} LIMIT 20")
            rows = [list(row) for row in cursor.fetchall()]
            
            result.append({
                "name": table_name,
                "columns": columns,
                "row_count": row_count,
                "column_names": col_names,
                "preview_rows": rows
            })
        
        return {"tables": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if conn:
            conn.close()


@router.delete("/chat/session/{session_id}")
async def clear_session_endpoint(session_id: str):
    """
    Resets conversation memory history for a session ID.
    """
    try:
        memory_manager.clear_history(session_id)
        return {"status": "success", "message": f"Session history for '{session_id}' cleared."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.websocket("/stream")
async def websocket_stream_endpoint(websocket: WebSocket):
    """
    WebSocket endpoint for low-latency duplex chat streaming and audio packet inputs.
    """
    await websocket.accept()
    print("[WebSocket] Client connected to real-time session.")
    
    session_id = "ws_session"
    
    try:
        while True:
            # Wait for text commands or raw binary voice inputs
            message = await websocket.receive()
            
            if "text" in message:
                data = json.loads(message["text"])
                msg_type = data.get("type")
                
                if msg_type == "chat":
                    user_text = data.get("message", "")
                    session_id = data.get("session_id", session_id)
                    
                    # Run standard orchestration
                    res = orchestrate_message(user_text, session_id)
                    
                    await websocket.send_json({
                        "type": "chat_response",
                        "response": res["response"],
                        "sql": res["sql"],
                        "chart": res["chart"],
                        "error": res["error"]
                    })
                    
                elif msg_type == "interrupt":
                    # Send immediate acknowledgment to interrupt audio playback on client
                    print("[WebSocket] Received voice interruption signal.")
                    await websocket.send_json({
                        "type": "interrupted",
                        "message": "Playback stopped."
                    })
                    
    except WebSocketDisconnect:
        print("[WebSocket] Client disconnected.")
    except Exception as e:
        print(f"[WebSocket] Error occurred: {str(e)}")
        try:
            await websocket.close()
        except Exception:
            pass


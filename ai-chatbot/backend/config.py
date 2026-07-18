import os

def load_dotenv():
    """Loads environment variables from the .env file in the workspace root."""
    root_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    env_path = os.path.join(root_dir, ".env")
    
    if os.path.exists(env_path):
        with open(env_path, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith("#") and "=" in line:
                    key, val = line.split("=", 1)
                    # Strip quotes if present
                    val = val.strip()
                    if (val.startswith('"') and val.endswith('"')) or (val.startswith("'") and val.endswith("'")):
                        val = val[1:-1]
                    os.environ[key.strip()] = val.strip()

# Run it
load_dotenv()

GEMINI_API_KEY = os.environ.get("REACT_APP_GEMINI_API_KEY")

if not GEMINI_API_KEY:
    # Check other potential variables or fallback
    GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY")

# Set the active API key
os.environ["GEMINI_API_KEY"] = GEMINI_API_KEY or ""

GEMINI_MODEL = os.environ.get("GEMINI_MODEL", "gemini-2.5-flash")


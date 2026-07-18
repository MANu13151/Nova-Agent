import os
from dotenv import load_dotenv
from google import genai

load_dotenv()

client = genai.Client(
    api_key=os.getenv("GEMINI_API_KEY")
)

MODEL = "gemini-2.5-flash"


def generate_sql(prompt: str) -> str:
    """
    Sends the prompt to Gemini and returns the generated SQL.
    """
    response = client.models.generate_content(
        model=MODEL,
        contents=prompt
    )

    return response.text
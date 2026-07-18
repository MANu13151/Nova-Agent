import os
from dotenv import load_dotenv
from groq import Groq

load_dotenv()

client = Groq(
    api_key=os.getenv("GROQ_API_KEY")
)

MODEL = "llama-3.3-70b-versatile"

def generate_sql(prompt: str) -> str:
    """
    Sends the prompt to Groq and returns the generated SQL.
    """
    chat_completion = client.chat.completions.create(
        messages=[
            {
                "role": "user",
                "content": prompt,
            }
        ],
        model=MODEL,
    )
    
    return chat_completion.choices[0].message.content

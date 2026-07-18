import os

from dotenv import load_dotenv
from sqlalchemy import create_engine, text

load_dotenv()

DB_HOST = os.getenv("DB_HOST")
DB_PORT = os.getenv("DB_PORT")
DB_NAME = os.getenv("DB_NAME")
DB_USER = os.getenv("DB_USER")
DB_PASSWORD = os.getenv("DB_PASSWORD")


DATABASE_URL = "sqlite:///" + os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "enterprise.db")

engine = create_engine(
    DATABASE_URL,
    echo=False
)


def test_connection():
    """
    Test whether PostgreSQL is reachable.
    """

    try:
        with engine.connect() as conn:
            result = conn.execute(text("SELECT sqlite_version();"))

            print("\n Connected Successfully!\n")

            print(result.fetchone()[0])


    except Exception as e:
       print("\n❌ Connection Failed")
       print(type(e).__name__)
       print(e)


if __name__ == "__main__":
    test_connection()
    
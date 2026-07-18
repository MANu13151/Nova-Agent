import os
from datetime import datetime

LOG_FILE = "logs/generated_sql.sql"


def save_sql(question, sql):

    os.makedirs("logs", exist_ok=True)

    with open(LOG_FILE, "a", encoding="utf-8") as file:

        file.write("\n")
        file.write("=" * 80)
        file.write("\n")

        file.write(f"Timestamp : {datetime.now()}\n")
        file.write(f"Question  : {question}\n\n")

        file.write("Generated SQL:\n\n")
        file.write(sql)

        file.write("\n")
        file.write("=" * 80)
        file.write("\n\n")
import csv
import os
from datetime import datetime

FILE = "logs/query_history.csv"


def save_query(question, sql, rows, execution_time, status):

    file_exists = os.path.isfile(FILE)

    with open(FILE, "a", newline="", encoding="utf-8") as f:

        writer = csv.writer(f)

        if not file_exists:
            writer.writerow([
                "Timestamp",
                "Question",
                "SQL",
                "Rows",
                "Execution Time",
                "Status"
            ])

        writer.writerow([
            datetime.now(),
            question,
            sql,
            rows,
            execution_time,
            status
        ])
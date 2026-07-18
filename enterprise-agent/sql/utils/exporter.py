import os
import re
from datetime import datetime


def clean_filename(question: str):

    question = question.lower().strip()

    # Replace spaces with underscore
    question = question.replace(" ", "_")

    # Remove special characters
    question = re.sub(r'[^a-zA-Z0-9_]', '', question)

    # Keep filename short
    question = question[:40]

    return question


def export_csv(df, question):

    os.makedirs("exports", exist_ok=True)

    filename = clean_filename(question)

    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")

    filepath = os.path.join(
        "exports",
        f"{filename}_{timestamp}.csv"
    )

    df.to_csv(filepath, index=False)

    return filepath


def export_excel(df, question):

    os.makedirs("exports", exist_ok=True)

    filename = clean_filename(question)

    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")

    filepath = os.path.join(
        "exports",
        f"{filename}_{timestamp}.xlsx"
    )

    df.to_excel(filepath, index=False)

    return filepath
import pandas as pd


def format_table(rows):
    """
    Convert list of dictionaries into a formatted table.
    """

    if not rows:
        return "No records found."

    df = pd.DataFrame(rows)

    return df.to_string(index=False)


def format_json(rows):
    """
    Return JSON format.
    """
    return rows
FORBIDDEN = [
    "DELETE",
    "DROP",
    "ALTER",
    "TRUNCATE",
    "UPDATE",
    "INSERT",
    "CREATE"
]


def validate_sql(sql: str):

    upper = sql.upper()

    for keyword in FORBIDDEN:

        if keyword in upper:
            raise Exception(f"Unsafe SQL detected: {keyword}")

    return True
from sqlalchemy import inspect
from Database.connection import engine


def load_schema():
    """
    Reads database tables and columns.
    """

    inspector = inspect(engine)

    schema = {}

    tables = inspector.get_table_names()

    for table in tables:
        columns = inspector.get_columns(table)

        schema[table] = [
            column["name"]
            for column in columns
        ]

    return schema


if __name__ == "__main__":

    database_schema = load_schema()

    for table, columns in database_schema.items():
        print("\nTable:", table)

        print("Columns:")
        for column in columns:
            print(" -", column)
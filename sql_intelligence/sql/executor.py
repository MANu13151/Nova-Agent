import pandas as pd
from sqlalchemy import text

from Database.connection import engine


def execute_sql(sql: str):

    with engine.connect() as conn:

        result = conn.execute(text(sql))

        df = pd.DataFrame(result.fetchall(),
                          columns=result.keys())

    return df
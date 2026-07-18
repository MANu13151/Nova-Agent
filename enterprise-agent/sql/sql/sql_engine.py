import time

from utils.cache import get_cached_sql, save_cached_sql
from utils.exporter import export_csv, export_excel

from ai.prompt_builder import build_prompt
from ai.llm_client import generate_sql
from ai.sql_corrector import correct_sql
from ai.sql_explainer import explain_sql

from sql.sql_cleaner import clean_sql
from sql.validator import validate_sql
from sql.executor import execute_sql

from logs.history import save_query
from utils.sql_logger import save_sql


def ask_database(question: str):
    """
    Complete SQL Intelligence Pipeline
    """

    # -----------------------------------
    # Check Cache
    # -----------------------------------
    cached_sql = get_cached_sql(question)

    if cached_sql:

        print("\nUsing Cached SQL...\n")
        sql = cached_sql

    else:

        prompt = build_prompt(question)

        sql = generate_sql(prompt)

        sql = clean_sql(sql)

        save_cached_sql(question, sql)

        save_sql(question, sql)

        print("\nGenerated SQL:\n")
        print(sql)

    # -----------------------------------
    # Validate SQL
    # -----------------------------------
    validate_sql(sql)

    # -----------------------------------
    # Execute SQL
    # -----------------------------------
    start = time.time()

    try:

        df = execute_sql(sql)

    except Exception as e:

        print("\nSQL Execution Failed!")
        print("Trying Auto Correction...\n")

        sql = correct_sql(
            question=question,
            wrong_sql=sql,
            error=str(e)
        )

        sql = clean_sql(sql)

        save_cached_sql(question, sql)

        save_sql(question, sql)

        validate_sql(sql)

        print("\nCorrected SQL:\n")
        print(sql)

        df = execute_sql(sql)

    end = time.time()

    execution_time = end - start

    explanation = explain_sql(sql)

    return sql, df, explanation, execution_time


if __name__ == "__main__":

    while True:

        question = input("\nAsk a question (type 'exit' to quit): ")

        if question.lower() == "exit":
            break

        try:

            sql, df, explanation, execution_time = ask_database(question)

            print("\n==============================")
            print("RESULTS")
            print("==============================\n")
            print(df)

            print("\n==============================")
            print("SQL EXPLANATION")
            print("==============================\n")
            print(explanation)

            print("\n==============================")
            print("EXECUTION METRICS")
            print("==============================")
            print(f"Rows Returned : {len(df)}")
            print(f"Execution Time: {execution_time:.3f} sec")

            # -----------------------------------
            # Export Results
            # -----------------------------------
            print("\n==============================")
            print("EXPORT RESULTS")
            print("==============================")

            choice = input(
                "\nExport Results?\n"
                "1. CSV\n"
                "2. Excel\n"
                "3. Skip\n\n"
                "Enter Choice: "
            )

            if choice == "1":

                filepath = export_csv(df, question)

                print("\n✅ CSV exported successfully!")
                print(f"Saved at: {filepath}")

            elif choice == "2":

                filepath = export_excel(df, question)

                print("\n✅ Excel exported successfully!")
                print(f"Saved at: {filepath}")

            else:

                print("\nExport skipped.")

            # -----------------------------------
            # Save Query History
            # -----------------------------------
            save_query(
                question=question,
                sql=sql,
                rows=len(df),
                execution_time=execution_time,
                status="SUCCESS"
            )

        except Exception as e:

            print("\nERROR")
            print(e)

            save_query(
                question=question,
                sql="N/A",
                rows=0,
                execution_time=0,
                status="FAILED"
            )
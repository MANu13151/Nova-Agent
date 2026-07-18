import pandas as pd


def summarize(rows):

    if not rows:
        return "No data found."

    df = pd.DataFrame(rows)

    summary = []

    summary.append(f"Total records found: {len(df)}.")

    numeric = df.select_dtypes(include="number")

    if not numeric.empty:

        for col in numeric.columns:

            summary.append(
                f"The average {col} is {round(numeric[col].mean(),2)}."
            )

    return " ".join(summary)
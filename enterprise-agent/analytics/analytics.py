import pandas as pd


def generate_statistics(rows):

    if not rows:
        return {}

    df = pd.DataFrame(rows)

    stats = {
        "Total Records": len(df),
        "Columns": list(df.columns)
    }

    numeric_cols = df.select_dtypes(include="number").columns

    for col in numeric_cols:

        stats[col] = {
            "Maximum": df[col].max().item(),
            "Minimum": df[col].min().item(),
            "Average": float(round(df[col].mean(), 2)),
            "Sum": df[col].sum().item()
        }

    return stats
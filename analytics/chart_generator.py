import pandas as pd
import matplotlib.pyplot as plt


def create_bar_chart(rows):

    if not rows:
        return None

    df = pd.DataFrame(rows)

    if len(df.columns) < 2:
        return None

    x = df.iloc[:, 0]
    y = df.iloc[:, 1]

    plt.figure(figsize=(8,5))

    plt.bar(x, y)

    plt.xlabel(df.columns[0])

    plt.ylabel(df.columns[1])

    plt.title("SQL Query Result")

    plt.tight_layout()

    plt.savefig("chart.png")

    plt.close()

    return "chart.png"
def format_sql_results_table(columns: list, rows: list) -> str:
    """
    Formats SQL execution results as a clean markdown table.
    """
    if not columns or not rows:
        return "No data returned."

    # Build Header
    header = "| " + " | ".join(columns) + " |"
    separator = "| " + " | ".join(["---"] * len(columns)) + " |"
    
    # Build Rows
    formatted_rows = []
    for row in rows:
        cells = []
        for cell in row:
            if cell is None:
                cells.append("NULL")
            elif isinstance(cell, float):
                # Format floats, especially money amounts, with 2 decimals
                cells.append(f"{cell:,.2f}")
            else:
                cells.append(str(cell))
        formatted_rows.append("| " + " | ".join(cells) + " |")

    return "\n".join([header, separator] + formatted_rows)

if __name__ == "__main__":
    # Test formatter
    cols = ["Employee", "Category", "Revenue"]
    data = [
        ["Alice Smith", "Software", 12000.5],
        ["Bob Jones", "Hardware", 4500.0],
        ["George Costanza", "Consulting", 3000.0]
    ]
    print(format_sql_results_table(cols, data))

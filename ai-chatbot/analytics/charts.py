import base64
from io import BytesIO

# Graceful import of matplotlib
try:
    import matplotlib
    matplotlib.use('Agg')  # Headless backend
    import matplotlib.pyplot as plt
    MATPLOTLIB_AVAILABLE = True
except ImportError:
    MATPLOTLIB_AVAILABLE = False

def detect_chart_type(labels_col_name: str, num_col_name: str, num_rows: int) -> str:
    """Detects the best chart type based on column names and row count."""
    name_lower = labels_col_name.lower()
    if any(keyword in name_lower for keyword in ["date", "month", "year", "day", "time", "sale_date"]):
        return "line"
    if num_rows <= 6 and any(keyword in name_lower for keyword in ["category", "region", "department", "role"]):
        return "pie"
    return "bar"

def generate_chart_config(columns: list, rows: list, query_text: str = "") -> dict:
    """
    Inspects SQL output and generates a JSON chart config.
    If matplotlib is available, it also embeds a base64-encoded chart image.
    """
    if not columns or not rows or len(rows) == 0:
        return None

    # Step 1: Identify column types
    # Find columns that look numeric
    num_idx = -1
    cat_idx = -1
    
    # Check first row to identify data types
    first_row = rows[0]
    for idx, val in enumerate(first_row):
        if isinstance(val, (int, float)) and num_idx == -1:
            # Skip ID columns if possible unless there are no other numbers
            if columns[idx].lower() != "id":
                num_idx = idx
        elif isinstance(val, str) and cat_idx == -1:
            cat_idx = idx

    # Fallbacks if we didn't find clear types
    if num_idx == -1:
        # Look for any number
        for idx, val in enumerate(first_row):
            if isinstance(val, (int, float)):
                num_idx = idx
                break
                
    if cat_idx == -1:
        # Look for any string or fallback to index 0
        for idx, val in enumerate(first_row):
            if idx != num_idx:
                cat_idx = idx
                break
        if cat_idx == -1:
            cat_idx = 0

    # If we couldn't find a numeric column, chart is not appropriate
    if num_idx == -1 or num_idx == cat_idx or len(columns) < 2:
        return None

    cat_col_name = columns[cat_idx]
    num_col_name = columns[num_idx]
    
    # Step 2: Extract data
    labels = []
    data_points = []
    
    for row in rows:
        labels.append(str(row[cat_idx]))
        try:
            data_points.append(float(row[num_idx]) if row[num_idx] is not None else 0.0)
        except (ValueError, TypeError):
            data_points.append(0.0)

    chart_type = detect_chart_type(cat_col_name, num_col_name, len(rows))
    title = f"{num_col_name.replace('_', ' ').title()} by {cat_col_name.replace('_', ' ').title()}"

    # Step 3: Build JSON configuration
    config = {
        "type": chart_type,
        "title": title,
        "labels": labels,
        "datasets": [
            {
                "label": num_col_name.replace('_', ' ').title(),
                "data": data_points
            }
        ],
        "base64_image": None
    }

    # Step 4: Render base64 image if matplotlib is available
    if MATPLOTLIB_AVAILABLE:
        try:
            plt.figure(figsize=(6, 4))
            plt.style.use('dark_background')  # Match dark premium theme
            
            # Setup cohesive color theme (gold/orange accents)
            bar_color = '#d4af37'  # Golden accent
            
            if chart_type == "bar":
                plt.bar(labels, data_points, color=bar_color, edgecolor='white', alpha=0.85)
            elif chart_type == "line":
                plt.plot(labels, data_points, color=bar_color, marker='o', linewidth=2)
            elif chart_type == "pie":
                plt.pie(data_points, labels=labels, autopct='%1.1f%%', startangle=140, 
                        colors=['#d4af37', '#e5c158', '#f3d980', '#a38421', '#735c10'])

            plt.title(title, fontsize=12, pad=15, color='#ffffff')
            plt.xticks(rotation=30, ha='right')
            plt.tight_layout()

            # Save to buffer
            buf = BytesIO()
            plt.savefig(buf, format='png', dpi=100, transparent=True)
            buf.seek(0)
            img_b64 = base64.b64encode(buf.read()).decode('utf-8')
            config["base64_image"] = f"data:image/png;base64,{img_b64}"
            plt.close()
        except Exception as e:
            # Log error and continue without image
            print(f"Failed to generate matplotlib chart: {str(e)}")
            
    return config

if __name__ == "__main__":
    # Test chart generation
    cols = ["department", "avg_salary"]
    data = [
        ["Sales", 78000.0],
        ["Engineering", 117500.0],
        ["Support", 50000.0],
        ["Marketing", 62000.0]
    ]
    cfg = generate_chart_config(cols, data)
    print("Chart Title:", cfg["title"])
    print("Chart Type:", cfg["type"])
    print("Chart Labels:", cfg["labels"])
    print("Chart Data:", cfg["datasets"][0]["data"])
    print("Has Image:", cfg["base64_image"] is not None)

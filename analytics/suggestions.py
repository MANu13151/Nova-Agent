def suggest(question):

    question = question.lower()

    suggestions = []

    if "sales" in question:

        suggestions.extend([
            "Show top 10 sales",
            "Compare yearly sales",
            "Generate monthly chart"
        ])

    elif "employee" in question:

        suggestions.extend([
            "Show highest salary",
            "Show department wise employees",
            "Average salary"
        ])

    else:

        suggestions.extend([
            "Generate chart",
            "Sort descending",
            "Show averages"
        ])

    return suggestions
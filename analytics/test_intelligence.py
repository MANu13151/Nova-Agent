from formatter import format_table
from analytics import generate_statistics
from chart_generator import create_bar_chart
from summary import summarize
from suggestions import suggest


rows = [

    {"Month":"Jan","Sales":25000},

    {"Month":"Feb","Sales":32000},

    {"Month":"Mar","Sales":28000},

    {"Month":"Apr","Sales":41000}

]


question = "Show monthly sales"



print("\n========== FORMATTED TABLE ==========\n")

print(format_table(rows))


print("\n========== STATISTICS ==========\n")

print(generate_statistics(rows))


print("\n========== SUMMARY ==========\n")

print(summarize(rows))


print("\n========== SUGGESTIONS ==========\n")

print(suggest(question))


print("\n========== CHART ==========\n")

chart = create_bar_chart(rows)

print("Chart saved as:", chart)
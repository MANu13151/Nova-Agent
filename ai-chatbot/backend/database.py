import sqlite3
import os
from datetime import datetime, timedelta

DATABASE_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "enterprise.db")

def get_db_connection():
    """Returns a connection to the SQLite database."""
    conn = sqlite3.connect(DATABASE_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    """Initializes the database, creating tables and inserting sample seed data."""
    conn = get_db_connection()
    cursor = conn.cursor()

    # Create tables
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS employees (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        role TEXT NOT NULL,
        department TEXT NOT NULL,
        salary REAL NOT NULL,
        hire_date TEXT NOT NULL
    )
    """)

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS customers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        company TEXT NOT NULL,
        signup_date TEXT NOT NULL
    )
    """)

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS sales (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        employee_id INTEGER,
        amount REAL NOT NULL,
        sale_date TEXT NOT NULL,
        product_category TEXT NOT NULL,
        region TEXT NOT NULL,
        FOREIGN KEY (employee_id) REFERENCES employees(id)
    )
    """)

    # Seed data if tables are empty
    cursor.execute("SELECT COUNT(*) FROM employees")
    if cursor.fetchone()[0] == 0:
        employees = [
            ("Alice Smith", "Sales Director", "Sales", 95000.0, "2023-03-15"),
            ("Bob Jones", "Senior Account Manager", "Sales", 75000.0, "2023-08-10"),
            ("Charlie Brown", "Customer Support Specialist", "Support", 50000.0, "2024-01-15"),
            ("Diana Prince", "Security Analyst", "Engineering", 110000.0, "2022-11-01"),
            ("Evan Wright", "Cloud Architect", "Engineering", 125000.0, "2021-06-20"),
            ("Fiona Gallagher", "Marketing Specialist", "Marketing", 62000.0, "2024-05-12"),
            ("George Costanza", "Sales Executive", "Sales", 68000.0, "2024-09-01"),
        ]
        cursor.executemany(
            "INSERT INTO employees (name, role, department, salary, hire_date) VALUES (?, ?, ?, ?, ?)",
            employees
        )

    cursor.execute("SELECT COUNT(*) FROM customers")
    if cursor.fetchone()[0] == 0:
        customers = [
            ("John Doe", "john.doe@acme.com", "Acme Corp", "2024-02-18"),
            ("Jane Miller", "jane.miller@globex.com", "Globex Corp", "2024-05-20"),
            ("Peter Parker", "peter@dailybugle.net", "Daily Bugle", "2024-07-11"),
            ("Clark Kent", "clark.kent@dailyplanet.com", "Daily Planet", "2024-08-01"),
            ("Bruce Wayne", "bruce@waynecorp.com", "Wayne Enterprises", "2023-12-01"),
            ("Tony Stark", "tony@starkindustries.com", "Stark Industries", "2024-01-10"),
            ("Arthur Dent", "arthur@guide.org", "Megadodo Publications", "2025-01-05"),
        ]
        cursor.executemany(
            "INSERT INTO customers (name, email, company, signup_date) VALUES (?, ?, ?, ?)",
            customers
        )

    cursor.execute("SELECT COUNT(*) FROM sales")
    if cursor.fetchone()[0] == 0:
        # We need employee ids, Alice (1), Bob (2), George (7) are in Sales
        # Let's seed sales transactions
        sales = [
            (1, 12000.0, "2025-01-15", "Software", "North America"),
            (2, 4500.0, "2025-01-20", "Hardware", "Europe"),
            (7, 3000.0, "2025-02-05", "Consulting", "North America"),
            (1, 15000.0, "2025-02-12", "Software", "Asia-Pacific"),
            (2, 8500.0, "2025-02-28", "Software", "Europe"),
            (7, 6200.0, "2025-03-05", "Support Plans", "North America"),
            (1, 20000.0, "2025-03-22", "Hardware", "North America"),
            (2, 7200.0, "2025-04-01", "Consulting", "Latin America"),
            (7, 4100.0, "2025-04-10", "Software", "North America"),
            (1, 9500.0, "2025-04-18", "Support Plans", "Asia-Pacific"),
            (2, 11000.0, "2025-05-02", "Hardware", "Europe"),
            (7, 5000.0, "2025-05-15", "Software", "Latin America"),
            (1, 18500.0, "2025-05-27", "Software", "North America"),
            (2, 9000.0, "2025-06-05", "Consulting", "Europe"),
            (7, 7500.0, "2025-06-18", "Support Plans", "North America"),
        ]
        cursor.executemany(
            "INSERT INTO sales (employee_id, amount, sale_date, product_category, region) VALUES (?, ?, ?, ?, ?)",
            sales
        )

    conn.commit()
    conn.close()
    print(f"Database initialized and seeded at: {DATABASE_PATH}")

if __name__ == "__main__":
    init_db()

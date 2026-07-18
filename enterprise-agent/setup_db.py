import sqlite3
import random
from datetime import datetime, timedelta

def setup_database():
    print("Creating local SQLite database: enterprise.db")
    conn = sqlite3.connect('enterprise.db')
    cursor = conn.cursor()

    # Drop existing tables
    cursor.execute("DROP TABLE IF EXISTS employees")
    cursor.execute("DROP TABLE IF EXISTS sales")

    # Create Employees Table
    cursor.execute("""
    CREATE TABLE employees (
        id INTEGER PRIMARY KEY,
        name TEXT NOT NULL,
        department TEXT NOT NULL,
        role TEXT NOT NULL,
        salary INTEGER NOT NULL,
        hire_date DATE NOT NULL
    )
    """)

    # Create Sales Table
    cursor.execute("""
    CREATE TABLE sales (
        id INTEGER PRIMARY KEY,
        amount REAL NOT NULL,
        region TEXT NOT NULL,
        product TEXT NOT NULL,
        sale_date DATE NOT NULL,
        employee_id INTEGER,
        FOREIGN KEY (employee_id) REFERENCES employees (id)
    )
    """)

    # Insert Dummy Employees
    departments = ['Engineering', 'Sales', 'Marketing', 'HR', 'Finance']
    roles = ['Manager', 'Associate', 'Director', 'Analyst', 'Engineer']
    
    for i in range(1, 21):
        name = f"Employee {i}"
        dept = random.choice(departments)
        role = random.choice(roles)
        salary = random.randint(50000, 150000)
        hire_date = (datetime.now() - timedelta(days=random.randint(100, 2000))).strftime('%Y-%m-%d')
        
        cursor.execute(
            "INSERT INTO employees (id, name, department, role, salary, hire_date) VALUES (?, ?, ?, ?, ?, ?)",
            (i, name, dept, role, salary, hire_date)
        )

    # Insert Dummy Sales
    regions = ['North America', 'Europe', 'Asia', 'South America']
    products = ['Enterprise Software', 'Cloud Hosting', 'Consulting Services', 'Support Package']
    
    for i in range(1, 101):
        amount = round(random.uniform(1000.0, 50000.0), 2)
        region = random.choice(regions)
        product = random.choice(products)
        sale_date = (datetime.now() - timedelta(days=random.randint(1, 365))).strftime('%Y-%m-%d')
        employee_id = random.randint(1, 20)
        
        cursor.execute(
            "INSERT INTO sales (id, amount, region, product, sale_date, employee_id) VALUES (?, ?, ?, ?, ?, ?)",
            (i, amount, region, product, sale_date, employee_id)
        )

    conn.commit()
    conn.close()
    print("✅ Database enterprise.db created successfully with dummy data.")

if __name__ == "__main__":
    setup_database()

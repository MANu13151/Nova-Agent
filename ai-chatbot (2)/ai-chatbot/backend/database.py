import sqlite3
import os
import random
from datetime import datetime, timedelta

DATABASE_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "enterprise.db")

def get_db_connection():
    """Returns a connection to the SQLite database."""
    conn = sqlite3.connect(DATABASE_PATH)
    conn.execute("PRAGMA foreign_keys = ON;")
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    """Initializes the database, creating tables and inserting sample seed data."""
    conn = get_db_connection()
    cursor = conn.cursor()

    # Drop existing tables in correct order of dependency
    cursor.execute("DROP TABLE IF EXISTS sales")
    cursor.execute("DROP TABLE IF EXISTS employees")
    cursor.execute("DROP TABLE IF EXISTS departments")
    cursor.execute("DROP TABLE IF EXISTS customers")
    cursor.execute("DROP TABLE IF EXISTS products")
    cursor.execute("DROP TABLE IF EXISTS users")

    # Create Tables
    cursor.execute("""
    CREATE TABLE departments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        budget REAL NOT NULL,
        head_count INTEGER DEFAULT 0
    )
    """)

    cursor.execute("""
    CREATE TABLE employees (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT UNIQUE,
        department_id INTEGER,
        role TEXT NOT NULL,
        salary INTEGER NOT NULL,
        hire_date TEXT NOT NULL,
        status TEXT DEFAULT 'active',
        FOREIGN KEY (department_id) REFERENCES departments(id)
    )
    """)

    cursor.execute("""
    CREATE TABLE customers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        company_name TEXT NOT NULL,
        contact_name TEXT,
        email TEXT UNIQUE,
        region TEXT NOT NULL,
        industry TEXT,
        created_at TEXT NOT NULL
    )
    """)

    cursor.execute("""
    CREATE TABLE products (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        category TEXT NOT NULL,
        unit_price REAL NOT NULL,
        stock_quantity INTEGER DEFAULT 0
    )
    """)

    cursor.execute("""
    CREATE TABLE sales (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        amount REAL NOT NULL,
        quantity INTEGER DEFAULT 1,
        region TEXT NOT NULL,
        product_id INTEGER,
        customer_id INTEGER,
        employee_id INTEGER,
        sale_date TEXT NOT NULL,
        status TEXT DEFAULT 'completed',
        FOREIGN KEY (product_id) REFERENCES products(id),
        FOREIGN KEY (customer_id) REFERENCES customers(id),
        FOREIGN KEY (employee_id) REFERENCES employees(id)
    )
    """)

    cursor.execute("""
    CREATE TABLE users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        display_name TEXT NOT NULL,
        role TEXT DEFAULT 'analyst',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
    """)

    # --- SEEDING DATA ---
    
    # 1. Departments
    depts = [
        ("Sales", 1200000.0),
        ("Engineering", 2500000.0),
        ("Support", 600000.0),
        ("Marketing", 800000.0),
        ("HR", 400000.0)
    ]
    cursor.executemany("INSERT INTO departments (name, budget) VALUES (?, ?)", depts)
    
    # 2. Products
    products = [
        ("Cloud Analytics Suite", "Software", 4999.0, 100),
        ("Nova Voice API", "Software", 1999.0, 200),
        ("Enterprise BI Portal", "Software", 8999.0, 50),
        ("Database Security Patch", "Software", 1299.0, 500),
        ("SQL Optimizer Core", "Software", 799.0, 1000),
        ("Smart Microphone Node", "Hardware", 299.0, 150),
        ("Speech Processor Server", "Hardware", 1499.0, 30),
        ("Acoustic Soundproofing kit", "Hardware", 120.0, 400),
        ("Solution Architecture Consultation", "Consulting", 5000.0, 9999),
        ("Custom Speech Model Training", "Consulting", 12000.0, 9999),
        ("Standard SLA Support", "Support Plans", 1500.0, 9999),
        ("24/7 Mission-Critical SLA Support", "Support Plans", 6000.0, 9999),
    ]
    cursor.executemany("INSERT INTO products (name, category, unit_price, stock_quantity) VALUES (?, ?, ?, ?)", products)

    # 3. Users
    users = [
        ("admin", "Administrator", "admin"),
        ("manu", "Manu", "analyst"),
        ("teja", "Teja", "analyst"),
        ("guest", "Guest", "viewer"),
    ]
    cursor.executemany("INSERT INTO users (username, display_name, role) VALUES (?, ?, ?)", users)

    # Use a fixed random seed to generate realistic and reproducible mock data
    random.seed(42)

    # 4. Customers
    company_names = ["Acme Corp", "Globex Corp", "Daily Bugle", "Daily Planet", "Wayne Enterprises", 
                     "Stark Industries", "Tyrell Corp", "Cyberdyne Systems", "Oscorp", "Soylent Corp",
                     "Umbrella Corp", "Initech", "Hooli", "Vehement Capital", "Reynholm Industries"]
    first_names = ["James", "Mary", "John", "Patricia", "Robert", "Jennifer", "Michael", "Linda", "William", "Elizabeth"]
    last_names = ["Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis", "Rodriguez", "Martinez"]
    industries = ["Technology", "Finance", "Healthcare", "Manufacturing", "Media", "Defense", "Energy"]
    regions = ["North America", "Europe", "Asia-Pacific", "Latin America"]

    seeded_customers = []
    for idx, company in enumerate(company_names * 2):  # 30 customers
        contact = f"{random.choice(first_names)} {random.choice(last_names)}"
        email = f"{contact.lower().replace(' ', '.')}@{company.lower().replace(' ', '')}.com"
        region = random.choice(regions)
        industry = random.choice(industries)
        # Random date in 2023 or 2024
        days_ago = random.randint(100, 800)
        created_at = (datetime.now() - timedelta(days=days_ago)).strftime("%Y-%m-%d")
        
        # Ensure email uniqueness
        if any(c[2] == email for c in seeded_customers):
            email = f"contact{idx}." + email
            
        seeded_customers.append((company, contact, email, region, industry, created_at))
        
    cursor.executemany("INSERT INTO customers (company_name, contact_name, email, region, industry, created_at) VALUES (?, ?, ?, ?, ?, ?)", seeded_customers)

    # 5. Employees
    roles_by_dept = {
        1: ["Sales Director", "Senior Account Manager", "Sales Executive", "Account Executive"],
        2: ["Engineering Director", "Cloud Architect", "Senior Devops Engineer", "Software Engineer", "Security Analyst"],
        3: ["Support Director", "Customer Support Specialist", "Tier-2 Support Agent"],
        4: ["Marketing Specialist", "SEO Lead", "Product Manager"],
        5: ["HR Manager", "Recruiting Specialist"]
    }
    
    seeded_employees = []
    # Seed a few core employees explicitly to guarantee names from original database
    core_employees = [
        ("Alice Smith", "alice.smith@enterprise.com", 1, "Sales Director", 95000, "2023-03-15", "active"),
        ("Bob Jones", "bob.jones@enterprise.com", 1, "Senior Account Manager", 75000, "2023-08-10", "active"),
        ("Charlie Brown", "charlie.brown@enterprise.com", 3, "Customer Support Specialist", 50000, "2024-01-15", "active"),
        ("Diana Prince", "diana.prince@enterprise.com", 2, "Security Analyst", 110000, "2022-11-01", "active"),
        ("Evan Wright", "evan.wright@enterprise.com", 2, "Cloud Architect", 125000, "2021-06-20", "active"),
        ("Fiona Gallagher", "fiona.gallagher@enterprise.com", 4, "Marketing Specialist", 62000, "2024-05-12", "active"),
        ("George Costanza", "george.costanza@enterprise.com", 1, "Sales Executive", 68000, "2024-09-01", "active"),
    ]
    for emp in core_employees:
        seeded_employees.append(emp)
        
    # Generate remaining employees up to 55
    all_names = [
        "David Miller", "Sarah Davis", "James Wilson", "Emily Taylor", "Robert Anderson", "Linda Thomas",
        "Michael Jackson", "Jessica White", "William Harris", "Karen Martin", "Richard Thompson", "Nancy Garcia",
        "Charles Martinez", "Lisa Robinson", "Joseph Clark", "Betty Rodriguez", "Thomas Lewis", "Margaret Lee",
        "Christopher Walker", "Sandra Hall", "Daniel Allen", "Ashley Young", "Matthew Hernandez", "Dorothy King",
        "Anthony Wright", "Kimberly Lopez", "Mark Hill", "Emily Scott", "Donald Green", "Donna Adams",
        "Paul Baker", "Michelle Gonzalez", "Steven Nelson", "Carol Carter", "Andrew Mitchell", "Amanda Perez",
        "Kenneth Roberts", "Melissa Turner", "Joshua Phillips", "Deborah Campbell", "Kevin Parker", "Stephanie Evans",
        "Brian Edwards", "Rebecca Collins", "George Stewart", "Sharon Sanchez", "Edward Morris", "Cynthia Rogers"
    ]
    
    for name in all_names:
        dept_id = random.choice([1, 2, 3, 4, 5])
        role = random.choice(roles_by_dept[dept_id])
        salary = random.randint(45, 140) * 1000
        days_ago = random.randint(150, 1000)
        hire_date = (datetime.now() - timedelta(days=days_ago)).strftime("%Y-%m-%d")
        status = random.choices(["active", "on_leave", "terminated"], weights=[0.85, 0.10, 0.05])[0]
        email = f"{name.lower().replace(' ', '.')}@enterprise.com"
        seeded_employees.append((name, email, dept_id, role, salary, hire_date, status))
        
    cursor.executemany("INSERT INTO employees (name, email, department_id, role, salary, hire_date, status) VALUES (?, ?, ?, ?, ?, ?, ?)", seeded_employees)

    # Update head_count in departments
    for d_id in range(1, 6):
        cursor.execute("SELECT COUNT(*) FROM employees WHERE department_id = ? AND status = 'active'", (d_id,))
        count = cursor.fetchone()[0]
        cursor.execute("UPDATE departments SET head_count = ? WHERE id = ?", (count, d_id))

    # 6. Sales
    # Get employee ids in sales department (dept_id = 1)
    cursor.execute("SELECT id FROM employees WHERE department_id = 1 AND status = 'active'")
    sales_employees = [r[0] for r in cursor.fetchall()]
    
    # Get customer ids and their regions
    cursor.execute("SELECT id, region FROM customers")
    customers_info = [(r[0], r[1]) for r in cursor.fetchall()]
    
    # Get products info
    cursor.execute("SELECT id, unit_price FROM products")
    products_info = [(r[0], r[1]) for r in cursor.fetchall()]

    seeded_sales = []
    for _ in range(150):  # Generate 150 sales transactions
        employee_id = random.choice(sales_employees)
        cust_id, region = random.choice(customers_info)
        prod_id, unit_price = random.choice(products_info)
        
        quantity = random.choices([1, 2, 3, 5, 10], weights=[0.6, 0.2, 0.1, 0.08, 0.02])[0]
        amount = unit_price * quantity
        
        # Random sale date in the last year
        days_ago = random.randint(1, 365)
        sale_date = (datetime.now() - timedelta(days=days_ago)).strftime("%Y-%m-%d")
        status = random.choices(["completed", "pending", "refunded"], weights=[0.90, 0.07, 0.03])[0]
        
        seeded_sales.append((amount, quantity, region, prod_id, cust_id, employee_id, sale_date, status))
        
    cursor.executemany("INSERT INTO sales (amount, quantity, region, product_id, customer_id, employee_id, sale_date, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)", seeded_sales)

    conn.commit()
    conn.close()
    print(f"Database initialized and seeded with 6 tables at: {DATABASE_PATH}")

if __name__ == "__main__":
    init_db()

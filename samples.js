// samples.js - Pre-configured relational datasets, color palettes, and queries matching Queryscope

const DATASETS = {
  retail: {
    name: "Retail sample",
    label: "Retail sample",
    tablesCount: "2 tables / 10 rows",
    description: "Retail schema demonstrating 1-to-many relationship between Customers and Orders with statuses and totals.",
    tables: [
      {
        name: "customers",
        badge: "4 rows",
        relationHint: "id → orders.customer_id",
        columns: [
          { name: "id", type: "INTEGER", pk: true, description: "id · PK" },
          { name: "name", type: "TEXT", pk: false, description: "name" },
          { name: "city", type: "TEXT", pk: false, description: "city" }
        ],
        dataSql: `
          CREATE TABLE customers (
            id INTEGER PRIMARY KEY,
            name TEXT NOT NULL,
            city TEXT NOT NULL
          );

          INSERT INTO customers (id, name, city) VALUES
          (1, 'Ava Chen', 'San Francisco'),
          (2, 'Ben Ortiz', 'Austin'),
          (3, 'Cara Lee', 'Seattle'),
          (4, 'Diego Ruiz', 'Boston');
        `,
        rowIdentities: [
          { id: 1, name: 'Ava Chen', short: 'Ava', color: '#10b981', bg: '#ecfdf5', border: '#86efac', text: '#065f46' },
          { id: 2, name: 'Ben Ortiz', short: 'Ben', color: '#8b5cf6', bg: '#f5f3ff', border: '#c4b5fd', text: '#5b21b6' },
          { id: 3, name: 'Cara Lee', short: 'Cara', color: '#f59e0b', bg: '#fffbeb', border: '#fcd34d', text: '#92400e' },
          { id: 4, name: 'Diego Ruiz', short: 'Diego', color: '#06b6d4', bg: '#ecfeff', border: '#67e8f9', text: '#0e7490' }
        ]
      },
      {
        name: "orders",
        badge: "6 rows",
        columns: [
          { name: "id", type: "INTEGER", pk: true, description: "id · PK" },
          { name: "customer_id", type: "INTEGER", pk: false, fk: "customers.id", description: "customer_id · FK" },
          { name: "total", type: "REAL", pk: false, description: "total" },
          { name: "status", type: "TEXT", pk: false, description: "status" }
        ],
        dataSql: `
          CREATE TABLE orders (
            id INTEGER PRIMARY KEY,
            customer_id INTEGER NOT NULL,
            total REAL NOT NULL,
            status TEXT NOT NULL,
            FOREIGN KEY (customer_id) REFERENCES customers(id)
          );

          INSERT INTO orders (id, customer_id, total, status) VALUES
          (101, 1, 120.00, 'paid'),
          (102, 2, 60.00, 'paid'),
          (103, 1, 80.00, 'paid'),
          (104, 3, 150.00, 'paid'),
          (105, 1, 40.00, 'pending'),
          (106, 4, 90.00, 'refunded');
        `
      }
    ],
    sampleQueries: [
      {
        title: "Who are our top customers?",
        filename: "top_customers.sql",
        category: "JOIN + AGGREGATION",
        subtitle: "Follow each row from source data to result. See what SQL does, not just what it returns.",
        previewNote: "Final result preview · Customers with at least $100 in paid orders, highest spend first.",
        sql: `SELECT c.name,
       SUM(o.total) AS total_spent
FROM customers c
JOIN orders o ON c.id = o.customer_id
WHERE o.status = 'paid'
GROUP BY c.id, c.name
HAVING SUM(o.total) >= 100
ORDER BY total_spent DESC;
-- Explore the execution below`
      },
      {
        title: "All orders with customer details",
        filename: "customer_orders.sql",
        category: "INNER JOIN",
        subtitle: "Pair each order with its respective customer name and location.",
        previewNote: "Final result preview · All 6 orders mapped to their customer profiles.",
        sql: `SELECT o.id AS order_id,
       c.name AS customer_name,
       o.total,
       o.status
FROM customers c
JOIN orders o ON c.id = o.customer_id
ORDER BY o.id ASC;`
      },
      {
        title: "Lifetime spend per customer",
        filename: "all_customer_spend.sql",
        category: "GROUP BY + AGGREGATION",
        subtitle: "Aggregate total spend across all customers who made purchases.",
        previewNote: "Final result preview · Total spending grouped by customer.",
        sql: `SELECT c.name,
       COUNT(o.id) AS orders_count,
       SUM(o.total) AS total_spent
FROM customers c
JOIN orders o ON c.id = o.customer_id
WHERE o.status = 'paid'
GROUP BY c.id, c.name
ORDER BY total_spent DESC;`
      },
      {
        title: "Pending and refunded orders",
        filename: "unsettled_orders.sql",
        category: "FILTERING",
        subtitle: "Filter out orders that haven't been completed successfully.",
        previewNote: "Final result preview · Filtered view of unresolved orders.",
        sql: `SELECT o.id, c.name, o.total, o.status
FROM orders o
JOIN customers c ON o.customer_id = c.id
WHERE o.status != 'paid';`
      }
    ]
  },

  company: {
    name: "Company sample",
    label: "Company sample",
    tablesCount: "2 tables / 13 rows",
    description: "Classic relational schema demonstrating One-to-Many relationships between Departments and Employees.",
    tables: [
      {
        name: "departments",
        badge: "5 rows",
        relationHint: "id → employees.department_id",
        columns: [
          { name: "id", type: "INTEGER", pk: true, description: "id · PK" },
          { name: "name", type: "TEXT", pk: false, description: "name" },
          { name: "location", type: "TEXT", pk: false, description: "location" }
        ],
        dataSql: `
          CREATE TABLE departments (
            id INTEGER PRIMARY KEY,
            name TEXT NOT NULL,
            location TEXT NOT NULL
          );

          INSERT INTO departments (id, name, location) VALUES
          (1, 'Engineering', 'San Francisco'),
          (2, 'Product', 'New York'),
          (3, 'Design', 'London'),
          (4, 'Marketing', 'San Francisco'),
          (5, 'Human Resources', 'Chicago');
        `,
        rowIdentities: [
          { id: 1, name: 'Engineering', short: 'Eng', color: '#10b981', bg: '#ecfdf5', border: '#86efac', text: '#065f46' },
          { id: 2, name: 'Product', short: 'Prod', color: '#8b5cf6', bg: '#f5f3ff', border: '#c4b5fd', text: '#5b21b6' },
          { id: 3, name: 'Design', short: 'Des', color: '#f59e0b', bg: '#fffbeb', border: '#fcd34d', text: '#92400e' },
          { id: 4, name: 'Marketing', short: 'Mkt', color: '#06b6d4', bg: '#ecfeff', border: '#67e8f9', text: '#0e7490' },
          { id: 5, name: 'HR', short: 'HR', color: '#ec4899', bg: '#fdf2f8', border: '#f472b6', text: '#9d174d' }
        ]
      },
      {
        name: "employees",
        badge: "8 rows",
        columns: [
          { name: "id", type: "INTEGER", pk: true, description: "id · PK" },
          { name: "name", type: "TEXT", pk: false, description: "name" },
          { name: "role", type: "TEXT", pk: false, description: "role" },
          { name: "salary", type: "INTEGER", pk: false, description: "salary" },
          { name: "department_id", type: "INTEGER", pk: false, fk: "departments.id", description: "department_id · FK" }
        ],
        dataSql: `
          CREATE TABLE employees (
            id INTEGER PRIMARY KEY,
            name TEXT NOT NULL,
            role TEXT NOT NULL,
            salary INTEGER NOT NULL,
            department_id INTEGER,
            FOREIGN KEY (department_id) REFERENCES departments(id)
          );

          INSERT INTO employees (id, name, role, salary, department_id) VALUES
          (101, 'Alice Chen', 'Senior Engineer', 125000, 1),
          (102, 'Bob Smith', 'Frontend Dev', 95000, 1),
          (103, 'Charlie Brown', 'Product Lead', 115000, 2),
          (104, 'Diana Prince', 'UI/UX Designer', 90000, 3),
          (105, 'Evan Wright', 'DevOps Engineer', 110000, 1),
          (106, 'Fiona Gallagher', 'Marketing Specialist', 72000, 4),
          (107, 'George Miller', 'Contractor Intern', 45000, NULL),
          (108, 'Hannah Abbott', 'Associate Designer', 70000, 3);
        `
      }
    ],
    sampleQueries: [
      {
        title: "Which departments have the highest salary spend?",
        filename: "department_salaries.sql",
        category: "JOIN + AGGREGATION",
        subtitle: "Analyze payroll spend by aggregating employee salaries within each department.",
        previewNote: "Final result preview · Departments ranked by total salary expenditures.",
        sql: `SELECT d.name,
       COUNT(e.id) AS team_size,
       ROUND(AVG(e.salary), 2) AS avg_salary,
       SUM(e.salary) AS total_payroll
FROM departments d
JOIN employees e ON d.id = e.department_id
GROUP BY d.id, d.name
ORDER BY total_payroll DESC;`
      },
      {
        title: "Filter high-earning employees",
        filename: "high_earners.sql",
        category: "FILTERING",
        subtitle: "List team members earning more than $90,000 per year.",
        previewNote: "Final result preview · Employees matching the salary threshold.",
        sql: `SELECT name, role, salary
FROM employees
WHERE salary > 90000
ORDER BY salary DESC;`
      }
    ]
  },

  university: {
    name: "University sample",
    label: "University sample",
    tablesCount: "2 tables / 10 rows",
    description: "Educational schema demonstrating students enrolled in various academic courses.",
    tables: [
      {
        name: "courses",
        badge: "4 rows",
        relationHint: "id → students.course_id",
        columns: [
          { name: "id", type: "INTEGER", pk: true, description: "id · PK" },
          { name: "title", type: "TEXT", pk: false, description: "title" },
          { name: "credits", type: "INTEGER", pk: false, description: "credits" },
          { name: "instructor", type: "TEXT", pk: false, description: "instructor" }
        ],
        dataSql: `
          CREATE TABLE courses (
            id INTEGER PRIMARY KEY,
            title TEXT NOT NULL,
            credits INTEGER NOT NULL,
            instructor TEXT NOT NULL
          );

          INSERT INTO courses (id, title, credits, instructor) VALUES
          (201, 'Introduction to SQL', 3, 'Dr. Stone'),
          (202, 'Data Structures', 4, 'Prof. Turing'),
          (203, 'Web Systems', 3, 'Dr. Berners'),
          (204, 'Machine Learning', 4, 'Prof. Hinton');
        `,
        rowIdentities: [
          { id: 201, name: 'Introduction to SQL', short: 'SQL', color: '#10b981', bg: '#ecfdf5', border: '#86efac', text: '#065f46' },
          { id: 202, name: 'Data Structures', short: 'DS', color: '#8b5cf6', bg: '#f5f3ff', border: '#c4b5fd', text: '#5b21b6' },
          { id: 203, name: 'Web Systems', short: 'Web', color: '#f59e0b', bg: '#fffbeb', border: '#fcd34d', text: '#92400e' },
          { id: 204, name: 'Machine Learning', short: 'ML', color: '#06b6d4', bg: '#ecfeff', border: '#67e8f9', text: '#0e7490' }
        ]
      },
      {
        name: "students",
        badge: "6 rows",
        columns: [
          { name: "id", type: "INTEGER", pk: true, description: "id · PK" },
          { name: "name", type: "TEXT", pk: false, description: "name" },
          { name: "gpa", type: "REAL", pk: false, description: "gpa" },
          { name: "course_id", type: "INTEGER", pk: false, fk: "courses.id", description: "course_id · FK" }
        ],
        dataSql: `
          CREATE TABLE students (
            id INTEGER PRIMARY KEY,
            name TEXT NOT NULL,
            gpa REAL NOT NULL,
            course_id INTEGER,
            FOREIGN KEY (course_id) REFERENCES courses(id)
          );

          INSERT INTO students (id, name, gpa, course_id) VALUES
          (1, 'Maya Patel', 3.85, 201),
          (2, 'Liam Johnson', 3.40, 201),
          (3, 'Sophia Garcia', 3.92, 202),
          (4, 'Noah Kim', 2.80, 203),
          (5, 'Olivia Wilson', 3.75, 202),
          (6, 'Ethan Davis', 3.10, NULL);
        `
      }
    ],
    sampleQueries: [
      {
        title: "Course enrolment & GPA performance",
        filename: "course_performance.sql",
        category: "JOIN + AGGREGATION",
        subtitle: "Calculate total students enrolled and average GPA per course.",
        previewNote: "Final result preview · Courses with average student GPAs.",
        sql: `SELECT c.title,
       COUNT(s.id) AS total_enrolled,
       ROUND(AVG(s.gpa), 2) AS average_gpa
FROM courses c
JOIN students s ON c.id = s.course_id
GROUP BY c.id, c.title
ORDER BY total_enrolled DESC;`
      }
    ]
  }
};

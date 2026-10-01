// samples.js - Pre-configured relational datasets and beginner-friendly sample queries

const DATASETS = {
  company: {
    name: "Company (Employees & Departments)",
    description: "Classic relational schema demonstrating One-to-Many relationships between Departments and Employees.",
    tables: [
      {
        name: "departments",
        columns: [
          { name: "id", type: "INTEGER", pk: true, description: "Primary Key" },
          { name: "name", type: "TEXT", pk: false, description: "Department Name" },
          { name: "location", type: "TEXT", pk: false, description: "Office Location" }
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
        `
      },
      {
        name: "employees",
        columns: [
          { name: "id", type: "INTEGER", pk: true, description: "Primary Key" },
          { name: "name", type: "TEXT", pk: false, description: "Employee Full Name" },
          { name: "role", type: "TEXT", pk: false, description: "Job Title" },
          { name: "salary", type: "INTEGER", pk: false, description: "Annual Salary in USD" },
          { name: "department_id", type: "INTEGER", pk: false, fk: "departments.id", description: "Foreign Key -> departments.id" }
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
        title: "1. Basic SELECT",
        category: "Basics",
        description: "Fetch all employee names, roles, and salaries.",
        sql: `SELECT name, role, salary\nFROM employees;`
      },
      {
        title: "2. Filter with WHERE",
        category: "Filtering",
        description: "Find employees earning more than $90,000.",
        sql: `SELECT name, role, salary\nFROM employees\nWHERE salary > 90000\nORDER BY salary DESC;`
      },
      {
        title: "3. Aggregate COUNT & AVG",
        category: "Aggregations",
        description: "Calculate overall headcount and average salary across all employees.",
        sql: `SELECT \n  COUNT(*) AS total_employees,\n  ROUND(AVG(salary), 2) AS average_salary,\n  MIN(salary) AS lowest_salary,\n  MAX(salary) AS highest_salary\nFROM employees;`
      },
      {
        title: "4. GROUP BY Departments",
        category: "Grouping",
        description: "Count employees and average salary per department ID.",
        sql: `SELECT \n  department_id,\n  COUNT(*) AS employee_count,\n  ROUND(AVG(salary), 2) AS avg_salary\nFROM employees\nWHERE department_id IS NOT NULL\nGROUP BY department_id\nHAVING COUNT(*) > 1;`
      },
      {
        title: "5. INNER JOIN (Match only)",
        category: "JOINs",
        description: "Combine employees with their department details (excludes employees without a department).",
        sql: `SELECT \n  employees.name AS employee_name,\n  employees.role,\n  departments.name AS department_name,\n  departments.location\nFROM employees\nINNER JOIN departments \n  ON employees.department_id = departments.id;`
      },
      {
        title: "6. LEFT JOIN (Include all employees)",
        category: "JOINs",
        description: "Include all employees, even contractors without an assigned department (shows NULL).",
        sql: `SELECT \n  employees.name AS employee_name,\n  employees.role,\n  COALESCE(departments.name, '[No Department]') AS department_name\nFROM employees\nLEFT JOIN departments \n  ON employees.department_id = departments.id;`
      }
    ]
  },
  university: {
    name: "University (Students & Courses)",
    description: "Educational schema demonstrating students enrolled in various academic courses.",
    tables: [
      {
        name: "courses",
        columns: [
          { name: "id", type: "INTEGER", pk: true, description: "Course ID" },
          { name: "title", type: "TEXT", pk: false, description: "Course Title" },
          { name: "credits", type: "INTEGER", pk: false, description: "Credit Hours" },
          { name: "instructor", type: "TEXT", pk: false, description: "Instructor Name" }
        ],
        dataSql: `
          CREATE TABLE courses (
            id INTEGER PRIMARY KEY,
            title TEXT NOT NULL,
            credits INTEGER NOT NULL,
            instructor TEXT NOT NULL
          );

          INSERT INTO courses (id, title, credits, instructor) VALUES
          (201, 'Introduction to SQL & Databases', 3, 'Dr. Stone'),
          (202, 'Data Structures & Algorithms', 4, 'Prof. Turing'),
          (203, 'Web Systems & Architecture', 3, 'Dr. Berners'),
          (204, 'Machine Learning Foundations', 4, 'Prof. Hinton');
        `
      },
      {
        name: "students",
        columns: [
          { name: "id", type: "INTEGER", pk: true, description: "Student ID" },
          { name: "name", type: "TEXT", pk: false, description: "Student Name" },
          { name: "gpa", type: "REAL", pk: false, description: "Grade Point Average" },
          { name: "course_id", type: "INTEGER", pk: false, fk: "courses.id", description: "Enrolled Course ID" }
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
        title: "1. All Students",
        category: "Basics",
        description: "List all students and their GPAs.",
        sql: `SELECT name, gpa FROM students ORDER BY gpa DESC;`
      },
      {
        title: "2. Honor Roll (GPA >= 3.5)",
        category: "Filtering",
        description: "Filter students eligible for academic honors.",
        sql: `SELECT name, gpa\nFROM students\nWHERE gpa >= 3.5\nORDER BY gpa DESC;`
      },
      {
        title: "3. Course Enrolment Count",
        category: "Grouping",
        description: "Count how many students are enrolled in each course.",
        sql: `SELECT \n  course_id,\n  COUNT(*) AS total_enrolled,\n  ROUND(AVG(gpa), 2) AS average_gpa\nFROM students\nWHERE course_id IS NOT NULL\nGROUP BY course_id;`
      },
      {
        title: "4. Student & Course INNER JOIN",
        category: "JOINs",
        description: "Show student names alongside their course title and instructor.",
        sql: `SELECT \n  students.name AS student_name,\n  students.gpa,\n  courses.title AS course_title,\n  courses.instructor\nFROM students\nINNER JOIN courses \n  ON students.course_id = courses.id;`
      }
    ]
  }
};

# SQL Visualizer

An interactive, in-browser educational platform designed to make learning SQL intuitive and visual. Powered by an in-browser SQLite WebAssembly engine (`sql.js`), enabling hands-on schema exploration, step-by-step clause visualization, and zero-latency query execution.

![SQL Visualizer Preview](https://img.shields.io/badge/SQLite-WASM-blue) ![License](https://img.shields.io/badge/license-MIT-green)

---

## 🚀 Features

- **In-Browser SQLite WASM Engine**: Run SQL queries directly inside your browser with zero server setup or backend required.
- **Two-Column Split Workspace**:
  - **Left Side**: Side-by-side live source tables, interactive Execution Pipeline Visualizer, and query results.
  - **Right Side**: Curated beginner-to-advanced Trial Queries and SQL Query Console.
- **Execution Pipeline Visualizer**:
  - Automatically decomposes queries according to the true logical order of SQL execution:
    $$\text{FROM / JOIN} \longrightarrow \text{WHERE} \longrightarrow \text{GROUP BY} \longrightarrow \text{HAVING} \longrightarrow \text{SELECT} \longrightarrow \text{ORDER BY / LIMIT}$$
  - **Multi-Mode JOIN Inspector**:
    - **Row Matcher Mode**: Interactive pairwise comparison cards showing matching keys and join outcomes (`✓ Match`, `NULL Joined`, `✗ Dropped`).
    - **Venn Diagram Mode**: Dynamic SVG circles visualizing table intersections and outer sets with live record counts.
    - **Joined Table Mode**: Direct inline data table displaying the intermediate joined dataset with disambiguated column headers.
  - **WHERE Filter Gate**: Live evaluation testing rows against boolean criteria, showing passed and filtered-out records.
  - **GROUP BY Aggregation Buckets**: Clusters records into collapsible visual buckets and displays summary calculations.
  - **SELECT Column Projection & ORDER BY Ranking**: Shows projected columns and ranked, sorted records.
- **Synchronized Table Highlighting**: Hovering over join pairs highlights corresponding source rows in the live tables above.
- **Pre-Configured Datasets**: Switch between `Company (Employees & Departments)` and `University (Students & Courses)` databases with instant data reset.

---

## 🛠️ Tech Stack

- **HTML5 & Vanilla JavaScript**: Clean, framework-free architecture for maximum performance and portability.
- **Vanilla CSS3**: Modern design system featuring subtle glassmorphism, responsive grid layouts, and high-contrast typography.
- **SQLite WebAssembly (`sql.js`)**: Real SQL engine executing in-memory inside the browser.

---

## 🏁 Getting Started

You can run SQL Visualizer locally using any static web server:

### Option 1: Using Python
```bash
python -m http.server 8000
```
Then open `http://localhost:8000` in your browser.

### Option 2: Using Node / npx
```bash
npx serve .
```

### Option 3: Direct File Opening
Double-click `index.html` to open it directly in modern browsers (Chrome, Edge, Firefox, Safari).

---

## 📁 Project Structure

```text
├── index.html            # Main application layout and DOM structure
├── style.css             # Design system, themes, and visualizer styling
├── app.js                # Application UI coordinator and event controller
├── visualizer.js         # SQL execution pipeline and operation visualizer
├── db.js                 # SQLite WebAssembly engine wrapper (sql.js)
├── samples.js            # Relational database schemas and sample queries
├── IMPLEMENTATION_PLAN.md# Architecture specifications and implementation roadmap
└── README.md             # Project documentation
```

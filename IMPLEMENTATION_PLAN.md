# SQL Learning & Query Visualizer — Master Implementation Roadmap

## 📌 Project Overview
**SQL Visualizer** is an interactive, in-browser educational platform designed to make learning SQL intuitive and visual. It runs a zero-latency SQLite engine directly in the browser via WebAssembly (`sql.js`), enabling hands-on schema exploration, query execution, step-by-step visual execution flow, and interactive query building.

---

## 🏛️ Module Breakdown & Status

### ✅ Module 1: Core Engine & Query Playground (Completed - MVP)
*Status: Implemented, Restructured & Enhanced with Live Side-by-Side Tables*
- **In-Browser SQLite WASM Engine**: Integrated `sql.js` for fast, sandboxed SQL execution without server backend.
- **Natural White-Themed UI**: Crisp, clean, human-designed interface with high-contrast slate typography, natural subtle accents, and zero AI-futuristic/glow styling.
- **Two-Column Visualizer Architecture**:
  - **Left Side (Visualization Space)**:
    - **Active Database Switcher & Reset**: Dataset switcher (`Company`, `University`), description, and data reset.
    - **Source Tables Side-by-Side**: Direct, live rendering of both tables (`employees` + `departments` or `students` + `courses`) with column PK/FK badges, types, and actual table rows with scroll support. No more hiding data behind modals.
    - **Query Results Area**: Positioned directly underneath the source tables to create an intuitive top-to-bottom data transformation pipeline.
  - **Right Side (Coding Space)**:
    - **Trial Queries for You**: Clean categorized query chips (Basics, Filtering, Aggregations, Grouping, JOINs) at the top.
    - **SQL Query Console**: Roomy SQL editor with keyboard shortcuts (`Ctrl+Enter`), Clear button, and prominent `Run Query` button.
- **Interactive Results**: Formatted table with sticky header, NULL pills, row counts, and execution duration. Auto-syncs source tables when mutation queries (`INSERT`, `UPDATE`, `DELETE`) are executed.

---

### ✅ Module 2: Visual Query Execution & Operation Visualizer (Completed)
*Status: Implemented, Connected & Verified*
*Goal: Transform static query results into interactive, visual data transformations so learners can see HOW SQL works step-by-step.*

- **SQL Clause Decomposition Engine ([visualizer.js](file:///c:/Users/Vedant/Desktop/Html/SQL%20Visualizer/visualizer.js))**:
  - Automatically parses SELECT queries into true logical SQL execution order:
    $$\text{FROM / JOIN} \longrightarrow \text{WHERE} \longrightarrow \text{GROUP BY} \longrightarrow \text{HAVING} \longrightarrow \text{SELECT} \longrightarrow \text{ORDER BY / LIMIT}$$
  - Executes intermediate sub-queries against in-browser SQLite WASM to guarantee 100% mathematically accurate snapshots at every stage.
- **Interactive Stepper & Timeline Navigation**:
  - Horizontal clickable timeline nodes with stage numbering, active pill badges, and direct stage jumping.
  - Stepper controls: `Reset`, `Prev`, `Play / Pause` (auto-advance with smooth timing), and `Next`.
  - Explainer banner breaking down each step in plain English.
- **Interactive JOIN Matcher, Venn Diagram & Table Modes**:
  - **Comprehensive Multi-Join Engine**: Full support for `LEFT JOIN`, `LEFT OUTER JOIN`, `INNER JOIN`, `RIGHT JOIN`, `FULL JOIN`, `CROSS JOIN`, and `USING (...)` syntax. Supports table and column aliases (`e.department_id = d.id`) and reversed ON conditions.
  - **Row Matcher Mode**: Pairwise comparison cards showing left table values, right table values, matching keys, and outcome badges (`✓ Match`, `NULL Joined`, `✗ Dropped`).
  - **Joined Table Mode**: Direct inline data table displaying all intermediate joined records with disambiguated headers and live NULL badges.
  - **Synchronized Table Highlighting**: Hovering over join pairs flashes matching records in the side-by-side source tables directly above.
  - **Interactive Venn Diagram Mode**: Clean SVG circles highlighting Intersection (`INNER JOIN`) and Outer sets (`LEFT JOIN`) with live row counts.
- **WHERE Clause Filter Gate**:
  - Visual filter gate testing each incoming row against the boolean condition (e.g. `salary > 90000`).
  - Surviving rows display green `✓ PASSED` status; discarded rows display strike-through and red `✗ FILTERED OUT` badges.
- **GROUP BY Bucketing & Aggregations**:
  - Clusters rows into visual container boxes labeled by grouping key (e.g. `department_id: 1`).
  - Shows grouped member chips and demonstrates how buckets collapse into single summary rows.
- **SELECT Column Projection & ORDER BY Sorting**:
  - Highlights projected output columns vs discarded intermediate columns.
  - Displays sorted rows with `#1`, `#2`, `#3` rank badges and sort directions.

---

### 🎨 Module 3: Visual Query Builder & Interactive ER Diagram
*Status: Planned*
*Goal: Empower beginner learners to construct queries without syntax fear and visualize database relationships.*

#### Key Features:
1. **Interactive Schema Graph (ER Diagram)**:
   - Interactive SVG/Canvas diagram mapping database tables as entity cards.
   - Relationship connector lines linking Primary Keys to Foreign Keys (1-to-many indicator).
   - Hovering over a foreign key highlights the related table and matching records.
2. **No-Code / Block-Based Query Builder**:
   - Visual query constructor:
     - Dropdown to pick table(s).
     - Checkbox selection for projected columns (`SELECT`).
     - Condition builder rows for filters (`WHERE` / `HAVING` with operators: `=`, `!=`, `>`, `<`, `LIKE`, `IN`).
     - Visual Join builder (select join type and joining keys).
     - Sort and limit controls.
   - **Real-Time Bidirectional Synchronization**:
     - Visual builder generates formatted SQL in the editor in real-time.
     - Basic SQL statements update the visual controls.
3. **SQL Query Explainer**:
   - Plain-English breakdown of complex queries (e.g. "Filters employees where salary > 90k, groups them by department, and calculates average salary").
   - SQLite `EXPLAIN QUERY PLAN` parser displayed as a tree diagram.

---

### 🔮 Module 4: Practice Challenges, Custom Data & Exporting (Polish & Extension)
*Status: Future Expansion*
- **Interactive Practice Quizzes & Challenges**: SQL exercises with automated output comparison and instant feedback.
- **Custom CSV/JSON Data Import**: Allow users to drag and drop CSV files to create custom tables on the fly.
- **Query & Chart Exporting**: Export visual flow diagrams, query plans, and result tables to CSV, JSON, and PNG.

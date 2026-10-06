// db.js - SQLite WebAssembly Engine Wrapper using sql.js

const DB = {
  sqlInstance: null,
  database: null,
  currentDatasetKey: 'retail',

  /**
   * Initializes the sql.js WebAssembly engine
   */
  async init() {
    if (this.sqlInstance) return;

    if (typeof window.initSqlJs !== 'function') {
      throw new Error(
        'sql.js library is not loaded. Please verify your internet connection to load the WebAssembly runtime from CDN.'
      );
    }

    this.sqlInstance = await window.initSqlJs({
      locateFile: file => `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.8.0/${file}`
    });

    this.loadDataset(this.currentDatasetKey);
  },

  /**
   * Loads or resets the database with the chosen dataset
   */
  loadDataset(key) {
    if (!this.sqlInstance) {
      throw new Error('Database engine is not initialized.');
    }

    const dataset = DATASETS[key];
    if (!dataset) {
      throw new Error(`Dataset "${key}" does not exist.`);
    }

    this.currentDatasetKey = key;

    // Close any prior database instance to free memory
    if (this.database) {
      try {
        this.database.close();
      } catch (e) {
        console.warn('Error closing existing database instance:', e);
      }
    }

    // Instantiate a new, isolated in-memory SQLite database
    this.database = new this.sqlInstance.Database();

    // Execute table creation and seed data SQL
    for (const table of dataset.tables) {
      this.database.exec(table.dataSql);
    }
  },

  /**
   * Resets the active dataset back to its default rows
   */
  reset() {
    this.loadDataset(this.currentDatasetKey);
  },

  /**
   * Executes a user query and returns structured results and metrics
   */
  execute(sqlQuery) {
    if (!this.database) {
      throw new Error('Database is not initialized. Please wait a moment or reload.');
    }

    const trimmed = (sqlQuery || '').trim();
    if (!trimmed) {
      return {
        columns: [],
        values: [],
        rowCount: 0,
        executionTime: 0,
        message: 'Query was empty.'
      };
    }

    const startTime = performance.now();

    try {
      // db.exec returns an array of result objects: [{ columns: [...], values: [[...]] }]
      const results = this.database.exec(trimmed);
      const executionTime = +(performance.now() - startTime).toFixed(2);

      if (!results || results.length === 0) {
        // Successful command that didn't produce rows (e.g. UPDATE, INSERT, CREATE)
        return {
          columns: [],
          values: [],
          rowCount: 0,
          executionTime,
          message: 'Query executed successfully. (0 rows returned)'
        };
      }

      // We present the last result set if multiple queries were executed
      const lastResult = results[results.length - 1];
      return {
        columns: lastResult.columns,
        values: lastResult.values,
        rowCount: lastResult.values.length,
        executionTime,
        message: `Success: ${lastResult.values.length} row${lastResult.values.length === 1 ? '' : 's'} returned.`
      };
    } catch (err) {
      const executionTime = +(performance.now() - startTime).toFixed(2);
      throw {
        message: err.message || 'An error occurred while executing the SQL query.',
        executionTime
      };
    }
  },

  /**
   * Fetches columns and records for a given table for the Schema Explorer
   */
  getTableDetails(tableName) {
    if (!this.database) return null;

    try {
      const infoResults = this.database.exec(`PRAGMA table_info(${tableName});`);
      const dataResults = this.database.exec(`SELECT * FROM ${tableName};`);

      const columns = (infoResults[0]?.values || []).map(row => ({
        cid: row[0],
        name: row[1],
        type: row[2],
        notnull: row[3] === 1,
        defaultValue: row[4],
        pk: row[5] === 1
      }));

      const rows = dataResults[0]?.values || [];
      const colNames = dataResults[0]?.columns || [];

      return {
        tableName,
        columns,
        colNames,
        rows
      };
    } catch (err) {
      console.error(`Error inspecting table ${tableName}:`, err);
      return null;
    }
  },

  /**
   * Returns metadata for all tables in the current dataset
   */
  getAllTables() {
    const dataset = DATASETS[this.currentDatasetKey];
    if (!dataset) return [];

    return dataset.tables.map(tbl => {
      const details = this.getTableDetails(tbl.name);
      return {
        name: tbl.name,
        metaColumns: tbl.columns,
        schema: details ? details.columns : [],
        rows: details ? details.rows : [],
        colNames: details ? details.colNames : []
      };
    });
  }
};

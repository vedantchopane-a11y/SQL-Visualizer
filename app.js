// app.js - Application UI Coordinator & Controller

document.addEventListener('DOMContentLoaded', async () => {
  // DOM Elements
  const statusDot = document.getElementById('statusDot');
  const statusText = document.getElementById('statusText');
  const datasetSelect = document.getElementById('datasetSelect');
  const resetDbBtn = document.getElementById('resetDbBtn');
  const datasetInfoBox = document.getElementById('datasetInfoBox');
  const databaseTablesContainer = document.getElementById('databaseTablesContainer');
  const presetChipsContainer = document.getElementById('presetChipsContainer');
  const sqlInput = document.getElementById('sqlInput');
  const runQueryBtn = document.getElementById('runQueryBtn');
  const clearBtn = document.getElementById('clearBtn');
  const activeQueryTitle = document.getElementById('activeQueryTitle');
  const activeQueryDesc = document.getElementById('activeQueryDesc');
  const rowCountMetric = document.getElementById('rowCountMetric');
  const executionTimeMetric = document.getElementById('executionTimeMetric');
  const resultsContent = document.getElementById('resultsContent');

  // Modal Elements
  const previewModal = document.getElementById('previewModal');
  const previewModalTableName = document.getElementById('previewModalTableName');
  const modalBodyContent = document.getElementById('modalBodyContent');
  const closeModalBtn = document.getElementById('closeModalBtn');

  /**
   * Initializes the application
   */
  async function initApp() {
    try {
      statusText.textContent = 'Loading SQLite Engine...';
      await DB.init();
      statusDot.classList.add('ready');
      statusText.textContent = 'SQLite Ready';

      renderCurrentDataset();

      // Initialize Execution Visualizer
      if (typeof Visualizer !== 'undefined' && Visualizer.init) {
        Visualizer.init();
      }

      // Automatically load the first trial query
      const defaultDataset = DATASETS[DB.currentDatasetKey];
      if (defaultDataset && defaultDataset.sampleQueries.length > 0) {
        selectPresetQuery(defaultDataset.sampleQueries[0]);
      }
    } catch (err) {
      console.error('Initialization error:', err);
      statusDot.style.backgroundColor = 'var(--accent-red)';
      statusText.textContent = 'Engine Load Failed';
      renderErrorState(
        'Failed to initialize SQLite engine: ' +
          (err.message || err) +
          '. Please check your internet connection to load sql-wasm.'
      );
    }
  }

  /**
   * Renders the active dataset info, table cards, and trial queries
   */
  function renderCurrentDataset() {
    const dataset = DATASETS[DB.currentDatasetKey];
    if (!dataset) return;

    // Render dataset description
    datasetInfoBox.textContent = dataset.description;

    // Render tables in active database
    renderDatabaseTables();

    // Render trial queries
    renderTrialQueries(dataset.sampleQueries);
  }

  /**
   * Renders the source tables directly side-by-side with live rows and columns
   */
  function renderDatabaseTables() {
    if (!databaseTablesContainer) return;
    databaseTablesContainer.innerHTML = '';

    const tables = DB.getAllTables();

    tables.forEach(table => {
      const card = document.createElement('div');
      card.className = 'source-table-card';

      // Build table headers with PK/FK indicators and column types
      const thHtml = table.colNames
        .map(colName => {
          const meta = (table.metaColumns || []).find(c => c.name === colName);
          let badge = '';
          if (meta?.pk) {
            badge = '<span class="badge-pk" title="Primary Key">PK</span>';
          } else if (meta?.fk) {
            badge = `<span class="badge-fk" title="Foreign Key -> ${escapeHtml(meta.fk)}">FK</span>`;
          }
          const colType = meta?.type ? `<span class="col-type-tag">${escapeHtml(meta.type)}</span>` : '';
          return `<th>
            <div class="col-header-cell">
              <span class="col-name">${escapeHtml(colName)}</span>
              ${badge}
              ${colType}
            </div>
          </th>`;
        })
        .join('');

      // Build table body rows
      let tbodyHtml = '';
      if (table.rows.length === 0) {
        tbodyHtml = `<tr><td colspan="${table.colNames.length || 1}" class="empty-cell">Table is empty</td></tr>`;
      } else {
        table.rows.forEach(row => {
          tbodyHtml += '<tr>';
          row.forEach(val => {
            if (val === null || val === undefined) {
              tbodyHtml += `<td><span class="null-badge">NULL</span></td>`;
            } else {
              tbodyHtml += `<td>${escapeHtml(String(val))}</td>`;
            }
          });
          tbodyHtml += '</tr>';
        });
      }

      card.innerHTML = `
        <div class="source-table-header">
          <div class="source-table-title">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="3" y="3" width="18" height="18" rx="2"/>
              <path d="M3 9h18"/>
              <path d="M9 21V9"/>
            </svg>
            <span class="table-name-title">${escapeHtml(table.name)}</span>
            <span class="table-rows-count">${table.rows.length} rows</span>
          </div>
          <button class="btn-expand-modal" data-table="${escapeHtml(table.name)}" title="Expand full view">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="15 3 21 3 21 9"/>
              <polyline points="9 21 3 21 3 15"/>
              <line x1="21" y1="3" x2="14" y2="10"/>
              <line x1="3" y1="21" x2="10" y2="14"/>
            </svg>
          </button>
        </div>
        <div class="source-table-data-wrapper">
          <table class="source-sql-table">
            <thead>
              <tr>${thHtml}</tr>
            </thead>
            <tbody>
              ${tbodyHtml}
            </tbody>
          </table>
        </div>
      `;

      databaseTablesContainer.appendChild(card);
    });

    // Attach expand modal listeners
    databaseTablesContainer.querySelectorAll('.btn-expand-modal').forEach(btn => {
      btn.addEventListener('click', e => {
        const tableName = e.currentTarget.getAttribute('data-table');
        openTablePreview(tableName);
      });
    });
  }

  /**
   * Renders clickable Trial Query chips
   */
  function renderTrialQueries(queries) {
    if (!presetChipsContainer) return;
    presetChipsContainer.innerHTML = '';

    queries.forEach((q, index) => {
      const chip = document.createElement('button');
      chip.className = 'trial-chip' + (index === 0 ? ' active' : '');
      chip.innerHTML = `
        <span class="trial-chip-cat">${escapeHtml(q.category)}</span>
        <span class="trial-chip-title">${escapeHtml(q.title)}</span>
      `;

      chip.addEventListener('click', () => {
        document.querySelectorAll('.trial-chip').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        selectPresetQuery(q);
      });

      presetChipsContainer.appendChild(chip);
    });
  }

  /**
   * Loads a trial query into the editor and executes it
   */
  function selectPresetQuery(preset) {
    sqlInput.value = preset.sql;
    activeQueryTitle.textContent = preset.title;
    activeQueryDesc.textContent = preset.description;
    handleRunQuery();
  }

  /**
   * Executes the SQL statement from the editor and updates UI
   */
  function handleRunQuery() {
    const sql = sqlInput.value;

    // Sync query title & description with active dataset presets or mark as custom
    const cleanCurrentSql = (sql || '').trim().replace(/;$/, '');
    const currentDataset = DATASETS[DB.currentDatasetKey];
    const matchedPreset = currentDataset?.sampleQueries?.find(
      q => q.sql.trim().replace(/;$/, '') === cleanCurrentSql
    );

    if (matchedPreset) {
      activeQueryTitle.textContent = matchedPreset.title;
      activeQueryDesc.textContent = matchedPreset.description;
      const chips = document.querySelectorAll('.trial-chip');
      currentDataset.sampleQueries.forEach((q, idx) => {
        if (chips[idx]) {
          chips[idx].classList.toggle('active', q.sql.trim().replace(/;$/, '') === cleanCurrentSql);
        }
      });
    } else {
      activeQueryTitle.textContent = 'Custom SQL Query';
      activeQueryDesc.textContent = 'Executing custom user-written SQL statement.';
      document.querySelectorAll('.trial-chip').forEach(c => c.classList.remove('active'));
    }

    try {
      const result = DB.execute(sql);

      // Update metrics
      rowCountMetric.textContent = `${result.rowCount} row${result.rowCount === 1 ? '' : 's'}`;
      executionTimeMetric.textContent = `${result.executionTime} ms`;

      // Render table or message
      if (result.columns.length === 0) {
        resultsContent.innerHTML = `
          <div class="state-empty">
            <p>${escapeHtml(result.message || 'Query executed successfully.')}</p>
          </div>
        `;
      } else {
        renderResultsTable(result.columns, result.values);
      }

      // If statement mutated data (insert, update, delete, etc.), refresh source tables view
      if (/^\s*(insert|update|delete|drop|alter|create)\b/i.test(sql)) {
        renderDatabaseTables();
      }

      // Update execution pipeline visualizer
      if (typeof Visualizer !== 'undefined' && Visualizer.loadQuery) {
        Visualizer.loadQuery(sql);
      }
    } catch (err) {
      rowCountMetric.textContent = `0 rows`;
      executionTimeMetric.textContent = `${err.executionTime || 0} ms`;
      renderErrorState(err.message || 'Syntax error in SQL statement.');

      if (typeof Visualizer !== 'undefined' && Visualizer.renderEmptyState) {
        Visualizer.renderEmptyState('Query has errors. Fix SQL to view visual pipeline.');
      }
    }
  }

  /**
   * Formats raw columns & rows into a clean data table with NULL formatting
   */
  function renderResultsTable(columns, rows) {
    let html = '<table class="sql-table"><thead><tr>';

    columns.forEach(col => {
      html += `<th>${escapeHtml(col)}</th>`;
    });
    html += '</tr></thead><tbody>';

    if (rows.length === 0) {
      html += `<tr><td colspan="${columns.length}" style="text-align:center; padding: 2rem; color: var(--text-muted);">Query returned 0 rows.</td></tr>`;
    } else {
      rows.forEach(row => {
        html += '<tr>';
        row.forEach(val => {
          if (val === null || val === undefined) {
            html += `<td><span class="null-badge">NULL</span></td>`;
          } else {
            html += `<td>${escapeHtml(String(val))}</td>`;
          }
        });
        html += '</tr>';
      });
    }

    html += '</tbody></table>';
    resultsContent.innerHTML = html;
  }

  /**
   * Displays formatted SQLite error message
   */
  function renderErrorState(errorMessage) {
    resultsContent.innerHTML = `
      <div class="state-error">
        <strong>SQL Execution Error:</strong>
        <span>${escapeHtml(errorMessage)}</span>
      </div>
    `;
  }

  /**
   * Opens the Table Preview Modal
   */
  function openTablePreview(tableName) {
    const details = DB.getTableDetails(tableName);
    if (!details) return;

    previewModalTableName.textContent = tableName;

    let html = '<table class="sql-table"><thead><tr>';
    details.colNames.forEach(col => {
      html += `<th>${escapeHtml(col)}</th>`;
    });
    html += '</tr></thead><tbody>';

    if (details.rows.length === 0) {
      html += `<tr><td colspan="${details.colNames.length}" style="text-align:center; padding: 1.5rem; color: var(--text-muted);">Table is empty.</td></tr>`;
    } else {
      details.rows.forEach(row => {
        html += '<tr>';
        row.forEach(val => {
          if (val === null || val === undefined) {
            html += `<td><span class="null-badge">NULL</span></td>`;
          } else {
            html += `<td>${escapeHtml(String(val))}</td>`;
          }
        });
        html += '</tr>';
      });
    }

    html += '</tbody></table>';
    modalBodyContent.innerHTML = html;
    previewModal.classList.add('active');
  }

  /**
   * Closes the Table Preview Modal
   */
  function closeTablePreview() {
    previewModal.classList.remove('active');
  }

  /**
   * Helper: Escapes HTML to prevent XSS
   */
  function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // Event Listeners
  runQueryBtn.addEventListener('click', handleRunQuery);

  sqlInput.addEventListener('input', () => {
    const cleanCurrentSql = sqlInput.value.trim().replace(/;$/, '');
    const currentDataset = DATASETS[DB.currentDatasetKey];
    const matchedPreset = currentDataset?.sampleQueries?.find(
      q => q.sql.trim().replace(/;$/, '') === cleanCurrentSql
    );
    const chips = document.querySelectorAll('.trial-chip');

    if (matchedPreset) {
      activeQueryTitle.textContent = matchedPreset.title;
      activeQueryDesc.textContent = matchedPreset.description;
      currentDataset.sampleQueries.forEach((q, idx) => {
        if (chips[idx]) chips[idx].classList.toggle('active', q.sql.trim().replace(/;$/, '') === cleanCurrentSql);
      });
    } else {
      activeQueryTitle.textContent = 'Custom SQL Query';
      activeQueryDesc.textContent = 'Executing custom user-written SQL statement.';
      chips.forEach(c => c.classList.remove('active'));
    }
  });

  clearBtn.addEventListener('click', () => {
    sqlInput.value = '';
    sqlInput.focus();
    activeQueryTitle.textContent = 'Custom Query';
    activeQueryDesc.textContent = 'Write and execute any valid SQL statement.';
    document.querySelectorAll('.trial-chip').forEach(c => c.classList.remove('active'));
    if (typeof Visualizer !== 'undefined' && Visualizer.renderEmptyState) {
      Visualizer.renderEmptyState('Write a query and click Run Query to inspect execution pipeline.');
    }
  });

  // Keyboard shortcut: Ctrl+Enter / Cmd+Enter
  window.addEventListener('keydown', e => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      handleRunQuery();
    }
  });

  // Switch Dataset
  datasetSelect.addEventListener('change', e => {
    const selectedKey = e.target.value;
    try {
      DB.loadDataset(selectedKey);
      renderCurrentDataset();

      // Load first trial query
      const dataset = DATASETS[selectedKey];
      if (dataset && dataset.sampleQueries.length > 0) {
        selectPresetQuery(dataset.sampleQueries[0]);
      }
    } catch (err) {
      renderErrorState(err.message);
    }
  });

  // Reset DB
  resetDbBtn.addEventListener('click', () => {
    try {
      DB.reset();
      renderDatabaseTables();
      handleRunQuery();

      const originalHtml = resetDbBtn.innerHTML;
      resetDbBtn.innerHTML = '<span>&#10003; Reset Done</span>';
      setTimeout(() => {
        resetDbBtn.innerHTML = originalHtml;
      }, 1200);
    } catch (err) {
      renderErrorState(err.message);
    }
  });

  // Close Modal handlers
  closeModalBtn.addEventListener('click', closeTablePreview);
  previewModal.addEventListener('click', e => {
    if (e.target === previewModal) {
      closeTablePreview();
    }
  });
  window.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      closeTablePreview();
    }
  });

  // Start initialization
  initApp();
});

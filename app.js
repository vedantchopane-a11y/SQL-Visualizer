// app.js - Queryscope Application Coordinator & Interactive Controller

document.addEventListener('DOMContentLoaded', async () => {
  // DOM Elements
  const sessionStatusText = document.getElementById('sessionStatusText');
  const sessionDot = document.getElementById('sessionDot');
  const datasetDropdownBtn = document.getElementById('datasetDropdownBtn');
  const datasetDropdownMenu = document.getElementById('datasetDropdownMenu');
  const activeSampleLabel = document.getElementById('activeSampleLabel');
  const queryTitleHeading = document.getElementById('queryTitleHeading');
  const queryCategoryTag = document.getElementById('queryCategoryTag');
  const querySubtitleText = document.getElementById('querySubtitleText');
  const sourceDataStats = document.getElementById('sourceDataStats');
  const sourceTablesContainer = document.getElementById('sourceTablesContainer');
  const resetDataBtn = document.getElementById('resetDataBtn');
  const outputMetricsPill = document.getElementById('outputMetricsPill');
  const queryOutputScroll = document.getElementById('queryOutputScroll');
  const outputPreviewNote = document.getElementById('outputPreviewNote');
  const downloadResultsBtn = document.getElementById('downloadResultsBtn');
  const editorFileName = document.getElementById('editorFileName');
  const editorGutter = document.getElementById('editorGutter');
  const sqlInput = document.getElementById('sqlInput');
  const formatSqlBtn = document.getElementById('formatSqlBtn');
  const visualizeQueryBtn = document.getElementById('visualizeQueryBtn');
  const shareQueryBtn = document.getElementById('shareQueryBtn');
  const toastNotice = document.getElementById('toastNotice');
  const toastMessage = document.getElementById('toastMessage');
  const navExamplesBtn = document.getElementById('navExamplesBtn');
  const navSqlGuideBtn = document.getElementById('navSqlGuideBtn');
  const examplesModal = document.getElementById('examplesModal');
  const examplesModalBody = document.getElementById('examplesModalBody');
  const closeExamplesBtn = document.getElementById('closeExamplesBtn');
  const sqlGuideModal = document.getElementById('sqlGuideModal');
  const closeGuideBtn = document.getElementById('closeGuideBtn');

  // Active query cache
  let currentQueryResult = null;
  let activeQueryMeta = null;

  // Row color identity mapping for retail dataset
  const CUSTOMER_COLORS = {
    1: { name: 'Ava Chen', color: '#10b981' },
    2: { name: 'Ben Ortiz', color: '#8b5cf6' },
    3: { name: 'Cara Lee', color: '#f59e0b' },
    4: { name: 'Diego Ruiz', color: '#06b6d4' }
  };

  /**
   * Initializes the application
   */
  async function initApp() {
    try {
      if (sessionStatusText) sessionStatusText.textContent = 'CONNECTING...';
      await DB.init();
      if (sessionStatusText) sessionStatusText.textContent = 'LOCAL SESSION';
      if (sessionDot) sessionDot.style.backgroundColor = '#10b981';

      if (typeof Visualizer !== 'undefined' && Visualizer.init) {
        Visualizer.init();
      }

      // Load initial dataset
      loadDatasetUI(DB.currentDatasetKey);

      // Setup event listeners
      setupEventListeners();
    } catch (err) {
      console.error('App init error:', err);
      if (sessionStatusText) sessionStatusText.textContent = 'OFFLINE';
      if (sessionDot) sessionDot.style.backgroundColor = '#ef4444';
      alert('Failed to initialize SQLite WebAssembly engine. Please check internet connection.');
    }
  }

  /**
   * Loads and renders a dataset
   */
  function loadDatasetUI(key) {
    DB.loadDataset(key);
    const dataset = DATASETS[key];
    if (!dataset) return;

    if (activeSampleLabel) activeSampleLabel.textContent = dataset.label;
    if (sourceDataStats) sourceDataStats.textContent = dataset.tablesCount || `${dataset.tables.length} tables`;

    // Render source data tables
    renderSourceTables();

    // Select the first sample query
    if (dataset.sampleQueries && dataset.sampleQueries.length > 0) {
      selectQuery(dataset.sampleQueries[0]);
    }
  }

  /**
   * Selects and loads a query into editor and executes it
   */
  function selectQuery(queryMeta) {
    activeQueryMeta = queryMeta;

    if (queryTitleHeading) queryTitleHeading.textContent = queryMeta.title;
    if (queryCategoryTag) queryCategoryTag.textContent = queryMeta.category || 'SQL QUERY';
    if (querySubtitleText) querySubtitleText.textContent = queryMeta.subtitle || '';
    if (outputPreviewNote) outputPreviewNote.textContent = queryMeta.previewNote || 'Query output';
    if (editorFileName) editorFileName.textContent = queryMeta.filename || 'query.sql';

    if (sqlInput) {
      sqlInput.value = queryMeta.sql;
      updateEditorGutter();
    }

    // Execute query and trigger visualizer
    runQuery();
  }

  /**
   * Executes SQL in editor, displays results, and passes query to Visualizer
   */
  function runQuery() {
    const sql = (sqlInput.value || '').trim();
    if (!sql) return;

    try {
      const result = DB.execute(sql);
      currentQueryResult = result;

      // Update metrics pill
      if (outputMetricsPill) {
        outputMetricsPill.textContent = `${result.rowCount} rows · ${result.executionTime} ms`;
      }

      // Render output table
      renderOutputTable(result);

      // Trigger Visualizer
      if (typeof Visualizer !== 'undefined' && Visualizer.loadQuery) {
        Visualizer.loadQuery(sql);
      }
    } catch (err) {
      console.warn('Query execution error:', err);
      if (outputMetricsPill) {
        outputMetricsPill.textContent = `Error · ${err.executionTime || 0} ms`;
      }
      renderErrorOutput(err.message || String(err));
    }
  }

  /**
   * Renders the Output table with customer identity dots
   */
  function renderOutputTable(result) {
    if (!queryOutputScroll) return;

    if (!result.columns || result.columns.length === 0) {
      queryOutputScroll.innerHTML = `<div style="padding:1rem; font-size:0.75rem; color:var(--text-muted); font-family:var(--font-mono);">${result.message || 'No rows returned.'}</div>`;
      return;
    }

    let ths = `<th>#</th>`;
    result.columns.forEach(col => {
      ths += `<th>${col} <span class="col-key-tag">· numeric</span></th>`;
    });

    let trs = '';
    result.values.forEach((row, idx) => {
      let tds = `<td><span style="color:var(--text-subtle);">${idx + 1}</span></td>`;

      row.forEach((val, colIdx) => {
        // Look up identity dot for customer name
        let dotHtml = '';
        if (typeof val === 'string') {
          for (const cId in CUSTOMER_COLORS) {
            if (val.toLowerCase().includes(CUSTOMER_COLORS[cId].name.toLowerCase())) {
              dotHtml = `<span class="row-dot" style="background-color:${CUSTOMER_COLORS[cId].color}; margin-right:0.45rem;"></span>`;
              break;
            }
          }
        }

        // Format numbers if decimal/money
        let displayVal = val;
        if (typeof val === 'number') {
          displayVal = val.toFixed(2);
        }

        tds += `<td><span class="row-identity-cell">${dotHtml}${displayVal !== null ? displayVal : 'NULL'}</span></td>`;
      });

      trs += `<tr>${tds}</tr>`;
    });

    queryOutputScroll.innerHTML = `
      <table class="scope-table">
        <thead><tr>${ths}</tr></thead>
        <tbody>${trs}</tbody>
      </table>
    `;
  }

  function renderErrorOutput(msg) {
    if (!queryOutputScroll) return;
    queryOutputScroll.innerHTML = `
      <div style="padding:0.85rem; font-size:0.75rem; color:#dc2626; font-family:var(--font-mono); background:#fef2f2; border-radius:var(--radius-md);">
        Error: ${msg}
      </div>
    `;
  }

  /**
   * Renders the Source Data tables with customer dots and relation hints
   */
  function renderSourceTables() {
    if (!sourceTablesContainer) return;
    sourceTablesContainer.innerHTML = '';

    const tables = DB.getAllTables();

    tables.forEach(table => {
      const card = document.createElement('div');
      card.className = 'source-sub-table-card';

      // Table meta
      const rowCount = table.rows ? table.rows.length : 0;
      const meta = DATASETS[DB.currentDatasetKey]?.tables.find(t => t.name === table.name);
      const relationHint = meta?.relationHint || '';

      // Headers
      let ths = '';
      table.colNames.forEach(colName => {
        const colMeta = (meta?.columns || []).find(c => c.name === colName);
        let tag = '';
        if (colMeta?.pk) tag = ' · PK';
        else if (colMeta?.fk) tag = ' · FK';
        ths += `<th>${colName}<span class="col-key-tag">${tag}</span></th>`;
      });

      // Rows
      let trs = '';
      (table.rows || []).forEach(row => {
        let tds = '';

        // If customers table, row[0] is id
        // If orders table, row[1] is customer_id
        let customerId = null;
        if (table.name === 'customers') customerId = row[0];
        else if (table.name === 'orders') customerId = row[1];

        const identity = customerId ? CUSTOMER_COLORS[customerId] : null;

        row.forEach((val, cIdx) => {
          let dotHtml = '';
          // Show dot on first column
          if (cIdx === 0 && identity) {
            dotHtml = `<span class="row-dot" style="background-color: ${identity.color}; margin-right: 0.45rem;"></span>`;
          }

          // Format total decimal if orders table and column index 2
          let formattedVal = val;
          if (table.name === 'orders' && cIdx === 2 && typeof val === 'number') {
            formattedVal = val.toFixed(2);
          }

          tds += `<td><span class="row-identity-cell">${dotHtml}${formattedVal !== null ? formattedVal : 'NULL'}</span></td>`;
        });

        trs += `<tr>${tds}</tr>`;
      });

      card.innerHTML = `
        <div class="source-sub-header">
          <span class="sub-table-name">${table.name}</span>
          <span class="sub-table-rows-badge">${rowCount} rows</span>
        </div>
        <div class="source-table-scroll">
          <table class="scope-table">
            <thead><tr>${ths}</tr></thead>
            <tbody>${trs}</tbody>
          </table>
        </div>
        ${relationHint ? `<div class="source-sub-footer">${relationHint}</div>` : ''}
      `;

      sourceTablesContainer.appendChild(card);
    });
  }

  /**
   * Keeps line numbers in the gutter synchronized with textarea lines
   */
  function updateEditorGutter() {
    if (!editorGutter || !sqlInput) return;
    const lines = (sqlInput.value || '').split('\n').length;
    let html = '';
    for (let i = 1; i <= Math.max(lines, 8); i++) {
      html += `<div class="gutter-num" id="lineNum_${i}">${i}</div>`;
    }
    editorGutter.innerHTML = html;
  }

  /**
   * Sets up all event listeners
   */
  function setupEventListeners() {
    // Dataset dropdown toggle
    if (datasetDropdownBtn) {
      datasetDropdownBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const wrapper = datasetDropdownBtn.closest('.sample-selector-wrapper');
        if (wrapper) wrapper.classList.toggle('open');
      });
    }

    // Dataset selection
    document.querySelectorAll('.dropdown-item').forEach(item => {
      item.addEventListener('click', () => {
        const key = item.getAttribute('data-dataset');
        if (key && DATASETS[key]) {
          document.querySelectorAll('.dropdown-item').forEach(i => i.classList.remove('active'));
          item.classList.add('active');
          const wrapper = item.closest('.sample-selector-wrapper');
          if (wrapper) wrapper.classList.remove('open');
          loadDatasetUI(key);
        }
      });
    });

    // Close dropdown on outside click
    window.addEventListener('click', () => {
      const wrapper = document.querySelector('.sample-selector-wrapper');
      if (wrapper) wrapper.classList.remove('open');
    });

    // Visualize Query Button
    if (visualizeQueryBtn) {
      visualizeQueryBtn.addEventListener('click', () => {
        runQuery();
      });
    }

    // Reset Data Button
    if (resetDataBtn) {
      resetDataBtn.addEventListener('click', () => {
        DB.reset();
        renderSourceTables();
        runQuery();
        showToast('Sample dataset restored to initial state.');
      });
    }

    // Format SQL button
    if (formatSqlBtn) {
      formatSqlBtn.addEventListener('click', () => {
        formatSqlQuery();
      });
    }

    // Sync line numbers on typing
    if (sqlInput) {
      sqlInput.addEventListener('input', () => {
        updateEditorGutter();
      });

      sqlInput.addEventListener('keydown', (e) => {
        // Ctrl+Enter or Cmd+Enter to run query
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
          e.preventDefault();
          runQuery();
        }
        // Ctrl+Alt+F or Cmd+J to format SQL
        if ((e.ctrlKey || e.metaKey) && (e.key === 'j' || (e.altKey && e.key === 'f'))) {
          e.preventDefault();
          formatSqlQuery();
        }
        // Tab key support
        if (e.key === 'Tab') {
          e.preventDefault();
          const start = sqlInput.selectionStart;
          const end = sqlInput.selectionEnd;
          sqlInput.value = sqlInput.value.substring(0, start) + '  ' + sqlInput.value.substring(end);
          sqlInput.selectionStart = sqlInput.selectionEnd = start + 2;
        }
      });
    }

    // Share Query Button
    if (shareQueryBtn) {
      shareQueryBtn.addEventListener('click', () => {
        const sql = sqlInput.value;
        if (navigator.clipboard) {
          navigator.clipboard.writeText(sql).then(() => {
            showToast('Query copied to clipboard!');
          }).catch(() => {
            showToast('Query ready to copy.');
          });
        } else {
          showToast('Query link generated.');
        }
      });
    }

    // Download CSV button
    if (downloadResultsBtn) {
      downloadResultsBtn.addEventListener('click', () => {
        exportOutputToCsv();
      });
    }

    // Examples navigation
    if (navExamplesBtn) {
      navExamplesBtn.addEventListener('click', () => {
        openExamplesModal();
      });
    }
    if (closeExamplesBtn) {
      closeExamplesBtn.addEventListener('click', () => {
        if (examplesModal) examplesModal.classList.remove('open');
      });
    }

    // SQL Guide navigation
    if (navSqlGuideBtn) {
      navSqlGuideBtn.addEventListener('click', () => {
        if (sqlGuideModal) sqlGuideModal.classList.add('open');
      });
    }
    if (closeGuideBtn) {
      closeGuideBtn.addEventListener('click', () => {
        if (sqlGuideModal) sqlGuideModal.classList.remove('open');
      });
    }

    // Close modals on clicking overlay backdrop
    window.addEventListener('click', (e) => {
      if (e.target === examplesModal) examplesModal.classList.remove('open');
      if (e.target === sqlGuideModal) sqlGuideModal.classList.remove('open');
    });
  }

  /**
   * Formats SQL with clean indentation and uppercase keywords
   */
  function formatSqlQuery() {
    let sql = sqlInput.value;
    const keywords = ['SELECT', 'FROM', 'JOIN', 'INNER JOIN', 'LEFT JOIN', 'WHERE', 'GROUP BY', 'HAVING', 'ORDER BY', 'LIMIT', 'ON', 'AS', 'AND', 'OR', 'DESC', 'ASC', 'COUNT', 'SUM', 'AVG', 'MIN', 'MAX', 'ROUND'];

    keywords.forEach(kw => {
      const regex = new RegExp(`\\b${kw}\\b`, 'gi');
      sql = sql.replace(regex, kw);
    });

    sqlInput.value = sql;
    updateEditorGutter();
    showToast('SQL formatted nicely.');
  }

  /**
   * Displays the toast notification
   */
  function showToast(msg) {
    if (!toastNotice) return;
    if (toastMessage) toastMessage.textContent = msg;
    toastNotice.classList.add('show');
    setTimeout(() => {
      toastNotice.classList.remove('show');
    }, 2800);
  }

  /**
   * Exports current output table to CSV file
   */
  function exportOutputToCsv() {
    if (!currentQueryResult || !currentQueryResult.columns || currentQueryResult.columns.length === 0) {
      showToast('No result rows to export.');
      return;
    }

    const headers = currentQueryResult.columns.join(',');
    const rows = currentQueryResult.values.map(r => r.map(v => `"${String(v !== null ? v : '')}"`).join(','));
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers, ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', 'query_result.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Downloaded query_result.csv');
  }

  /**
   * Opens Examples modal with categorized queries
   */
  function openExamplesModal() {
    if (!examplesModal || !examplesModalBody) return;
    examplesModalBody.innerHTML = '';

    const currentDataset = DATASETS[DB.currentDatasetKey];
    if (!currentDataset) return;

    const grid = document.createElement('div');
    grid.className = 'examples-grid';

    (currentDataset.sampleQueries || []).forEach(q => {
      const card = document.createElement('button');
      card.className = 'example-card-btn';
      card.innerHTML = `
        <div class="example-header-line">
          <span class="example-title">${q.title}</span>
          <span class="example-cat-tag">${q.category || 'SQL'}</span>
        </div>
        <p class="example-desc">${q.subtitle || q.description || ''}</p>
      `;

      card.addEventListener('click', () => {
        selectQuery(q);
        examplesModal.classList.remove('open');
      });

      grid.appendChild(card);
    });

    examplesModalBody.appendChild(grid);
    examplesModal.classList.add('open');
  }

  // Kickstart application
  await initApp();
});

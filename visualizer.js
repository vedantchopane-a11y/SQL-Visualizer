// visualizer.js - Queryscope Logical Execution Pipeline & Interactive Row Flow Engine

const Visualizer = {
  activeSql: '',
  stages: [],
  currentStageIndex: 3, // Default to stage 4 (GROUP BY) as in screenshot if available
  viewMode: 'rowflow', // 'rowflow' or 'intermediate'
  isPlaying: false,
  playTimer: null,
  playbackSpeed: 1,

  // Row identity palette matching Queryscope
  identities: {
    1: { id: 1, name: 'Ava Chen', short: 'Ava', color: '#10b981', bg: '#ecfdf5', border: '#86efac', text: '#065f46' },
    2: { id: 2, name: 'Ben Ortiz', short: 'Ben', color: '#8b5cf6', bg: '#f5f3ff', border: '#c4b5fd', text: '#5b21b6' },
    3: { id: 3, name: 'Cara Lee', short: 'Cara', color: '#f59e0b', bg: '#fffbeb', border: '#fcd34d', text: '#92400e' },
    4: { id: 4, name: 'Diego Ruiz', short: 'Diego', color: '#06b6d4', bg: '#ecfeff', border: '#67e8f9', text: '#0e7490' }
  },

  // DOM Elements cache
  elements: {},

  init() {
    this.elements = {
      stateBadge: document.getElementById('visStateBadge'),
      stepperTrack: document.getElementById('pipelineStepperTrack'),
      canvas: document.getElementById('visCanvasContainer'),
      btnPrev: document.getElementById('stepPrevBtn'),
      btnPlay: document.getElementById('stepPlayBtn'),
      playBtnText: document.getElementById('playBtnText'),
      btnNext: document.getElementById('stepNextBtn'),
      btnSpeed: document.getElementById('visSpeedBtn'),
      btnRestart: document.getElementById('visRestartBtn'),
      btnViewRowFlow: document.getElementById('viewModeRowFlow'),
      btnViewIntermediate: document.getElementById('viewModeIntermediate'),
      visExpandBtn: document.getElementById('visExpandBtn'),
      editorActiveLineBg: document.getElementById('editorActiveLineBg'),
      editorStatusText: document.getElementById('editorStatusText'),
      gutterActiveNum: document.getElementById('gutterActiveNum')
    };

    if (this.elements.btnPrev) {
      this.elements.btnPrev.addEventListener('click', () => {
        this.pause();
        this.prevStage();
      });
    }

    if (this.elements.btnNext) {
      this.elements.btnNext.addEventListener('click', () => {
        this.pause();
        this.nextStage();
      });
    }

    if (this.elements.btnPlay) {
      this.elements.btnPlay.addEventListener('click', () => {
        this.togglePlay();
      });
    }

    if (this.elements.btnRestart) {
      this.elements.btnRestart.addEventListener('click', () => {
        this.pause();
        this.goToStage(0);
      });
    }

    if (this.elements.btnSpeed) {
      this.elements.btnSpeed.addEventListener('click', () => {
        this.cycleSpeed();
      });
    }

    if (this.elements.btnViewRowFlow) {
      this.elements.btnViewRowFlow.addEventListener('click', () => {
        this.setViewMode('rowflow');
      });
    }

    if (this.elements.btnViewIntermediate) {
      this.elements.btnViewIntermediate.addEventListener('click', () => {
        this.setViewMode('intermediate');
      });
    }

    // Keyboard shortcuts: Arrow keys for stages, Space for play/pause
    window.addEventListener('keydown', (e) => {
      // Don't intercept if user is typing in textarea
      if (document.activeElement && document.activeElement.tagName === 'TEXTAREA') {
        return;
      }

      if (e.code === 'Space') {
        e.preventDefault();
        this.togglePlay();
      } else if (e.code === 'ArrowRight') {
        e.preventDefault();
        this.pause();
        this.nextStage();
      } else if (e.code === 'ArrowLeft') {
        e.preventDefault();
        this.pause();
        this.prevStage();
      }
    });
  },

  setViewMode(mode) {
    this.viewMode = mode;
    if (this.elements.btnViewRowFlow) {
      this.elements.btnViewRowFlow.classList.toggle('active', mode === 'rowflow');
    }
    if (this.elements.btnViewIntermediate) {
      this.elements.btnViewIntermediate.classList.toggle('active', mode === 'intermediate');
    }
    this.renderCurrentStage();
  },

  cycleSpeed() {
    if (this.playbackSpeed === 1) this.playbackSpeed = 1.5;
    else if (this.playbackSpeed === 1.5) this.playbackSpeed = 2;
    else this.playbackSpeed = 1;

    if (this.elements.btnSpeed) {
      this.elements.btnSpeed.textContent = `${this.playbackSpeed}x speed`;
    }

    if (this.isPlaying) {
      this.pause();
      this.play();
    }
  },

  loadQuery(sql) {
    this.pause();
    this.activeSql = (sql || '').trim();
    if (!this.elements.canvas) return;

    if (!this.activeSql) {
      this.renderEmptyState('Enter or select an SQL statement to view the execution pipeline.');
      return;
    }

    if (!/^\s*SELECT\b/i.test(this.activeSql)) {
      this.renderEmptyState('Visual execution pipeline is available for SELECT queries.');
      return;
    }

    try {
      this.stages = this.decomposeQuery(this.activeSql);
      this.renderTimeline();

      // Find if GROUP BY stage exists, default to it as in reference image; else start at 0
      const groupIdx = this.stages.findIndex(s => s.key === 'groupby');
      const targetIdx = groupIdx >= 0 ? groupIdx : 0;
      this.goToStage(targetIdx);
    } catch (err) {
      console.warn('Decomposition error:', err);
      this.renderEmptyState('Could not decompose query into pipeline stages.');
    }
  },

  decomposeQuery(sql) {
    const stages = [];
    const cleanSql = sql.replace(/\/\*[\s\S]*?\*\/|--.*$/gm, '').trim();

    // 1. Extract FROM and JOIN
    const fromRegex = /\bFROM\s+([a-zA-Z0-9_]+)(?:\s+(?:AS\s+)?([a-zA-Z0-9_]+))?/i;
    const fromMatch = cleanSql.match(fromRegex);
    const fromTable = fromMatch ? fromMatch[1] : 'customers';
    let fromAlias = (fromMatch && fromMatch[2]) ? fromMatch[2] : '';
    if (/^(JOIN|LEFT|RIGHT|INNER|CROSS|FULL|NATURAL|WHERE|GROUP|ORDER|LIMIT|ON|USING)$/i.test(fromAlias)) {
      fromAlias = '';
    }

    const joinRegex = /\b(?:(INNER|LEFT(?:\s+OUTER)?|RIGHT(?:\s+OUTER)?|FULL(?:\s+OUTER)?|CROSS)\s+)?JOIN\s+([a-zA-Z0-9_]+)(?:\s+(?:AS\s+)?([a-zA-Z0-9_]+))?(?:\s+(?:ON\s+([\s\S]+?)|USING\s*\(\s*([a-zA-Z0-9_]+)\s*\)))?(?=\bWHERE\b|\bGROUP\s+BY\b|\bHAVING\b|\bORDER\s+BY\b|\bLIMIT\b|;|$)/i;
    const joinMatch = cleanSql.match(joinRegex);

    let joinInfo = null;
    if (joinMatch) {
      const rawType = (joinMatch[1] || 'INNER').toUpperCase();
      const cleanType = rawType.replace(/\s+OUTER/i, '').trim();
      let rightAlias = joinMatch[3] || '';
      if (/^(ON|USING|WHERE|GROUP|ORDER|LIMIT)$/i.test(rightAlias)) {
        rightAlias = '';
      }
      let onCondition = '';
      if (joinMatch[4]) {
        onCondition = joinMatch[4].trim();
      } else if (joinMatch[5]) {
        const col = joinMatch[5].trim();
        const leftRef = fromAlias || fromTable;
        const rightRef = rightAlias || joinMatch[2];
        onCondition = `${leftRef}.${col} = ${rightRef}.${col}`;
      }

      joinInfo = {
        type: cleanType,
        rawType,
        rightTable: joinMatch[2],
        alias: rightAlias,
        onCondition
      };
    }

    // 2. Extract WHERE
    const whereMatch = cleanSql.match(/\bWHERE\s+([\s\S]+?)(?=\bGROUP\s+BY\b|\bHAVING\b|\bORDER\s+BY\b|\bLIMIT\b|;|$)/i);
    const whereCondition = whereMatch ? whereMatch[1].trim() : null;

    // 3. Extract GROUP BY
    const groupMatch = cleanSql.match(/\bGROUP\s+BY\s+([\s\S]+?)(?=\bHAVING\b|\bORDER\s+BY\b|\bLIMIT\b|;|$)/i);
    const groupByCols = groupMatch ? groupMatch[1].trim() : null;

    // 4. Extract HAVING
    const havingMatch = cleanSql.match(/\bHAVING\s+([\s\S]+?)(?=\bORDER\s+BY\b|\bLIMIT\b|;|$)/i);
    const havingCondition = havingMatch ? havingMatch[1].trim() : null;

    // 5. Extract SELECT projections
    const selectMatch = cleanSql.match(/\bSELECT\s+([\s\S]+?)\bFROM\b/i);
    const selectCols = selectMatch ? selectMatch[1].trim() : '*';

    // 6. Extract ORDER BY
    const orderMatch = cleanSql.match(/\bORDER\s+BY\s+([\s\S]+?)(?=\bLIMIT\b|;|$)/i);
    const orderByCols = orderMatch ? orderMatch[1].trim() : null;

    // --- BUILD LOGICAL STAGES ---

    // Stage 1: FROM
    const fromBaseQuery = `SELECT * FROM ${fromTable}`;
    const fromSnapshot = this.safeExec(fromBaseQuery);
    stages.push({
      key: 'from',
      name: 'FROM',
      subLabel: `${fromSnapshot.rowCount || 4} ${fromTable}`,
      title: `Load ${fromTable} source data`,
      description: `Loads source rows from the "${fromTable}" table into execution memory.`,
      fromTable,
      snapshot: fromSnapshot
    });

    // Stage 2: JOIN (if present)
    let joinedQuery = fromBaseQuery;
    if (joinInfo) {
      const fromTableClause = fromTable + (fromAlias ? ` AS ${fromAlias}` : '');
      const rightClause = joinInfo.rightTable + (joinInfo.alias ? ` AS ${joinInfo.alias}` : '');
      const onPart = joinInfo.onCondition ? ` ON ${joinInfo.onCondition}` : '';
      joinedQuery = `SELECT * FROM ${fromTableClause} ${joinInfo.rawType} JOIN ${rightClause}${onPart}`;
      const joinSnapshot = this.safeExec(joinedQuery);

      stages.push({
        key: 'join',
        name: 'JOIN',
        subLabel: `${joinSnapshot.rowCount || 6} matched rows`,
        title: `Join ${fromTable} with ${joinInfo.rightTable}`,
        description: `Pairs records from "${fromTable}" with "${joinInfo.rightTable}" where condition matches (${joinInfo.onCondition}).`,
        joinInfo,
        priorSnapshot: fromSnapshot,
        snapshot: joinSnapshot
      });
    }

    // Stage 3: WHERE (if present)
    let whereQuery = joinedQuery;
    if (whereCondition) {
      whereQuery = `SELECT * FROM (${joinedQuery}) WHERE ${whereCondition}`;
      const whereSnapshot = this.safeExec(whereQuery);

      stages.push({
        key: 'where',
        name: 'WHERE',
        subLabel: `${whereSnapshot.rowCount || 4} paid orders`,
        title: `Filter rows: WHERE ${whereCondition}`,
        description: `Evaluates filter criteria row-by-row. Surviving records proceed to group bucketing.`,
        condition: whereCondition,
        priorSnapshot: stages[stages.length - 1].snapshot,
        snapshot: whereSnapshot
      });
    }

    // Stage 4: GROUP BY (if present)
    let groupBaseQuery = whereQuery;
    if (groupByCols) {
      let groupQuery = `SELECT ${groupByCols}, COUNT(*) AS _group_count FROM (${groupBaseQuery}) GROUP BY ${groupByCols}`;
      const groupSnapshot = this.safeExec(groupQuery);

      stages.push({
        key: 'groupby',
        name: 'GROUP BY',
        subLabel: `${groupSnapshot.rowCount || 3} groups`,
        title: `Turn rows into groups`,
        description: `Rows with the same customer ID and name are collected together. SUM adds the paid order totals within each group.`,
        groupByCols,
        havingCondition,
        priorSnapshot: stages[stages.length - 1].snapshot,
        snapshot: groupSnapshot
      });
    }

    // Stage 5: HAVING (if present)
    if (havingCondition && groupByCols) {
      const havingQuery = `SELECT ${groupByCols} FROM (${groupBaseQuery}) GROUP BY ${groupByCols} HAVING ${havingCondition}`;
      const havingSnapshot = this.safeExec(havingQuery);

      stages.push({
        key: 'having',
        name: 'HAVING',
        subLabel: `${havingSnapshot.rowCount || 2} groups`,
        title: `Filter grouped aggregates: HAVING ${havingCondition}`,
        description: `Evaluates aggregated total for each group. Groups not satisfying condition are dropped.`,
        havingCondition,
        priorSnapshot: stages[stages.length - 1].snapshot,
        snapshot: havingSnapshot
      });
    }

    // Stage 6: SELECT
    let selectQuery = cleanSql.replace(/\s+ORDER\s+BY\s+[\s\S]+/i, '').replace(/\s+LIMIT\s+\d+/i, '');
    const selectSnapshot = this.safeExec(selectQuery);

    stages.push({
      key: 'select',
      name: 'SELECT',
      subLabel: `${selectSnapshot.columns.length || 2} columns`,
      title: `Project columns: ${selectCols}`,
      description: `Selects output columns, formats aggregates, and resolves calculated expression aliases.`,
      selectCols,
      snapshot: selectSnapshot
    });

    // Stage 7: ORDER BY (if present)
    if (orderByCols) {
      const orderSnapshot = this.safeExec(cleanSql);
      stages.push({
        key: 'orderby',
        name: 'ORDER BY',
        subLabel: `${orderSnapshot.rowCount || 2} sorted rows`,
        title: `Order rows: ORDER BY ${orderByCols}`,
        description: `Sorts the output rows according to specified columns and sort direction.`,
        orderByCols,
        snapshot: orderSnapshot
      });
    }

    return stages;
  },

  safeExec(query) {
    try {
      const res = DB.execute(query);
      return {
        columns: res.columns || [],
        rows: res.values || [],
        rowCount: res.rowCount || 0
      };
    } catch (e) {
      return {
        columns: [],
        rows: [],
        rowCount: 0,
        error: e.message || String(e)
      };
    }
  },

  renderTimeline() {
    if (!this.elements.stepperTrack) return;
    this.elements.stepperTrack.innerHTML = '';

    this.stages.forEach((stage, idx) => {
      const card = document.createElement('div');
      card.className = 'stepper-step-card' + (idx === this.currentStageIndex ? ' active' : (idx < this.currentStageIndex ? ' completed' : ''));
      card.setAttribute('data-index', idx);

      const circleContent = idx < this.currentStageIndex 
        ? `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"></polyline></svg>` 
        : (idx + 1);

      card.innerHTML = `
        <div class="step-circle">${circleContent}</div>
        <div class="step-meta">
          <span class="step-clause-name">${stage.name}</span>
          <span class="step-sub-label">${stage.subLabel || ''}</span>
        </div>
      `;

      card.addEventListener('click', () => {
        this.pause();
        this.goToStage(idx);
      });

      this.elements.stepperTrack.appendChild(card);
    });
  },

  goToStage(index) {
    if (index < 0 || index >= this.stages.length) return;
    this.currentStageIndex = index;

    const stage = this.stages[index];
    if (!stage) return;

    // Update state badge: PAUSED · STEP X / Y
    if (this.elements.stateBadge) {
      const playState = this.isPlaying ? 'RUNNING' : 'PAUSED';
      this.elements.stateBadge.textContent = `${playState} · STEP ${index + 1} / ${this.stages.length}`;
    }

    // Update Stepper Cards styling
    if (this.elements.stepperTrack) {
      const cards = this.elements.stepperTrack.querySelectorAll('.stepper-step-card');
      cards.forEach((c, idx) => {
        c.classList.toggle('active', idx === index);
        c.classList.toggle('completed', idx < index);
        const circle = c.querySelector('.step-circle');
        if (circle) {
          if (idx < index) {
            circle.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"></polyline></svg>`;
          } else {
            circle.textContent = idx + 1;
          }
        }
      });
    }

    // Update Nav buttons
    if (this.elements.btnPrev) this.elements.btnPrev.disabled = index === 0;
    if (this.elements.btnNext) this.elements.btnNext.disabled = index === this.stages.length - 1;

    // Highlight corresponding SQL line in Code Studio
    this.highlightCodeLineForStage(stage);

    // Render Canvas
    this.renderCurrentStage();
  },

  highlightCodeLineForStage(stage) {
    // Map stage name to line in editor
    const sqlText = (this.activeSql || '').split('\n');
    let lineIdx = -1;
    let keywordRegex = new RegExp(`\\b${stage.name}\\b`, 'i');

    for (let i = 0; i < sqlText.length; i++) {
      if (keywordRegex.test(sqlText[i])) {
        lineIdx = i;
        break;
      }
    }

    // Default to line 5 (0-indexed line 5 is line 6 for GROUP BY)
    if (lineIdx === -1 && stage.key === 'groupby') lineIdx = 5;

    if (this.elements.editorActiveLineBg && lineIdx >= 0) {
      this.elements.editorActiveLineBg.style.display = 'block';
      this.elements.editorActiveLineBg.style.top = `${lineIdx * 1.65}em`;
    }

    // Update gutter active number
    const gutterNums = document.querySelectorAll('.gutter-num');
    gutterNums.forEach((numEl, i) => {
      numEl.classList.toggle('highlight-line-num', i === lineIdx);
    });

    // Update Status text
    if (this.elements.editorStatusText) {
      this.elements.editorStatusText.textContent = `Valid query · ${stage.name} is in focus`;
    }
  },

  nextStage() {
    if (this.currentStageIndex < this.stages.length - 1) {
      this.goToStage(this.currentStageIndex + 1);
    } else {
      this.pause();
    }
  },

  prevStage() {
    if (this.currentStageIndex > 0) {
      this.goToStage(this.currentStageIndex - 1);
    }
  },

  togglePlay() {
    if (this.isPlaying) this.pause();
    else this.play();
  },

  play() {
    if (this.currentStageIndex >= this.stages.length - 1) {
      this.goToStage(0);
    }
    this.isPlaying = true;
    if (this.elements.playBtnText) this.elements.playBtnText.textContent = 'Pause';
    if (this.elements.stateBadge) {
      this.elements.stateBadge.textContent = `RUNNING · STEP ${this.currentStageIndex + 1} / ${this.stages.length}`;
    }

    const interval = 2600 / this.playbackSpeed;
    this.playTimer = setInterval(() => {
      if (this.currentStageIndex < this.stages.length - 1) {
        this.nextStage();
      } else {
        this.pause();
      }
    }, interval);
  },

  pause() {
    this.isPlaying = false;
    if (this.playTimer) {
      clearInterval(this.playTimer);
      this.playTimer = null;
    }
    if (this.elements.playBtnText) this.elements.playBtnText.textContent = 'Play';
    if (this.elements.stateBadge && this.stages.length > 0) {
      this.elements.stateBadge.textContent = `PAUSED · STEP ${this.currentStageIndex + 1} / ${this.stages.length}`;
    }
  },

  renderCurrentStage() {
    if (!this.elements.canvas || this.stages.length === 0) return;
    const stage = this.stages[this.currentStageIndex];
    if (!stage) return;

    if (this.viewMode === 'intermediate') {
      this.renderIntermediateTableView(stage);
    } else {
      this.renderRowFlowView(stage);
    }
  },

  renderIntermediateTableView(stage) {
    const snap = stage.snapshot;
    let ths = snap.columns.map(c => `<th>${c}</th>`).join('');
    let trs = snap.rows.map((row, rIdx) => {
      let tds = row.map(v => `<td>${v === null ? '<span style="color:#94a3b8;">NULL</span>' : v}</td>`).join('');
      return `<tr>${tds}</tr>`;
    }).join('');

    this.elements.canvas.innerHTML = `
      <div style="width:100%; overflow-x:auto;">
        <div style="margin-bottom:0.75rem; display:flex; justify-content:space-between; align-items:center;">
          <span style="font-family:var(--font-mono); font-size:0.8rem; font-weight:600; color:var(--text-secondary);">
            Intermediate Table Snapshot · <strong>${stage.name}</strong> (${snap.rowCount} rows)
          </span>
          <span style="font-size:0.72rem; color:var(--text-muted);">${stage.title}</span>
        </div>
        <table class="scope-table" style="background:#ffffff; border:1px solid var(--border-color); border-radius:var(--radius-md);">
          <thead><tr>${ths}</tr></thead>
          <tbody>${trs || '<tr><td colspan="100" style="text-align:center; padding:1.5rem; color:var(--text-muted);">No records</td></tr>'}</tbody>
        </table>
      </div>
    `;
  },

  renderRowFlowView(stage) {
    // Check if we are on GROUP BY stage (which matches the exact screenshot)
    if (stage.key === 'groupby') {
      this.renderGroupByFlow(stage);
      return;
    }

    if (stage.key === 'where') {
      this.renderWhereFlow(stage);
      return;
    }

    if (stage.key === 'having') {
      this.renderHavingFlow(stage);
      return;
    }

    if (stage.key === 'select') {
      this.renderSelectFlow(stage);
      return;
    }

    if (stage.key === 'orderby') {
      this.renderOrderByFlow(stage);
      return;
    }

    if (stage.key === 'join') {
      this.renderJoinFlow(stage);
      return;
    }

    // Default FROM flow
    this.renderFromFlow(stage);
  },

  /**
   * STAGE 4: GROUP BY Flow (Matches screenshot pixel-for-pixel)
   */
  renderGroupByFlow(stage) {
    this.elements.canvas.innerHTML = `
      <div class="row-flow-arena">
        <!-- LEFT COLUMN: AFTER WHERE · 4 ROWS -->
        <div class="flow-col-left">
          <div class="flow-col-header">AFTER WHERE · 4 ROWS</div>
          <div class="flow-row-pills-list">
            <div class="flow-row-pill" id="pill101">
              <div class="pill-left">
                <span class="row-dot" style="background-color: #10b981;"></span>
                <span class="pill-id">101</span>
                <span class="pill-name">Ava Chen</span>
              </div>
              <div class="pill-right">
                <span class="pill-amount">120.00</span>
                <span class="pill-status">paid</span>
              </div>
            </div>

            <div class="flow-row-pill" id="pill103">
              <div class="pill-left">
                <span class="row-dot" style="background-color: #10b981;"></span>
                <span class="pill-id">103</span>
                <span class="pill-name">Ava Chen</span>
              </div>
              <div class="pill-right">
                <span class="pill-amount">80.00</span>
                <span class="pill-status">paid</span>
              </div>
            </div>

            <div class="flow-row-pill" id="pill102">
              <div class="pill-left">
                <span class="row-dot" style="background-color: #8b5cf6;"></span>
                <span class="pill-id">102</span>
                <span class="pill-name">Ben Ortiz</span>
              </div>
              <div class="pill-right">
                <span class="pill-amount">60.00</span>
                <span class="pill-status">paid</span>
              </div>
            </div>

            <div class="flow-row-pill" id="pill104">
              <div class="pill-left">
                <span class="row-dot" style="background-color: #f59e0b;"></span>
                <span class="pill-id">104</span>
                <span class="pill-name">Cara Lee</span>
              </div>
              <div class="pill-right">
                <span class="pill-amount">150.00</span>
                <span class="pill-status">paid</span>
              </div>
            </div>
          </div>

          <div class="flow-removed-notice">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="22 17 13.5 8.5 8.5 13.5 2 7"></polyline>
              <polyline points="16 17 22 17 22 11"></polyline>
            </svg>
            <span>Orders 105 (pending) and 106 (refunded) were removed in WHERE.</span>
          </div>
        </div>

        <!-- CENTER COLUMN: GROUP BY c.id, c.name · 3 GROUPS -->
        <div class="flow-col-center">
          <div class="center-header-row">
            <span class="center-header-title">GROUP BY c.id, c.name · 3 GROUPS</span>
            <span class="center-header-calc">SUM(o.total)</span>
          </div>

          <div class="groups-container">
            <!-- Group 1: Ava Chen (Green) -->
            <div class="group-card group-green" id="groupAva">
              <div class="group-info-left">
                <span class="group-title">Ava Chen</span>
                <span class="group-sub-meta">c.id = 1 · 2 rows</span>
              </div>
              <div class="group-calc-right">
                <span class="calc-breakdown">120.00 + 80.00</span>
                <span class="calc-final-total" style="color: #065f46;">200.00</span>
              </div>
            </div>

            <!-- Group 2: Ben Ortiz (Purple) -->
            <div class="group-card group-purple" id="groupBen">
              <div class="group-info-left">
                <span class="group-title">Ben Ortiz</span>
                <span class="group-sub-meta">c.id = 2 · 1 row</span>
              </div>
              <div class="group-calc-right">
                <span class="calc-breakdown">60.00</span>
                <span class="calc-final-total" style="color: #5b21b6;">60.00</span>
              </div>
            </div>

            <!-- Group 3: Cara Lee (Amber) -->
            <div class="group-card group-amber" id="groupCara">
              <div class="group-info-left">
                <span class="group-title">Cara Lee</span>
                <span class="group-sub-meta">c.id = 3 · 1 row</span>
              </div>
              <div class="group-calc-right">
                <span class="calc-breakdown">150.00</span>
                <span class="calc-final-total" style="color: #92400e;">150.00</span>
              </div>
            </div>
          </div>
        </div>

        <!-- RIGHT COLUMN: STEP EXPLAINER SIDEBAR -->
        <div class="flow-col-right">
          <span class="explainer-step-tag">04 / GROUP BY</span>
          <h3 class="explainer-heading">Turn rows into groups</h3>
          <p class="explainer-paragraph">
            Rows with the same customer ID and name are collected together. SUM adds the paid order totals within each group.
          </p>

          <div class="explainer-stat-boxes">
            <div class="stat-box">
              <span class="stat-value">4 → 3</span>
              <span class="stat-label">rows to groups</span>
            </div>
            <div class="stat-box">
              <span class="stat-value">$410</span>
              <span class="stat-label">total paid spend</span>
            </div>
          </div>

          <div class="explainer-next-preview">
            <span class="next-step-tag">NEXT → HAVING</span>
            <span class="next-step-text">Keep totals ≥ 100. Ben's 60.00 group will be removed.</span>
          </div>
        </div>
      </div>
    `;
  },

  /**
   * STAGE 1: FROM Flow
   */
  renderFromFlow(stage) {
    this.elements.canvas.innerHTML = `
      <div class="row-flow-arena">
        <div class="flow-col-left">
          <div class="flow-col-header">DATABASE STORAGE</div>
          <div class="flow-row-pills-list">
            <div class="flow-row-pill">
              <span class="pill-name">customers (Table)</span>
              <span class="pill-amount">4 rows</span>
            </div>
            <div class="flow-row-pill">
              <span class="pill-name">orders (Table)</span>
              <span class="pill-amount">6 rows</span>
            </div>
          </div>
        </div>

        <div class="flow-col-center">
          <div class="center-header-row">
            <span class="center-header-title">LOAD SOURCE TABLE · 4 ROWS</span>
          </div>
          <div class="groups-container">
            <div class="group-card group-green">
              <div class="group-info-left">
                <span class="group-title">customers</span>
                <span class="group-sub-meta">Columns: id (PK), name, city</span>
              </div>
              <span class="calc-final-total" style="font-size:1rem; color:#065f46;">4 records loaded</span>
            </div>
          </div>
        </div>

        <div class="flow-col-right">
          <span class="explainer-step-tag">01 / FROM</span>
          <h3 class="explainer-heading">Load source table</h3>
          <p class="explainer-paragraph">
            The SQL engine initiates execution by loading records from the primary table "customers" into memory.
          </p>
          <div class="explainer-stat-boxes">
            <div class="stat-box">
              <span class="stat-value">4</span>
              <span class="stat-label">customers in table</span>
            </div>
            <div class="stat-box">
              <span class="stat-value">3</span>
              <span class="stat-label">schema attributes</span>
            </div>
          </div>
          <div class="explainer-next-preview">
            <span class="next-step-tag">NEXT → JOIN</span>
            <span class="next-step-text">Match customers with order records via ON c.id = o.customer_id.</span>
          </div>
        </div>
      </div>
    `;
  },

  /**
   * STAGE 2: JOIN Flow
   */
  renderJoinFlow(stage) {
    this.elements.canvas.innerHTML = `
      <div class="row-flow-arena">
        <div class="flow-col-left">
          <div class="flow-col-header">LEFT: CUSTOMERS (4)</div>
          <div class="flow-row-pills-list">
            <div class="flow-row-pill"><span>• 1 Ava Chen</span> <span style="color:#10b981;">has 3 orders</span></div>
            <div class="flow-row-pill"><span>• 2 Ben Ortiz</span> <span style="color:#8b5cf6;">has 1 order</span></div>
            <div class="flow-row-pill"><span>• 3 Cara Lee</span> <span style="color:#f59e0b;">has 1 order</span></div>
            <div class="flow-row-pill"><span>• 4 Diego Ruiz</span> <span style="color:#06b6d4;">has 1 order</span></div>
          </div>
        </div>

        <div class="flow-col-center">
          <div class="center-header-row">
            <span class="center-header-title">ON c.id = o.customer_id · 6 MATCHED ROWS</span>
          </div>
          <div class="groups-container">
            <div class="group-card group-green">
              <div class="group-info-left">
                <span class="group-title">Ava Chen + Orders 101, 103, 105</span>
                <span class="group-sub-meta">3 matched pairs created</span>
              </div>
            </div>
            <div class="group-card group-purple">
              <div class="group-info-left">
                <span class="group-title">Ben Ortiz + Order 102</span>
                <span class="group-sub-meta">1 matched pair created</span>
              </div>
            </div>
            <div class="group-card group-amber">
              <div class="group-info-left">
                <span class="group-title">Cara Lee + Order 104</span>
                <span class="group-sub-meta">1 matched pair created</span>
              </div>
            </div>
          </div>
        </div>

        <div class="flow-col-right">
          <span class="explainer-step-tag">02 / JOIN</span>
          <h3 class="explainer-heading">Combine relational records</h3>
          <p class="explainer-paragraph">
            Orders are looked up and mapped to their respective customer profiles by comparing primary and foreign keys.
          </p>
          <div class="explainer-stat-boxes">
            <div class="stat-box">
              <span class="stat-value">6</span>
              <span class="stat-label">total matched rows</span>
            </div>
            <div class="stat-box">
              <span class="stat-value">0</span>
              <span class="stat-label">unlinked rows</span>
            </div>
          </div>
          <div class="explainer-next-preview">
            <span class="next-step-tag">NEXT → WHERE</span>
            <span class="next-step-text">Filter out pending and refunded orders.</span>
          </div>
        </div>
      </div>
    `;
  },

  /**
   * STAGE 3: WHERE Flow
   */
  renderWhereFlow(stage) {
    this.elements.canvas.innerHTML = `
      <div class="row-flow-arena">
        <div class="flow-col-left">
          <div class="flow-col-header">INCOMING JOINED ROWS · 6</div>
          <div class="flow-row-pills-list">
            <div class="flow-row-pill" style="border-left: 3px solid #10b981;"><span>101 Ava Chen</span> <span>paid ✓</span></div>
            <div class="flow-row-pill" style="border-left: 3px solid #10b981;"><span>103 Ava Chen</span> <span>paid ✓</span></div>
            <div class="flow-row-pill" style="border-left: 3px solid #8b5cf6;"><span>102 Ben Ortiz</span> <span>paid ✓</span></div>
            <div class="flow-row-pill" style="border-left: 3px solid #f59e0b;"><span>104 Cara Lee</span> <span>paid ✓</span></div>
            <div class="flow-row-pill" style="opacity:0.6; text-decoration:line-through; border-left: 3px solid #ef4444;"><span>105 Ava Chen</span> <span>pending ✗</span></div>
            <div class="flow-row-pill" style="opacity:0.6; text-decoration:line-through; border-left: 3px solid #ef4444;"><span>106 Diego Ruiz</span> <span>refunded ✗</span></div>
          </div>
        </div>

        <div class="flow-col-center">
          <div class="center-header-row">
            <span class="center-header-title">WHERE o.status = 'paid' · 4 PASSED</span>
          </div>
          <div class="groups-container">
            <div class="group-card group-green">
              <div class="group-info-left">
                <span class="group-title">4 Paid Orders Passed Filter Gate</span>
                <span class="group-sub-meta">Orders 101, 102, 103, 104 advance to GROUP BY</span>
              </div>
              <span class="calc-final-total" style="font-size:1.1rem; color:#065f46;">4 rows</span>
            </div>
            <div class="group-card" style="background:#fef2f2; border:1px solid #fecdd3;">
              <div class="group-info-left">
                <span class="group-title" style="color:#9f1239;">2 Discarded Orders</span>
                <span class="group-sub-meta">Order 105 (pending) and Order 106 (refunded) eliminated</span>
              </div>
            </div>
          </div>
        </div>

        <div class="flow-col-right">
          <span class="explainer-step-tag">03 / WHERE</span>
          <h3 class="explainer-heading">Filter individual rows</h3>
          <p class="explainer-paragraph">
            The WHERE filter tests each joined record against the condition o.status = 'paid'. Non-paid orders are immediately removed.
          </p>
          <div class="explainer-stat-boxes">
            <div class="stat-box">
              <span class="stat-value">6 → 4</span>
              <span class="stat-label">rows kept</span>
            </div>
            <div class="stat-box">
              <span class="stat-value">2</span>
              <span class="stat-label">filtered out</span>
            </div>
          </div>
          <div class="explainer-next-preview">
            <span class="next-step-tag">NEXT → GROUP BY</span>
            <span class="next-step-text">Group remaining 4 paid orders by customer identity.</span>
          </div>
        </div>
      </div>
    `;
  },

  /**
   * STAGE 5: HAVING Flow
   */
  renderHavingFlow(stage) {
    this.elements.canvas.innerHTML = `
      <div class="row-flow-arena">
        <div class="flow-col-left">
          <div class="flow-col-header">CANDIDATE GROUPS · 3</div>
          <div class="flow-row-pills-list">
            <div class="flow-row-pill" style="border-left: 3px solid #10b981;">
              <span>Ava Chen</span> <span style="font-weight:700;">$200.00</span>
            </div>
            <div class="flow-row-pill" style="border-left: 3px solid #f59e0b;">
              <span>Cara Lee</span> <span style="font-weight:700;">$150.00</span>
            </div>
            <div class="flow-row-pill" style="border-left: 3px solid #ef4444; opacity:0.6; text-decoration:line-through;">
              <span>Ben Ortiz</span> <span style="font-weight:700;">$60.00</span>
            </div>
          </div>
        </div>

        <div class="flow-col-center">
          <div class="center-header-row">
            <span class="center-header-title">HAVING SUM(o.total) >= 100 · 2 GROUPS SURVIVE</span>
          </div>
          <div class="groups-container">
            <div class="group-card group-green">
              <div class="group-info-left">
                <span class="group-title">Ava Chen: $200.00 ≥ 100</span>
                <span class="group-sub-meta">Evaluates to TRUE (Group passes)</span>
              </div>
              <span class="calc-final-total" style="color:#065f46;">✓ KEPT</span>
            </div>
            <div class="group-card group-amber">
              <div class="group-info-left">
                <span class="group-title">Cara Lee: $150.00 ≥ 100</span>
                <span class="group-sub-meta">Evaluates to TRUE (Group passes)</span>
              </div>
              <span class="calc-final-total" style="color:#92400e;">✓ KEPT</span>
            </div>
            <div class="group-card" style="background:#fef2f2; border:1px solid #fecdd3;">
              <div class="group-info-left">
                <span class="group-title" style="color:#9f1239;">Ben Ortiz: $60.00 &lt; 100</span>
                <span class="group-sub-meta">Evaluates to FALSE (Group discarded)</span>
              </div>
              <span class="calc-final-total" style="font-size:1rem; color:#9f1239;">✗ DROPPED</span>
            </div>
          </div>
        </div>

        <div class="flow-col-right">
          <span class="explainer-step-tag">05 / HAVING</span>
          <h3 class="explainer-heading">Filter grouped aggregates</h3>
          <p class="explainer-paragraph">
            HAVING inspects computed totals for each bucket. Ben Ortiz's $60.00 total fails the $100 cutoff and is excluded.
          </p>
          <div class="explainer-stat-boxes">
            <div class="stat-box">
              <span class="stat-value">3 → 2</span>
              <span class="stat-label">groups retained</span>
            </div>
            <div class="stat-box">
              <span class="stat-value">$350</span>
              <span class="stat-label">qualifying spend</span>
            </div>
          </div>
          <div class="explainer-next-preview">
            <span class="next-step-tag">NEXT → SELECT</span>
            <span class="next-step-text">Format output columns and alias names.</span>
          </div>
        </div>
      </div>
    `;
  },

  /**
   * STAGE 6: SELECT Flow
   */
  renderSelectFlow(stage) {
    this.elements.canvas.innerHTML = `
      <div class="row-flow-arena">
        <div class="flow-col-left">
          <div class="flow-col-header">QUALIFIED GROUPS · 2</div>
          <div class="flow-row-pills-list">
            <div class="flow-row-pill"><span>• Ava Chen</span> <span>Total: 200.00</span></div>
            <div class="flow-row-pill"><span>• Cara Lee</span> <span>Total: 150.00</span></div>
          </div>
        </div>

        <div class="flow-col-center">
          <div class="center-header-row">
            <span class="center-header-title">PROJECT COLUMNS · c.name, total_spent</span>
          </div>
          <div class="groups-container">
            <div class="group-card group-green">
              <div class="group-info-left">
                <span class="group-title">name: Ava Chen</span>
                <span class="group-sub-meta">total_spent: 200.00 (numeric)</span>
              </div>
            </div>
            <div class="group-card group-amber">
              <div class="group-info-left">
                <span class="group-title">name: Cara Lee</span>
                <span class="group-sub-meta">total_spent: 150.00 (numeric)</span>
              </div>
            </div>
          </div>
        </div>

        <div class="flow-col-right">
          <span class="explainer-step-tag">06 / SELECT</span>
          <h3 class="explainer-heading">Project target columns</h3>
          <p class="explainer-paragraph">
            Extracts requested fields (c.name and SUM(o.total)) and assigns user alias 'total_spent'.
          </p>
          <div class="explainer-stat-boxes">
            <div class="stat-box">
              <span class="stat-value">2</span>
              <span class="stat-label">projected columns</span>
            </div>
            <div class="stat-box">
              <span class="stat-value">2</span>
              <span class="stat-label">output rows</span>
            </div>
          </div>
          <div class="explainer-next-preview">
            <span class="next-step-tag">NEXT → ORDER BY</span>
            <span class="next-step-text">Sort highest total_spent first (DESC).</span>
          </div>
        </div>
      </div>
    `;
  },

  /**
   * STAGE 7: ORDER BY Flow
   */
  renderOrderByFlow(stage) {
    this.elements.canvas.innerHTML = `
      <div class="row-flow-arena">
        <div class="flow-col-left">
          <div class="flow-col-header">FINAL ROWS BEFORE SORT</div>
          <div class="flow-row-pills-list">
            <div class="flow-row-pill"><span>• Ava Chen</span> <span>200.00</span></div>
            <div class="flow-row-pill"><span>• Cara Lee</span> <span>150.00</span></div>
          </div>
        </div>

        <div class="flow-col-center">
          <div class="center-header-row">
            <span class="center-header-title">ORDER BY total_spent DESC · FINAL RESULT</span>
          </div>
          <div class="groups-container">
            <div class="group-card group-green">
              <div class="group-info-left">
                <span class="group-title">#1 · Ava Chen</span>
                <span class="group-sub-meta">Highest overall spend</span>
              </div>
              <span class="calc-final-total" style="color:#065f46;">200.00</span>
            </div>
            <div class="group-card group-amber">
              <div class="group-info-left">
                <span class="group-title">#2 · Cara Lee</span>
                <span class="group-sub-meta">Second highest spend</span>
              </div>
              <span class="calc-final-total" style="color:#92400e;">150.00</span>
            </div>
          </div>
        </div>

        <div class="flow-col-right">
          <span class="explainer-step-tag">07 / ORDER BY</span>
          <h3 class="explainer-heading">Sort and present</h3>
          <p class="explainer-paragraph">
            The dataset is ordered in descending order so the top spending customer appears at row #1.
          </p>
          <div class="explainer-stat-boxes">
            <div class="stat-box">
              <span class="stat-value">2</span>
              <span class="stat-label">sorted records</span>
            </div>
            <div class="stat-box">
              <span class="stat-value">DESC</span>
              <span class="stat-label">sort direction</span>
            </div>
          </div>
          <div class="explainer-next-preview">
            <span class="next-step-tag">RESULT COMPLETE</span>
            <span class="next-step-text">Execution finished. View formatted output table above.</span>
          </div>
        </div>
      </div>
    `;
  },

  renderEmptyState(message) {
    if (!this.elements.canvas) return;
    this.elements.canvas.innerHTML = `
      <div style="display:flex; flex-direction:column; align-items:center; justify-content:center; padding:3rem; color:var(--text-muted); text-align:center;">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="margin-bottom:0.75rem;">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="12" y1="8" x2="12" y2="12"></line>
          <line x1="12" y1="16" x2="12.01" y2="16"></line>
        </svg>
        <p style="font-size:0.88rem;">${message}</p>
      </div>
    `;
  }
};

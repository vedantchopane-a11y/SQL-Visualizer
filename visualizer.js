// visualizer.js - Step-by-Step SQL Execution Pipeline & Operation Visualizer

const Visualizer = {
  activeSql: '',
  stages: [],
  currentStageIndex: 0,
  isPlaying: false,
  playTimer: null,
  joinViewMode: 'matcher', // 'matcher', 'venn', or 'table'

  // DOM Elements cache
  elements: {
    card: null,
    badge: null,
    timeline: null,
    stepTag: null,
    stepTitle: null,
    stepDesc: null,
    arena: null,
    btnReset: null,
    btnPrev: null,
    btnPlay: null,
    btnNext: null
  },

  /**
   * Initializes the Visualizer DOM hooks and event listeners
   */
  init() {
    this.elements.card = document.getElementById('visualizerCard');
    this.elements.badge = document.getElementById('currentStageBadge');
    this.elements.timeline = document.getElementById('pipelineTimeline');
    this.elements.stepTag = document.getElementById('stageStepTag');
    this.elements.stepTitle = document.getElementById('stageStepTitle');
    this.elements.stepDesc = document.getElementById('stageStepDesc');
    this.elements.arena = document.getElementById('visualArena');
    this.elements.btnReset = document.getElementById('stepResetBtn');
    this.elements.btnPrev = document.getElementById('stepPrevBtn');
    this.elements.btnPlay = document.getElementById('stepPlayBtn');
    this.elements.btnNext = document.getElementById('stepNextBtn');

    if (this.elements.btnReset) {
      this.elements.btnReset.addEventListener('click', () => {
        this.pause();
        this.goToStage(0);
      });
    }

    if (this.elements.btnPrev) {
      this.elements.btnPrev.addEventListener('click', () => {
        this.pause();
        this.prevStage();
      });
    }

    if (this.elements.btnPlay) {
      this.elements.btnPlay.addEventListener('click', () => {
        this.togglePlay();
      });
    }

    if (this.elements.btnNext) {
      this.elements.btnNext.addEventListener('click', () => {
        this.pause();
        this.nextStage();
      });
    }
  },

  /**
   * Loads a new SQL statement and parses it into execution stages
   */
  loadQuery(sql) {
    this.pause();
    this.activeSql = (sql || '').trim();
    if (!this.elements.arena) return;

    if (!this.activeSql) {
      this.renderEmptyState('Enter or select an SQL statement to view the execution pipeline.');
      return;
    }

    // Only visualize SELECT queries for pipeline flow
    if (!/^\s*SELECT\b/i.test(this.activeSql)) {
      this.renderEmptyState('Visual execution pipeline is available for SELECT queries (Data Retrieval).');
      return;
    }

    try {
      this.stages = this.decomposeQuery(this.activeSql);
      this.renderTimeline();
      this.goToStage(0);
    } catch (err) {
      console.warn('Visualizer parse error:', err);
      this.renderEmptyState('Could not decompose query for visual pipeline.');
    }
  },

  /**
   * Decomposes a SELECT query into logical stages following SQL order of operations:
   * FROM/JOIN -> WHERE -> GROUP BY -> HAVING -> SELECT -> ORDER BY / LIMIT
   */
  decomposeQuery(sql) {
    const stages = [];
    const cleanSql = sql.replace(/\/\*[\s\S]*?\*\/|--.*$/gm, '').trim();

    // 1. Extract FROM and JOIN
    const fromRegex = /\bFROM\s+([a-zA-Z0-9_]+)(?:\s+(?:AS\s+)?([a-zA-Z0-9_]+))?/i;
    const fromMatch = cleanSql.match(fromRegex);
    const fromTable = fromMatch ? fromMatch[1] : '';
    let fromAlias = (fromMatch && fromMatch[2]) ? fromMatch[2] : '';
    if (/^(JOIN|LEFT|RIGHT|INNER|CROSS|FULL|NATURAL|WHERE|GROUP|ORDER|LIMIT|ON|USING)$/i.test(fromAlias)) {
      fromAlias = '';
    }

    const joinRegex = /\b(?:(INNER|LEFT(?:\s+OUTER)?|RIGHT(?:\s+OUTER)?|FULL(?:\s+OUTER)?|CROSS)\s+)?JOIN\s+([a-zA-Z0-9_]+)(?:\s+(?:AS\s+)?([a-zA-Z0-9_]+))?(?:\s+(?:ON\s+([\s\S]+?)|USING\s*\(\s*([a-zA-Z0-9_]+)\s*\)))?(?=\bWHERE\b|\bGROUP\s+BY\b|\bORDER\s+BY\b|\bLIMIT\b|;|$)/i;
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
        rawType: rawType,
        rightTable: joinMatch[2],
        alias: rightAlias,
        onCondition
      };
    }

    // 2. Extract WHERE
    const whereMatch = cleanSql.match(/\bWHERE\s+([\s\S]+?)(?=\bGROUP\s+BY\b|\bORDER\s+BY\b|\bLIMIT\b|;|$)/i);
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

    // 7. Extract LIMIT
    const limitMatch = cleanSql.match(/\bLIMIT\s+(\d+)/i);
    const limitCount = limitMatch ? parseInt(limitMatch[1], 10) : null;

    // --- BUILD LOGICAL STAGES ---

    // Stage 1: FROM & JOIN
    const fromTableClause = fromTable + (fromAlias ? ` AS ${fromAlias}` : '');
    let fromJoinQuery = `SELECT * FROM ${fromTableClause}`;
    let fromTitle = `FROM ${fromTable}`;
    let fromDesc = `Load source records from table "${fromTable}".`;

    if (joinInfo) {
      const rightClause = joinInfo.rightTable + (joinInfo.alias ? ` AS ${joinInfo.alias}` : '');
      const onPart = joinInfo.onCondition ? ` ON ${joinInfo.onCondition}` : '';
      fromJoinQuery += ` ${joinInfo.rawType} JOIN ${rightClause}${onPart}`;
      fromTitle = `${joinInfo.type} JOIN ${joinInfo.rightTable}`;
      fromDesc = `Combine "${fromTable}" with "${joinInfo.rightTable}" using ${joinInfo.type} JOIN${joinInfo.onCondition ? ' matching rows on: ' + joinInfo.onCondition : ''}.`;
    }

    const fromSnapshot = this.safeExec(fromJoinQuery);

    stages.push({
      key: 'from',
      name: joinInfo ? `${joinInfo.type} JOIN` : 'FROM',
      title: fromTitle,
      description: fromDesc,
      hasJoin: !!joinInfo,
      joinInfo,
      fromTable,
      fromAlias,
      snapshot: fromSnapshot
    });

    // Stage 2: WHERE Filter Gate (if present)
    let whereQuery = fromJoinQuery;
    if (whereCondition) {
      whereQuery += ` WHERE ${whereCondition}`;
      const whereSnapshot = this.safeExec(whereQuery);

      stages.push({
        key: 'where',
        name: 'WHERE',
        title: `Filter rows: WHERE ${whereCondition}`,
        description: `Evaluate condition for each row. Rows passing condition proceed to next step.`,
        condition: whereCondition,
        priorSnapshot: fromSnapshot,
        snapshot: whereSnapshot
      });
    }

    // Stage 3: GROUP BY (if present)
    let currentBaseQuery = whereQuery;
    if (groupByCols) {
      let groupQuery = `SELECT ${groupByCols}, COUNT(*) AS _group_count FROM (${currentBaseQuery}) GROUP BY ${groupByCols}`;
      const groupSnapshot = this.safeExec(groupQuery);

      stages.push({
        key: 'groupby',
        name: 'GROUP BY',
        title: `GROUP BY ${groupByCols}`,
        description: `Cluster remaining rows into buckets based on "${groupByCols}" and compute aggregate summary stats.`,
        groupByCols,
        havingCondition,
        priorSnapshot: stages[stages.length - 1].snapshot,
        snapshot: groupSnapshot
      });

      currentBaseQuery = `${currentBaseQuery} GROUP BY ${groupByCols}`;
    }

    // Stage 4: HAVING (if present)
    if (havingCondition) {
      currentBaseQuery += ` HAVING ${havingCondition}`;
      const havingSnapshot = this.safeExec(`SELECT ${groupByCols} FROM (${currentBaseQuery})`);

      stages.push({
        key: 'having',
        name: 'HAVING',
        title: `Filter groups: HAVING ${havingCondition}`,
        description: `Discard grouped buckets that do not satisfy: ${havingCondition}.`,
        havingCondition,
        snapshot: havingSnapshot
      });
    }

    // Stage 5: SELECT Projection
    let selectQuery = cleanSql;
    // Strip ORDER BY and LIMIT for this stage
    selectQuery = selectQuery.replace(/\s+ORDER\s+BY\s+[\s\S]+/i, '').replace(/\s+LIMIT\s+\d+/i, '');
    const selectSnapshot = this.safeExec(selectQuery);

    stages.push({
      key: 'select',
      name: 'SELECT',
      title: `Project columns: ${selectCols}`,
      description: `Extract and format requested output columns and evaluate computed expressions.`,
      selectCols,
      snapshot: selectSnapshot
    });

    // Stage 6: ORDER BY / LIMIT (if present)
    if (orderByCols || limitCount) {
      const finalSnapshot = this.safeExec(cleanSql);
      let orderTitle = orderByCols ? `ORDER BY ${orderByCols}` : '';
      if (limitCount) orderTitle += `${orderTitle ? ' ' : ''}LIMIT ${limitCount}`;

      stages.push({
        key: 'orderby',
        name: orderByCols ? 'ORDER BY' : 'LIMIT',
        title: orderTitle,
        description: `Sort rows by requested criteria and restrict output row count.`,
        orderByCols,
        limitCount,
        snapshot: finalSnapshot
      });
    }

    return stages;
  },

  /**
   * Safe execution helper that runs a snapshot query against SQLite WASM
   */
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

  /**
   * Renders the horizontal pipeline timeline
   */
  renderTimeline() {
    if (!this.elements.timeline) return;
    this.elements.timeline.innerHTML = '';

    this.stages.forEach((stage, idx) => {
      const node = document.createElement('button');
      node.className = 'timeline-step-btn' + (idx === this.currentStageIndex ? ' active' : '');
      node.setAttribute('data-index', idx);

      node.innerHTML = `
        <span class="timeline-step-num">${idx + 1}</span>
        <span class="timeline-step-name">${this.escapeHtml(stage.name)}</span>
      `;

      node.addEventListener('click', () => {
        this.pause();
        this.goToStage(idx);
      });

      this.elements.timeline.appendChild(node);

      // Insert arrow separator between nodes
      if (idx < this.stages.length - 1) {
        const arrow = document.createElement('div');
        arrow.className = 'timeline-connector';
        arrow.innerHTML = `
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="9 18 15 12 9 6"></polyline>
          </svg>
        `;
        this.elements.timeline.appendChild(arrow);
      }
    });
  },

  /**
   * Navigates to a specific stage index
   */
  goToStage(index) {
    if (index < 0 || index >= this.stages.length) return;
    this.currentStageIndex = index;

    const stage = this.stages[index];
    if (!stage) return;

    // Update active badge & text
    if (this.elements.badge) this.elements.badge.textContent = stage.name;
    if (this.elements.stepTag) this.elements.stepTag.textContent = `STAGE ${index + 1} OF ${this.stages.length}`;
    if (this.elements.stepTitle) this.elements.stepTitle.textContent = stage.title;
    if (this.elements.stepDesc) this.elements.stepDesc.textContent = stage.description;

    // Update timeline nodes styling
    if (this.elements.timeline) {
      const nodes = this.elements.timeline.querySelectorAll('.timeline-step-btn');
      nodes.forEach((n, idx) => {
        n.classList.toggle('active', idx === index);
        n.classList.toggle('completed', idx < index);
      });
    }

    // Update stepper button states
    if (this.elements.btnPrev) this.elements.btnPrev.disabled = index === 0;
    if (this.elements.btnNext) this.elements.btnNext.disabled = index === this.stages.length - 1;

    // Render stage animation arena
    this.renderStageArena(stage);
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
    if (this.isPlaying) {
      this.pause();
    } else {
      this.play();
    }
  },

  play() {
    if (this.currentStageIndex >= this.stages.length - 1) {
      this.goToStage(0);
    }
    this.isPlaying = true;
    if (this.elements.btnPlay) {
      this.elements.btnPlay.innerHTML = '⏸ Pause';
      this.elements.btnPlay.classList.add('is-playing');
    }

    this.playTimer = setInterval(() => {
      if (this.currentStageIndex < this.stages.length - 1) {
        this.nextStage();
      } else {
        this.pause();
      }
    }, 2800);
  },

  pause() {
    this.isPlaying = false;
    if (this.playTimer) {
      clearInterval(this.playTimer);
      this.playTimer = null;
    }
    if (this.elements.btnPlay) {
      this.elements.btnPlay.innerHTML = '▶ Play';
      this.elements.btnPlay.classList.remove('is-playing');
    }
  },

  /**
   * Master renderer for the visual arena based on stage type
   */
  renderStageArena(stage) {
    if (!this.elements.arena) return;
    this.elements.arena.innerHTML = '';

    // Clear any previous source table row highlights
    this.clearSourceHighlights();

    switch (stage.key) {
      case 'from':
        if (stage.hasJoin) {
          this.renderJoinStage(stage);
        } else {
          this.renderFromStage(stage);
        }
        break;

      case 'where':
        this.renderWhereStage(stage);
        break;

      case 'groupby':
        this.renderGroupByStage(stage);
        break;

      case 'having':
        this.renderHavingStage(stage);
        break;

      case 'select':
        this.renderSelectStage(stage);
        break;

      case 'orderby':
        this.renderOrderByStage(stage);
        break;

      default:
        this.renderGenericTableStage(stage);
    }
  },

  /**
   * STAGE: Basic FROM single table
   */
  renderFromStage(stage) {
    const snap = stage.snapshot;
    this.elements.arena.innerHTML = `
      <div class="stage-container from-stage">
        <div class="stage-meta-bar">
          <span class="meta-label">Loaded Table: <strong>${this.escapeHtml(stage.fromTable)}</strong></span>
          <span class="meta-pill">${snap.rowCount} records loaded into execution memory</span>
        </div>
        <div class="stage-table-wrapper">
          ${this.buildMiniTableHtml(snap.columns, snap.rows, 5)}
        </div>
      </div>
    `;
  },

  /**
   * STAGE: JOIN (Key Matching & Venn Modes)
   */
  renderJoinStage(stage) {
    const join = stage.joinInfo;
    const snap = stage.snapshot;

    // Fetch details for left and right tables
    const leftDetails = DB.getTableDetails(stage.fromTable);
    const rightDetails = DB.getTableDetails(join.rightTable);

    if (!leftDetails || !rightDetails) {
      this.renderGenericTableStage(stage);
      return;
    }

    // Determine matching keys from ON condition or USING
    const onCond = join.onCondition || '';
    const fromTable = stage.fromTable;
    const fromAlias = stage.fromAlias || '';
    const rightTable = join.rightTable;
    const rightAlias = join.alias || '';

    let leftCol = '';
    let rightCol = '';

    if (onCond) {
      const eqMatch = onCond.match(/([\w\.]+)\s*=\s*([\w\.]+)/);
      if (eqMatch) {
        const sideA = eqMatch[1].trim();
        const sideB = eqMatch[2].trim();

        const resolveSide = side => {
          if (side.includes('.')) {
            const parts = side.split('.');
            const tbl = parts[0].trim().toLowerCase();
            const col = parts[1].trim();
            if (tbl === fromTable.toLowerCase() || (fromAlias && tbl === fromAlias.toLowerCase())) {
              return { target: 'left', col };
            }
            if (tbl === rightTable.toLowerCase() || (rightAlias && tbl === rightAlias.toLowerCase())) {
              return { target: 'right', col };
            }
          } else {
            if (leftDetails.colNames.includes(side) && !rightDetails.colNames.includes(side)) {
              return { target: 'left', col: side };
            }
            if (rightDetails.colNames.includes(side) && !leftDetails.colNames.includes(side)) {
              return { target: 'right', col: side };
            }
          }
          return { target: null, col: side };
        };

        const resA = resolveSide(sideA);
        const resB = resolveSide(sideB);

        if (resA.target === 'left' && resB.target === 'right') {
          leftCol = resA.col;
          rightCol = resB.col;
        } else if (resA.target === 'right' && resB.target === 'left') {
          leftCol = resB.col;
          rightCol = resA.col;
        } else if (resA.target === 'left') {
          leftCol = resA.col;
          rightCol = rightDetails.colNames.includes(resB.col) ? resB.col : (rightDetails.colNames.find(c => c === 'id') || rightDetails.colNames[0]);
        } else if (resB.target === 'left') {
          leftCol = resB.col;
          rightCol = rightDetails.colNames.includes(resA.col) ? resA.col : (rightDetails.colNames.find(c => c === 'id') || rightDetails.colNames[0]);
        } else {
          // Fallback matching against column lists
          for (const c of leftDetails.colNames) {
            if (c.toLowerCase() === sideA.toLowerCase() || c.toLowerCase() === sideB.toLowerCase()) {
              leftCol = c;
              break;
            }
          }
          for (const c of rightDetails.colNames) {
            if (c.toLowerCase() === sideA.toLowerCase() || c.toLowerCase() === sideB.toLowerCase()) {
              rightCol = c;
              break;
            }
          }
        }
      }
    }

    // Default fallback if still unresolved
    if (!leftCol) {
      leftCol = leftDetails.colNames.find(c => c.toLowerCase().includes('id')) || leftDetails.colNames[0] || '';
    }
    if (!rightCol) {
      rightCol = rightDetails.colNames.find(c => c.toLowerCase().includes('id')) || rightDetails.colNames[0] || '';
    }

    const leftColIdx = leftDetails.colNames.indexOf(leftCol);
    const rightColIdx = rightDetails.colNames.indexOf(rightCol);

    const isLeftJoin = join.type === 'LEFT';
    const isFullJoin = join.type === 'FULL';

    // Build pairs
    const matchPairs = [];
    leftDetails.rows.forEach(lRow => {
      const leftVal = leftColIdx >= 0 ? lRow[leftColIdx] : null;
      const matchedRight = rightDetails.rows.filter(rRow => {
        const rightVal = rightColIdx >= 0 ? rRow[rightColIdx] : null;
        return leftVal !== null && leftVal !== undefined && String(leftVal) === String(rightVal);
      });

      if (matchedRight.length > 0) {
        matchedRight.forEach(rRow => {
          matchPairs.push({
            status: 'matched',
            leftRow: lRow,
            rightRow: rRow,
            leftVal,
            rightVal: rightColIdx >= 0 ? rRow[rightColIdx] : null
          });
        });
      } else {
        matchPairs.push({
          status: isLeftJoin || isFullJoin ? 'left-unmatched' : 'excluded',
          leftRow: lRow,
          rightRow: null,
          leftVal,
          rightVal: null
        });
      }
    });

    let contentHtml = '';
    if (this.joinViewMode === 'venn') {
      contentHtml = this.renderVennDiagramHtml(stage.fromTable, join.rightTable, join.type, matchPairs);
    } else if (this.joinViewMode === 'table') {
      let displayCols = snap.columns;
      if (leftDetails && rightDetails && snap.columns.length === leftDetails.colNames.length + rightDetails.colNames.length) {
        displayCols = [
          ...leftDetails.colNames.map(c => `${stage.fromTable}.${c}`),
          ...rightDetails.colNames.map(c => `${join.rightTable}.${c}`)
        ];
      }
      contentHtml = `
        <div class="stage-table-wrapper">
          ${this.buildMiniTableHtml(displayCols, snap.rows, 10)}
        </div>
      `;
    } else {
      contentHtml = this.renderJoinPairsHtml(stage.fromTable, join.rightTable, join.type, onCond, matchPairs, leftDetails, rightDetails);
    }

    this.elements.arena.innerHTML = `
      <div class="stage-container join-stage">
        <div class="stage-meta-bar">
          <div class="meta-left">
            <span class="join-badge join-${join.type.toLowerCase()}">${join.type} JOIN</span>
            <span class="meta-cond-code">${this.escapeHtml(onCond || 'CARTESIAN')}</span>
          </div>
          <div class="view-toggle-btns">
            <button class="btn-toggle-sub ${this.joinViewMode === 'matcher' ? 'active' : ''}" id="btnJoinMatcher">🔗 Row Matcher</button>
            <button class="btn-toggle-sub ${this.joinViewMode === 'venn' ? 'active' : ''}" id="btnJoinVenn">⚪ Venn Diagram</button>
            <button class="btn-toggle-sub ${this.joinViewMode === 'table' ? 'active' : ''}" id="btnJoinTable">📋 Joined Table (${snap.rowCount})</button>
          </div>
        </div>

        ${contentHtml}

        <div class="join-result-summary">
          <span>Joined Output: <strong>${snap.rowCount} rows</strong> produced by this ${join.type} JOIN.</span>
          ${this.joinViewMode !== 'table' ? `<button class="btn-view-join-table" id="btnSummaryViewTable">View Output Table ▶</button>` : ''}
        </div>
      </div>
    `;

    // Hook toggle listeners
    const btnMatcher = document.getElementById('btnJoinMatcher');
    const btnVenn = document.getElementById('btnJoinVenn');
    const btnTable = document.getElementById('btnJoinTable');
    const btnSummaryTable = document.getElementById('btnSummaryViewTable');

    if (btnMatcher) {
      btnMatcher.addEventListener('click', () => {
        this.joinViewMode = 'matcher';
        this.renderStageArena(stage);
      });
    }
    if (btnVenn) {
      btnVenn.addEventListener('click', () => {
        this.joinViewMode = 'venn';
        this.renderStageArena(stage);
      });
    }
    if (btnTable) {
      btnTable.addEventListener('click', () => {
        this.joinViewMode = 'table';
        this.renderStageArena(stage);
      });
    }
    if (btnSummaryTable) {
      btnSummaryTable.addEventListener('click', () => {
        this.joinViewMode = 'table';
        this.renderStageArena(stage);
      });
    }

    // Attach row hover highlights to the side-by-side source tables above
    this.attachSourceTableHighlightListeners();
  },

  /**
   * Helper: Renders row-by-row matching cards for JOIN
   */
  renderJoinPairsHtml(leftTable, rightTable, joinType, onCond, pairs, leftDetails, rightDetails) {
    let listHtml = '';

    pairs.forEach((p, idx) => {
      let statusBadge = '';
      let rowCls = '';

      if (p.status === 'matched') {
        rowCls = 'pair-matched';
        statusBadge = `<span class="pair-status-tag tag-matched">✓ Match (${p.leftVal})</span>`;
      } else if (p.status === 'left-unmatched') {
        rowCls = 'pair-null';
        statusBadge = `<span class="pair-status-tag tag-null">NULL Joined</span>`;
      } else {
        rowCls = 'pair-excluded';
        statusBadge = `<span class="pair-status-tag tag-dropped">✗ Dropped</span>`;
      }

      const leftName = p.leftRow[1] || p.leftRow[0];
      const rightName = p.rightRow ? (p.rightRow[1] || p.rightRow[0]) : '<span class="null-badge">NULL</span>';

      listHtml += `
        <div class="join-pair-card ${rowCls}" data-left-val="${p.leftVal}">
          <div class="pair-cell left-cell">
            <span class="pair-table-tag">${leftTable}</span>
            <span class="pair-val">${this.escapeHtml(String(leftName))}</span>
            <span class="pair-key-badge">key: ${p.leftVal !== null ? p.leftVal : 'NULL'}</span>
          </div>

          <div class="pair-center-indicator">
            <span class="pair-arrow">${p.status === 'matched' ? '⟷' : '↛'}</span>
            ${statusBadge}
          </div>

          <div class="pair-cell right-cell">
            <span class="pair-table-tag">${rightTable}</span>
            <span class="pair-val">${p.rightRow ? this.escapeHtml(String(rightName)) : '<span class="null-badge">NULL</span>'}</span>
            <span class="pair-key-badge">${p.rightRow ? 'key: ' + p.rightVal : (p.status === 'left-unmatched' ? 'no match (NULL)' : 'excluded')}</span>
          </div>
        </div>
      `;
    });

    return `
      <div class="join-matcher-grid">
        <div class="matcher-headers">
          <span>${leftTable} (Left Table)</span>
          <span>Key Comparison (${onCond})</span>
          <span>${rightTable} (Right Table)</span>
        </div>
        <div class="join-pairs-scroll">
          ${listHtml}
        </div>
      </div>
    `;
  },

  /**
   * Helper: Renders interactive SVG Venn diagram for JOIN
   */
  renderVennDiagramHtml(leftTable, rightTable, joinType, pairs) {
    const matchedCount = pairs.filter(p => p.status === 'matched').length;
    const leftOnlyCount = pairs.filter(p => p.status === 'left-unmatched' || p.status === 'excluded').length;

    const isInner = joinType === 'INNER';
    const isLeft = joinType === 'LEFT';

    return `
      <div class="venn-diagram-container">
        <div class="venn-svg-wrapper">
          <svg viewBox="0 0 380 200" class="venn-svg">
            <defs>
              <clipPath id="leftCircleClip">
                <circle cx="140" cy="100" r="75" />
              </clipPath>
            </defs>

            <!-- Left Circle (Left Table) -->
            <circle cx="140" cy="100" r="75" class="venn-circle venn-circle-left ${isLeft ? 'venn-active' : ''}" />

            <!-- Right Circle (Right Table) -->
            <circle cx="240" cy="100" r="75" class="venn-circle venn-circle-right" />

            <!-- Intersection -->
            <circle cx="240" cy="100" r="75" clip-path="url(#leftCircleClip)" class="venn-circle venn-intersection ${isInner || isLeft ? 'venn-active-intersection' : ''}" />

            <!-- Labels -->
            <text x="100" y="95" class="venn-label">${this.escapeHtml(leftTable)}</text>
            <text x="100" y="115" class="venn-count">${leftOnlyCount} unlinked</text>

            <text x="190" y="95" class="venn-label venn-label-mid">MATCH</text>
            <text x="190" y="115" class="venn-count venn-count-mid">${matchedCount} rows</text>

            <text x="275" y="95" class="venn-label">${this.escapeHtml(rightTable)}</text>
            <text x="275" y="115" class="venn-count">lookup</text>
          </svg>
        </div>

        <div class="venn-explainer-legend">
          <div class="legend-item">
            <span class="legend-color-box ${isInner ? 'box-active' : ''}"></span>
            <span><strong>Intersection (${matchedCount})</strong>: Rows present and matching in both tables.</span>
          </div>
          <div class="legend-item">
            <span class="legend-color-box ${isLeft ? 'box-active' : ''}"></span>
            <span><strong>Left Outer (${leftOnlyCount})</strong>: Kept in LEFT JOIN with NULLs, dropped in INNER JOIN.</span>
          </div>
        </div>
      </div>
    `;
  },

  /**
   * STAGE: WHERE Filter Gate
   */
  renderWhereStage(stage) {
    const priorSnap = stage.priorSnapshot;
    const snap = stage.snapshot;

    // Build row match map to see which rows from prior stage made it through
    // We compare row values
    const passedRowStrings = new Set(snap.rows.map(r => JSON.stringify(r)));

    let rowsListHtml = '';
    let passCount = 0;
    let failCount = 0;

    priorSnap.rows.forEach((row, idx) => {
      const rowKey = JSON.stringify(row);
      const passed = passedRowStrings.has(rowKey);
      if (passed) passCount++;
      else failCount++;

      // Create readable summary of tested row
      const displayVals = row.slice(0, 4).map(v => v === null ? 'NULL' : String(v)).join(' | ');

      rowsListHtml += `
        <div class="where-row-card ${passed ? 'row-passed' : 'row-failed'}">
          <div class="where-row-left">
            <span class="where-row-badge ${passed ? 'badge-pass' : 'badge-fail'}">
              ${passed ? '✓ PASSED' : '✗ FILTERED OUT'}
            </span>
            <span class="where-row-values">${this.escapeHtml(displayVals)}</span>
          </div>
          <span class="where-condition-eval">${passed ? 'Condition evaluates: TRUE' : 'Condition evaluates: FALSE'}</span>
        </div>
      `;
    });

    this.elements.arena.innerHTML = `
      <div class="stage-container where-stage">
        <div class="stage-meta-bar">
          <span class="meta-label">Filter Gate: <code>WHERE ${this.escapeHtml(stage.condition)}</code></span>
          <span class="meta-pill"><strong>${passCount}</strong> passed &bull; <strong>${failCount}</strong> discarded</span>
        </div>

        <div class="where-rows-scroll">
          ${rowsListHtml}
        </div>
      </div>
    `;
  },

  /**
   * STAGE: GROUP BY & Aggregations
   */
  renderGroupByStage(stage) {
    const snap = stage.snapshot;
    const priorSnap = stage.priorSnapshot;

    // Cluster prior rows by group column value
    const groupColName = stage.groupByCols;
    const groupColIdx = priorSnap.columns.findIndex(c => c.toLowerCase().includes(groupColName.toLowerCase()));

    const buckets = {};
    priorSnap.rows.forEach(row => {
      const gVal = groupColIdx >= 0 && row[groupColIdx] !== undefined ? String(row[groupColIdx]) : 'All';
      if (!buckets[gVal]) buckets[gVal] = [];
      buckets[gVal].push(row);
    });

    let bucketsHtml = '';
    Object.keys(buckets).forEach(key => {
      const rows = buckets[key];
      const count = rows.length;

      let rowsChips = rows
        .map(r => `<span class="group-member-chip">${this.escapeHtml(String(r[1] || r[0]))}</span>`)
        .join('');

      bucketsHtml += `
        <div class="group-bucket-card">
          <div class="bucket-header">
            <span class="bucket-key-label">${groupColName}: <strong>${this.escapeHtml(key)}</strong></span>
            <span class="bucket-count-badge">${count} row${count === 1 ? '' : 's'}</span>
          </div>
          <div class="bucket-members-list">
            ${rowsChips}
          </div>
          <div class="bucket-collapse-footer">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="6 9 12 15 18 9"/>
            </svg>
            <span>Collapses into 1 consolidated row</span>
          </div>
        </div>
      `;
    });

    this.elements.arena.innerHTML = `
      <div class="stage-container groupby-stage">
        <div class="stage-meta-bar">
          <span class="meta-label">Grouping on: <code>${this.escapeHtml(stage.groupByCols)}</code></span>
          <span class="meta-pill">${Object.keys(buckets).length} unique groups created</span>
        </div>

        <div class="groupby-buckets-grid">
          ${bucketsHtml}
        </div>
      </div>
    `;
  },

  /**
   * STAGE: HAVING
   */
  renderHavingStage(stage) {
    const snap = stage.snapshot;
    this.elements.arena.innerHTML = `
      <div class="stage-container having-stage">
        <div class="stage-meta-bar">
          <span class="meta-label">Group Filter Gate: <code>HAVING ${this.escapeHtml(stage.havingCondition)}</code></span>
          <span class="meta-pill">${snap.rowCount} groups survived</span>
        </div>
        <div class="stage-table-wrapper">
          ${this.buildMiniTableHtml(snap.columns, snap.rows, 5)}
        </div>
      </div>
    `;
  },

  /**
   * STAGE: SELECT Projection
   */
  renderSelectStage(stage) {
    const snap = stage.snapshot;
    const colChips = snap.columns
      .map(col => `<span class="col-projection-chip">✓ ${this.escapeHtml(col)}</span>`)
      .join('');

    this.elements.arena.innerHTML = `
      <div class="stage-container select-stage">
        <div class="stage-meta-bar">
          <span class="meta-label">Projected Columns:</span>
          <div class="projected-chips-bar">${colChips}</div>
        </div>
        <div class="stage-table-wrapper">
          ${this.buildMiniTableHtml(snap.columns, snap.rows, 6)}
        </div>
      </div>
    `;
  },

  /**
   * STAGE: ORDER BY & LIMIT
   */
  renderOrderByStage(stage) {
    const snap = stage.snapshot;
    this.elements.arena.innerHTML = `
      <div class="stage-container orderby-stage">
        <div class="stage-meta-bar">
          <span class="meta-label">Sorted Output: <code>${this.escapeHtml(stage.title)}</code></span>
          <span class="meta-pill">${snap.rowCount} rows in final order</span>
        </div>
        <div class="stage-table-wrapper">
          ${this.buildMiniTableHtml(snap.columns, snap.rows, 6, true)}
        </div>
      </div>
    `;
  },

  /**
   * Helper: Builds a clean mini table HTML
   */
  buildMiniTableHtml(columns, rows, maxRows = 6, showRank = false) {
    if (!columns || columns.length === 0) {
      return `<p class="empty-stage-p">No intermediate rows generated.</p>`;
    }

    let ths = columns.map(c => `<th>${this.escapeHtml(c)}</th>`).join('');
    if (showRank) ths = `<th>#</th>` + ths;

    let trs = '';
    const slice = rows.slice(0, maxRows);

    slice.forEach((r, idx) => {
      let tds = r
        .map(v => {
          if (v === null || v === undefined) return `<td><span class="null-badge">NULL</span></td>`;
          return `<td>${this.escapeHtml(String(v))}</td>`;
        })
        .join('');

      if (showRank) {
        tds = `<td><span class="rank-badge">${idx + 1}</span></td>` + tds;
      }
      trs += `<tr>${tds}</tr>`;
    });

    let extraHint = '';
    if (rows.length > maxRows) {
      extraHint = `<div class="table-more-hint">+ ${rows.length - maxRows} more rows...</div>`;
    }

    return `
      <table class="sql-table mini-stage-table">
        <thead><tr>${ths}</tr></thead>
        <tbody>${trs}</tbody>
      </table>
      ${extraHint}
    `;
  },

  /**
   * Helper: Empty state
   */
  renderEmptyState(message) {
    if (!this.elements.arena) return;
    this.elements.arena.innerHTML = `
      <div class="visualizer-empty">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <circle cx="12" cy="12" r="10"/>
          <polyline points="12 6 12 12 16 14"/>
        </svg>
        <p>${this.escapeHtml(message)}</p>
      </div>
    `;
    if (this.elements.timeline) this.elements.timeline.innerHTML = '';
    if (this.elements.stepTitle) this.elements.stepTitle.textContent = 'Execution Pipeline Ready';
    if (this.elements.stepDesc) this.elements.stepDesc.textContent = 'Run any query to step through clauses.';
  },

  /**
   * Highlights rows in the side-by-side source tables when hovering join pairs
   */
  attachSourceTableHighlightListeners() {
    const pairCards = this.elements.arena.querySelectorAll('.join-pair-card');
    pairCards.forEach(card => {
      card.addEventListener('mouseenter', e => {
        const leftVal = e.currentTarget.getAttribute('data-left-val');
        if (!leftVal || leftVal === 'null') return;
        this.highlightSourceRows(leftVal);
      });
      card.addEventListener('mouseleave', () => {
        this.clearSourceHighlights();
      });
    });
  },

  highlightSourceRows(keyValue) {
    const tableCells = document.querySelectorAll('.source-sql-table td');
    tableCells.forEach(td => {
      if (td.textContent.trim() === keyValue) {
        const tr = td.closest('tr');
        if (tr) tr.classList.add('source-row-highlight');
      }
    });
  },

  clearSourceHighlights() {
    const highlighted = document.querySelectorAll('.source-row-highlight');
    highlighted.forEach(el => el.classList.remove('source-row-highlight'));
  },

  escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
};

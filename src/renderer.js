const QUESTIONS = [
  {
    category: 'Competition Evaluation',
    items: [
      'If your team is not the incumbent, and an incumbent exists, is the customer unhappy with the incumbent\'s performance?',
      'Do you know the level of competition for the opportunity, and believe that your capabilities place you as a top competitor?',
      'Has your team identified potential competitors and their team\'s makeup?'
    ]
  },
  {
    category: 'Customer Desire for Competition',
    items: [
      'Has the customer demonstrated a clear desire for competition?',
      'Has the customer hosted an industry day or pushed out RFI (Sources Sought or Market Survey) in an effort to identify vendors interested in the opportunity?',
      'Has the customer identified key hot buttons and concerns to you during any face-to-face interaction?'
    ]
  },
  {
    category: 'Customer Relationship',
    items: [
      'Is the customer aware of your interest in the opportunity, and in your capabilities and service offerings as they relate to the opportunity?',
      'Have you had face-to-face meetings with the customer\'s Program/Product Manager, Technical Lead, and or any potential Technical Evaluation Board members?',
      'Has your team supported this customer on another contract in any capacity?'
    ]
  },
  {
    category: 'Management Capabilities',
    items: [
      'Are you confident in your team\'s understanding of the customer\'s management requirements?',
      'Does your team\'s prime have an established past performance record in managing contracts of similar size, scope and complexity?',
      'Does your team\'s prime have the required accounting system and processes (for example, DCMA approved)?',
      'Does your team\'s prime have the required facility clearance level (for example, Top Secret)?'
    ]
  },
  {
    category: 'Positioning',
    items: [
      'Has your team responded to an RFI (Market Survey or Sources Sought) from the customer?',
      'Do you expect the opportunity to be released in a contract vehicle that your team can compete in?',
      'Does the customer\'s acquisition strategy identify potential set-asides that could benefit your team?',
      'If this is a re-compete, does your team consist of any incumbents or strategic hires that the customer values?'
    ]
  },
  {
    category: 'Price to Win',
    items: [
      'Is your team competitive given the customer\'s proposed cost evaluation criteria?',
      'Has your team been awarded contracts for similar products or services using the proposed evaluation criteria?',
      'Have you obtained budget and funding information from the customer?',
      'If there is an incumbent, can you estimate the incumbent\'s pricing?',
      'Are you confident in your team\'s understanding of the customer\'s budget limitations and available funding?'
    ]
  },
  {
    category: 'Technical Capabilities',
    items: [
      'Are you confident in your team\'s understanding of the customer\'s technical requirements?',
      'Does your team have the required technical and domain capabilities to meet the needs of the customer?',
      'Are you confident in your team\'s ability to offer key technical discriminators that provide value to the customer?'
    ]
  }
];

const ANSWERS = [
  { value: 'yes', label: 'Yes', score: 100 },
  { value: 'unsure', label: 'Unsure', score: 25 },
  { value: 'no', label: 'No', score: 0 }
];

const app = document.getElementById('app');
const homeButton = document.getElementById('homeButton');

const state = {
  db: { opportunities: [] },
  view: 'home',
  selectedOpportunityId: null,
  editingOpportunityId: null
};

homeButton.addEventListener('click', () => {
  state.view = 'home';
  state.editingOpportunityId = null;
  render();
});

async function init() {
  await refreshDb();
  render();
}

async function refreshDb() {
  state.db = await window.pwinApi.getDb();
  if (!state.selectedOpportunityId && state.db.opportunities.length) {
    state.selectedOpportunityId = state.db.opportunities[0].id;
  }
}

function uid() {
  return `opp_${Date.now()}_${Math.random().toString(16).slice(2, 8)}`;
}

function formatPercent(value) {
  if (value === null || value === undefined || Number.isNaN(value)) return '—';
  return `${value.toFixed(1)}%`;
}

function calculateAssessment(formData) {
  const questions = [];
  const categoryScores = {};
  let globalCounter = 1;

  QUESTIONS.forEach((section) => {
    const scoredItems = section.items.map((text, index) => {
      const key = `${section.category}__${index}`;
      const answerValue = formData.answers[key];
      const answer = ANSWERS.find((item) => item.value === answerValue) || ANSWERS[1];
      return {
        category: section.category,
        number: globalCounter++,
        text,
        answerValue: answer.value,
        answerLabel: answer.label,
        score: answer.score
      };
    });

    categoryScores[section.category] = scoredItems.reduce((sum, item) => sum + item.score, 0) / scoredItems.length;
    questions.push(...scoredItems);
  });

  const totalPwin = Object.values(categoryScores).reduce((sum, value) => sum + value, 0) / Object.keys(categoryScores).length;

  return {
    timestamp: new Date().toISOString(),
    categoryScores,
    totalPwin,
    questions,
    notes: formData.notes || ''
  };
}

function getOpportunityById(id) {
  return state.db.opportunities.find((item) => item.id === id);
}

function render() {
  app.innerHTML = '';
  if (state.view === 'home') return renderHome();
  if (state.view === 'add') return renderAddOrEdit(false);
  if (state.view === 'update') return renderUpdate();
  if (state.view === 'edit-opportunity') return renderAddOrEdit(true);
}

function renderHome() {
  const template = document.getElementById('homeViewTemplate');
  app.appendChild(template.content.cloneNode(true));
  app.querySelector('[data-action="add"]').addEventListener('click', () => {
    state.view = 'add';
    state.editingOpportunityId = null;
    render();
  });
  app.querySelector('[data-action="update"]').addEventListener('click', () => {
    state.view = 'update';
    render();
  });
}

function renderAddOrEdit(isEdit) {
  const existing = isEdit ? getOpportunityById(state.editingOpportunityId) : null;
  const section = document.createElement('section');
  section.className = 'form-panel';

  const title = isEdit ? 'Edit Opportunity and Add PWIN Update' : 'Add New Opportunity';
  const helper = isEdit
    ? 'Update the opportunity details if needed, answer the questions based on the latest information, and save a new row.'
    : 'Enter the opportunity details and answer each question using Yes, Unsure, or No.';

  section.innerHTML = `
    <h2>${title}</h2>
    <p class="helper">${helper}</p>
    <form id="assessmentForm">
      <div class="field-grid">
        <div class="field full">
          <label for="opportunityName">Opportunity Name</label>
          <input id="opportunityName" name="opportunityName" required value="${escapeHtml(existing?.name || '')}" />
        </div>
        <div class="field">
          <label for="solicitationNumber">Solicitation Number</label>
          <input id="solicitationNumber" name="solicitationNumber" value="${escapeHtml(existing?.solicitationNumber || '')}" />
        </div>
        <div class="field">
          <label for="notes">Assessment Notes</label>
          <input id="notes" name="notes" placeholder="Optional notes for this update" />
        </div>
      </div>
      <div id="scorePreview" class="score-grid"></div>
      <div id="questionContainer"></div>
      <div class="button-row">
        <button type="submit" class="primary">Save Assessment</button>
        <button type="button" id="cancelButton" class="ghost">Cancel</button>
      </div>
    </form>
  `;

  app.appendChild(section);

  const form = section.querySelector('#assessmentForm');
  const scorePreview = section.querySelector('#scorePreview');
  const questionContainer = section.querySelector('#questionContainer');
  const answersState = {};

  QUESTIONS.forEach((sectionDef) => {
    const h = document.createElement('h3');
    h.className = 'category-header';
    h.textContent = sectionDef.category;
    questionContainer.appendChild(h);

    sectionDef.items.forEach((questionText, index) => {
      const key = `${sectionDef.category}__${index}`;
      answersState[key] = 'unsure';
      const card = document.createElement('div');
      card.className = 'question-card';
      card.innerHTML = `
        <div class="question-meta">
          <span>${sectionDef.category}</span>
          <span>Question ${index + 1}</span>
        </div>
        <div class="question-text">${escapeHtml(questionText)}</div>
        <div class="radio-group">
          ${ANSWERS.map((answer) => `
            <label class="radio-pill">
              <input type="radio" name="${encodeURIComponent(key)}" value="${answer.value}" ${answer.value === 'unsure' ? 'checked' : ''} />
              <span>${answer.label}</span>
            </label>
          `).join('')}
        </div>
      `;
      questionContainer.appendChild(card);
    });
  });

  const renderScorePreview = () => {
    const assessment = calculateAssessment({ answers: answersState });
    scorePreview.innerHTML = [
      ...Object.entries(assessment.categoryScores).slice(0, 3),
      ['Total PWIN', assessment.totalPwin]
    ].map(([label, value]) => `
      <div class="score-card">
        <div class="label">${escapeHtml(label)}</div>
        <div class="value">${formatPercent(value)}</div>
      </div>
    `).join('');
  };

  questionContainer.addEventListener('change', (event) => {
    if (event.target.matches('input[type="radio"]')) {
      const key = decodeURIComponent(event.target.name);
      answersState[key] = event.target.value;
      renderScorePreview();
    }
  });

  renderScorePreview();

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const opportunity = {
      id: existing?.id || uid(),
      name: form.opportunityName.value.trim(),
      solicitationNumber: form.solicitationNumber.value.trim()
    };

    const assessment = calculateAssessment({
      answers: answersState,
      notes: form.notes.value.trim()
    });

    await window.pwinApi.saveAssessment({ opportunity, assessment });
    await refreshDb();
    state.selectedOpportunityId = opportunity.id;
    state.view = 'update';
    render();
  });

  section.querySelector('#cancelButton').addEventListener('click', () => {
    state.view = isEdit ? 'update' : 'home';
    state.editingOpportunityId = null;
    render();
  });
}

function getPwinBandClass(value) {
  if (value >= 80) return 'pwin-high';
  if (value >= 50) return 'pwin-medium';
  return 'pwin-low';
}

function renderUpdate() {
  const wrapper = document.createElement('section');
  wrapper.className = 'layout-two';

  const left = document.createElement('div');
  left.className = 'panel';
  left.innerHTML = `
    <h2>Opportunities</h2>
    <p class="helper">Select an opportunity to review updates, add a new row, or export to Excel.</p>
    <div class="button-row">
      <button id="newFromUpdate" class="secondary">Add Opportunity</button>
    </div>
    <div class="opportunity-list" id="opportunityList"></div>
  `;

  const right = document.createElement('div');
  right.className = 'history-panel';

  wrapper.append(left, right);
  app.appendChild(wrapper);

  left.querySelector('#newFromUpdate').addEventListener('click', () => {
    state.view = 'add';
    render();
  });

  const list = left.querySelector('#opportunityList');
  const opportunities = [...state.db.opportunities].sort((a, b) => a.name.localeCompare(b.name));

  if (!opportunities.length) {
    list.innerHTML = '<div class="empty-state">No opportunities saved yet.</div>';
  } else {
    opportunities.forEach((opportunity) => {
      const card = document.createElement('div');
      card.className = `opportunity-card ${opportunity.id === state.selectedOpportunityId ? 'active' : ''}`;
      card.innerHTML = `
        <div><strong>${escapeHtml(opportunity.name)}</strong></div>
        <div class="subtle">${escapeHtml(opportunity.solicitationNumber || 'No solicitation number')}</div>
        <div class="tag">${opportunity.assessments.length} update${opportunity.assessments.length === 1 ? '' : 's'}</div>
      `;
      card.addEventListener('click', () => {
        state.selectedOpportunityId = opportunity.id;
        render();
      });
      list.appendChild(card);
    });
  }

  const selected = getOpportunityById(state.selectedOpportunityId);
  if (!selected) {
    right.innerHTML = '<div class="empty-state">Select an opportunity to view its scoring history.</div>';
    return;
  }

  right.innerHTML = `
    <h2>${escapeHtml(selected.name)}</h2>
    <p class="helper">${escapeHtml(selected.solicitationNumber || 'No solicitation number')}</p>
    <div class="button-row">
      <button id="addUpdateBtn" class="primary">Add PWIN Update</button>
      <button id="editBtn" class="ghost">Edit Opportunity</button>
      <button id="exportBtn" class="secondary">Export to Spreadsheet</button>
      <button id="deleteBtn" class="danger">Delete Opportunity</button>
    </div>
    <div class="table-wrap" id="historyTableWrap"></div>
  `;

  right.querySelector('#addUpdateBtn').addEventListener('click', () => {
    state.editingOpportunityId = selected.id;
    state.view = 'edit-opportunity';
    render();
  });

  right.querySelector('#editBtn').addEventListener('click', async () => {
    state.editingOpportunityId = selected.id;
    state.view = 'edit-opportunity';
    render();
  });

  right.querySelector('#exportBtn').addEventListener('click', async () => {
    const result = await window.pwinApi.exportOpportunity(selected);
    if (!result.canceled) {
      alert(`Exported to:\n${result.filePath}`);
    }
  });

  right.querySelector('#deleteBtn').addEventListener('click', async () => {
    const okay = confirm(`Delete ${selected.name}? This removes all PWIN updates for the opportunity.`);
    if (!okay) return;
    await window.pwinApi.deleteOpportunity(selected.id);
    await refreshDb();
    state.selectedOpportunityId = state.db.opportunities[0]?.id || null;
    render();
  });

  const columns = [
    'Update',
    'Timestamp',
    'PWIN',
    'Competition Evaluation',
    'Customer Desire for Competition',
    'Customer Relationship',
    'Management Capabilities',
    'Positioning',
    'Price to Win',
    'Technical Capabilities'
  ];

  const rows = selected.assessments.map((assessment, index) => ({
    updateNumber: index + 1,
    timestamp: new Date(assessment.timestamp).toLocaleString(),
    totalPwin: assessment.totalPwin,
    categoryScores: assessment.categoryScores
  }));

  const tableHtml = `
    <table>
      <thead>
        <tr>${columns.map((column) => `<th>${escapeHtml(column)}</th>`).join('')}</tr>
      </thead>
      <tbody>
        ${rows.map((row) => `
          <tr>
            <td>${row.updateNumber}</td>
            <td>${escapeHtml(row.timestamp)}</td>
            <td class="pwin-cell ${getPwinBandClass(row.totalPwin)}">${escapeHtml(formatPercent(row.totalPwin))}</td>
            <td>${escapeHtml(formatPercent(row.categoryScores['Competition Evaluation']))}</td>
            <td>${escapeHtml(formatPercent(row.categoryScores['Customer Desire for Competition']))}</td>
            <td>${escapeHtml(formatPercent(row.categoryScores['Customer Relationship']))}</td>
            <td>${escapeHtml(formatPercent(row.categoryScores['Management Capabilities']))}</td>
            <td>${escapeHtml(formatPercent(row.categoryScores['Positioning']))}</td>
            <td>${escapeHtml(formatPercent(row.categoryScores['Price to Win']))}</td>
            <td>${escapeHtml(formatPercent(row.categoryScores['Technical Capabilities']))}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;

  right.querySelector('#historyTableWrap').innerHTML = tableHtml;
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

init();

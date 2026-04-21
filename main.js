const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const ExcelJS = require('exceljs');

function createWindow() {
  const win = new BrowserWindow({
    width: 1440,
    height: 960,
    minWidth: 900,
    minHeight: 640,
    icon: path.join(__dirname, 'assets', 'tek-annoa-logo.ico'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  win.loadFile(path.join(__dirname, 'src', 'index.html'));
}

function getDataFilePath() {
  const userData = app.getPath('userData');
  return path.join(userData, 'pwin-opportunities.json');
}

function ensureDb() {
  const filePath = getDataFilePath();
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, JSON.stringify({ opportunities: [] }, null, 2), 'utf8');
  }
  return filePath;
}

function readDb() {
  const filePath = ensureDb();
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function writeDb(db) {
  const filePath = ensureDb();
  fs.writeFileSync(filePath, JSON.stringify(db, null, 2), 'utf8');
}

ipcMain.handle('db:get', async () => {
  return readDb();
});

ipcMain.handle('db:save-assessment', async (_, payload) => {
  const db = readDb();
  const { opportunity, assessment } = payload;

  let existing = db.opportunities.find((item) => item.id === opportunity.id);

  if (!existing) {
    existing = {
      id: opportunity.id,
      name: opportunity.name,
      solicitationNumber: opportunity.solicitationNumber || '',
      createdAt: new Date().toISOString(),
      assessments: []
    };
    db.opportunities.push(existing);
  } else {
    existing.name = opportunity.name;
    existing.solicitationNumber = opportunity.solicitationNumber || '';
  }

  existing.assessments.push(assessment);
  existing.updatedAt = new Date().toISOString();

  writeDb(db);
  return existing;
});

ipcMain.handle('db:update-opportunity', async (_, opportunity) => {
  const db = readDb();
  const existing = db.opportunities.find((item) => item.id === opportunity.id);
  if (!existing) {
    throw new Error('Opportunity not found');
  }
  existing.name = opportunity.name;
  existing.solicitationNumber = opportunity.solicitationNumber || '';
  existing.updatedAt = new Date().toISOString();
  writeDb(db);
  return existing;
});

ipcMain.handle('db:delete-opportunity', async (_, id) => {
  const db = readDb();
  db.opportunities = db.opportunities.filter((item) => item.id !== id);
  writeDb(db);
  return true;
});

ipcMain.handle('export:opportunity', async (_, opportunity) => {
  const { canceled, filePath } = await dialog.showSaveDialog({
    title: 'Export Opportunity PWIN',
    defaultPath: `${opportunity.name.replace(/[^a-z0-9]+/gi, '_').toLowerCase() || 'opportunity'}_pwin.xlsx`,
    filters: [{ name: 'Excel Workbook', extensions: ['xlsx'] }]
  });

  if (canceled || !filePath) {
    return { canceled: true };
  }

  const summaryRows = opportunity.assessments.map((assessment, index) => ({
    Update: index + 1,
    Timestamp: assessment.timestamp,
    'Opportunity Name': opportunity.name,
    'Solicitation Number': opportunity.solicitationNumber || '',
    'Competition Evaluation': assessment.categoryScores['Competition Evaluation'],
    'Customer Desire for Competition': assessment.categoryScores['Customer Desire for Competition'],
    'Customer Relationship': assessment.categoryScores['Customer Relationship'],
    'Management Capabilities': assessment.categoryScores['Management Capabilities'],
    'Positioning': assessment.categoryScores['Positioning'],
    'Price to Win': assessment.categoryScores['Price to Win'],
    'Technical Capabilities': assessment.categoryScores['Technical Capabilities'],
    'Total PWIN': assessment.totalPwin
  }));

  const detailRows = [];
  opportunity.assessments.forEach((assessment, index) => {
    assessment.questions.forEach((question) => {
      detailRows.push({
        Update: index + 1,
        Timestamp: assessment.timestamp,
        Category: question.category,
        'Question Number': question.number,
        Question: question.text,
        Answer: question.answerLabel,
        Score: question.score
      });
    });
  });

  const workbook = new ExcelJS.Workbook();
  const summarySheet = workbook.addWorksheet('Summary');
  const detailSheet = workbook.addWorksheet('Question Details');

  if (summaryRows.length) {
    summarySheet.columns = Object.keys(summaryRows[0]).map((key) => ({ header: key, key }));
    summaryRows.forEach((row) => summarySheet.addRow(row));
  }

  if (detailRows.length) {
    detailSheet.columns = Object.keys(detailRows[0]).map((key) => ({ header: key, key }));
    detailRows.forEach((row) => detailSheet.addRow(row));
  }

  [summarySheet, detailSheet].forEach((sheet) => {
    if (sheet.rowCount > 0) {
      sheet.getRow(1).font = { bold: true };
      sheet.columns.forEach((column) => {
        let maxLength = 12;
        column.eachCell({ includeEmpty: true }, (cell) => {
          const cellValue = cell.value === null || cell.value === undefined ? '' : String(cell.value);
          maxLength = Math.max(maxLength, cellValue.length + 2);
        });
        column.width = Math.min(maxLength, 60);
      });
      sheet.views = [{ state: 'frozen', ySplit: 1 }];
    }
  });

  await workbook.xlsx.writeFile(filePath);

  return { canceled: false, filePath };
});

app.whenReady().then(() => {
  ensureDb();
  createWindow();

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

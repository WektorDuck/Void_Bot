const { google } = require('googleapis');

const auth = new google.auth.GoogleAuth({
  keyFile: 'API_GoogleSheets.json', // имя твоего JSON файла
  scopes: ['https://www.googleapis.com/auth/spreadsheets']
});

const sheets = google.sheets({ version: 'v4', auth });

module.exports = sheets;

const express = require('express');
const cors = require('cors');
const { google } = require('googleapis');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Google Sheets configuration
const GOOGLE_SHEET_ID = process.env.GOOGLE_SHEET_ID || '1zeSlEN7VS2S6KPZH7_uvQeeY3Iu5INUyi12V0_Wi9G4';

// Initialize Google Sheets client
function getSheetsClient() {
  try {
    const credentials = {
      type: "service_account",
      project_id: process.env.GOOGLE_PROJECT_ID,
      private_key_id: process.env.GOOGLE_PRIVATE_KEY_ID,
      private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      client_email: process.env.GOOGLE_CLIENT_EMAIL,
      client_id: process.env.GOOGLE_CLIENT_ID,
      auth_uri: "https://accounts.google.com/o/oauth2/auth",
      token_uri: "https://oauth2.googleapis.com/token",
      auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
      client_x509_cert_url: `https://www.googleapis.com/robot/v1/metadata/x509/${process.env.GOOGLE_CLIENT_EMAIL}`
    };

    const auth = new google.auth.GoogleAuth({
      credentials: credentials,
      scopes: ['https://www.googleapis.com/auth/spreadsheets']
    });

    return google.sheets({ version: 'v4', auth });
  } catch (error) {
    console.error('Error initializing Google Sheets client:', error);
    throw error;
  }
}

// API Routes
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Football Database API is running' });
});

// Read from Google Sheets
app.post('/api/sheets/read', async (req, res) => {
  try {
    const { sheetName, range } = req.body;
    
    const sheets = getSheetsClient();
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: GOOGLE_SHEET_ID,
      range: `${sheetName}!${range}`
    });
    
    res.json({ success: true, data: response.data.values || [] });
  } catch (error) {
    console.error('Error reading sheet:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Write to Google Sheets
app.post('/api/sheets/write', async (req, res) => {
  try {
    const { sheetName, range, values } = req.body;
    
    const sheets = getSheetsClient();
    const response = await sheets.spreadsheets.values.update({
      spreadsheetId: GOOGLE_SHEET_ID,
      range: `${sheetName}!${range}`,
      valueInputOption: 'RAW',
      resource: { values }
    });
    
    res.json({ success: true, data: response.data });
  } catch (error) {
    console.error('Error writing to sheet:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Append to Google Sheets
app.post('/api/sheets/append', async (req, res) => {
  try {
    const { sheetName, values } = req.body;
    
    const sheets = getSheetsClient();
    const response = await sheets.spreadsheets.values.append({
      spreadsheetId: GOOGLE_SHEET_ID,
      range: `${sheetName}!A:Z`,
      valueInputOption: 'RAW',
      insertDataOption: 'INSERT_ROWS',
      resource: { values }
    });
    
    res.json({ success: true, data: response.data });
  } catch (error) {
    console.error('Error appending to sheet:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Serve static files in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../build')));
  
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../build/index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📊 Google Sheet ID: ${GOOGLE_SHEET_ID}`);
});

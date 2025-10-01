const { app, BrowserWindow, Menu, ipcMain, protocol } = require('electron');
const path = require('path');
const isDev = require('electron-is-dev');
const { google } = require('googleapis');

let mainWindow;

function createWindow() {
  // Create the browser window
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      enableRemoteModule: true,
      webSecurity: false,
      allowRunningInsecureContent: true
    },
    icon: path.join(__dirname, '../assets/icon.ico'),
    show: false
  });

  // Load the app
  const startUrl = isDev 
    ? 'http://localhost:3000' 
    : `file://${path.join(__dirname, '../build/index.html')}`;
  
  mainWindow.loadURL(startUrl);
  
  // Handle navigation for React Router
  mainWindow.webContents.on('will-navigate', (event, navigationUrl) => {
    const parsedUrl = new URL(navigationUrl);
    
    if (parsedUrl.origin !== 'file:') {
      event.preventDefault();
    }
  });

  // Show window when ready
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // Open DevTools in development
  if (isDev) {
    mainWindow.webContents.openDevTools();
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// This method will be called when Electron has finished initialization
app.whenReady().then(() => {
  // Register protocol for loading local files
  if (!isDev) {
    protocol.registerFileProtocol('file', (request, callback) => {
      const url = request.url.substr(7); // Remove 'file://'
      callback({ path: path.normalize(url) });
    });
  }
  createWindow();
});

// Quit when all windows are closed
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// Completely hide the menu bar
Menu.setApplicationMenu(null);

// Google Sheets IPC bridge (runs in Node main process)
function getSheetsClient() {
  try {
    // Define the single credentials file path
    // In production, credentials are copied to the app resources
    const credentialsPath = isDev 
      ? path.join(__dirname, '../src/credentials/Credentials.json')
      : path.join(process.resourcesPath, 'credentials/Credentials.json');
    
    // Check if credentials file exists
    if (!require('fs').existsSync(credentialsPath)) {
      console.error(`❌ Credentials file not found at: ${credentialsPath}`);
      console.error('📁 Current __dirname:', __dirname);
      console.error('📁 Full path:', credentialsPath);
      console.error('📁 File exists:', require('fs').existsSync(credentialsPath));
      
      throw new Error(`Credentials file not found at: ${credentialsPath}`);
    }
    
    
    // Load and validate credentials file
    let credentials;
    try {
      credentials = require(credentialsPath);
    } catch (loadError) {
      console.error('❌ Error loading credentials file:', loadError.message);
      throw new Error(`Failed to load credentials file: ${loadError.message}`);
    }
    
    // Validate credentials structure
    if (!credentials || !credentials.private_key || !credentials.client_email) {
      console.error('❌ Invalid credentials file structure:');
      console.error('   - Has credentials object:', !!credentials);
      console.error('   - Has private_key:', !!credentials?.private_key);
      console.error('   - Has client_email:', !!credentials?.client_email);
      console.error('   - Available keys:', credentials ? Object.keys(credentials) : 'none');
      throw new Error('Invalid credentials file structure. Missing required fields (private_key, client_email).');
    }

    
    const auth = new google.auth.GoogleAuth({
      credentials: credentials,
      scopes: ['https://www.googleapis.com/auth/spreadsheets']
    });
    const sheets = google.sheets({ version: 'v4', auth });
    
    return sheets;
  } catch (error) {
    console.error('❌ Error initializing Google Sheets client:', error);
    console.error('🔧 Troubleshooting tips:');
    console.error('   1. Ensure Credentials.json exists in the correct location');
    console.error('   2. Check that the file contains valid Google Service Account credentials');
    console.error('   3. Verify the Google Sheet is shared with the service account email');
    console.error('   4. Make sure Google Sheets API is enabled in Google Cloud Console');
    throw error;
  }
}

ipcMain.handle('sheets:read', async (event, args) => {
  try {
    const { sheetId, sheetName, range } = args;
    
    const sheets = getSheetsClient();
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: `${sheetName}!${range}`
    });
    
    return response.data.values || [];
  } catch (error) {
    console.error('❌ Error reading sheet:', error);
    console.error('Sheet ID:', args.sheetId);
    console.error('Sheet Name:', args.sheetName);
    console.error('Range:', args.range);
    throw new Error(`Failed to read sheet: ${error.message}`);
  }
});

ipcMain.handle('sheets:write', async (event, args) => {
  try {
    const { sheetId, sheetName, range, values } = args;
    
    const sheets = getSheetsClient();
    const response = await sheets.spreadsheets.values.update({
      spreadsheetId: sheetId,
      range: `${sheetName}!${range}`,
      valueInputOption: 'RAW',
      resource: { values }
    });
    return response.data;
  } catch (error) {
    console.error('Error writing to sheet:', error);
    throw new Error(`Failed to write to sheet: ${error.message}`);
  }
});

ipcMain.handle('sheets:append', async (event, args) => {
  try {
    const { sheetId, sheetName, values } = args;
    
    const sheets = getSheetsClient();
    const response = await sheets.spreadsheets.values.append({
      spreadsheetId: sheetId,
      range: `${sheetName}!A:Z`,
      valueInputOption: 'RAW',
      insertDataOption: 'INSERT_ROWS',
      resource: { values }
    });
    return response.data;
  } catch (error) {
    console.error('Error appending to sheet:', error);
    throw new Error(`Failed to append to sheet: ${error.message}`);
  }
});
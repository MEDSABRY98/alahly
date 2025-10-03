const { app, BrowserWindow, Menu, ipcMain, protocol } = require('electron');
const path = require('path');
const isDev = require('electron-is-dev');
const { google } = require('googleapis');

// Enable debug mode in production for troubleshooting
if (!isDev) {
  try {
    const { enableDebugMode } = require('./debug');
    enableDebugMode();
  } catch (error) {
    console.log('Debug mode not available:', error.message);
  }
}

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
      allowRunningInsecureContent: true,
      preload: path.join(__dirname, 'preload.js')
    },
    icon: path.join(__dirname, '../assets/icon.ico'),
    show: false
  });

  // Load the app
  const buildPath = path.join(__dirname, '../build/index.html');
  const startUrl = isDev 
    ? 'http://localhost:3000' 
    : `file://${buildPath}`;
  
  console.log('🚀 Loading URL:', startUrl);
  console.log('📁 Build path exists:', require('fs').existsSync(buildPath));
  console.log('📁 Current __dirname:', __dirname);
  console.log('📁 Full build path:', buildPath);
  
  // Check if build directory exists
  const buildDir = path.join(__dirname, '../build');
  if (require('fs').existsSync(buildDir)) {
    console.log('📁 Build directory contents:', require('fs').readdirSync(buildDir));
  } else {
    console.error('❌ Build directory does not exist!');
  }
  
  // Try loading with error handling
  mainWindow.loadURL(startUrl).catch(err => {
    console.error('❌ Failed to load URL:', err);
    console.log('🔄 Trying alternative loading method...');
    
    // Try with absolute path
    const absolutePath = path.resolve(buildPath);
    const alternativeUrl = `file://${absolutePath}`;
    console.log('🔄 Trying absolute path:', alternativeUrl);
    
    mainWindow.loadURL(alternativeUrl).catch(altErr => {
      console.error('❌ Alternative loading also failed:', altErr);
      // Show error page with more helpful information
      const errorHtml = `
        <html>
          <head>
            <title>Football Database - Error</title>
            <style>
              body { font-family: Arial, sans-serif; padding: 40px; background: #f5f5f5; }
              .error-container { background: white; padding: 30px; border-radius: 10px; box-shadow: 0 4px 20px rgba(0,0,0,0.1); }
              h1 { color: #e74c3c; margin-bottom: 20px; }
              .error-details { background: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0; }
              .solution { background: #e8f5e8; padding: 15px; border-radius: 5px; margin: 20px 0; }
              code { background: #f1f1f1; padding: 2px 5px; border-radius: 3px; }
            </style>
          </head>
          <body>
            <div class="error-container">
              <h1>🚨 Application Loading Error</h1>
              <p>The Football Database application failed to load properly.</p>
              
              <div class="error-details">
                <h3>Error Details:</h3>
                <p><strong>Error:</strong> ${altErr.message}</p>
                <p><strong>Build Path:</strong> <code>${buildPath}</code></p>
                <p><strong>Build Exists:</strong> ${require('fs').existsSync(buildPath) ? 'Yes' : 'No'}</p>
              </div>
              
              <div class="solution">
                <h3>💡 Solutions:</h3>
                <ol>
                  <li>Make sure you have built the application first: <code>npm run build</code></li>
                  <li>Check if the build directory exists and contains index.html</li>
                  <li>Try running the development version: <code>npm run electron-dev</code></li>
                  <li>Restart the application</li>
                </ol>
              </div>
            </div>
          </body>
        </html>
      `;
      mainWindow.loadURL(`data:text/html,${encodeURIComponent(errorHtml)}`);
    });
  });
  
  // Handle navigation for React Router
  mainWindow.webContents.on('will-navigate', (event, navigationUrl) => {
    const parsedUrl = new URL(navigationUrl);
    
    if (parsedUrl.origin !== 'file:') {
      event.preventDefault();
    }
  });

  // Show window when ready
  mainWindow.once('ready-to-show', () => {
    console.log('✅ Window ready to show');
    mainWindow.show();
  });

  // Handle load errors
  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
    console.error('❌ Failed to load:', errorCode, errorDescription, validatedURL);
    console.error('🔧 Trying alternative loading method...');
    
    // Try loading with different protocol
    if (!isDev) {
      const alternativeUrl = `file://${path.resolve(__dirname, '../build/index.html')}`;
      console.log('🔄 Trying alternative URL:', alternativeUrl);
      mainWindow.loadURL(alternativeUrl);
    }
  });

  // Handle page load
  mainWindow.webContents.on('did-finish-load', () => {
    console.log('✅ Page loaded successfully');
    
    // Check if React app is actually rendered
    mainWindow.webContents.executeJavaScript(`
      console.log('🔍 Checking React app status...');
      const rootElement = document.getElementById('root');
      console.log('Root element:', rootElement);
      console.log('Root children count:', rootElement ? rootElement.children.length : 'No root element');
      console.log('Body children count:', document.body.children.length);
      
      // Check if React has rendered anything
      if (rootElement && rootElement.children.length === 0) {
        console.error('❌ React app not rendered - root element is empty');
        // Show a more helpful error message
        const errorHtml = \`
          <div style="
            display: flex; 
            align-items: center; 
            justify-content: center; 
            height: 100vh; 
            background: #f5f5f5; 
            font-family: Arial, sans-serif;
          ">
            <div style="
              background: white; 
              padding: 40px; 
              border-radius: 10px; 
              box-shadow: 0 4px 20px rgba(0,0,0,0.1);
              text-align: center;
              max-width: 500px;
            ">
              <h1 style="color: #e74c3c; margin-bottom: 20px;">🚨 React App Loading Error</h1>
              <p>The React application failed to render properly.</p>
              <div style="
                background: #f8f9fa; 
                padding: 15px; 
                border-radius: 5px; 
                margin: 20px 0;
                text-align: left;
              ">
                <h3>Possible causes:</h3>
                <ul>
                  <li>JavaScript bundle not loaded correctly</li>
                  <li>CSS files missing or corrupted</li>
                  <li>Build process incomplete</li>
                  <li>Missing dependencies</li>
                </ul>
              </div>
              <div style="
                background: #e8f5e8; 
                padding: 15px; 
                border-radius: 5px; 
                margin: 20px 0;
              ">
                <h3>💡 Solutions:</h3>
                <ol style="text-align: left;">
                  <li>Run <code>npm run build</code> to rebuild the application</li>
                  <li>Check browser console for JavaScript errors</li>
                  <li>Verify all files are present in the build directory</li>
                  <li>Try running in development mode: <code>npm run electron-dev</code></li>
                </ol>
              </div>
            </div>
          </div>
        \`;
        document.body.innerHTML = errorHtml;
      } else {
        console.log('✅ React app appears to be rendered');
      }
    `).catch(err => {
      console.error('❌ Error checking React app:', err);
    });
  });

  // Open DevTools in development or for debugging
  if (isDev) {
    mainWindow.webContents.openDevTools();
  } else {
    // In production, open DevTools for debugging if needed
    // Uncomment the next line to open DevTools in production for debugging
    // mainWindow.webContents.openDevTools();
  }
  
  // Add additional debugging for production
  if (!isDev) {
    mainWindow.webContents.on('console-message', (event, level, message, line, sourceId) => {
      console.log(`[Renderer ${level}]: ${message} (${sourceId}:${line})`);
    });
    
    // Add error handling for uncaught exceptions
    mainWindow.webContents.on('uncaught-exception', (event, error) => {
      console.error('❌ Uncaught exception in renderer:', error);
    });
    
    // Add error handling for unhandled promise rejections
    mainWindow.webContents.on('unhandled-rejection', (event, error) => {
      console.error('❌ Unhandled promise rejection in renderer:', error);
    });
    
  // Add timeout to check if app loads properly
  setTimeout(() => {
    mainWindow.webContents.executeJavaScript(`
      const rootElement = document.getElementById('root');
      if (rootElement && rootElement.children.length === 0) {
        console.error('❌ React app still not loaded after 5 seconds');
        document.body.innerHTML = '<div style="padding: 20px; color: red; font-family: Arial;"><h1>Application Loading Error</h1><p>The application failed to load properly. Please check the console for details.</p><p>If this problem persists, please contact support.</p></div>';
      }
    `).catch(err => {
      console.error('❌ Error checking app status:', err);
    });
  }, 5000);
  
  // Add additional timeout for more thorough checking
  setTimeout(() => {
    mainWindow.webContents.executeJavaScript(`
      const rootElement = document.getElementById('root');
      if (rootElement && rootElement.children.length === 0) {
        console.error('❌ React app still not loaded after 10 seconds');
        document.body.innerHTML = '<div style="padding: 20px; color: red; font-family: Arial;"><h1>Critical Application Error</h1><p>The application has failed to load after multiple attempts.</p><p>This may be due to a missing dependency or configuration issue.</p><p>Please check the console for detailed error messages.</p></div>';
      }
    `).catch(err => {
      console.error('❌ Error checking app status (10s):', err);
    });
  }, 10000);
  
  // Add final timeout for comprehensive error handling
  setTimeout(() => {
    mainWindow.webContents.executeJavaScript(`
      const rootElement = document.getElementById('root');
      if (rootElement && rootElement.children.length === 0) {
        console.error('❌ React app still not loaded after 15 seconds - giving up');
        document.body.innerHTML = '<div style="padding: 20px; color: red; font-family: Arial;"><h1>Application Failed to Load</h1><p>The application has failed to load after 15 seconds.</p><p>This indicates a serious issue with the application configuration.</p><p>Please try the following:</p><ul><li>Restart the application</li><li>Check if all required files are present</li><li>Contact support if the problem persists</li></ul></div>';
      }
    `).catch(err => {
      console.error('❌ Error checking app status (15s):', err);
    });
  }, 15000);
  
  // Add comprehensive error logging
  mainWindow.webContents.on('crashed', (event) => {
    console.error('❌ Renderer process crashed');
  });
  
  mainWindow.webContents.on('unresponsive', () => {
    console.error('❌ Renderer process became unresponsive');
  });
  
  mainWindow.webContents.on('responsive', () => {
    console.log('✅ Renderer process became responsive again');
  });
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
      const normalizedPath = path.normalize(url);
      console.log('📁 Loading file:', normalizedPath);
      callback({ path: normalizedPath });
    });
    
    // Also register a custom protocol for better handling
    protocol.registerFileProtocol('app', (request, callback) => {
      const url = request.url.substr(6); // Remove 'app://'
      const filePath = path.join(__dirname, '..', url);
      console.log('📁 Loading app file:', filePath);
      callback({ path: filePath });
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
function getSheetsClient(credentialsFile = 'alahlypks.json') {
  try {
    // Define the credentials file path based on the file name
    // In production, credentials are copied to the app resources
    const credentialsPath = isDev 
      ? path.join(__dirname, `../src/credentials/${credentialsFile}`)
      : path.join(process.resourcesPath, `credentials/${credentialsFile}`);
    
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

// Separate function for PKS data
function getPKSSheetsClient() {
  return getSheetsClient('alahlypks.json');
}

// Main sheets client for general data
function getMainSheetsClient() {
  return getSheetsClient('alahlypks.json'); // You can change this to your main credentials file
}

ipcMain.handle('sheets:read', async (event, args) => {
  try {
    const { sheetId, sheetName, range } = args;
    
    console.log('📊 Sheets Read Request:');
    console.log('   Sheet ID:', sheetId);
    console.log('   Sheet Name:', sheetName);
    console.log('   Range:', range);
    
    const sheets = getMainSheetsClient();
    const fullRange = `${sheetName}!${range}`;
    console.log('   Full Range:', fullRange);
    
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: fullRange
    });
    
    console.log('✅ Sheets Read Success:', response.data.values ? response.data.values.length : 0, 'rows');
    return response.data.values || [];
  } catch (error) {
    console.error('❌ Error reading sheet:', error);
    console.error('Sheet ID:', args.sheetId);
    console.error('Sheet Name:', args.sheetName);
    console.error('Range:', args.range);
    console.error('Error details:', error.message);
    throw new Error(`Failed to read sheet: ${error.message}`);
  }
});

// Separate handler for PKS data
ipcMain.handle('pks:read', async (event, args) => {
  try {
    const { sheetId, sheetName, range } = args;
    
    console.log('⚽ PKS Read Request:');
    console.log('   Sheet ID:', sheetId);
    console.log('   Sheet Name:', sheetName);
    console.log('   Range:', range);
    
    const sheets = getPKSSheetsClient();
    const fullRange = `${sheetName}!${range}`;
    console.log('   Full Range:', fullRange);
    
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: fullRange
    });
    
    console.log('✅ PKS Read Success:', response.data.values ? response.data.values.length : 0, 'rows');
    return response.data.values || [];
  } catch (error) {
    console.error('❌ Error reading PKS sheet:', error);
    console.error('Sheet ID:', args.sheetId);
    console.error('Sheet Name:', args.sheetName);
    console.error('Range:', args.range);
    console.error('Error details:', error.message);
    throw new Error(`Failed to read PKS sheet: ${error.message}`);
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
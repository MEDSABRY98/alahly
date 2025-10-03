/**
 * Debug utilities for Football Database Electron app
 * This file provides debugging capabilities in production builds
 */

const { app, BrowserWindow } = require('electron');
const path = require('path');

/**
 * Enable debug mode for production builds
 * This helps diagnose issues when the app doesn't work properly
 */
function enableDebugMode() {
  console.log('🔧 Debug mode enabled for Football Database');
  
  // Enable detailed logging
  process.env.DEBUG = 'electron:*';
  
  // Add debug information to console
  console.log('📊 Debug Information:');
  console.log('   - App Version:', app.getVersion());
  console.log('   - Electron Version:', process.versions.electron);
  console.log('   - Node Version:', process.versions.node);
  console.log('   - Chrome Version:', process.versions.chrome);
  console.log('   - Platform:', process.platform);
  console.log('   - Architecture:', process.arch);
  console.log('   - App Path:', app.getAppPath());
  console.log('   - User Data Path:', app.getPath('userData'));
  
  // Check if build directory exists
  const buildPath = path.join(__dirname, '../build');
  const fs = require('fs');
  
  if (fs.existsSync(buildPath)) {
    console.log('✅ Build directory exists');
    const buildContents = fs.readdirSync(buildPath);
    console.log('📁 Build contents:', buildContents);
    
    // Check for essential files
    const essentialFiles = ['index.html', 'static'];
    essentialFiles.forEach(file => {
      if (buildContents.includes(file)) {
        console.log(`✅ Found essential file: ${file}`);
      } else {
        console.log(`❌ Missing essential file: ${file}`);
      }
    });
  } else {
    console.log('❌ Build directory does not exist!');
    console.log('   Expected path:', buildPath);
  }
  
  // Add error handlers
  process.on('uncaughtException', (error) => {
    console.error('❌ Uncaught Exception:', error);
  });
  
  process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  });
  
  // Add window debugging
  app.on('browser-window-created', (event, window) => {
    console.log('🪟 Browser window created');
    
    window.on('ready-to-show', () => {
      console.log('✅ Window ready to show');
    });
    
    window.webContents.on('did-finish-load', () => {
      console.log('✅ Page finished loading');
      
      // Check if React app loaded
      window.webContents.executeJavaScript(`
        console.log('🔍 Debug: Checking React app...');
        const root = document.getElementById('root');
        if (root && root.children.length > 0) {
          console.log('✅ React app loaded successfully');
        } else {
          console.log('❌ React app not loaded or empty');
        }
      `).catch(err => {
        console.error('❌ Error checking React app:', err);
      });
    });
    
    window.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
      console.error('❌ Page failed to load:', errorCode, errorDescription, validatedURL);
    });
  });
}

module.exports = {
  enableDebugMode
};
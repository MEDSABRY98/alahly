// Factory to determine which sheets service to use based on environment
import sheetsService from './sheetsService';
import sheetsServiceWeb from './sheetsServiceWeb';

// Check if we're running in Electron (desktop app) or web browser
const isElectron = () => {
  return window.require && window.require('electron');
};

// Export the appropriate service based on environment
const getSheetsService = () => {
  if (isElectron()) {
    console.log('🖥️ Using Electron Sheets Service (Desktop App)');
    return sheetsService;
  } else {
    console.log('🌐 Using Web Sheets Service (Browser)');
    return sheetsServiceWeb;
  }
};

export default getSheetsService();

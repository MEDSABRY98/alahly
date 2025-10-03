// Factory to determine which PKS service to use based on environment
import { pksService } from './pksService';
import pksServiceWeb from './pksServiceWeb';

// Check if we're running in Electron (desktop app) or web browser
const isElectron = () => {
  return window.electronAPI && window.electronAPI.isElectron;
};

// Export the appropriate service based on environment
const getPKSService = () => {
  if (isElectron()) {
    console.log('🖥️ Using Electron PKS Service (Desktop App)');
    return pksService;
  } else {
    console.log('🌐 Using Web PKS Service (Browser)');
    return pksServiceWeb;
  }
};

export const pksServiceFactory = getPKSService();
export default pksServiceFactory;

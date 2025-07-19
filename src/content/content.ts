import { 
  ExtensionAction,
  SunflowerSessionData,
  NetworkMonitoringMessage
} from '../types/extension';

console.log('Sunflower API Monitor content script chargé');

// Écouter les messages du monde MAIN
window.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SUNFLOWER_NETWORK_DATA') {
    const networkData: SunflowerSessionData = event.data.data;
    
    console.log('📨 Message reçu du monde MAIN:', networkData.method, networkData.url);
    
    // Transférer vers le background script
    const message: NetworkMonitoringMessage = {
      action: ExtensionAction.NETWORK_REQUEST,
      data: networkData
    };
    
    chrome.runtime.sendMessage(message).catch(error => {
      console.log('Erreur envoi vers background:', error);
    });
  }
});
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
    
    const logPrefix = networkData.type === 'autosave' ? '🔄' : '🟢';
    console.log(`${logPrefix} Message reçu du monde MAIN:`, {
      type: networkData.type,
      method: networkData.method,
      url: networkData.url,
      analyticsId: networkData.analyticsId
    });
    
    // Transférer vers le background script
    const message: NetworkMonitoringMessage = {
      action: ExtensionAction.NETWORK_REQUEST,
      data: networkData
    };
    
    chrome.runtime.sendMessage(message)
      .then(() => {
        console.log(`${logPrefix} Message transféré vers background avec succès`);
      })
      .catch(error => {
        console.error('Erreur envoi vers background:', error);
      });
  }
});
import { 
  ExtensionAction,
  SunflowerSessionData,
  NetworkMonitoringMessage,
  TimersExtractedMessage
} from '../types/extension';


// Écouter les messages du monde MAIN
window.addEventListener('message', (event) => {
  // Messages réseau (silencieux)
  if (event.data && event.data.type === 'SUNFLOWER_NETWORK_DATA') {
    const networkData: SunflowerSessionData = event.data.data;
    
    const message: NetworkMonitoringMessage = {
      action: ExtensionAction.NETWORK_REQUEST,
      data: networkData
    };
    
    chrome.runtime.sendMessage(message).catch(() => {
      // Silencieux
    });
  }

  // Messages timers
  if (event.data && event.data.type === 'SUNFLOWER_TIMER_DATA') {
    const timerData = event.data.data;
    
    const message: TimersExtractedMessage = {
      action: ExtensionAction.TIMERS_EXTRACTED,
      data: timerData
    };
    
    chrome.runtime.sendMessage(message).catch(() => {
      // Silencieux
    });
  }
});
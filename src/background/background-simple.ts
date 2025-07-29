// Background script minimal pour tests

chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.set({ sessionData: [] });
});

chrome.runtime.onMessage.addListener((request: any, _sender: any, sendResponse: any) => {
  
  // Gestion des données réseau (existant)
  if (request.action === 'networkRequest') {
    chrome.storage.local.get(['sessionData'], (result: any) => {
      const sessionData = result['sessionData'] || [];
      sessionData.push(request.data);
      
      // Garder seulement les 1000 dernières entrées
      if (sessionData.length > 1000) {
        sessionData.splice(0, sessionData.length - 1000);
      }
      
      chrome.storage.local.set({ sessionData }, () => {
        sendResponse({ success: true });
      });
    });
    return true; // Pour réponse asynchrone
  }
  
  // Gestion des données de timers (nouveau - version simplifiée)
  if (request.action === 'timersExtracted') {

    // Stocker les dernières données de timers
    chrome.storage.local.get(['timerData'], (result: any) => {
      const timerHistory = result['timerData'] || [];
      timerHistory.push(request.data);
      
      // Garder seulement les 100 dernières extractions
      if (timerHistory.length > 100) {
        timerHistory.splice(0, timerHistory.length - 100);
      }
      
      chrome.storage.local.set({ 
        timerData: timerHistory,
        lastTimerExtraction: request.data 
      }, () => {
        sendResponse({ success: true });
      });
    });
    return true;
  }
  
  if (request.action === 'getSessionData') {
    chrome.storage.local.get(['sessionData'], (result: any) => {
      const sessionData = result['sessionData'] || [];
      sendResponse(sessionData); // Retourner directement les données
    });
    return true;
  }

  // Récupérer les données de timers (nouveau)
  if (request.action === 'getTimerData') {
    chrome.storage.local.get(['timerData', 'lastTimerExtraction'], (result: any) => {
      const timerData = result['timerData'] || [];
      const lastExtraction = result['lastTimerExtraction'] || null;
      sendResponse({ history: timerData, latest: lastExtraction });
    });
    return true;
  }
  
  sendResponse({ success: false });
  return false;
});
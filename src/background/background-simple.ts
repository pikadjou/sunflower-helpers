// Background script minimal pour tests
console.log('Background script chargé');

chrome.runtime.onInstalled.addListener(() => {
  console.log('Extension installée');
  chrome.storage.local.set({ sessionData: [] });
});

chrome.runtime.onMessage.addListener((request: any, _sender: any, sendResponse: any) => {
  console.log('Message reçu:', request);
  
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
  
  if (request.action === 'getSessionData') {
    chrome.storage.local.get(['sessionData'], (result: any) => {
      const sessionData = result['sessionData'] || [];
      console.log('Background: Retour de', sessionData.length, 'sessions');
      sendResponse(sessionData); // Retourner directement les données
    });
    return true;
  }
  
  sendResponse({ success: false });
  return false;
});
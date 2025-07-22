import { 
  ExtensionAction,
  SunflowerSessionData,
  SunflowerGameData,
  NetworkMonitoringMessage,
  AutosaveUpdateMessage
} from '../types/extension';

class BackgroundManager {
  constructor() {
    this.initialize();
  }

  private initialize(): void {
    chrome.runtime.onInstalled.addListener(() => this.handleInstall());
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => 
      this.handleMessage(request, sender, sendResponse)
    );
    
    console.log('Sunflower API Monitor démarré');
  }

  private handleInstall(): void {
    console.log('Sunflower API Monitor installé');
    // Initialiser le stockage vide pour les données de session
    chrome.storage.local.set({ sessionData: [] });
  }

  private handleMessage(
    request: any, 
    _sender: chrome.runtime.MessageSender, 
    sendResponse: (response?: any) => void
  ): boolean {
    console.log('Message reçu:', request);
    
    switch (request.action) {
      case ExtensionAction.GET_SESSION_DATA:
        this.getSessionData().then(data => sendResponse(data));
        return true;
        
      case ExtensionAction.NETWORK_REQUEST:
        const networkMsg = request as NetworkMonitoringMessage;
        if (networkMsg.data) {
          this.handleNetworkDataFromContent(networkMsg.data);
        }
        break;
        
      case 'GET_LATEST_AUTOSAVE':
        this.getLatestAutosaveData().then(data => sendResponse(data));
        return true;
        
      default:
        console.log('Action non reconnue:', request.action);
    }

    return false;
  }


  // Méthodes pour recevoir les données des content scripts
  private handleNetworkDataFromContent(data: SunflowerSessionData): void {
    console.log('Données réseau reçues du content script:', data.url, 'Type:', data.type);
    
    if (data.type === 'autosave') {
      this.handleAutosaveData(data);
    } else {
      this.storeSunflowerSessionData(data);
    }
  }

  private handleAutosaveData(data: SunflowerSessionData): void {
    console.log('Traitement données autosave, analyticsId:', data.analyticsId);
    
    // Stocker aussi les données d'autosave dans l'historique
    this.storeSunflowerSessionData(data);
    
    // Extraire les données de la ferme pour mise à jour temps réel
    if (data.responseBody?.farm) {
      this.broadcastRealTimeUpdate(data.responseBody.farm, data.analyticsId);
    } else if (data.responseBody && !data.responseBody.farm) {
      // Si la structure est différente, essayer d'utiliser directement responseBody
      this.broadcastRealTimeUpdate(data.responseBody, data.analyticsId);
    }
  }

  private async broadcastRealTimeUpdate(farmData: SunflowerGameData, analyticsId?: string): Promise<void> {
    console.log('Diffusion mise à jour temps réel:', analyticsId);
    
    // Stocker les dernières données d'autosave pour les popups qui s'ouvrent plus tard
    await chrome.storage.local.set({ 
      lastAutosaveData: farmData,
      lastAutosaveTimestamp: Date.now(),
      lastAutosaveAnalyticsId: analyticsId || 'unknown'
    });
    
    // Notifier la popup si elle est ouverte
    try {
      chrome.runtime.sendMessage({
        action: ExtensionAction.AUTOSAVE_UPDATE,
        data: farmData,
        analyticsId: analyticsId || 'unknown'
      } as AutosaveUpdateMessage);
      console.log('✅ Message autosave envoyé au popup');
    } catch (error) {
      console.log('😴 Popup non disponible, données stockées pour plus tard');
    }
  }

  private async storeSunflowerSessionData(sessionData: SunflowerSessionData): Promise<void> {
    try {
      const result = await chrome.storage.local.get(['sessionData']);
      let storedData: SunflowerSessionData[] = result['sessionData'] || [];
      
      // Ajouter la nouvelle donnée
      storedData.push(sessionData);
      
      // Maintenir un maximum de 1000 entrées (comme indiqué dans CLAUDE.md)
      if (storedData.length > 1000) {
        storedData = storedData.slice(-1000);
      }
      
      await chrome.storage.local.set({ sessionData: storedData });
      
      console.log('Données de session stockées:', sessionData.url, sessionData.method, 'Type:', sessionData.type);
      
      // Notifier les autres composants (seulement pour les sessions, pas les autosaves)
      if (sessionData.type === 'session') {
        this.notifySessionDataUpdate();
      }
      
    } catch (error) {
      console.error('Erreur lors du stockage des données de session:', error);
    }
  }

  private async getSessionData(): Promise<SunflowerSessionData[]> {
    try {
      const result = await chrome.storage.local.get(['sessionData']);
      return result['sessionData'] || [];
    } catch (error) {
      console.error('Erreur lors de la récupération des données de session:', error);
      return [];
    }
  }

  private async getLatestAutosaveData(): Promise<any> {
    try {
      const result = await chrome.storage.local.get(['lastAutosaveData', 'lastAutosaveTimestamp', 'lastAutosaveAnalyticsId']);
      return {
        data: result['lastAutosaveData'] || null,
        timestamp: result['lastAutosaveTimestamp'] || 0,
        analyticsId: result['lastAutosaveAnalyticsId'] || null
      };
    } catch (error) {
      console.error('Erreur lors de la récupération des données d\'autosave:', error);
      return { data: null, timestamp: 0, analyticsId: null };
    }
  }

  private notifySessionDataUpdate(): void {
    // Notifier la popup si elle est ouverte
    try {
      chrome.runtime.sendMessage({
        action: ExtensionAction.NETWORK_REQUEST
      });
    } catch (error) {
      // Popup fermée, ignorer l'erreur
    }
  }
}

// Initialisation du service worker
new BackgroundManager();
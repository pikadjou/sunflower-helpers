import { 
  ExtensionAction,
  SunflowerSessionData,
  NetworkMonitoringMessage
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
        
      default:
        console.log('Action non reconnue:', request.action);
    }

    return false;
  }


  // Méthodes pour recevoir les données des content scripts
  private handleNetworkDataFromContent(data: SunflowerSessionData): void {
    console.log('Données réseau reçues du content script:', data.url);
    this.storeSunflowerSessionData(data);
  }

  private async storeSunflowerSessionData(sessionData: SunflowerSessionData): Promise<void> {
    try {
      const result = await chrome.storage.local.get(['sessionData']);
      let storedData: SunflowerSessionData[] = result['sessionData'] || [];
      
      // Ajouter la nouvelle donnée
      storedData.push(sessionData);
      
      
      await chrome.storage.local.set({ sessionData: storedData });
      
      console.log('Données de session stockées:', sessionData.url, sessionData.method);
      
      // Notifier les autres composants
      this.notifySessionDataUpdate();
      
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
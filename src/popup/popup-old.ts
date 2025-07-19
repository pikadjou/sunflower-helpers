import { 
  ExtensionSettings, 
  ExtensionStats, 
  ExtensionAction,
  AutoModeChangedMessage,
  ToggleFeatureMessage,
  SunflowerSessionData
} from '../types/extension';

class PopupManager {
  private isFeatureActive = false;
  private settings: ExtensionSettings = { isActive: false, autoMode: false };
  private sessionData: SunflowerSessionData[] = [];

  constructor() {
    this.initializePopup();
  }

  private async initializePopup(): Promise<void> {
    console.log('Sunflower Helpers popup initialisée');
    
    await this.loadSettings();
    await this.loadStats();
    await this.loadSessionData();
    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    const toggleBtn = document.getElementById('toggleButton') as HTMLButtonElement;
    const autoModeCheckbox = document.getElementById('autoMode') as HTMLInputElement;
    const isActiveCheckbox = document.getElementById('isActive') as HTMLInputElement;
    const focusBtn = document.getElementById('focusButton') as HTMLButtonElement;
    const viewSessionDataBtn = document.getElementById('viewSessionDataButton') as HTMLButtonElement;
    const exportSessionDataBtn = document.getElementById('exportSessionDataButton') as HTMLButtonElement;
    const closeModalBtn = document.getElementById('closeModal') as HTMLButtonElement;
    const urlFilter = document.getElementById('urlFilter') as HTMLInputElement;
    const methodFilter = document.getElementById('methodFilter') as HTMLSelectElement;

    if (toggleBtn) {
      toggleBtn.addEventListener('click', () => this.toggleMainFeature());
    }

    if (autoModeCheckbox) {
      autoModeCheckbox.addEventListener('change', (event) => 
        this.handleAutoModeChange(event as Event)
      );
    }

    if (isActiveCheckbox) {
      isActiveCheckbox.addEventListener('change', (event) => 
        this.handleIsActiveChange(event as Event)
      );
    }

    if (focusBtn) {
      focusBtn.addEventListener('click', () => this.activateFocusMode());
    }

    if (viewSessionDataBtn) {
      viewSessionDataBtn.addEventListener('click', () => this.showSessionDataModal());
    }

    if (exportSessionDataBtn) {
      exportSessionDataBtn.addEventListener('click', () => this.exportSessionData());
    }

    if (closeModalBtn) {
      closeModalBtn.addEventListener('click', () => this.hideSessionDataModal());
    }

    if (urlFilter) {
      urlFilter.addEventListener('input', () => this.filterSessionData());
    }

    if (methodFilter) {
      methodFilter.addEventListener('change', () => this.filterSessionData());
    }

    // Fermer la modal en cliquant à l'extérieur
    const modal = document.getElementById('sessionDataModal');
    if (modal) {
      modal.addEventListener('click', (event) => {
        if (event.target === modal) {
          this.hideSessionDataModal();
        }
      });
    }
  }

  private async loadSettings(): Promise<void> {
    try {
      const result = await chrome.storage.sync.get(['isActive', 'autoMode']);
      
      this.isFeatureActive = result['isActive'] || false;
      this.settings = {
        isActive: result['isActive'] || false,
        autoMode: result['autoMode'] || false
      };

      this.updateToggleButton();

      const autoModeCheckbox = document.getElementById('autoMode') as HTMLInputElement;
      if (autoModeCheckbox) {
        autoModeCheckbox.checked = this.settings.autoMode;
      }
    } catch (error) {
      console.error('Erreur lors du chargement des paramètres:', error);
    }
  }

  private async loadStats(): Promise<void> {
    try {
      const result = await chrome.storage.local.get(['pageCount']);
      const stats: ExtensionStats = {
        pageCount: result['pageCount'] || 0
      };

      const pageCountElement = document.getElementById('pageCount');
      if (pageCountElement) {
        pageCountElement.textContent = stats.pageCount.toString();
      }
    } catch (error) {
      console.error('Erreur lors du chargement des statistiques:', error);
    }
  }

  private async toggleMainFeature(): Promise<void> {
    this.isFeatureActive = !this.isFeatureActive;

    try {
      await chrome.storage.sync.set({ isActive: this.isFeatureActive });
      this.updateToggleButton();

      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tabs[0]?.id) {
        const message: ToggleFeatureMessage = {
          action: ExtensionAction.TOGGLE_FEATURE,
          isActive: this.isFeatureActive
        };

        await chrome.tabs.sendMessage(tabs[0].id, message);
      }
    } catch (error) {
      console.error('Erreur lors du toggle de la fonctionnalité:', error);
    }
  }

  private updateToggleButton(): void {
    const toggleBtn = document.getElementById('toggleFeature') as HTMLButtonElement;
    
    if (toggleBtn) {
      if (this.isFeatureActive) {
        toggleBtn.textContent = 'Désactiver l\'assistant';
        toggleBtn.style.background = '#d63031';
      } else {
        toggleBtn.textContent = 'Activer l\'assistant';
        toggleBtn.style.background = '#e17055';
      }
    }
  }

  private async handleAutoModeChange(event: Event): Promise<void> {
    const target = event.target as HTMLInputElement;
    const autoMode = target.checked;

    try {
      await chrome.storage.sync.set({ autoMode });

      const message: AutoModeChangedMessage = {
        action: ExtensionAction.AUTO_MODE_CHANGED,
        autoMode
      };

      await chrome.runtime.sendMessage(message);
    } catch (error) {
      console.error('Erreur lors du changement de mode automatique:', error);
    }
  }


  public async updateStats(): Promise<void> {
    await this.loadStats();
    await this.loadSessionData();
  }

  private async loadSessionData(): Promise<void> {
    try {
      const response = await chrome.runtime.sendMessage({
        action: ExtensionAction.GET_SESSION_DATA
      });
      
      this.sessionData = response || [];
      this.updateSessionDataStats();
    } catch (error) {
      console.error('Erreur lors du chargement des données de session:', error);
    }
  }

  private updateSessionDataStats(): void {
    const requestCountElement = document.getElementById('apiRequestCount');
    const lastRequestTimeElement = document.getElementById('lastRequestTime');
    
    if (requestCountElement) {
      requestCountElement.textContent = this.sessionData.length.toString();
    }
    
    if (lastRequestTimeElement && this.sessionData.length > 0) {
      const lastRequest = this.sessionData[this.sessionData.length - 1];
      if (lastRequest) {
        const date = new Date(lastRequest.timestamp);
        lastRequestTimeElement.textContent = date.toLocaleTimeString();
      }
    } else if (lastRequestTimeElement) {
      lastRequestTimeElement.textContent = 'Aucune';
    }
  }

  private async handleIsActiveChange(event: Event): Promise<void> {
    const target = event.target as HTMLInputElement;
    const isActive = target.checked;
    
    try {
      await chrome.storage.sync.set({ isActive });
      this.isFeatureActive = isActive;
      this.updateToggleButton();
      
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tabs[0]?.id) {
        const message: ToggleFeatureMessage = {
          action: ExtensionAction.TOGGLE_FEATURE,
          isActive
        };
        await chrome.tabs.sendMessage(tabs[0].id, message);
      }
    } catch (error) {
      console.error('Erreur lors du changement d\'état actif:', error);
    }
  }

  private async activateFocusMode(): Promise<void> {
    try {
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tabs[0]?.id) {
        await chrome.tabs.sendMessage(tabs[0].id, {
          action: 'focusMode'
        });
      }
    } catch (error) {
      console.error('Erreur lors de l\'activation du mode focus:', error);
    }
  }

  private showSessionDataModal(): void {
    const modal = document.getElementById('sessionDataModal');
    if (modal) {
      modal.style.display = 'flex';
      this.renderSessionData();
    }
  }

  private hideSessionDataModal(): void {
    const modal = document.getElementById('sessionDataModal');
    if (modal) {
      modal.style.display = 'none';
    }
  }

  private renderSessionData(): void {
    const container = document.getElementById('sessionDataList');
    if (!container) return;
    
    container.innerHTML = '';
    
    if (this.sessionData.length === 0) {
      container.innerHTML = '<p>Aucune donnée de session disponible.</p>';
      return;
    }
    
    this.sessionData.forEach(data => {
      const item = this.createSessionDataItem(data);
      container.appendChild(item);
    });
  }

  private createSessionDataItem(data: SunflowerSessionData): HTMLElement {
    const div = document.createElement('div');
    div.className = 'session-item';
    
    const timestamp = new Date(data.timestamp).toLocaleString();
    const url = new URL(data.url).pathname;
    
    div.innerHTML = `
      <div class="session-item-header">
        <div>
          <span class="session-method ${data.method}">${data.method}</span>
          <span class="session-url">${url}</span>
        </div>
        <span class="session-timestamp">${timestamp}</span>
      </div>
      <details class="session-details">
        <summary>Voir les détails</summary>
        ${data.requestBody ? `<div><strong>Request Body:</strong><pre>${JSON.stringify(data.requestBody, null, 2)}</pre></div>` : ''}
        ${data.responseBody ? `<div><strong>Response Body:</strong><pre>${JSON.stringify(data.responseBody, null, 2)}</pre></div>` : ''}
        ${data.responseHeaders ? `<div><strong>Response Headers:</strong><pre>${JSON.stringify(data.responseHeaders, null, 2)}</pre></div>` : ''}
        <div><strong>Status Code:</strong> ${data.statusCode || 'N/A'}</div>
      </details>
    `;
    
    return div;
  }

  private filterSessionData(): void {
    const urlFilter = (document.getElementById('urlFilter') as HTMLInputElement)?.value.toLowerCase() || '';
    const methodFilter = (document.getElementById('methodFilter') as HTMLSelectElement)?.value || '';
    
    const filteredData = this.sessionData.filter(data => {
      const urlMatch = !urlFilter || data.url.toLowerCase().includes(urlFilter);
      const methodMatch = !methodFilter || data.method === methodFilter;
      return urlMatch && methodMatch;
    });
    
    const container = document.getElementById('sessionDataList');
    if (!container) return;
    
    container.innerHTML = '';
    
    if (filteredData.length === 0) {
      container.innerHTML = '<p>Aucune donnée trouvée avec ces filtres.</p>';
      return;
    }
    
    filteredData.forEach(data => {
      const item = this.createSessionDataItem(data);
      container.appendChild(item);
    });
  }

  private exportSessionData(): void {
    if (this.sessionData.length === 0) {
      alert('Aucune donnée à exporter.');
      return;
    }
    
    const dataStr = JSON.stringify(this.sessionData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `sunflower-session-data-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    URL.revokeObjectURL(url);
  }
}

// Initialisation
document.addEventListener('DOMContentLoaded', () => {
  const popupManager = new PopupManager();

  // Écouter les messages du background script
  chrome.runtime.onMessage.addListener((request, _sender, _sendResponse) => {
    if (request.action === ExtensionAction.UPDATE_STATS) {
      popupManager.updateStats();
    }
    if (request.action === ExtensionAction.NETWORK_REQUEST) {
      popupManager.updateStats();
    }
  });
});
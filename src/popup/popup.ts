import { ExtensionAction, SunflowerSessionData, SunflowerGameData, AutosaveUpdateMessage } from '../types/extension';
import { OverviewRenderer, InventoryRenderer, MiningRenderer } from './renderers';
import { ResourcesRenderer, BuildingsRenderer } from './other-renderers';
import { RawDataRenderer, DebugRenderer } from './debug-renderers';
import { TimersRenderer } from './crop-tabs-renderer';

class DashboardManager {
  private sessionData: SunflowerSessionData[] = [];
  private currentGameData: SunflowerGameData | null = null;
  private activeSection: string = 'basic';
  private activeTab: string = 'inventory';
  private activeCategory: string = 'all';
  private activeMiningCategory: string = 'stones';
  private currentSearchTerm: string = '';
  // private activeAchievementCategory: string = 'farming'; // Unused for now

  constructor() {
    this.initializeDashboard();
  }

  private async initializeDashboard(): Promise<void> {
    
    // Charger d'abord les données de session
    await this.loadSessionData();
    
    // Extraire les données de jeu depuis les sessions
    this.extractGameData();
    
    // Vérifier s'il y a des données d'autosave plus récentes
    await this.checkForLatestAutosave();
    
    // Rendre le dashboard avec les données actuelles
    this.renderDashboard();
    
    // Configurer les événements APRÈS le render pour s'assurer que tous les éléments existent
    this.setupEventListeners();
  }

  private async checkForLatestAutosave(): Promise<void> {
    try {
      const response = await chrome.runtime.sendMessage({ action: 'GET_LATEST_AUTOSAVE' });
      
      if (response && response.data && response.timestamp) {
        // Vérifier si les données d'autosave sont plus récentes que les données de session
        const latestSessionTime = this.sessionData.length > 0 
          ? this.sessionData[this.sessionData.length - 1]?.timestamp || 0
          : 0;
        
        
        if (response.timestamp > latestSessionTime) {
          this.currentGameData = response.data;
          this.showUpdateNotification();
        }
      }
    } catch (error) {
    }
  }

  private setupEventListeners(): void {
    try {
      // Supprimer tous les anciens listeners d'abord pour éviter les doublons
      this.removeEventListeners();
      
      this.setupSectionSwitching();
      this.setupTabSwitching();
      this.setupCategorySwitching();
      this.setupActionButtons();
    } catch (error) {
    }
  }

  private removeEventListeners(): void {
    // Simple préparation - on n'a pas vraiment besoin de supprimer les listeners
    // car nous ne les configurons qu'une fois au démarrage et après les refreshs
  }

  private setupSectionSwitching(): void {
    const sectionBtns = document.querySelectorAll('.section-btn');
    sectionBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const target = e.target as HTMLElement;
        const section = target.dataset['section'];
        if (section) {
          this.switchSection(section);
        }
      });
    });
  }

  private switchSection(sectionName: string): void {
    this.activeSection = sectionName;
    
    // Update section buttons
    document.querySelectorAll('.section-btn').forEach(btn => {
      btn.classList.remove('active');
    });
    document.querySelector(`[data-section="${sectionName}"]`)?.classList.add('active');

    // Update section content
    document.querySelectorAll('.data-section').forEach(section => {
      section.classList.remove('active');
    });
    document.getElementById(`${sectionName}-section`)?.classList.add('active');

    // Set default tab for each section
    if (sectionName === 'basic') {
      this.activeTab = 'inventory';
      this.activeCategory = 'all'; // Reset à "Tous" pour l'inventaire
    } else {
      this.activeTab = 'overview';
    }

    // Update tab buttons in the active section
    const activeSection = document.getElementById(`${sectionName}-section`);
    if (activeSection) {
      const tabs = activeSection.querySelectorAll('.tab-btn');
      tabs.forEach(tab => tab.classList.remove('active'));
      const defaultTab = activeSection.querySelector(`[data-tab="${this.activeTab}"]`);
      defaultTab?.classList.add('active');
    }

    this.renderActiveTab().catch(() => {});
  }

  private setupTabSwitching(): void {
    const tabBtns = document.querySelectorAll('.tab-btn');
    tabBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const target = e.target as HTMLElement;
        const tab = target.dataset['tab'];
        if (tab) {
          this.switchTab(tab);
        } else {
        }
      });
    });
  }

  private setupCategorySwitching(): void {
    const categoryBtns = document.querySelectorAll('.category-btn[data-category]');
    categoryBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const target = e.target as HTMLElement;
        const category = target.dataset['category'];
        if (category) {
          this.switchCategory(category);
        }
      });
    });

    const miningCategoryBtns = document.querySelectorAll('.category-btn[data-mining-category]');
    miningCategoryBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const target = e.target as HTMLElement;
        const miningCategory = target.dataset['miningCategory'];
        if (miningCategory) {
          this.switchMiningCategory(miningCategory);
        }
      });
    });

  }

  private setupActionButtons(): void {
    const refreshBtn = document.getElementById('refreshData');
    const exportBtn = document.getElementById('exportData');
    const clearBtn = document.getElementById('clearData');
    const detachBtn = document.getElementById('detachBtn');


    if (refreshBtn) {
      refreshBtn.addEventListener('click', () => {
        this.refreshData();
      });
    }

    if (exportBtn) {
      exportBtn.addEventListener('click', () => {
        this.exportData();
      });
    }

    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        this.clearData();
      });
    }

    if (detachBtn) {
      detachBtn.addEventListener('click', () => {
        this.detachPopup();
      });
    }

    // Bouton close tip
    const closeTipBtn = document.getElementById('closeTip');
    if (closeTipBtn) {
      closeTipBtn.addEventListener('click', (e) => {
        const tipElement = (e.target as HTMLElement).parentElement;
        if (tipElement) {
          tipElement.style.display = 'none';
        }
      });
    }

    // Actions rapides de l'overview
    this.setupQuickActions();
    
    // Recherche d'inventaire
    this.setupInventorySearch();
  }

  private setupQuickActions(): void {
    const harvestAllBtn = document.getElementById('harvestAll');
    const collectHoneyBtn = document.getElementById('collectHoney');

    if (harvestAllBtn) {
      harvestAllBtn.addEventListener('click', () => this.harvestAll());
    }

    if (collectHoneyBtn) {
      collectHoneyBtn.addEventListener('click', () => this.collectAllHoney());
    }
  }

  // Actions rapides
  private harvestAll(): void {
    // Logique de récolte automatique
    alert('🌾 Fonction de récolte automatique en développement');
  }

  private collectAllHoney(): void {
    // Logique de collecte de miel
    alert('🍯 Fonction de collecte de miel en développement');
  }

  private setupInventorySearch(): void {
    const searchInput = document.getElementById('inventorySearch') as HTMLInputElement;
    const clearBtn = document.getElementById('clearSearch');
    
    if (searchInput) {
      // Événement de saisie avec déboucement
      let searchTimeout: number;
      searchInput.addEventListener('input', (e) => {
        clearTimeout(searchTimeout);
        searchTimeout = window.setTimeout(() => {
          const target = e.target as HTMLInputElement;
          this.currentSearchTerm = target.value.toLowerCase().trim();
          this.updateSearchUI();
          if (this.activeTab === 'inventory') {
            this.renderInventory();
          }
        }, 300); // Déboucement de 300ms
      });
      
      // Événement pour la touche Enter
      searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          clearTimeout(searchTimeout);
          this.currentSearchTerm = searchInput.value.toLowerCase().trim();
          this.updateSearchUI();
          if (this.activeTab === 'inventory') {
            this.renderInventory();
          }
        }
      });
    }
    
    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        if (searchInput) {
          searchInput.value = '';
          this.currentSearchTerm = '';
          this.updateSearchUI();
          if (this.activeTab === 'inventory') {
            this.renderInventory();
          }
        }
      });
    }
  }
  
  private updateSearchUI(): void {
    const clearBtn = document.getElementById('clearSearch');
    
    if (clearBtn) {
      if (this.currentSearchTerm.length > 0) {
        clearBtn.classList.remove('hidden');
      } else {
        clearBtn.classList.add('hidden');
      }
    }
  }

  private detachPopup(): void {
    // Ouvrir le dashboard dans un nouvel onglet
    const url = chrome.runtime.getURL('popup/popup.html');
    chrome.tabs.create({ url: url });
    
    // Fermer le popup actuel
    window.close();
  }

  private async loadSessionData(): Promise<void> {
    try {
      const response = await chrome.runtime.sendMessage({
        action: ExtensionAction.GET_SESSION_DATA
      });
      
      this.sessionData = response || [];
      
      if (this.sessionData.length > 0) {
      }
    } catch (error) {
    }
  }

  private extractGameData(): void {
    
    if (this.sessionData.length === 0) {
      this.currentGameData = null;
      // this.createTestData(); // Désactivé pour vérifier la capture réelle
      return;
    }

    const latestSession = this.sessionData[this.sessionData.length - 1];
    
    if (latestSession?.responseBody?.farm) {
      this.currentGameData = latestSession.responseBody.farm;
    } else if (latestSession?.responseBody) {
      this.currentGameData = latestSession.responseBody;
    } else {
      this.currentGameData = null;
      // this.createTestData(); // Désactivé pour vérifier la capture réelle
    }
  }

  private switchTab(tabName: string): void {
    this.activeTab = tabName;
    
    // Update tab buttons only in the active section
    const activeSection = document.getElementById(`${this.activeSection}-section`);
    if (activeSection) {
      const tabs = activeSection.querySelectorAll('.tab-btn');
      tabs.forEach(tab => tab.classList.remove('active'));
      const targetTab = activeSection.querySelector(`[data-tab="${tabName}"]`);
      targetTab?.classList.add('active');
    }

    // Update tab panes
    document.querySelectorAll('.tab-pane').forEach(pane => {
      pane.classList.remove('active');
    });
    document.getElementById(tabName)?.classList.add('active');

    this.renderActiveTab().catch(() => {});
  }

  private switchCategory(categoryName: string): void {
    this.activeCategory = categoryName;
    
    document.querySelectorAll('.category-btn[data-category]').forEach(btn => {
      btn.classList.remove('active');
    });
    document.querySelector(`[data-category="${categoryName}"]`)?.classList.add('active');

    this.renderInventory();
  }

  private switchMiningCategory(categoryName: string): void {
    this.activeMiningCategory = categoryName;
    
    document.querySelectorAll('.category-btn[data-mining-category]').forEach(btn => {
      btn.classList.remove('active');
    });
    document.querySelector(`[data-mining-category="${categoryName}"]`)?.classList.add('active');

    this.renderMining();
  }


  private renderDashboard(): void {
    
    this.updateFarmInfo();
    this.updateSessionCount();
    this.renderActiveTab().catch(() => {});
    
  }

  private updateFarmInfo(): void {
    const farmIdElement = document.getElementById('farmId');
    const lastUpdateElement = document.getElementById('lastUpdate');

    if (farmIdElement) {
      let farmId = 'Inconnu';
      
      if (this.currentGameData?.['id']) {
        farmId = this.currentGameData['id'].toString();
      } else if (this.sessionData.length > 0) {
        const lastSession = this.sessionData[this.sessionData.length - 1];
        if (lastSession?.responseBody?.farm?.['id']) {
          farmId = lastSession.responseBody.farm['id'].toString();
        }
      }
      
      farmIdElement.textContent = farmId;
    }

    if (lastUpdateElement && this.sessionData.length > 0) {
      const lastSession = this.sessionData[this.sessionData.length - 1];
      if (lastSession) {
        const date = new Date(lastSession.timestamp);
        lastUpdateElement.textContent = date.toLocaleTimeString('fr-FR', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit'
        });
      }
    }

  }


  private updateSessionCount(): void {
    const countElement = document.getElementById('sessionCount');
    if (countElement) {
      try {
        const count = this.sessionData?.length || 0;
        countElement.textContent = count.toString();
      } catch (error) {
        countElement.textContent = '0';
      }
    }
  }

  private async renderActiveTab(): Promise<void> {
    switch (this.activeTab) {
      case 'overview':
        this.renderOverview();
        break;
      case 'timers':
        await this.renderTimers();
        break;
      case 'inventory':
        this.renderInventory();
        break;
      case 'resources':
        this.renderResources();
        break;
      case 'buildings':
        this.renderBuildings();
        break;
      case 'mining':
        this.renderMining();
        break;
      case 'raw-data':
        this.renderRawData();
        break;
      case 'debug':
        this.renderDebug();
        break;
    }
  }

  private renderOverview(): void {
    OverviewRenderer.render(this.currentGameData);
    this.updateOverviewExtensions();
  }

  private updateOverviewExtensions(): void {
    // Mettre à jour les nouvelles statistiques de l'overview
    if (!this.currentGameData) {
      return;
    }


    // Série quotidienne
    const dailyStreakEl = document.getElementById('dailyStreak');
    if (dailyStreakEl) {
      const streaks = this.currentGameData.dailyRewards?.streaks || 0;
      dailyStreakEl.textContent = streaks.toString();
    }

    // Miel total
    const totalHoneyEl = document.getElementById('totalHoney');
    if (totalHoneyEl) {
      const beehives = this.currentGameData.beehives || {};
      const totalHoney = Object.values(beehives).reduce((total: number, beehive: any) => {
        return total + (beehive.honey?.produced || 0);
      }, 0);
      totalHoneyEl.textContent = totalHoney.toFixed(1);
    }
  }

  private renderInventory(): void {
    InventoryRenderer.render(this.currentGameData, this.activeCategory, this.currentSearchTerm);
  }

  private renderResources(): void {
    ResourcesRenderer.render(this.currentGameData);
  }


  private renderBuildings(): void {
    BuildingsRenderer.render(this.currentGameData);
  }

  private renderMining(): void {
    MiningRenderer.render(this.currentGameData, this.activeMiningCategory);
  }

  private renderRawData(): void {
    RawDataRenderer.render(this.sessionData);
  }

  private renderDebug(): void {
    DebugRenderer.render(this.sessionData, this.currentGameData);
  }


  private async renderTimers(): Promise<void> {
    await TimersRenderer.render(this.currentGameData);
  }

  private async refreshData(): Promise<void> {
    await this.loadSessionData();
    this.extractGameData();
    this.renderDashboard();
    // Reconfigurer les événements après le refresh
    this.setupEventListeners();
  }

  private exportData(): void {
    if (!this.currentGameData) {
      alert('Aucune donnée à exporter.');
      return;
    }
    
    const dataStr = JSON.stringify(this.currentGameData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `sunflower-farm-data-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    URL.revokeObjectURL(url);
  }

  private async clearData(): Promise<void> {
    if (!confirm('Êtes-vous sûr de vouloir effacer toutes les données interceptées ?')) {
      return;
    }

    try {
      await chrome.storage.local.set({ sessionData: [] });
      this.sessionData = [];
      this.currentGameData = null;
      this.renderDashboard();
      
      alert('Toutes les données ont été effacées.');
    } catch (error) {
      alert('Erreur lors de l\'effacement des données.');
    }
  }

  public async updateDashboard(): Promise<void> {
    await this.loadSessionData();
    this.extractGameData();
    this.renderDashboard();
  }

  public handleRealTimeUpdate(farmData: SunflowerGameData): void {
    
    // Mettre à jour les données actuelles
    this.currentGameData = farmData;
    
    // Afficher une notification de mise à jour
    this.showUpdateNotification();
    
    // Re-rendre automatiquement tout le dashboard
    this.renderDashboard();
    
    // Reconfigurer les événements après le re-render
    this.setupEventListeners();
    
  }

  private showUpdateNotification(): void {
    // Créer ou mettre à jour une notification visuelle
    let notification = document.getElementById('updateNotification');
    
    if (!notification) {
      notification = document.createElement('div');
      notification.id = 'updateNotification';
      notification.className = 'update-notification';
      document.querySelector('.header')?.appendChild(notification);
    }
    
    const now = new Date().toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
    
    notification.innerHTML = `🔄 Mis à jour automatiquement à ${now}`;
    notification.style.display = 'block';
    
    // Masquer après 5 secondes
    setTimeout(() => {
      if (notification) {
        notification.style.display = 'none';
      }
    }, 5000);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const dashboardManager = new DashboardManager();

  // Ajouter un listener pour les messages en temps réel
  chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
    
    if (request.action === ExtensionAction.NETWORK_REQUEST) {
      dashboardManager.updateDashboard().then(() => {
        sendResponse({ success: true });
      }).catch((error: Error) => {
        sendResponse({ success: false, error: error.message });
      });
      return true; // Pour indiquer une réponse asynchrone
    } else if (request.action === ExtensionAction.AUTOSAVE_UPDATE) {
      const autosaveMsg = request as AutosaveUpdateMessage;
      try {
        dashboardManager.handleRealTimeUpdate(autosaveMsg.data);
        sendResponse({ success: true });
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
        sendResponse({ success: false, error: errorMessage });
      }
    }
    return false; // Pour les autres cas
  });

  // Vérifier périodiquement les nouvelles données (fallback)
  setInterval(async () => {
    try {
      await dashboardManager.updateDashboard();
    } catch (error) {
    }
  }, 30000); // Toutes les 30 secondes
});
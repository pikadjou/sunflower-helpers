import { ExtensionAction, SunflowerSessionData, SunflowerGameData } from '../types/extension';
import { OverviewRenderer, InventoryRenderer, MiningRenderer } from './renderers';
import { ResourcesRenderer, AnimalsRenderer, BuildingsRenderer } from './other-renderers';
import { RawDataRenderer, DebugRenderer } from './debug-renderers';

class DashboardManager {
  private sessionData: SunflowerSessionData[] = [];
  private currentGameData: SunflowerGameData | null = null;
  private activeTab: string = 'overview';
  private activeCategory: string = 'seeds';
  private activeMiningCategory: string = 'stones';

  constructor() {
    this.initializeDashboard();
  }

  private async initializeDashboard(): Promise<void> {
    console.log('Sunflower Dashboard initialisé');
    
    await this.loadSessionData();
    this.setupEventListeners();
    this.extractGameData();
    this.renderDashboard();
  }

  private setupEventListeners(): void {
    this.setupTabSwitching();
    this.setupCategorySwitching();
    this.setupActionButtons();
  }

  private setupTabSwitching(): void {
    const tabBtns = document.querySelectorAll('.tab-btn');
    tabBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const target = e.target as HTMLElement;
        const tab = target.dataset['tab'];
        if (tab) {
          this.switchTab(tab);
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

    if (refreshBtn) {
      refreshBtn.addEventListener('click', () => this.refreshData());
    }

    if (exportBtn) {
      exportBtn.addEventListener('click', () => this.exportData());
    }

    if (clearBtn) {
      clearBtn.addEventListener('click', () => this.clearData());
    }
  }

  private async loadSessionData(): Promise<void> {
    try {
      const response = await chrome.runtime.sendMessage({
        action: ExtensionAction.GET_SESSION_DATA
      });
      
      this.sessionData = response || [];
      console.log('Données de session chargées:', this.sessionData.length, 'sessions');
      
      if (this.sessionData.length > 0) {
        console.log('Dernière session:', this.sessionData[this.sessionData.length - 1]);
      }
    } catch (error) {
      console.error('Erreur lors du chargement des données de session:', error);
    }
  }

  private extractGameData(): void {
    if (this.sessionData.length === 0) {
      this.currentGameData = null;
      console.log('Aucune donnée de session disponible');
      return;
    }

    const latestSession = this.sessionData[this.sessionData.length - 1];
    console.log('Session la plus récente:', latestSession);
    
    if (latestSession?.responseBody?.farm) {
      this.currentGameData = latestSession.responseBody.farm;
      console.log('Données de la ferme extraites:', this.currentGameData);
    } else if (latestSession?.responseBody) {
      this.currentGameData = latestSession.responseBody;
      console.log('Données extraites depuis responseBody:', this.currentGameData);
    } else {
      console.log('Pas de responseBody dans la session');
      this.currentGameData = null;
    }
  }

  private switchTab(tabName: string): void {
    this.activeTab = tabName;
    
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.classList.remove('active');
    });
    document.querySelector(`[data-tab="${tabName}"]`)?.classList.add('active');

    document.querySelectorAll('.tab-pane').forEach(pane => {
      pane.classList.remove('active');
    });
    document.getElementById(tabName)?.classList.add('active');

    this.renderActiveTab();
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
    this.renderActiveTab();
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
        lastUpdateElement.textContent = date.toLocaleTimeString();
      }
    }
  }

  private updateSessionCount(): void {
    const countElement = document.getElementById('sessionCount');
    if (countElement) {
      countElement.textContent = this.sessionData.length.toString();
    }
  }

  private renderActiveTab(): void {
    switch (this.activeTab) {
      case 'overview':
        this.renderOverview();
        break;
      case 'inventory':
        this.renderInventory();
        break;
      case 'resources':
        this.renderResources();
        break;
      case 'animals':
        this.renderAnimals();
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
  }

  private renderInventory(): void {
    InventoryRenderer.render(this.currentGameData, this.activeCategory);
  }

  private renderResources(): void {
    ResourcesRenderer.render(this.currentGameData);
  }

  private renderAnimals(): void {
    AnimalsRenderer.render(this.currentGameData);
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

  private async refreshData(): Promise<void> {
    await this.loadSessionData();
    this.extractGameData();
    this.renderDashboard();
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
      console.error('Erreur lors de l\'effacement des données:', error);
      alert('Erreur lors de l\'effacement des données.');
    }
  }

  public async updateDashboard(): Promise<void> {
    await this.loadSessionData();
    this.extractGameData();
    this.renderDashboard();
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const dashboardManager = new DashboardManager();

  chrome.runtime.onMessage.addListener((request, _sender, _sendResponse) => {
    if (request.action === ExtensionAction.NETWORK_REQUEST) {
      dashboardManager.updateDashboard();
    }
  });
});
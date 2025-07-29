import { 
  ExtensionAction,
  SunflowerSessionData
} from '../types/extension';

interface SunflowerGameData {
  inventory?: Record<string, string>;
  balance?: string;
  coins?: number;
  experience?: number;
  bumpkin?: {
    experience?: number;
    level?: number;
  };
  chickens?: Record<string, any>;
  cows?: Record<string, any>;
  sheep?: Record<string, any>;
  buildings?: Record<string, any>;
  [key: string]: any;
}

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
    
    await this.loadSessionData();
    this.setupEventListeners();
    this.extractGameData();
    this.renderDashboard();
  }

  private setupEventListeners(): void {
    // Tab switching
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

    // Category switching for inventory
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

    // Category switching for mining
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

    // Action buttons
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
      
      // Log des données pour débogage
      if (this.sessionData.length > 0) {
      }
    } catch (error) {
    }
  }

  private extractGameData(): void {
    if (this.sessionData.length === 0) {
      this.currentGameData = null;
      return;
    }

    // Prendre la réponse la plus récente
    const latestSession = this.sessionData[this.sessionData.length - 1];
    
    if (latestSession?.responseBody?.farm) {
      // Les données de la ferme sont dans responseBody.farm
      this.currentGameData = latestSession.responseBody.farm;
    } else if (latestSession?.responseBody) {
      // Fallback: utiliser responseBody directement
      this.currentGameData = latestSession.responseBody;
    } else {
      this.currentGameData = null;
    }
  }

  private switchTab(tabName: string): void {
    this.activeTab = tabName;
    
    // Update tab buttons
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.classList.remove('active');
    });
    document.querySelector(`[data-tab="${tabName}"]`)?.classList.add('active');

    // Update tab panes
    document.querySelectorAll('.tab-pane').forEach(pane => {
      pane.classList.remove('active');
    });
    document.getElementById(tabName)?.classList.add('active');

    // Render content for active tab
    this.renderActiveTab();
  }

  private switchCategory(categoryName: string): void {
    this.activeCategory = categoryName;
    
    // Update category buttons for inventory
    document.querySelectorAll('.category-btn[data-category]').forEach(btn => {
      btn.classList.remove('active');
    });
    document.querySelector(`[data-category="${categoryName}"]`)?.classList.add('active');

    // Re-render inventory
    this.renderInventory();
  }

  private switchMiningCategory(categoryName: string): void {
    this.activeMiningCategory = categoryName;
    
    // Update category buttons for mining
    document.querySelectorAll('.category-btn[data-mining-category]').forEach(btn => {
      btn.classList.remove('active');
    });
    document.querySelector(`[data-mining-category="${categoryName}"]`)?.classList.add('active');

    // Re-render mining
    this.renderMining();
  }

  private renderDashboard(): void {
    this.updateFarmInfo();
    this.renderActiveTab();
  }

  private updateFarmInfo(): void {
    const farmIdElement = document.getElementById('farmId');
    const lastUpdateElement = document.getElementById('lastUpdate');

    if (farmIdElement) {
      // Essayer de trouver l'ID de la ferme
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
    if (!this.currentGameData) {
      this.showNoDataMessage('overview');
      return;
    }

    // Update stats cards - essayer différentes structures de données
    let coins = 0, balance = 0, experience = 0, level = 1;
    
    // Essayer de trouver les coins
    if (this.currentGameData.coins !== undefined) {
      coins = this.currentGameData.coins;
    } else if (this.currentGameData.inventory?.['Coin']) {
      coins = parseFloat(this.currentGameData.inventory['Coin']) || 0;
    }
    
    // Essayer de trouver le balance
    if (this.currentGameData.balance !== undefined) {
      balance = parseFloat(this.currentGameData.balance) || 0;
    } else if (this.currentGameData.inventory?.['SFL']) {
      balance = parseFloat(this.currentGameData.inventory['SFL']) || 0;
    }
    
    // Essayer de trouver l'expérience et le niveau
    if (this.currentGameData.bumpkin) {
      experience = this.currentGameData.bumpkin.experience || 0;
      level = this.currentGameData.bumpkin.level || 1;
    } else if (this.currentGameData.experience !== undefined) {
      experience = this.currentGameData.experience;
    }
    
    this.updateElement('coins', this.formatNumber(coins));
    this.updateElement('balance', this.formatNumber(balance));
    this.updateElement('experience', this.formatNumber(experience));
    this.updateElement('level', level.toString());

    // Update recent activities
    this.renderRecentActivities();
    
    // Mettre à jour le compteur de sessions
    this.updateSessionCount();
  }

  private renderInventory(): void {
    const container = document.getElementById('inventoryItems');
    if (!container || !this.currentGameData?.inventory) {
      this.showNoDataMessage('inventory');
      return;
    }

    container.innerHTML = '';
    
    const inventory = this.currentGameData.inventory;
    const filteredItems = this.filterInventoryByCategory(inventory, this.activeCategory);

    Object.entries(filteredItems).forEach(([itemName, quantity]) => {
      const itemElement = this.createInventoryItem(itemName, quantity);
      container.appendChild(itemElement);
    });
  }

  private renderResources(): void {
    const rawMaterialsContainer = document.getElementById('rawMaterials');
    const buildingMaterialsContainer = document.getElementById('buildingMaterials');
    
    if (!this.currentGameData?.inventory) {
      this.showNoDataMessage('resources');
      return;
    }

    const rawMaterials = this.filterInventoryByCategory(this.currentGameData.inventory, 'raw');
    const buildingMaterials = this.filterInventoryByCategory(this.currentGameData.inventory, 'building');

    if (rawMaterialsContainer) {
      rawMaterialsContainer.innerHTML = '';
      Object.entries(rawMaterials).forEach(([name, quantity]) => {
        const item = this.createResourceItem(name, quantity);
        rawMaterialsContainer.appendChild(item);
      });
    }

    if (buildingMaterialsContainer) {
      buildingMaterialsContainer.innerHTML = '';
      Object.entries(buildingMaterials).forEach(([name, quantity]) => {
        const item = this.createResourceItem(name, quantity);
        buildingMaterialsContainer.appendChild(item);
      });
    }
  }

  private renderAnimals(): void {
    this.renderAnimalSection('chickens', '🐔');
    this.renderAnimalSection('cows', '🐄');
    this.renderAnimalSection('sheep', '🐑');
  }

  private renderBuildings(): void {
    const container = document.getElementById('buildingsList');
    if (!container || !this.currentGameData?.buildings) {
      this.showNoDataMessage('buildings');
      return;
    }

    container.innerHTML = '';
    
    Object.entries(this.currentGameData.buildings).forEach(([buildingName, buildingData]) => {
      const buildingElement = this.createBuildingCard(buildingName, buildingData);
      container.appendChild(buildingElement);
    });
  }


  private filterInventoryByCategory(inventory: Record<string, string>, category: string): Record<string, string> {
    const categoryMappings: Record<string, string[]> = {
      seeds: ['Sunflower Seed', 'Potato Seed', 'Pumpkin Seed', 'Carrot Seed', 'Cabbage Seed', 'Soybean Seed', 'Beetroot Seed', 'Cauliflower Seed', 'Parsnip Seed', 'Eggplant Seed', 'Corn Seed', 'Radish Seed', 'Wheat Seed', 'Kale Seed'],
      crops: ['Sunflower', 'Potato', 'Pumpkin', 'Carrot', 'Cabbage', 'Soybean', 'Beetroot', 'Cauliflower', 'Parsnip', 'Eggplant', 'Corn', 'Radish', 'Wheat', 'Kale'],
      tools: ['Axe', 'Pickaxe', 'Stone Pickaxe', 'Iron Pickaxe', 'Gold Pickaxe', 'Rod', 'Fishing Rod'],
      food: ['Flour', 'Cake', 'Bread', 'Pancakes', 'Roasted Cauliflower', 'Sauerkraut'],
      flowers: ['Red Pansy', 'Yellow Pansy', 'Purple Pansy', 'White Pansy', 'Blue Pansy'],
      raw: ['Wood', 'Stone', 'Iron', 'Gold', 'Egg', 'Chicken'],
      building: ['Crimstone', 'Oil', 'Diamond']
    };

    const categoryItems = categoryMappings[category] || [];
    const filtered: Record<string, string> = {};

    Object.entries(inventory).forEach(([itemName, quantity]) => {
      if (category === 'other') {
        // For 'other', include items not in any specific category
        const isInCategory = Object.values(categoryMappings).some(items => 
          items.some(item => item.toLowerCase() === itemName.toLowerCase())
        );
        if (!isInCategory) {
          filtered[itemName] = quantity;
        }
      } else if (categoryItems.some(item => item.toLowerCase() === itemName.toLowerCase())) {
        filtered[itemName] = quantity;
      }
    });

    return filtered;
  }

  private createInventoryItem(name: string, quantity: string): HTMLElement {
    const div = document.createElement('div');
    div.className = 'inventory-item';
    
    const icon = this.getItemIcon(name);
    
    div.innerHTML = `
      <div class="item-icon">${icon}</div>
      <div class="item-name">${name}</div>
      <div class="item-quantity">${quantity}</div>
    `;
    
    return div;
  }

  private createResourceItem(name: string, quantity: string): HTMLElement {
    const div = document.createElement('div');
    div.className = 'resource-item';
    
    const icon = this.getItemIcon(name);
    
    div.innerHTML = `
      <div class="item-icon">${icon}</div>
      <div class="item-name">${name}</div>
      <div class="item-quantity">${quantity}</div>
    `;
    
    return div;
  }

  private renderAnimalSection(animalType: string, icon: string): void {
    const container = document.getElementById(animalType);
    if (!container) return;

    const animals = this.currentGameData?.[animalType];
    if (!animals) {
      container.innerHTML = `<div class="animal-card">Aucun ${animalType.slice(0, -1)} trouvé</div>`;
      return;
    }

    container.innerHTML = '';
    
    Object.entries(animals).forEach(([animalId, animalData]: [string, any]) => {
      const animalElement = this.createAnimalCard(animalId, animalData, icon);
      container.appendChild(animalElement);
    });
  }

  private createAnimalCard(id: string, data: any, icon: string): HTMLElement {
    const div = document.createElement('div');
    div.className = 'animal-card';
    
    const state = data.state || 'idle';
    const stateClass = state.toLowerCase();
    
    div.innerHTML = `
      <div class="item-icon">${icon}</div>
      <div class="item-name">${id}</div>
      <div class="animal-state ${stateClass}">${state}</div>
    `;
    
    return div;
  }

  private createBuildingCard(name: string, data: any): HTMLElement {
    const div = document.createElement('div');
    div.className = 'building-card';
    
    const coordinates = data.coordinates ? `(${data.coordinates.x}, ${data.coordinates.y})` : '';
    
    div.innerHTML = `
      <div class="building-name">${this.escapeHtml(name)}</div>
      <div class="item-name">${this.escapeHtml(coordinates)}</div>
    `;
    
    return div;
  }

  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  private renderRecentActivities(): void {
    const container = document.getElementById('recentActivities');
    if (!container) return;

    const activityText = this.sessionData.length > 0 
      ? `Données de session chargées avec succès (${this.sessionData.length} sessions)`
      : 'En attente de données...';
    
    container.innerHTML = `<div class="activity-item">${activityText}</div>`;
    
    // Ajouter plus d'informations si on a des données
    if (this.currentGameData) {
      const inventoryCount = Object.keys(this.currentGameData.inventory || {}).length;
      const activityInfo = `<div class="activity-item">Inventaire: ${inventoryCount} éléments</div>`;
      container.innerHTML += activityInfo;
    }
  }

  private getItemIcon(itemName: string): string {
    const iconMap: Record<string, string> = {
      'Wood': '🪵',
      'Stone': '🪨',
      'Iron': '⚙️',
      'Gold': '🟡',
      'Egg': '🥚',
      'Chicken': '🐔',
      'Sunflower': '🌻',
      'Potato': '🥔',
      'Pumpkin': '🎃',
      'Carrot': '🥕',
      'Cabbage': '🥬',
      'Axe': '🪓',
      'Pickaxe': '⛏️',
      'Flour': '🌾',
      'Cake': '🎂',
      'Bread': '🍞'
    };
    
    return iconMap[itemName] || '📦';
  }

  private showNoDataMessage(section: string): void {
    const containers: Record<string, string> = {
      overview: 'recentActivities',
      inventory: 'inventoryItems',
      resources: 'rawMaterials',
      animals: 'chickens',
      buildings: 'buildingsList',
      mining: 'miningItems'
    };
    
    const containerId = containers[section];
    if (containerId) {
      const container = document.getElementById(containerId);
      
      if (container) {
        container.innerHTML = '<div class="activity-item">Aucune donnée disponible. Visitez Sunflower Land pour charger les données.</div>';
      }
    }
  }

  private updateElement(id: string, value: string): void {
    const element = document.getElementById(id);
    if (element) {
      element.textContent = value;
    }
  }

  private formatNumber(num: number): string {
    return new Intl.NumberFormat('fr-FR').format(num);
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
      alert('Erreur lors de l\'effacement des données.');
    }
  }

  public async updateDashboard(): Promise<void> {
    await this.loadSessionData();
    this.extractGameData();
    this.renderDashboard();
  }

  private renderRawData(): void {
    const container = document.getElementById('rawDataContainer');
    if (!container) return;

    container.innerHTML = '';
    
    if (this.sessionData.length === 0) {
      container.innerHTML = '<div class="raw-session-item">Aucune donnée interceptée. Visitez Sunflower Land pour capturer des données.</div>';
      return;
    }

    // Afficher toutes les sessions par ordre chronologique inversé
    const sortedData = [...this.sessionData].reverse();
    sortedData.forEach((session, index) => {
      const sessionElement = this.createRawSessionItem(session, index + 1);
      container.appendChild(sessionElement);
    });
  }

  private createRawSessionItem(session: SunflowerSessionData, index: number): HTMLElement {
    const div = document.createElement('div');
    div.className = 'raw-session-item';
    
    const timestamp = new Date(session.timestamp).toLocaleString();
    
    div.innerHTML = `
      <div class="raw-session-header">
        <span>Session #${index} - ${session.method} ${session.url}</span>
        <span class="raw-session-timestamp">${timestamp}</span>
      </div>
      <div class="raw-session-data">${JSON.stringify(session, null, 2)}</div>
    `;
    
    return div;
  }

  private updateSessionCount(): void {
    const countElement = document.getElementById('sessionCount');
    if (countElement) {
      countElement.textContent = this.sessionData.length.toString();
    }
  }

  private renderDebug(): void {
    const container = document.getElementById('debugContainer');
    if (!container) return;

    container.innerHTML = '';
    
    // Informations de base
    this.addDebugItem(container, 'Nombre de sessions', this.sessionData.length.toString());
    this.addDebugItem(container, 'Données de jeu extraites', this.currentGameData ? 'Oui' : 'Non');
    
    if (this.sessionData.length > 0) {
      const latestSession = this.sessionData[this.sessionData.length - 1];
      if (latestSession) {
        this.addDebugItem(container, 'Dernière session URL', latestSession.url);
        this.addDebugItem(container, 'Dernière session méthode', latestSession.method);
        this.addDebugItem(container, 'Dernière session status', latestSession.statusCode?.toString() || 'N/A');
        this.addDebugItem(container, 'Response body existe', latestSession.responseBody ? 'Oui' : 'Non');
        
        if (latestSession.responseBody) {
          const responseKeys = Object.keys(latestSession.responseBody);
          this.addDebugItem(container, 'Clés de la réponse', responseKeys.join(', '));
          
          // Vérifier si la ferme existe
          if (latestSession.responseBody.farm) {
            const farmKeys = Object.keys(latestSession.responseBody.farm);
            this.addDebugItem(container, 'Clés de farm trouvées', farmKeys.join(', '));
            
            // Afficher un aperçu des données de la ferme
            const farmPreview = this.createDataPreview(latestSession.responseBody.farm);
            this.addDebugItem(container, 'Aperçu des données de ferme', farmPreview);
          } else {
            this.addDebugItem(container, 'farm dans responseBody', 'NON TROUVÉ');
          }
          
          // Afficher un aperçu des données complètes
          const preview = this.createDataPreview(latestSession.responseBody);
          this.addDebugItem(container, 'Aperçu complet', preview);
        }
      }
    }
    
    if (this.currentGameData) {
      const gameDataKeys = Object.keys(this.currentGameData);
      this.addDebugItem(container, 'Clés des données de jeu', gameDataKeys.join(', '));
      
      if (this.currentGameData.inventory) {
        const inventoryKeys = Object.keys(this.currentGameData.inventory);
        this.addDebugItem(container, 'Clés de l\'inventaire', `${inventoryKeys.length} éléments: ${inventoryKeys.slice(0, 10).join(', ')}${inventoryKeys.length > 10 ? '...' : ''}`);
      }
    }
  }

  private addDebugItem(container: HTMLElement, label: string, value: string): void {
    const div = document.createElement('div');
    div.className = 'debug-item';
    
    div.innerHTML = `
      <div class="debug-label">${label}:</div>
      <div class="debug-value">${this.escapeHtml(value)}</div>
    `;
    
    container.appendChild(div);
  }

  private createDataPreview(data: any): string {
    if (!data || typeof data !== 'object') {
      return String(data);
    }
    
    const preview: string[] = [];
    for (const [key, value] of Object.entries(data)) {
      if (typeof value === 'object' && value !== null) {
        const subKeys = Object.keys(value);
        preview.push(`${key}: {${subKeys.length} clés: ${subKeys.slice(0, 3).join(', ')}${subKeys.length > 3 ? '...' : ''}}`);
      } else {
        const valueStr = String(value);
        preview.push(`${key}: ${valueStr.length > 50 ? valueStr.substring(0, 50) + '...' : valueStr}`);
      }
      
      if (preview.length >= 10) {
        preview.push('...');
        break;
      }
    }
    
    return preview.join('\n');
  }

  private renderMining(): void {
    const container = document.getElementById('miningItems');
    if (!container || !this.currentGameData) {
      this.showNoDataMessage('mining');
      return;
    }

    container.innerHTML = '';

    if (this.activeMiningCategory === 'collectibles') {
      this.renderCollectibles();
    } else {
      this.renderMiningByCategory();
    }
  }

  private renderMiningByCategory(): void {
    const container = document.getElementById('miningItems');
    if (!container || !this.currentGameData) {
      return;
    }

    const locations = this.currentGameData[this.activeMiningCategory];
    if (locations && typeof locations === 'object') {
      Object.entries(locations).forEach(([locationId, locationData]: [string, any]) => {
        const card = this.createMiningLocationCard(this.activeMiningCategory, locationId, locationData);
        container.appendChild(card);
      });
    }

    if (container.children.length === 0) {
      const categoryNames: Record<string, string> = {
        stones: 'pierre',
        trees: 'bois',
        iron: 'fer',
        gold: 'or',
        crimstones: 'pierre carmin',
        oil: 'pétrole'
      };
      const categoryName = categoryNames[this.activeMiningCategory] || this.activeMiningCategory;
      container.innerHTML = `<div class="mining-location-card">Aucun emplacement de ${categoryName} trouvé</div>`;
    }
  }

  private createMiningLocationCard(type: string, _locationId: string, data: any): HTMLElement {
    const div = document.createElement('div');
    div.className = 'mining-location-card';
    
    const icon = this.getMiningIcon(type);
    const amount = data.amount || data.stone?.amount || 0;
    const coordinates = data.x !== undefined && data.y !== undefined ? `(${data.x}, ${data.y})` : '';
    const status = amount > 0 ? 'available' : 'depleted';
    const statusText = amount > 0 ? 'Disponible' : 'Épuisé';
    
    div.innerHTML = `
      <div class="mining-location-header">
        <div class="item-icon">${icon}</div>
      </div>
      <div class="mining-location-type">${this.formatMiningType(type)}</div>
      <div class="mining-location-coords">${coordinates}</div>
      <div class="mining-location-amount">${amount} disponible(s)</div>
      <div class="mining-status ${status}">${statusText}</div>
    `;
    
    return div;
  }

  private renderCollectibles(): void {
    const container = document.getElementById('miningItems');
    if (!container || !this.currentGameData) {
      return;
    }

    container.innerHTML = '';
    
    // Chercher les collectibles (beehives, fruitPatches, flowers, crops)
    // Note: 'trees' est maintenant dans son propre onglet Bois
    const collectibleTypes = ['beehives', 'fruitPatches', 'flowers', 'crops'];
    
    collectibleTypes.forEach(collectibleType => {
      const items = this.currentGameData?.[collectibleType];
      if (items && typeof items === 'object') {
        Object.entries(items).forEach(([itemId, itemData]: [string, any]) => {
          const card = this.createCollectibleCard(collectibleType, itemId, itemData);
          container.appendChild(card);
        });
      }
    });

    if (container.children.length === 0) {
      container.innerHTML = '<div class="collectible-card">Aucun élément à collecter trouvé</div>';
    }
  }

  private createCollectibleCard(type: string, _itemId: string, data: any): HTMLElement {
    const div = document.createElement('div');
    div.className = 'collectible-card';
    
    const icon = this.getCollectibleIcon(type, data);
    const coordinates = data.x !== undefined && data.y !== undefined ? `(${data.x}, ${data.y})` : '';
    const readyAt = data.harvestedAt || data.harvestsAt || data.readyAt;
    const isReady = this.isCollectibleReady(data);
    const readyText = isReady ? 'Prêt à collecter' : this.getTimeUntilReady(readyAt);
    
    div.innerHTML = `
      <div class="collectible-icon">${icon}</div>
      <div class="collectible-name">${this.formatCollectibleName(type, data)}</div>
      <div class="collectible-coords">${coordinates}</div>
      <div class="collectible-ready" style="color: ${isReady ? '#28a745' : '#ffc107'}">${readyText}</div>
    `;
    
    return div;
  }

  private getMiningIcon(type: string): string {
    const iconMap: Record<string, string> = {
      'stones': '🗿',
      'trees': '🌳',
      'iron': '⚙️',
      'gold': '🟡',
      'crimstones': '🔴',
      'sunstones': '🟠',
      'oil': '🛢️'
    };
    
    return iconMap[type] || '⛏️';
  }

  private getCollectibleIcon(type: string, data: any): string {
    const iconMap: Record<string, string> = {
      'beehives': '🐝',
      'trees': '🌳',
      'fruitPatches': '🍇',
      'flowers': '🌸',
      'crops': '🌱'
    };
    
    // Essayer d'être plus spécifique basé sur les données
    if (type === 'trees' && data.wood) {
      return '🌲';
    }
    if (type === 'crops' && data.crop) {
      return this.getItemIcon(data.crop.name || 'crop');
    }
    
    return iconMap[type] || '📦';
  }

  private formatMiningType(type: string): string {
    const typeMap: Record<string, string> = {
      'stones': 'Pierre',
      'trees': 'Bois',
      'iron': 'Fer',
      'gold': 'Or',
      'crimstones': 'Pierre Carmin',
      'sunstones': 'Pierre Solaire',
      'oil': 'Pétrole'
    };
    
    return typeMap[type] || type;
  }

  private formatCollectibleName(type: string, data: any): string {
    if (data.name) return data.name;
    if (data.crop?.name) return data.crop.name;
    if (data.fruit?.name) return data.fruit.name;
    
    const typeMap: Record<string, string> = {
      'beehives': 'Ruche',
      'trees': 'Arbre',
      'fruitPatches': 'Patch de Fruits',
      'flowers': 'Fleur',
      'crops': 'Culture'
    };
    
    return typeMap[type] || type;
  }

  private isCollectibleReady(data: any): boolean {
    const now = Date.now();
    const readyAt = data.harvestedAt || data.harvestsAt || data.readyAt;
    
    if (!readyAt) return false;
    return now >= readyAt;
  }

  private getTimeUntilReady(readyAt: number): string {
    if (!readyAt) return 'Temps inconnu';
    
    const now = Date.now();
    const timeLeft = readyAt - now;
    
    if (timeLeft <= 0) return 'Prêt!';
    
    const minutes = Math.floor(timeLeft / (1000 * 60));
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (days > 0) return `${days}j ${hours % 24}h`;
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    return `${minutes}m`;
  }

}

// Initialisation
document.addEventListener('DOMContentLoaded', () => {
  const dashboardManager = new DashboardManager();

  // Écouter les messages du background script
  chrome.runtime.onMessage.addListener((request, _sender, _sendResponse) => {
    if (request.action === ExtensionAction.NETWORK_REQUEST) {
      dashboardManager.updateDashboard();
    }
  });
});
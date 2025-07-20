import { SunflowerGameData } from '../types/extension';
import { UIUtils, TimeUtils, IconUtils } from './utils';

export class OverviewRenderer {
  static render(gameData: SunflowerGameData | null): void {
    if (!gameData) {
      UIUtils.showNoDataMessage('recentActivities', 'Aucune donnée disponible. Visitez Sunflower Land pour charger les données.');
      return;
    }

    let coins = 0, balance = 0, experience = 0, level = 1;
    
    if (gameData.coins !== undefined) {
      coins = gameData.coins;
    } else if (gameData.inventory?.['Coin']) {
      coins = parseFloat(gameData.inventory['Coin']) || 0;
    }
    
    if (gameData.balance !== undefined) {
      balance = parseFloat(gameData.balance) || 0;
    } else if (gameData.inventory?.['SFL']) {
      balance = parseFloat(gameData.inventory['SFL']) || 0;
    }
    
    if (gameData.bumpkin) {
      experience = gameData.bumpkin.experience || 0;
      level = gameData.bumpkin.level || 1;
    } else if (gameData.experience !== undefined) {
      experience = gameData.experience;
    }
    
    UIUtils.updateElement('coins', UIUtils.formatNumber(coins));
    UIUtils.updateElement('balance', UIUtils.formatNumber(balance));
    UIUtils.updateElement('experience', UIUtils.formatNumber(experience));
    UIUtils.updateElement('level', level.toString());

    OverviewRenderer.renderRecentActivities(gameData);
  }

  private static renderRecentActivities(gameData: SunflowerGameData): void {
    const container = document.getElementById('recentActivities');
    if (!container) return;

    const inventoryCount = Object.keys(gameData.inventory || {}).length;
    const activityText = `Données de session chargées avec succès`;
    const activityInfo = `Inventaire: ${inventoryCount} éléments`;
    
    container.innerHTML = `
      <div class="activity-item">${activityText}</div>
      <div class="activity-item">${activityInfo}</div>
    `;
  }
}

export class InventoryRenderer {
  static render(gameData: SunflowerGameData | null, activeCategory: string): void {
    const container = document.getElementById('inventoryItems');
    if (!container || !gameData?.inventory) {
      UIUtils.showNoDataMessage('inventoryItems', 'Aucune donnée d\'inventaire disponible.');
      return;
    }

    container.innerHTML = '';
    
    const filteredItems = InventoryRenderer.filterByCategory(gameData.inventory, activeCategory);

    Object.entries(filteredItems).forEach(([itemName, quantity]) => {
      const itemElement = InventoryRenderer.createInventoryItem(itemName, quantity);
      container.appendChild(itemElement);
    });
  }

  private static filterByCategory(inventory: Record<string, string>, category: string): Record<string, string> {
    const categoryMappings: Record<string, string[]> = {
      seeds: ['Sunflower Seed', 'Potato Seed', 'Pumpkin Seed', 'Carrot Seed', 'Cabbage Seed', 'Soybean Seed', 'Beetroot Seed', 'Cauliflower Seed', 'Parsnip Seed', 'Eggplant Seed', 'Corn Seed', 'Radish Seed', 'Wheat Seed', 'Kale Seed'],
      crops: ['Sunflower', 'Potato', 'Pumpkin', 'Carrot', 'Cabbage', 'Soybean', 'Beetroot', 'Cauliflower', 'Parsnip', 'Eggplant', 'Corn', 'Radish', 'Wheat', 'Kale'],
      tools: ['Axe', 'Pickaxe', 'Stone Pickaxe', 'Iron Pickaxe', 'Gold Pickaxe', 'Rod', 'Fishing Rod'],
      food: ['Flour', 'Cake', 'Bread', 'Pancakes', 'Roasted Cauliflower', 'Sauerkraut'],
      flowers: ['Red Pansy', 'Yellow Pansy', 'Purple Pansy', 'White Pansy', 'Blue Pansy']
    };

    const categoryItems = categoryMappings[category] || [];
    const filtered: Record<string, string> = {};

    Object.entries(inventory).forEach(([itemName, quantity]) => {
      if (category === 'other') {
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

  private static createInventoryItem(name: string, quantity: string): HTMLElement {
    const div = document.createElement('div');
    div.className = 'inventory-item';
    
    const icon = IconUtils.getItemIcon(name);
    
    div.innerHTML = `
      <div class="item-icon">${icon}</div>
      <div class="item-name">${name}</div>
      <div class="item-quantity">${quantity}</div>
    `;
    
    return div;
  }
}

export class MiningRenderer {
  static render(gameData: SunflowerGameData | null, activeMiningCategory: string): void {
    const container = document.getElementById('miningItems');
    if (!container || !gameData) {
      UIUtils.showNoDataMessage('miningItems', 'Aucune donnée disponible. Visitez Sunflower Land pour charger les données.');
      return;
    }

    container.innerHTML = '';

    if (activeMiningCategory === 'collectibles') {
      MiningRenderer.renderCollectibles(gameData);
    } else {
      MiningRenderer.renderMiningByCategory(gameData, activeMiningCategory);
    }
  }

  private static renderMiningByCategory(gameData: SunflowerGameData, category: string): void {
    const container = document.getElementById('miningItems');
    if (!container) return;

    const locations = gameData[category];
    if (locations && typeof locations === 'object') {
      Object.entries(locations).forEach(([_locationId, locationData]: [string, any]) => {
        const card = MiningRenderer.createMiningLocationCard(category, locationData);
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
      const categoryName = categoryNames[category] || category;
      container.innerHTML = `<div class="mining-location-card">Aucun emplacement de ${categoryName} trouvé</div>`;
    }
  }

  private static renderCollectibles(gameData: SunflowerGameData): void {
    const container = document.getElementById('miningItems');
    if (!container) return;

    container.innerHTML = '';
    
    const collectibleTypes = ['beehives', 'fruitPatches', 'flowers', 'crops'];
    
    collectibleTypes.forEach(collectibleType => {
      const items = gameData[collectibleType];
      if (items && typeof items === 'object') {
        Object.entries(items).forEach(([_itemId, itemData]: [string, any]) => {
          const card = MiningRenderer.createCollectibleCard(collectibleType, itemData);
          container.appendChild(card);
        });
      }
    });

    if (container.children.length === 0) {
      container.innerHTML = '<div class="collectible-card">Aucun élément à collecter trouvé</div>';
    }
  }

  private static createMiningLocationCard(type: string, data: any): HTMLElement {
    const div = document.createElement('div');
    div.className = 'mining-location-card';
    
    const icon = IconUtils.getMiningIcon(type);
    const amount = data.amount || data.stone?.amount || 0;
    const coordinates = data.x !== undefined && data.y !== undefined ? `(${data.x}, ${data.y})` : '';
    const status = amount > 0 ? 'available' : 'depleted';
    const statusText = amount > 0 ? 'Disponible' : 'Épuisé';
    
    div.innerHTML = `
      <div class="mining-location-header">
        <div class="item-icon">${icon}</div>
      </div>
      <div class="mining-location-type">${MiningRenderer.formatMiningType(type)}</div>
      <div class="mining-location-coords">${coordinates}</div>
      <div class="mining-location-amount">${amount} disponible(s)</div>
      <div class="mining-status ${status}">${statusText}</div>
    `;
    
    return div;
  }

  private static createCollectibleCard(type: string, data: any): HTMLElement {
    const div = document.createElement('div');
    div.className = 'collectible-card';
    
    const icon = IconUtils.getCollectibleIcon(type, data);
    const coordinates = data.x !== undefined && data.y !== undefined ? `(${data.x}, ${data.y})` : '';
    const readyAt = data.harvestedAt || data.harvestsAt || data.readyAt;
    const isReady = TimeUtils.isReady(readyAt);
    const readyText = isReady ? 'Prêt à collecter' : TimeUtils.getTimeUntilReady(readyAt);
    
    div.innerHTML = `
      <div class="collectible-icon">${icon}</div>
      <div class="collectible-name">${MiningRenderer.formatCollectibleName(type, data)}</div>
      <div class="collectible-coords">${coordinates}</div>
      <div class="collectible-ready" style="color: ${isReady ? '#28a745' : '#ffc107'}">${readyText}</div>
    `;
    
    return div;
  }

  private static formatMiningType(type: string): string {
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

  private static formatCollectibleName(type: string, data: any): string {
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
}
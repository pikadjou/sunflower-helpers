import { SunflowerGameData } from '../types/extension';
import { UIUtils, IconUtils } from './utils';

export class ResourcesRenderer {
  static render(gameData: SunflowerGameData | null): void {
    if (!gameData?.inventory) {
      UIUtils.showNoDataMessage('rawMaterials', 'Aucune donnée de ressources disponible.');
      return;
    }

    ResourcesRenderer.renderRawMaterials(gameData.inventory);
    ResourcesRenderer.renderBuildingMaterials(gameData.inventory);
  }

  private static renderRawMaterials(inventory: Record<string, string>): void {
    const container = document.getElementById('rawMaterials');
    if (!container) return;

    const rawMaterials = ResourcesRenderer.filterByCategory(inventory, 'raw');
    container.innerHTML = '';
    
    Object.entries(rawMaterials).forEach(([name, quantity]) => {
      const item = ResourcesRenderer.createResourceItem(name, quantity);
      container.appendChild(item);
    });
  }

  private static renderBuildingMaterials(inventory: Record<string, string>): void {
    const container = document.getElementById('buildingMaterials');
    if (!container) return;

    const buildingMaterials = ResourcesRenderer.filterByCategory(inventory, 'building');
    container.innerHTML = '';
    
    Object.entries(buildingMaterials).forEach(([name, quantity]) => {
      const item = ResourcesRenderer.createResourceItem(name, quantity);
      container.appendChild(item);
    });
  }

  private static filterByCategory(inventory: Record<string, string>, category: string): Record<string, string> {
    const categoryMappings: Record<string, string[]> = {
      raw: ['Wood', 'Stone', 'Iron', 'Gold', 'Egg', 'Chicken'],
      building: ['Crimstone', 'Oil', 'Diamond']
    };

    const categoryItems = categoryMappings[category] || [];
    const filtered: Record<string, string> = {};

    Object.entries(inventory).forEach(([itemName, quantity]) => {
      if (categoryItems.some(item => item.toLowerCase() === itemName.toLowerCase())) {
        filtered[itemName] = quantity;
      }
    });

    return filtered;
  }

  private static createResourceItem(name: string, quantity: string): HTMLElement {
    const div = document.createElement('div');
    div.className = 'resource-item';
    
    const icon = IconUtils.getItemIcon(name);
    
    div.innerHTML = `
      <div class="item-icon">${icon}</div>
      <div class="item-name">${name}</div>
      <div class="item-quantity">${quantity}</div>
    `;
    
    return div;
  }
}

export class AnimalsRenderer {
  static render(gameData: SunflowerGameData | null): void {
    AnimalsRenderer.renderAnimalSection('chickens', '🐔', gameData);
    AnimalsRenderer.renderAnimalSection('cows', '🐄', gameData);
    AnimalsRenderer.renderAnimalSection('sheep', '🐑', gameData);
  }

  private static renderAnimalSection(animalType: string, icon: string, gameData: SunflowerGameData | null): void {
    const container = document.getElementById(animalType);
    if (!container) return;

    const animals = gameData?.[animalType];
    if (!animals) {
      container.innerHTML = `<div class="animal-card">Aucun ${animalType.slice(0, -1)} trouvé</div>`;
      return;
    }

    container.innerHTML = '';
    
    Object.entries(animals).forEach(([animalId, animalData]: [string, any]) => {
      const animalElement = AnimalsRenderer.createAnimalCard(animalId, animalData, icon);
      container.appendChild(animalElement);
    });
  }

  private static createAnimalCard(id: string, data: any, icon: string): HTMLElement {
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
}

export class BuildingsRenderer {
  static render(gameData: SunflowerGameData | null): void {
    const container = document.getElementById('buildingsList');
    if (!container || !gameData?.buildings) {
      UIUtils.showNoDataMessage('buildingsList', 'Aucune donnée de bâtiments disponible.');
      return;
    }

    container.innerHTML = '';
    
    Object.entries(gameData.buildings).forEach(([buildingName, buildingData]) => {
      const buildingElement = BuildingsRenderer.createBuildingCard(buildingName, buildingData);
      container.appendChild(buildingElement);
    });
  }

  private static createBuildingCard(name: string, data: any): HTMLElement {
    const div = document.createElement('div');
    div.className = 'building-card';
    
    const coordinates = data.coordinates ? `(${data.coordinates.x}, ${data.coordinates.y})` : '';
    
    div.innerHTML = `
      <div class="building-name">${UIUtils.escapeHtml(name)}</div>
      <div class="item-name">${UIUtils.escapeHtml(coordinates)}</div>
    `;
    
    return div;
  }
}
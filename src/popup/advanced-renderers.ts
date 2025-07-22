import { SunflowerGameData } from '../types/extension';
import { 
  TimerManager,
  TimerData,
  ActiveTimer
} from './analytics-utils';

export class TimersRenderer {
  private static currentInterval: number | null = null;

  static render(gameData: SunflowerGameData | null): void {
    // Nettoyer les intervals existants
    this.cleanup();
    console.log('⏰ TimersRenderer.render appelé avec:', {
      hasData: !!gameData,
      dataKeys: gameData ? Object.keys(gameData) : [],
      crops: gameData?.crops ? Object.keys(gameData.crops).length : 0,
      beehives: gameData?.beehives ? Object.keys(gameData.beehives).length : 0,
      buildings: gameData?.buildings ? Object.keys(gameData.buildings).length : 0
    });
    
    if (!gameData) {
      console.log('❌ Pas de données de jeu, affichage du message par défaut');
      this.renderNoData();
      return;
    }

    try {
      const timerData = TimerManager.calculateTimers(gameData);
      console.log('✅ Données de timer calculées:', {
        activeTimers: timerData.activeTimers.length,
        scheduledActivities: timerData.scheduledActivities.length,
        harvestCalendar: timerData.harvestCalendar.length,
        optimizationSuggestions: timerData.optimizationSuggestions.length
      });

      this.renderActiveTimers(timerData);
      // Supprimer les autres sections - garder seulement "Activités en Cours"
      this.hideOtherSections();
    } catch (error) {
      console.error('❌ Erreur lors du calcul des timers:', error);
      this.renderNoData();
    }
  }

  private static renderNoData(): void {
    const activeTimersEl = document.getElementById('activeTimers');
    if (activeTimersEl) activeTimersEl.innerHTML = '<div class="no-timers">Aucune activité en cours</div>';
    this.hideOtherSections();
  }

  private static hideOtherSections(): void {
    const scheduledEl = document.getElementById('scheduledActivities');
    const calendarEl = document.getElementById('harvestCalendar'); 
    const suggestionsEl = document.getElementById('optimizationSuggestions');

    if (scheduledEl) scheduledEl.style.display = 'none';
    if (calendarEl) calendarEl.style.display = 'none';
    if (suggestionsEl) suggestionsEl.style.display = 'none';
  }

  private static renderActiveTimers(timerData: TimerData): void {
    const container = document.getElementById('activeTimers');
    if (!container) return;

    if (!timerData.activeTimers || timerData.activeTimers.length === 0) {
      container.innerHTML = '<div class="no-timers">Aucune activité en cours</div>';
      return;
    }

    // Filtrer seulement les crops
    const cropsOnly = timerData.activeTimers.filter(timer => timer.type === 'crop');
    
    if (cropsOnly.length === 0) {
      container.innerHTML = '<div class="no-timers">Aucune culture en cours</div>';
      return;
    }

    // Regrouper les crops par type de culture
    const cropGroups = this.groupCropsByType(cropsOnly);
    
    // Créer l'interface à onglets
    container.innerHTML = this.renderCropTabs(cropGroups);
    
    // Attacher les event listeners pour les onglets
    this.attachTabEventListeners(container);
  }






  private static getTimerIcon(type: string): string {
    const icons = {
      crop: '🌱',
      building: '🏗️',
      beehive: '🍯',
      resource: '⛏️',
      fruit: '🍎',
      // Icônes spécifiques pour les cultures/items
      'Artichoke': '🥬',
      'Soybean': '🌱', 
      'Wheat': '🌾',
      'Corn': '🌽',
      'Carrot': '🥕',
      'Apple': '🍎',
      'Orange': '🍊',
      'Banana': '🍌',
      'Miel': '🍯'
    };
    return icons[type as keyof typeof icons] || '⏰';
  }


  private static groupCropsByType(crops: ActiveTimer[]): Record<string, ActiveTimer[]> {
    const groups: Record<string, ActiveTimer[]> = {};
    
    crops.forEach(crop => {
      // Extraire le nom de la culture du nom du timer
      const cropName = crop.name ? crop.name.split(' x')[0] : 'Culture';
      
      // S'assurer que cropName est valide
      const safeCropName = cropName || 'Culture';
      
      if (!groups[safeCropName]) {
        groups[safeCropName] = [];
      }
      groups[safeCropName].push(crop);
    });
    
    return groups;
  }

  private static renderCropTabs(cropGroups: Record<string, ActiveTimer[]>): string {
    const cropTypes = Object.keys(cropGroups).sort();
    
    if (cropTypes.length === 0) {
      return '<div class="no-timers">Aucune culture en cours</div>';
    }

    // ID unique pour éviter les conflits
    const tabsId = `crop-tabs-${Date.now()}`;
    
    return `
      <div class="crop-tabs-container">
        <div class="crop-tabs-header">
          ${cropTypes.map((cropType, index) => {
            const crops = cropGroups[cropType] || [];
            const readyCount = crops.filter(c => c.isReady).length;
            
            return `
              <button class="crop-tab ${index === 0 ? 'active' : ''}" 
                      data-tab-target="${tabsId}-${cropType}">
                <span class="tab-icon">${this.getTimerIcon(cropType)}</span>
                <span class="tab-name">${cropType}</span>
                <span class="tab-count">${crops.length}</span>
                ${readyCount > 0 ? `<span class="tab-ready">${readyCount}</span>` : ''}
              </button>
            `;
          }).join('')}
        </div>
        <div class="crop-tabs-content">
          ${cropTypes.map((cropType, index) => `
            <div class="crop-tab-panel ${index === 0 ? 'active' : ''}" 
                 id="${tabsId}-${cropType}">
              <div class="crop-type-header">
                <span class="crop-icon">${this.getTimerIcon(cropType)}</span>
                <span class="crop-name">${cropType}</span>
                <span class="crop-stats">${this.getCropStats(cropGroups[cropType] || [])}</span>
              </div>
              <div class="crop-items">
                ${this.renderCropItems(cropGroups[cropType] || [])}
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  private static getCropStats(crops: ActiveTimer[]): string {
    const totalQuantity = crops.reduce((sum, crop) => {
      const match = crop.name?.match(/x(\d+\.?\d*)/);
      return sum + (match && match[1] ? parseFloat(match[1]) : 1);
    }, 0);
    
    const readyCount = crops.filter(c => c.isReady).length;
    const readyQuantity = crops.filter(c => c.isReady).reduce((sum, crop) => {
      const match = crop.name?.match(/x(\d+\.?\d*)/);
      return sum + (match && match[1] ? parseFloat(match[1]) : 1);
    }, 0);
    
    return `Total: ${totalQuantity.toFixed(1)} ${readyCount > 0 ? `| Prêt: ${readyQuantity.toFixed(1)}` : ''}`;
  }

  private static renderCropItems(crops: ActiveTimer[]): string {
    // Séparer les crops prêts et en cours
    const readyCrops = crops.filter(c => c.isReady);
    const activeCrops = crops.filter(c => !c.isReady);
    const sortedCrops = [...readyCrops, ...activeCrops];
    
    return sortedCrops.map(crop => {
      const statusClass = crop.isReady ? 'ready' : 'active';
      let timeText = '';
      
      if (crop.isReady) {
        timeText = '✅ Prêt à récolter';
      } else {
        const remainingHours = Math.floor(crop.remainingTime / (60 * 60 * 1000));
        const remainingMinutes = Math.floor((crop.remainingTime % (60 * 60 * 1000)) / (60 * 1000));
        
        let timeDisplay = '';
        if (remainingHours > 0) {
          timeDisplay = `${remainingHours}h ${remainingMinutes}m`;
        } else if (remainingMinutes > 0) {
          timeDisplay = `${remainingMinutes}m`;
        } else {
          timeDisplay = `${Math.ceil(crop.remainingTime / 1000)}s`;
        }
        
        const endTime = new Date(Date.now() + crop.remainingTime);
        timeText = `🌱 En cours (${timeDisplay}) | Fin: ${endTime.toLocaleDateString('fr-FR', {
          day: '2-digit',
          month: '2-digit',
          hour: '2-digit',
          minute: '2-digit'
        })}`;
      }
      
      const quantity = crop.name?.match(/x(\d+\.?\d*)/)?.[1] || '1';
      
      return `
        <div class="crop-item ${statusClass}">
          <div class="crop-item-header">
            <span class="crop-quantity">x${quantity}</span>
            ${crop.isReady ? '<span class="ready-badge">PRÊT</span>' : ''}
          </div>
          <div class="crop-item-time">${timeText}</div>
        </div>
      `;
    }).join('');
  }

  private static attachTabEventListeners(container: HTMLElement): void {
    const tabButtons = container.querySelectorAll('.crop-tab');
    
    tabButtons.forEach(button => {
      button.addEventListener('click', (event) => {
        const target = event.currentTarget as HTMLElement;
        const tabTarget = target.getAttribute('data-tab-target');
        
        if (!tabTarget) return;
        
        this.switchCropTab(target, tabTarget);
      });
    });
  }

  private static switchCropTab(clickedButton: HTMLElement, tabId: string): void {
    const tabsContainer = clickedButton.closest('.crop-tabs-container');
    
    if (!tabsContainer) return;
    
    // Désactiver tous les onglets et panneaux
    tabsContainer.querySelectorAll('.crop-tab').forEach(tab => tab.classList.remove('active'));
    tabsContainer.querySelectorAll('.crop-tab-panel').forEach(panel => panel.classList.remove('active'));
    
    // Activer l'onglet cliqué
    clickedButton.classList.add('active');
    
    // Activer le panneau correspondant
    const panel = document.getElementById(tabId);
    if (panel) {
      panel.classList.add('active');
    }
  }





  private static cleanup(): void {
    if (this.currentInterval !== null) {
      clearInterval(this.currentInterval);
      this.currentInterval = null;
    }
  }
}
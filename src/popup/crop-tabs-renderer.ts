import { SunflowerGameData } from '../types/extension';
import { TimerManager } from './analytics-utils';

/**
 * Optimized crop tabs renderer using HTML templates
 */
export class CropTabsRenderer {
  private static readonly CROP_ICONS: Record<string, string> = {
    'Potato': '🥔',
    'Pumpkin': '🎃',
    'Carrot': '🥕',
    'Cabbage': '🥬',
    'Beetroot': '🦠',
    'Cauliflower': '🥦',
    'Parsnip': '🥕',
    'Eggplant': '🍆',
    'Corn': '🌽',
    'Radish': '🤬',
    'Wheat': '🌾',
    'Kale': '🥬',
    'Blueberry': '🫐',
    'Orange': '🍊',
    'Apple': '🍎',
    'Banana': '🍌',
    'Sunflower': '🌻'
  };

  /**
   * Main render method
   */
  static async render(gameData: SunflowerGameData | null): Promise<void> {
    
    const container = document.getElementById('activeTimers');
    if (!container) return;

    try {
      if (!gameData) {
        await this.renderNoData(container);
        return;
      }

      const timerData = TimerManager.calculateTimers(gameData);
      const cropsOnly = timerData.activeTimers.filter(timer => timer.type === 'crop');
      
      if (cropsOnly.length === 0) {
        await this.renderNoData(container);
        return;
      }

      // Utiliser un rendu simple sans templates pour garantir l'affichage
      this.renderSimpleTimers(container, cropsOnly);
      this.hideOtherSections();
      
    } catch (error) {
      await this.renderNoData(container);
    }
  }


  /**
   * Render simple timers without templates (fallback)
   */
  private static renderSimpleTimers(container: HTMLElement, timers: any[]): void {
    // Regrouper les timers par type de culture
    const groupedTimers = this.groupTimersByCrop(timers);
    
    let html = `<div class="simple-timers">`;
    
    // Total header
    html += `<div class="timers-header">
      <h3>Cultures en cours</h3>
      <span class="total-count">${timers.length} parcelles</span>
    </div>`;
    
    // Render each crop group
    for (const [cropName, cropTimers] of Object.entries(groupedTimers)) {
      html += this.renderCropGroup(cropName, cropTimers as any[]);
    }
    
    html += `</div>`;
    container.innerHTML = html;
    
    // Attach event listeners for expand/collapse
    this.attachExpandCollapseListeners(container);
  }
  
  /**
   * Group timers by crop type
   */
  private static groupTimersByCrop(timers: any[]): Record<string, any[]> {
    const groups = new Map<string, any[]>();
    
    // Group timers
    timers.forEach(timer => {
      const cropName = timer.name || 'Culture inconnue';
      const existing = groups.get(cropName);
      if (existing) {
        existing.push(timer);
      } else {
        groups.set(cropName, [timer]);
      }
    });
    
    // Sort and convert to object
    const sortedGroups: Record<string, any[]> = {};
    Array.from(groups.keys())
      .sort()
      .forEach(key => {
        const groupTimers = groups.get(key)!;
        sortedGroups[key] = groupTimers.sort((a, b) => {
          if (a.isReady && !b.isReady) return 1;
          if (!a.isReady && b.isReady) return -1;
          return a.remainingTime - b.remainingTime;
        });
      });
    
    return sortedGroups;
  }
  
  /**
   * Render a single crop group
   */
  private static renderCropGroup(cropName: string, timers: any[]): string {
    const readyCount = timers.filter(t => t.isReady).length;
    const growingCount = timers.length - readyCount;
    const groupId = `crop-group-${cropName.replace(/\s+/g, '-').toLowerCase()}`;
    
    // Calculer la prochaine récolte
    const nextHarvest = this.getNextHarvestTime(timers);
    
    // Par défaut, expand les groupes avec des cultures prêtes, collapse les autres
    const isCollapsed = readyCount === 0 && growingCount > 3; // Collapse si beaucoup de cultures en cours
    const indicator = isCollapsed ? '▶' : '▼';
    const headerClass = isCollapsed ? 'crop-group-header collapsed' : 'crop-group-header';
    const contentStyle = isCollapsed ? 'style="display: none;"' : '';
    
    let html = `
      <div class="crop-group">
        <div class="${headerClass}" data-toggle="${groupId}">
          <div class="crop-header-left">
            <span class="collapse-indicator">${indicator}</span>
            <h4 class="crop-name">${this.getCropIcon(cropName)} ${cropName}</h4>
          </div>
          <div class="crop-stats">
            <span class="ready-count">${readyCount} prêtes</span>
            <span class="growing-count">${growingCount} en cours</span>
            <span class="next-harvest">🕰️ ${nextHarvest}</span>
          </div>
        </div>
        <div class="crop-timers" id="${groupId}" ${contentStyle}>
    `;
    
    timers.forEach((timer, index) => {
      const endDate = this.calculateEndDate(timer);
      html += `
        <div class="timer-item ${timer.isReady ? 'ready' : 'growing'}">
          <div class="timer-info">
            <div class="timer-plot">Parcelle ${index + 1}</div>
            <div class="timer-end-date-main">${endDate}</div>
            <div class="timer-time-secondary">${timer.remainingTimeFormatted}</div>
          </div>
          <div class="timer-status">${timer.isReady ? '✅ PRÊT' : '🌱 En cours'}</div>
        </div>
      `;
    });
    
    html += `
        </div>
      </div>
    `;
    
    return html;
  }
  
  /**
   * Calculate and format end date
   */
  private static calculateEndDate(timer: any): string {
    if (timer.isReady) return 'Maintenant';
    if (timer.remainingTime <= 0) return 'Bientôt';
    
    const now = new Date();
    const endTime = new Date(now.getTime() + timer.remainingTime);
    
    // Si c'est aujourd'hui, afficher seulement l'heure
    if (endTime.toDateString() === now.toDateString()) {
      return endTime.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    }
    
    // Sinon afficher date + heure
    return endTime.toLocaleString('fr-FR', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
  
  /**
   * Get next harvest time for a group
   */
  private static getNextHarvestTime(timers: any[]): string {
    // S'il y a des cultures prêtes, retourner "Maintenant"
    const readyTimers = timers.filter(t => t.isReady);
    if (readyTimers.length > 0) {
      return readyTimers.length > 1 ? `Maintenant (${readyTimers.length})` : 'Maintenant';
    }
    
    // Sinon, trouver la culture avec le temps restant le plus court
    const growingTimers = timers.filter(t => !t.isReady && t.remainingTime > 0);
    if (growingTimers.length === 0) {
      return 'Aucune';
    }
    
    // Trier par temps restant croissant
    const nextTimer = growingTimers.sort((a, b) => a.remainingTime - b.remainingTime)[0];
    
    // Calculer l'heure de fin
    const now = new Date();
    const endTime = new Date(now.getTime() + nextTimer.remainingTime);
    
    // Si c'est dans moins d'une heure, afficher en minutes
    if (nextTimer.remainingTime < 3600000) { // 1 heure en ms
      const minutes = Math.ceil(nextTimer.remainingTime / 60000);
      return minutes <= 1 ? 'Bientôt' : `dans ${minutes}min`;
    }
    
    // Si c'est aujourd'hui, afficher seulement l'heure
    if (endTime.toDateString() === now.toDateString()) {
      return endTime.toLocaleTimeString('fr-FR', {
        hour: '2-digit',
        minute: '2-digit'
      });
    }
    
    // Sinon afficher date + heure
    return endTime.toLocaleString('fr-FR', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  /**
   * Attach expand/collapse event listeners
   */
  private static attachExpandCollapseListeners(container: HTMLElement): void {
    const headers = container.querySelectorAll('.crop-group-header[data-toggle]');
    
    headers.forEach(header => {
      header.addEventListener('click', (event) => {
        const target = event.currentTarget as HTMLElement;
        const toggleTarget = target.getAttribute('data-toggle');
        
        if (toggleTarget) {
          const content = document.getElementById(toggleTarget);
          const indicator = target.querySelector('.collapse-indicator');
          
          if (content && indicator) {
            const isExpanded = !target.classList.contains('collapsed');
            
            if (isExpanded) {
              // Collapse
              content.style.display = 'none';
              indicator.textContent = '▶'; // Right arrow
              target.classList.add('collapsed');
            } else {
              // Expand
              content.style.display = 'block';
              indicator.textContent = '▼'; // Down arrow
              target.classList.remove('collapsed');
            }
          }
        }
      });
    });
  }

  /**
   * Get crop icon
   */
  private static getCropIcon(cropName: string): string {
    const cleanName = cropName.replace(/[0-9\s]+/g, '').trim();
    return this.CROP_ICONS[cleanName] || '🌱';
  }

  /**
   * Render no data state
   */
  private static async renderNoData(container: HTMLElement): Promise<void> {
    container.innerHTML = '<div class="no-timers">Aucune culture en cours</div>';
    this.hideOtherSections();
  }

  /**
   * Hide other sections
   */
  private static hideOtherSections(): void {
    const sectionsToHide = ['scheduledActivities', 'harvestCalendar', 'optimizationSuggestions'];
    sectionsToHide.forEach(sectionId => {
      const element = document.getElementById(sectionId);
      if (element) element.style.display = 'none';
    });
  }
}

// Export for backward compatibility
export { CropTabsRenderer as TimersRenderer };
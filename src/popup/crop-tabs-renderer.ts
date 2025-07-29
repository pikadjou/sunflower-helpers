import { SunflowerGameData } from '../types/extension';
import { TimerManager } from './analytics-utils';

/**
 * Optimized crop tabs renderer using HTML templates
 */
export class CropTabsRenderer {
  private static currentInterval: number | null = null;

  /**
   * Main render method
   */
  static async render(gameData: SunflowerGameData | null): Promise<void> {
    this.cleanup();
    
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
    const html = `
      <div class="simple-timers">
        <h3>Cultures en cours (${timers.length})</h3>
        <div class="timer-list">
          ${timers.map(timer => `
            <div class="timer-item ${timer.isReady ? 'ready' : 'growing'}">
              <div class="timer-name">${timer.name}</div>
              <div class="timer-time">${timer.remainingTimeFormatted}</div>
              <div class="timer-status">${timer.isReady ? '✅ PRÊT' : '🌱 En cours'}</div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
    
    container.innerHTML = html;
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
    const sectionsToHide = [
      'scheduledActivities',
      'harvestCalendar', 
      'optimizationSuggestions'
    ];
    
    sectionsToHide.forEach(sectionId => {
      const element = document.getElementById(sectionId);
      if (element) {
        element.style.display = 'none';
      }
    });
  }

  /**
   * Cleanup intervals
   */
  private static cleanup(): void {
    if (this.currentInterval !== null) {
      clearInterval(this.currentInterval);
      this.currentInterval = null;
    }
  }
}

// Export for backward compatibility
export { CropTabsRenderer as TimersRenderer };
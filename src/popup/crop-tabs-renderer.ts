import { SunflowerGameData } from '../types/extension';
import { TimerManager } from './analytics-utils';
import { TemplateEngine, TemplateData } from './template-engine';
import { CropDataManager, CropGroup } from './crop-data-manager';

/**
 * Optimized crop tabs renderer using HTML templates
 */
export class CropTabsRenderer {
  private static currentInterval: number | null = null;
  private static readonly TEMPLATES = {
    container: 'crop-tabs-container',
    tab: 'crop-tab', 
    panel: 'crop-tab-panel',
    item: 'crop-item'
  } as const;

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

      await this.renderCropTabs(container, cropsOnly);
      this.hideOtherSections();
      
    } catch (error) {
      console.error('❌ Erreur lors du rendu des onglets:', error);
      await this.renderNoData(container);
    }
  }

  /**
   * Render crop tabs interface
   */
  private static async renderCropTabs(container: HTMLElement, crops: any[]): Promise<void> {
    const cropGroups = CropDataManager.groupCropsByType(crops);
    const tabsId = `crop-tabs-${Date.now()}`;
    
    // Load main container template
    const containerTemplate = await TemplateEngine.loadTemplate(this.TEMPLATES.container);
    container.innerHTML = containerTemplate;

    // Get containers for tabs and panels
    const tabsContainer = container.querySelector('[data-tabs-container]') as HTMLElement;
    const contentContainer = container.querySelector('[data-content-container]') as HTMLElement;
    
    if (!tabsContainer || !contentContainer) {
      throw new Error('Template containers not found');
    }

    // Render tabs and panels
    await this.renderTabs(tabsContainer, cropGroups, tabsId);
    await this.renderPanels(contentContainer, cropGroups, tabsId);
    
    // Attach event listeners
    this.attachEventListeners(container);
  }

  /**
   * Render tab buttons
   */
  private static async renderTabs(container: HTMLElement, cropGroups: Map<string, CropGroup>, tabsId: string): Promise<void> {
    const tabsData = CropDataManager.createTabData(cropGroups, tabsId);
    const tabTemplate = await TemplateEngine.loadTemplate(this.TEMPLATES.tab);
    
    const tabsHTML = tabsData.map(tabData => 
      TemplateEngine.render(tabTemplate, tabData as TemplateData)
    ).join('');
    
    container.innerHTML = tabsHTML;
  }

  /**
   * Render tab panels
   */
  private static async renderPanels(container: HTMLElement, cropGroups: Map<string, CropGroup>, tabsId: string): Promise<void> {
    const panelsData = CropDataManager.createPanelData(cropGroups, tabsId);
    const panelTemplate = await TemplateEngine.loadTemplate(this.TEMPLATES.panel);
    const itemTemplate = await TemplateEngine.loadTemplate(this.TEMPLATES.item);
    
    const panelsHTML = await Promise.all(
      panelsData.map(async (panelData) => {
        // Render panel structure
        let panelHTML = TemplateEngine.render(panelTemplate, panelData as TemplateData);
        
        // Render items for this panel
        const itemsHTML = panelData.items.map(item => 
          TemplateEngine.render(itemTemplate, item as TemplateData)
        ).join('');
        
        // Inject items into panel
        panelHTML = panelHTML.replace('<!-- Items injectés dynamiquement -->', itemsHTML);
        
        return panelHTML;
      })
    );
    
    container.innerHTML = panelsHTML.join('');
  }

  /**
   * Attach event listeners for tab switching
   */
  private static attachEventListeners(container: HTMLElement): void {
    const tabButtons = container.querySelectorAll('.crop-tab');
    
    tabButtons.forEach(button => {
      button.addEventListener('click', (event) => {
        const target = event.currentTarget as HTMLElement;
        const tabTarget = target.getAttribute('data-tab-target');
        
        if (!tabTarget) return;
        
        this.switchTab(target, tabTarget);
      });
    });
  }

  /**
   * Switch active tab
   */
  private static switchTab(clickedButton: HTMLElement, tabId: string): void {
    const tabsContainer = clickedButton.closest('.crop-tabs-container');
    
    if (!tabsContainer) return;
    
    // Remove active class from all tabs and panels
    tabsContainer.querySelectorAll('.crop-tab').forEach(tab => 
      tab.classList.remove('active')
    );
    tabsContainer.querySelectorAll('.crop-tab-panel').forEach(panel => 
      panel.classList.remove('active')
    );
    
    // Add active class to clicked tab
    clickedButton.classList.add('active');
    
    // Add active class to corresponding panel
    const panel = document.getElementById(tabId);
    if (panel) {
      panel.classList.add('active');
    }
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
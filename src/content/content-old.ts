import { 
  ExtensionSettings,
  PageInfo,
  ExtensionMessage,
  ExtensionAction,
  ActivityAction,
  ToggleFeatureMessage,
  UpdateSettingsMessage
} from '../types/extension';

class ContentScriptManager {
  private isActive = false;
  private settings: ExtensionSettings = { isActive: false, autoMode: false };
  private helperUI: HTMLElement | null = null;
  private mutationObserver?: MutationObserver;
  private keyboardHandler: (event: KeyboardEvent) => void;

  constructor() {
    console.log('Sunflower Helpers content script chargé');
    
    this.keyboardHandler = (event: KeyboardEvent) => this.handleKeyboardShortcuts(event);
    this.initialize();
  }

  private async initialize(): Promise<void> {
    await this.loadSettings();
    this.setupEventListeners();
    this.notifyPageVisit();
    this.observePageChanges();
  }

  private async loadSettings(): Promise<void> {
    try {
      const response = await chrome.runtime.sendMessage({
        action: ExtensionAction.GET_SETTINGS
      });
      
      if (response) {
        this.settings = response;
        this.isActive = response.isActive;
        
        if (this.isActive) {
          this.activateHelpers();
        }
      }
    } catch (error) {
      console.error('Erreur lors du chargement des paramètres:', error);
    }
  }

  private setupEventListeners(): void {
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      this.handleMessage(request as ExtensionMessage, sender, sendResponse);
    });
    
    document.addEventListener('DOMContentLoaded', () => this.handleDOMReady());
    window.addEventListener('load', () => this.handlePageLoad());
  }

  private handleMessage(
    request: ExtensionMessage, 
    _sender: chrome.runtime.MessageSender, 
    sendResponse: (response?: any) => void
  ): void {
    console.log('Message reçu dans content script:', request);
    
    switch (request.action) {
      case ExtensionAction.TOGGLE_FEATURE:
        const toggleMsg = request as ToggleFeatureMessage;
        this.isActive = toggleMsg.isActive;
        if (this.isActive) {
          this.activateHelpers();
        } else {
          this.deactivateHelpers();
        }
        break;
        
      case ExtensionAction.UPDATE_SETTINGS:
        const updateMsg = request as UpdateSettingsMessage;
        this.settings = { ...this.settings, ...updateMsg.settings };
        this.applySettings();
        break;
        
      case ExtensionAction.GET_PAGE_INFO:
        sendResponse(this.getPageInfo());
        break;
    }
  }

  private notifyPageVisit(): void {
    chrome.runtime.sendMessage({
      action: ExtensionAction.PAGE_VISITED,
      url: window.location.href,
      title: document.title
    }).catch(() => {
      // Extension context invalidated, ignore
    });
  }

  private activateHelpers(): void {
    console.log('Activation des helpers Sunflower');
    
    if (!this.helperUI) {
      this.createHelperUI();
    }
    
    this.enablePageEnhancements();
    this.enableKeyboardShortcuts();
    
    document.body.classList.add('sunflower-helpers-active');
    
    this.logActivity(ActivityAction.HELPERS_ACTIVATED, { url: window.location.href });
  }

  private deactivateHelpers(): void {
    console.log('Désactivation des helpers Sunflower');
    
    if (this.helperUI) {
      this.helperUI.remove();
      this.helperUI = null;
    }
    
    this.disablePageEnhancements();
    this.disableKeyboardShortcuts();
    
    document.body.classList.remove('sunflower-helpers-active');
    
    this.logActivity(ActivityAction.HELPERS_DEACTIVATED, { url: window.location.href });
  }

  private createHelperUI(): void {
    this.helperUI = document.createElement('div');
    this.helperUI.id = 'sunflower-helper-ui';
    this.helperUI.innerHTML = `
      <div class="sunflower-floating-btn" title="Sunflower Helpers">
        🌻
      </div>
      <div class="sunflower-panel" style="display: none;">
        <h3>Sunflower Helpers</h3>
        <button id="sunflower-highlight-links">Surligner les liens</button>
        <button id="sunflower-focus-mode">Mode focus</button>
        <button id="sunflower-summarize">Résumer la page</button>
      </div>
    `;
    
    document.body.appendChild(this.helperUI);
    
    const floatingBtn = this.helperUI.querySelector('.sunflower-floating-btn') as HTMLElement;
    const panel = this.helperUI.querySelector('.sunflower-panel') as HTMLElement;
    
    if (floatingBtn && panel) {
      floatingBtn.addEventListener('click', () => {
        const isVisible = panel.style.display !== 'none';
        panel.style.display = isVisible ? 'none' : 'block';
      });
    }
    
    // Événements pour les boutons
    const highlightBtn = this.helperUI.querySelector('#sunflower-highlight-links') as HTMLButtonElement;
    const focusBtn = this.helperUI.querySelector('#sunflower-focus-mode') as HTMLButtonElement;
    const summarizeBtn = this.helperUI.querySelector('#sunflower-summarize') as HTMLButtonElement;
    
    if (highlightBtn) highlightBtn.addEventListener('click', () => this.highlightLinks());
    if (focusBtn) focusBtn.addEventListener('click', () => this.toggleFocusMode());
    if (summarizeBtn) summarizeBtn.addEventListener('click', () => this.summarizePage());
  }

  private enablePageEnhancements(): void {
    if (this.settings.autoMode) {
      this.enhanceReadability();
    }
    
    this.addVisualCues();
  }

  private disablePageEnhancements(): void {
    document.querySelectorAll('.sunflower-enhancement').forEach(el => {
      el.classList.remove('sunflower-enhancement');
    });
  }

  private enableKeyboardShortcuts(): void {
    document.addEventListener('keydown', this.keyboardHandler);
  }

  private disableKeyboardShortcuts(): void {
    document.removeEventListener('keydown', this.keyboardHandler);
  }

  private handleKeyboardShortcuts(event: KeyboardEvent): void {
    // Ctrl+Shift+H : Activer/désactiver les helpers
    if (event.ctrlKey && event.shiftKey && event.key === 'H') {
      event.preventDefault();
      chrome.runtime.sendMessage({ action: ExtensionAction.TOGGLE_FROM_KEYBOARD });
    }
    
    // Ctrl+Shift+F : Mode focus
    if (event.ctrlKey && event.shiftKey && event.key === 'F') {
      event.preventDefault();
      this.toggleFocusMode();
    }
  }

  private highlightLinks(): void {
    const links = document.querySelectorAll('a[href]') as NodeListOf<HTMLAnchorElement>;
    links.forEach(link => {
      link.classList.toggle('sunflower-highlighted-link');
    });
    
    this.logActivity(ActivityAction.LINKS_HIGHLIGHTED, { count: links.length });
  }

  private toggleFocusMode(): void {
    const isFocusMode = document.body.classList.contains('sunflower-focus-mode');
    
    if (isFocusMode) {
      document.body.classList.remove('sunflower-focus-mode');
    } else {
      document.body.classList.add('sunflower-focus-mode');
      
      const distractingElements = document.querySelectorAll(
        'aside, .sidebar, .ads, [class*="ad-"]'
      ) as NodeListOf<HTMLElement>;
      
      distractingElements.forEach(el => {
        el.style.opacity = '0.3';
      });
    }
    
    this.logActivity(ActivityAction.FOCUS_MODE_TOGGLED, { enabled: !isFocusMode });
  }

  private summarizePage(): void {
    const content = this.extractMainContent();
    console.log('Résumé de la page:', content.substring(0, 200) + '...');
    
    alert(`Fonctionnalité de résumé en développement. Contenu principal extrait: ${content.length} caractères.`);
    
    this.logActivity(ActivityAction.PAGE_SUMMARIZED, { contentLength: content.length });
  }

  private extractMainContent(): string {
    const contentSelectors = [
      'main',
      'article',
      '.content',
      '.main-content',
      '#content',
      '.post-content'
    ];
    
    for (const selector of contentSelectors) {
      const element = document.querySelector(selector);
      if (element) {
        return (element as HTMLElement).textContent || (element as HTMLElement).innerText || '';
      }
    }
    
    // Fallback : contenu du body sans scripts et styles
    const bodyClone = document.body.cloneNode(true) as HTMLElement;
    const scripts = bodyClone.querySelectorAll('script, style, noscript');
    scripts.forEach(el => el.remove());
    
    return bodyClone.textContent || bodyClone.innerText || '';
  }

  private enhanceReadability(): void {
    const textElements = document.querySelectorAll('p, h1, h2, h3, h4, h5, h6, li');
    textElements.forEach(el => {
      el.classList.add('sunflower-enhanced-text');
    });
  }

  private addVisualCues(): void {
    const interactiveElements = document.querySelectorAll(
      'button, input, select, textarea, [role="button"]'
    );
    interactiveElements.forEach(el => {
      el.classList.add('sunflower-interactive');
    });
  }

  private observePageChanges(): void {
    this.mutationObserver = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'childList' && this.isActive) {
          this.addVisualCues();
        }
      });
    });
    
    this.mutationObserver.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  private handleDOMReady(): void {
    console.log('DOM prêt pour Sunflower Helpers');
  }

  private handlePageLoad(): void {
    console.log('Page chargée pour Sunflower Helpers');
    
    if (this.isActive) {
      setTimeout(() => this.enablePageEnhancements(), 1000);
    }
  }

  private getPageInfo(): PageInfo {
    return {
      url: window.location.href,
      title: document.title,
      contentLength: document.body.textContent?.length || 0,
      linksCount: document.querySelectorAll('a[href]').length,
      imagesCount: document.querySelectorAll('img').length
    };
  }

  private logActivity(action: ActivityAction, data: Record<string, any> = {}): void {
    chrome.runtime.sendMessage({
      action: ExtensionAction.LOG_ACTIVITY,
      data: {
        action,
        url: window.location.href,
        ...data
      }
    }).catch(() => {
      // Extension context invalidated, ignore
    });
  }

  private applySettings(): void {
    if (this.isActive) {
      if (this.settings.autoMode) {
        this.enhanceReadability();
      }
    }
  }
}

// Initialisation du content script
(() => {
  new ContentScriptManager();
})();
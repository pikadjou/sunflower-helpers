/**
 * Timer Manager - Extraction PURE du temps affiché dans le HTML
 * 
 * PRINCIPE IMPORTANT:
 * - Le jeu affiche déjà le temps correct avec TOUS les bonus appliqués
 * - On ne fait AUCUN calcul de bonus nous-mêmes
 * - On parse exactement ce qui est visible à l'écran
 * - Le temps HTML = temps réel sans modification
 */

import { PureDOMExtractor, DOMExtractionResult, DOMTimerData } from './pure-dom-extractor';
import { ExtensionAction } from '../types/extension';

class TimerManager {
    private extractor: PureDOMExtractor;

    constructor() {
        this.extractor = new PureDOMExtractor();
    }

    public extractTimersOnce(): void {
        const result = this.extractor.scanOnce();
        this.handleDOMExtractionResult(result);
    }

    private handleDOMExtractionResult(result: DOMExtractionResult): void {
        const filteredElements = this.filterRelevantElements(result.foundElements);
        const timersWithEndDates = this.calculateEndDates(filteredElements);

        // Envoyer les résultats au background script
        const resultWithDates = {
            ...result,
            foundElements: filteredElements,
            totalFound: filteredElements.length,
            timersWithEndDates: timersWithEndDates
        };
        this.sendToBackground(resultWithDates);
    }

    private calculateEndDates(elements: DOMTimerData[]): Array<DOMTimerData & { endDate?: number | undefined }> {
        return elements.map(element => {
            const text = element.displayedText.toLowerCase();
            let endDate: number | undefined;

            if (text.includes('ready')) {
                // Timer prêt - pas de date de fin
                endDate = undefined;
            } else {
                // IMPORTANT: Le temps affiché dans le HTML est déjà le bon temps
                // Aucun bonus à appliquer, aucune modification
                // On utilise exactement ce qui est affiché par le jeu
                const timeInMs = this.parseExactDisplayedTime(text);
                if (timeInMs) {
                    const now = Date.now();
                    endDate = now + timeInMs;
                }
            }

            return {
                ...element,
                endDate
            };
        });
    }

    private parseExactDisplayedTime(text: string): number | null {
        let totalMs = 0;

        // Heures: "2h", "2 hr"
        const hoursMatch = text.match(/(\d+)\s*h(?:r)?/i);
        if (hoursMatch?.[1]) {
            const hours = parseInt(hoursMatch[1]);
            totalMs += hours * 60 * 60 * 1000;
        }

        // Minutes: "30m", "30 min"  
        const minutesMatch = text.match(/(\d+)\s*m(?:in)?/i);
        if (minutesMatch?.[1]) {
            const minutes = parseInt(minutesMatch[1]);
            totalMs += minutes * 60 * 1000;
        }

        // Secondes: "45s", "45 sec"
        const secondsMatch = text.match(/(\d+)\s*s(?:ec)?/i);
        if (secondsMatch?.[1]) {
            const seconds = parseInt(secondsMatch[1]);
            totalMs += seconds * 1000;
        }

        return totalMs > 0 ? totalMs : null;
    }

    private filterRelevantElements(elements: DOMTimerData[]): DOMTimerData[] {
        return elements.filter((element) => {
            const text = element.displayedText;
            
            const mightBeTimer = (
                /ready/i.test(text) ||
                /\d+[hms]/i.test(text) ||
                /\d+\s+(hr|min|sec)/i.test(text) ||
                /\d+:\d+/i.test(text) ||
                text.length < 20
            );
            
            const isGeneric = (
                element.elementInfo.tagName === 'HTML' ||
                element.elementInfo.tagName === 'BODY' ||
                text.length > 100 ||
                (/^(div|span|p)$/i.test(element.elementInfo.tagName) && text.length > 50)
            );

            return mightBeTimer && !isGeneric;
        });
    }

    private sendToBackground(result: DOMExtractionResult): void {
        // Envoyer via postMessage (comme le network interceptor)
        window.postMessage({
            type: 'SUNFLOWER_TIMER_DATA',
            action: ExtensionAction.TIMERS_EXTRACTED,
            data: result
        }, '*');
    }

    public getStatus(): { extractorStatus: any } {
        return {
            extractorStatus: this.extractor.getStatus()
        };
    }
}

// Instance globale
let timerManager: TimerManager | null = null;

// Fonction d'initialisation
function initializeTimerManager(): void {
    if (timerManager) {
        return;
    }

    timerManager = new TimerManager();
    
    // Attendre un peu pour que la page soit chargée
    setTimeout(() => {
        timerManager?.extractTimersOnce();
    }, 2000);
    
    // Et aussi tout de suite
    timerManager.extractTimersOnce();
}

// Écouter les messages pour contrôler l'extraction
function setupMessageListeners(): void {
    // Écouter les messages depuis le content script principal ou popup
    window.addEventListener('message', (event) => {
        if (event.source !== window) return;

        const { type, action } = event.data;

        if (type === 'SUNFLOWER_TIMER_CONTROL') {
            if (action === ExtensionAction.EXTRACT_TIMERS_ONCE && timerManager) {
                timerManager.extractTimersOnce();
            }
        }
    });
}

const isOnSunflowerLand = window.location.href.includes('sunflower-land.com');

// Initialiser quand le DOM est prêt
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        if (isOnSunflowerLand) {
            initializeTimerManager();
            setupMessageListeners();
        }
    });
} else {
    if (isOnSunflowerLand) {
        initializeTimerManager();
        setupMessageListeners();
    }
}

// Permettre une nouvelle extraction sur demande
window.addEventListener('focus', () => {
    // Silencieux
});

// Exporter pour utilisation externe si nécessaire
(window as any).__sunflowerTimerManager = timerManager;
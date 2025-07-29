/**
 * Simple Timer Extractor - Extraction basée uniquement sur le texte affiché dans l'HTML
 * Se concentre sur ce qui est visible à l'écran sans calculs complexes
 */

export interface DisplayedTimer {
    id: string;                    // ID unique basé sur position
    text: string;                  // Texte exact affiché ("Ready", "2h 30m", etc.)
    element: HTMLElement;          // Élément DOM contenant le texte
    position: { x: number; y: number }; // Position écran
    isReady: boolean;              // true si "Ready"
    lastSeen: number;              // Timestamp de dernière détection
}

export interface TimerDisplayResult {
    timers: DisplayedTimer[];
    timestamp: number;
    readyCount: number;
    growingCount: number;
}

export class SimpleTimerExtractor {
    private isRunning = false;
    private scanInterval: number | undefined = undefined;
    private mutationObserver: MutationObserver | undefined = undefined;
    private lastTimers: DisplayedTimer[] = [];
    private callbacks: ((result: TimerDisplayResult) => void)[] = [];

    // Patterns pour reconnaître les temps affichés
    private readonly TIME_PATTERNS = [
        /\b\d+h\s*\d*m?\b/gi,           // "2h 30m", "2h"
        /\b\d+m\s*\d*s?\b/gi,           // "30m", "30m 45s"
        /\b\d+s\b/gi,                   // "45s"
        /\b\d+\s*hr\s*\d*\s*min?\b/gi,  // "2 hr 30 min"
        /\b\d+\s*min\s*\d*\s*sec?\b/gi, // "30 min 45 sec"
        /\bReady\b/gi                   // "Ready"
    ];

    constructor() {
    }

    public addCallback(callback: (result: TimerDisplayResult) => void): void {
        this.callbacks.push(callback);
    }

    public start(interval: number = 2000): void {
        if (this.isRunning) {
            return;
        }

        this.isRunning = true;

        // Scan initial
        this.scanForDisplayedTimers();

        // Scan périodique
        this.scanInterval = window.setInterval(() => {
            this.scanForDisplayedTimers();
        }, interval);

        // Observer les changements DOM
        this.setupMutationObserver();
    }

    public stop(): void {
        if (!this.isRunning) return;

        this.isRunning = false;
        
        if (this.scanInterval) {
            clearInterval(this.scanInterval);
            this.scanInterval = undefined;
        }

        if (this.mutationObserver) {
            this.mutationObserver.disconnect();
            this.mutationObserver = undefined;
        }

    }

    private setupMutationObserver(): void {
        this.mutationObserver = new MutationObserver((mutations) => {
            // Vérifier si des changements de texte ont eu lieu
            let hasTextChange = false;

            for (const mutation of mutations) {
                if (mutation.type === 'characterData') {
                    hasTextChange = true;
                    break;
                }
                
                if (mutation.type === 'childList') {
                    for (const node of Array.from(mutation.addedNodes)) {
                        if (node.nodeType === Node.ELEMENT_NODE) {
                            const element = node as Element;
                            if (this.containsTimeText(element)) {
                                hasTextChange = true;
                                break;
                            }
                        }
                    }
                }
                
                if (hasTextChange) break;
            }

            if (hasTextChange) {
                // Débounce pour éviter trop de scans
                setTimeout(() => {
                    if (this.isRunning) {
                        this.scanForDisplayedTimers();
                    }
                }, 300);
            }
        });

        this.mutationObserver.observe(document.body, {
            childList: true,
            subtree: true,
            characterData: true
        });
    }

    private containsTimeText(element: Element): boolean {
        const text = element.textContent || '';
        return this.TIME_PATTERNS.some(pattern => pattern.test(text));
    }

    private scanForDisplayedTimers(): void {
        const foundTimers: DisplayedTimer[] = [];
        const now = Date.now();

        // Méthode 1 : Scanner tout le texte visible
        this.scanAllVisibleText(foundTimers, now);

        // Méthode 2 : Scanner spécifiquement les éléments susceptibles d'avoir des timers
        this.scanSpecificElements(foundTimers, now);

        // Déduplication basée sur la position et le texte
        const uniqueTimers = this.deduplicateTimers(foundTimers);

        // Vérifier s'il y a des changements
        if (this.hasTimerChanges(this.lastTimers, uniqueTimers)) {
            const result: TimerDisplayResult = {
                timers: uniqueTimers,
                timestamp: now,
                readyCount: uniqueTimers.filter(t => t.isReady).length,
                growingCount: uniqueTimers.filter(t => !t.isReady).length
            };

            this.notifyCallbacks(result);
            this.lastTimers = uniqueTimers;

            // Log simple
        }
    }

    private scanAllVisibleText(foundTimers: DisplayedTimer[], timestamp: number): void {
        const walker = document.createTreeWalker(
            document.body,
            NodeFilter.SHOW_TEXT,
            {
                acceptNode: (node) => {
                    // Ignorer les éléments cachés
                    const parent = node.parentElement;
                    if (!parent) return NodeFilter.FILTER_REJECT;

                    const style = getComputedStyle(parent);
                    if (style.display === 'none' || style.visibility === 'hidden') {
                        return NodeFilter.FILTER_REJECT;
                    }

                    const text = node.textContent?.trim() || '';
                    return this.TIME_PATTERNS.some(pattern => pattern.test(text)) 
                        ? NodeFilter.FILTER_ACCEPT 
                        : NodeFilter.FILTER_REJECT;
                }
            }
        );

        let textNode: Text | null;
        while (textNode = walker.nextNode() as Text) {
            const element = textNode.parentElement;
            if (!element) continue;

            const text = textNode.textContent?.trim() || '';
            
            // Tester chaque pattern
            for (const pattern of this.TIME_PATTERNS) {
                pattern.lastIndex = 0; // Reset regex
                const matches = pattern.exec(text);
                
                if (matches) {
                    const matchedText = matches[0];
                    const rect = element.getBoundingClientRect();
                    
                    // Vérifier que l'élément est visible à l'écran
                    if (rect.width > 0 && rect.height > 0) {
                        const timer: DisplayedTimer = {
                            id: this.generateTimerId(element, matchedText),
                            text: matchedText,
                            element: element,
                            position: {
                                x: Math.round(rect.left + rect.width / 2),
                                y: Math.round(rect.top + rect.height / 2)
                            },
                            isReady: matchedText.toLowerCase() === 'ready',
                            lastSeen: timestamp
                        };

                        foundTimers.push(timer);
                    }
                    break; // Un seul match par élément
                }
            }
        }
    }

    private scanSpecificElements(foundTimers: DisplayedTimer[], timestamp: number): void {
        // Cibler les éléments spécifiques qui contiennent souvent des timers
        const selectors = [
            '[role="tooltip"]',           // Popovers
            '.timer',                     // Classes timer communes
            '.countdown',                 // Classes countdown
            '.progress',                  // Barres de progression
            'div[class*="timer"]',        // Divs avec "timer" dans la classe
            'span[class*="time"]',        // Spans avec "time" dans la classe
            // Sélecteurs génériques pour texte
            'div', 'span', 'p'
        ];

        for (const selector of selectors) {
            const elements = document.querySelectorAll(selector);
            
            for (const element of Array.from(elements)) {
                const text = element.textContent?.trim() || '';
                
                // Vérifier que l'élément est visible
                const style = getComputedStyle(element);
                if (style.display === 'none' || style.visibility === 'hidden') {
                    continue;
                }

                const rect = element.getBoundingClientRect();
                if (rect.width === 0 || rect.height === 0) {
                    continue;
                }

                // Tester les patterns de temps
                for (const pattern of this.TIME_PATTERNS) {
                    pattern.lastIndex = 0;
                    const matches = pattern.exec(text);
                    
                    if (matches) {
                        const matchedText = matches[0];
                        
                        // Éviter les doublons avec scanAllVisibleText
                        const existingTimer = foundTimers.find(t => 
                            Math.abs(t.position.x - (rect.left + rect.width / 2)) < 10 &&
                            Math.abs(t.position.y - (rect.top + rect.height / 2)) < 10 &&
                            t.text === matchedText
                        );

                        if (!existingTimer) {
                            const timer: DisplayedTimer = {
                                id: this.generateTimerId(element as HTMLElement, matchedText),
                                text: matchedText,
                                element: element as HTMLElement,
                                position: {
                                    x: Math.round(rect.left + rect.width / 2),
                                    y: Math.round(rect.top + rect.height / 2)
                                },
                                isReady: matchedText.toLowerCase() === 'ready',
                                lastSeen: timestamp
                            };

                            foundTimers.push(timer);
                        }
                        break;
                    }
                }
            }
        }
    }

    private generateTimerId(element: HTMLElement, text: string): string {
        const rect = element.getBoundingClientRect();
        return `timer-${Math.round(rect.left)}-${Math.round(rect.top)}-${text.replace(/\s+/g, '')}-${Date.now()}`;
    }

    private deduplicateTimers(timers: DisplayedTimer[]): DisplayedTimer[] {
        const seen = new Map<string, DisplayedTimer>();

        for (const timer of timers) {
            // Clé basée sur position approximative et texte
            const posKey = `${Math.round(timer.position.x / 10) * 10}-${Math.round(timer.position.y / 10) * 10}`;
            const key = `${posKey}-${timer.text}`;

            if (!seen.has(key) || seen.get(key)!.lastSeen < timer.lastSeen) {
                seen.set(key, timer);
            }
        }

        return Array.from(seen.values());
    }

    private hasTimerChanges(oldTimers: DisplayedTimer[], newTimers: DisplayedTimer[]): boolean {
        if (oldTimers.length !== newTimers.length) {
            return true;
        }

        // Créer des sets pour comparer
        const oldSet = new Set(oldTimers.map(t => `${t.position.x}-${t.position.y}-${t.text}`));
        const newSet = new Set(newTimers.map(t => `${t.position.x}-${t.position.y}-${t.text}`));

        // Vérifier si les sets sont différents
        if (oldSet.size !== newSet.size) {
            return true;
        }

        for (const item of oldSet) {
            if (!newSet.has(item)) {
                return true;
            }
        }

        return false;
    }

    private notifyCallbacks(result: TimerDisplayResult): void {
        for (const callback of this.callbacks) {
            try {
                callback(result);
            } catch (error) {
            }
        }
    }

    public getStatus(): { isRunning: boolean; lastTimersCount: number } {
        return {
            isRunning: this.isRunning,
            lastTimersCount: this.lastTimers.length
        };
    }
}
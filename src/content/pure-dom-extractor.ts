/**
 * Pure DOM Extractor - Lit EXACTEMENT ce qui est affiché par le jeu
 * 
 * PRINCIPE: Le jeu calcule et affiche déjà le bon temps avec tous les bonus.
 * On ne fait que lire ce qui est visible, sans aucune modification.
 */

export interface DOMTimerData {
    displayedText: string;         // Le texte brut tel qu'affiché
    position: { x: number; y: number }; // Position à l'écran
    timestamp: number;             // Quand on l'a trouvé
    elementInfo: {
        tagName: string;
        className: string;
        id: string;
        innerHTML: string;
    };
}

export interface DOMExtractionResult {
    foundElements: DOMTimerData[];
    scanTimestamp: number;
    totalFound: number;
}

export class PureDOMExtractor {
    private callbacks: ((result: DOMExtractionResult) => void)[] = [];

    constructor() {
    }

    public addCallback(callback: (result: DOMExtractionResult) => void): void {
        this.callbacks.push(callback);
    }

    public scanOnce(): DOMExtractionResult {
        return this.scanDOM();
    }

    private scanDOM(): DOMExtractionResult {
        const foundElements: DOMTimerData[] = [];
        const scanTimestamp = Date.now();

        // Chercher tous les éléments visibles avec du texte
        this.scanAllVisibleElements(foundElements, scanTimestamp);

        // Créer le résultat
        const result: DOMExtractionResult = {
            foundElements: foundElements,
            scanTimestamp: scanTimestamp,
            totalFound: foundElements.length
        };


        return result;
    }

    private scanAllVisibleElements(foundElements: DOMTimerData[], timestamp: number): void {
        const allElements = document.querySelectorAll('*');

        for (const element of Array.from(allElements)) {
            const htmlElement = element as HTMLElement;
            
            if (!this.isElementVisible(htmlElement)) {
                continue;
            }

            const displayedText = htmlElement.textContent?.trim() || '';
            
            if (displayedText && displayedText.length > 0) {
                const rect = htmlElement.getBoundingClientRect();
                
                if (rect.width > 0 && rect.height > 0) {
                    const timerData: DOMTimerData = {
                        displayedText: displayedText,
                        position: {
                            x: Math.round(rect.left + rect.width / 2),
                            y: Math.round(rect.top + rect.height / 2)
                        },
                        timestamp: timestamp,
                        elementInfo: {
                            tagName: htmlElement.tagName,
                            className: htmlElement.className || '',
                            id: htmlElement.id || '',
                            innerHTML: htmlElement.innerHTML.substring(0, 100)
                        }
                    };

                    foundElements.push(timerData);
                }
            }
        }
    }

    private isElementVisible(element: HTMLElement): boolean {
        // Vérifier le style CSS
        const style = getComputedStyle(element);
        if (style.display === 'none' || 
            style.visibility === 'hidden' || 
            style.opacity === '0') {
            return false;
        }

        // Vérifier la position sur l'écran
        const rect = element.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0;
    }



    public getStatus(): { lastScanTime: number | null } {
        return {
            lastScanTime: Date.now()
        };
    }

    // Méthodes utilitaires pour filtrer les résultats après extraction
    public static filterByText(elements: DOMTimerData[], textPattern: RegExp): DOMTimerData[] {
        return elements.filter(el => textPattern.test(el.displayedText));
    }

    public static filterByTag(elements: DOMTimerData[], tagName: string): DOMTimerData[] {
        return elements.filter(el => el.elementInfo.tagName.toLowerCase() === tagName.toLowerCase());
    }

    public static filterByClass(elements: DOMTimerData[], className: string): DOMTimerData[] {
        return elements.filter(el => el.elementInfo.className.includes(className));
    }

    public static filterByPosition(elements: DOMTimerData[], minX: number, maxX: number, minY: number, maxY: number): DOMTimerData[] {
        return elements.filter(el => 
            el.position.x >= minX && el.position.x <= maxX &&
            el.position.y >= minY && el.position.y <= maxY
        );
    }
}
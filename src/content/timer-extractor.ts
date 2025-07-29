/**
 * Timer Extractor - Module d'extraction des timers de crops depuis l'interface DOM
 * Basé sur l'analyse du code source de Sunflower Land
 */

import { ExtractedTimer, TimerExtractionResult } from '../types/extension';

export interface ExtractionStrategy {
    name: string;
    extract(): ExtractedTimer[];
    isAvailable(): boolean;
}

export class CropTimerExtractor {
    private strategies: ExtractionStrategy[] = [];
    private isRunning = false;
    private extractionInterval: number | undefined = undefined;
    private mutationObserver: MutationObserver | undefined = undefined;
    private lastResults: ExtractedTimer[] = [];
    private callbacks: ((result: TimerExtractionResult) => void)[] = [];

    constructor() {
        this.initializeStrategies();
    }

    private initializeStrategies(): void {
        this.strategies = [
            new TextPatternStrategy(),
            new ImageContextStrategy(),
            new PopoverDetectionStrategy(),
            new ProgressBarStrategy()
        ];
    }

    public addCallback(callback: (result: TimerExtractionResult) => void): void {
        this.callbacks.push(callback);
    }

    public removeCallback(callback: (result: TimerExtractionResult) => void): void {
        const index = this.callbacks.indexOf(callback);
        if (index > -1) {
            this.callbacks.splice(index, 1);
        }
    }

    public start(options: { interval?: number; strategies?: string[] } = {}): void {
        if (this.isRunning) {
            return;
        }

        const interval = options.interval || 2000; // 2 secondes par défaut
        this.isRunning = true;

        // Filtrer les stratégies si spécifié
        if (options.strategies) {
            this.strategies = this.strategies.filter(s => 
                options.strategies!.includes(s.name)
            );
        }

        // Scanner initial
        this.performExtraction();

        // Scanner périodique
        this.extractionInterval = window.setInterval(() => {
            this.performExtraction();
        }, interval);

        // Observer les mutations DOM
        this.setupMutationObserver();

    }

    public stop(): void {
        if (!this.isRunning) {
            return;
        }

        this.isRunning = false;

        if (this.extractionInterval) {
            clearInterval(this.extractionInterval);
            this.extractionInterval = undefined;
        }

        if (this.mutationObserver) {
            this.mutationObserver.disconnect();
            this.mutationObserver = undefined;
        }

    }

    private setupMutationObserver(): void {
        this.mutationObserver = new MutationObserver((mutations) => {
            let shouldExtract = false;

            for (const mutation of mutations) {
                // Vérifier si des éléments avec du texte temporel ont été ajoutés
                if (mutation.type === 'childList') {
                    for (const node of Array.from(mutation.addedNodes)) {
                        if (node.nodeType === Node.ELEMENT_NODE) {
                            const element = node as Element;
                            if (this.elementContainsTimeText(element)) {
                                shouldExtract = true;
                                break;
                            }
                        }
                    }
                }

                // Vérifier les changements de texte
                if (mutation.type === 'characterData') {
                    const text = mutation.target.textContent || '';
                    if (this.isTimeFormat(text)) {
                        shouldExtract = true;
                    }
                }

                if (shouldExtract) break;
            }

            if (shouldExtract) {
                // Debounce pour éviter trop d'extractions
                setTimeout(() => this.performExtraction(), 100);
            }
        });

        this.mutationObserver.observe(document.body, {
            childList: true,
            subtree: true,
            characterData: true
        });
    }

    private elementContainsTimeText(element: Element): boolean {
        const text = element.textContent || '';
        return this.isTimeFormat(text) || 
               element.querySelector('*')?.textContent?.includes('Ready') ||
               element.querySelector('img[src*="crops/"]') !== null;
    }

    private performExtraction(): void {
        if (!this.isRunning) return;

        const allTimers: ExtractedTimer[] = [];
        const extractionTimestamp = Date.now();

        // Exécuter toutes les stratégies disponibles
        for (const strategy of this.strategies) {
            if (strategy.isAvailable()) {
                try {
                    const timers = strategy.extract();
                    allTimers.push(...timers);
                } catch (error) {
                }
            }
        }

        // Déduplication des timers
        const uniqueTimers = this.deduplicateTimers(allTimers);

        // Calculer les statistiques
        const readyCount = uniqueTimers.filter(t => t.state === 'ready').length;
        const growingCount = uniqueTimers.filter(t => t.state === 'growing').length;

        const result: TimerExtractionResult = {
            timers: uniqueTimers,
            extractionTimestamp,
            totalFound: uniqueTimers.length,
            readyCount,
            growingCount
        };

        // Notifier seulement s'il y a des changements
        if (this.hasChanges(this.lastResults, uniqueTimers)) {
            this.notifyCallbacks(result);
            this.lastResults = uniqueTimers;
        }
    }

    private deduplicateTimers(timers: ExtractedTimer[]): ExtractedTimer[] {
        const seen = new Map<string, ExtractedTimer>();

        for (const timer of timers) {
            const key = `${timer.position.x}-${timer.position.y}-${timer.timeText}`;
            if (!seen.has(key) || seen.get(key)!.lastUpdated < timer.lastUpdated) {
                seen.set(key, timer);
            }
        }

        return Array.from(seen.values());
    }

    private hasChanges(oldTimers: ExtractedTimer[], newTimers: ExtractedTimer[]): boolean {
        if (oldTimers.length !== newTimers.length) {
            return true;
        }

        // Vérifier les changements de contenu
        const oldSet = new Set(oldTimers.map(t => `${t.position.x}-${t.position.y}-${t.timeText}`));
        const newSet = new Set(newTimers.map(t => `${t.position.x}-${t.position.y}-${t.timeText}`));

        return oldSet.size !== newSet.size || 
               [...oldSet].some(key => !newSet.has(key));
    }

    private notifyCallbacks(result: TimerExtractionResult): void {
        for (const callback of this.callbacks) {
            try {
                callback(result);
            } catch (error) {
            }
        }
    }

    private isTimeFormat(text: string): boolean {
        const timePatterns = [
            /\d+[hms]\s*/g,                    // "2h", "30m", "45s"
            /\d+\s+(hr|min|sec)/g,             // "2 hr", "30 min", "45 sec"
            /\d+h\s*\d+m/g,                    // "2h 30m"
            /\d+\s*hr\s+\d+\s*min/g,          // "2 hr 30 min"
            /^Ready$/i,                        // "Ready"
        ];

        return timePatterns.some(pattern => pattern.test(text));
    }

    public getStatus(): { isRunning: boolean; strategiesCount: number; lastResultsCount: number } {
        return {
            isRunning: this.isRunning,
            strategiesCount: this.strategies.length,
            lastResultsCount: this.lastResults.length
        };
    }
}

// Stratégie : Détection par patterns de texte
class TextPatternStrategy implements ExtractionStrategy {
    name = 'TextPattern';

    isAvailable(): boolean {
        return true;
    }

    extract(): ExtractedTimer[] {
        const timers: ExtractedTimer[] = [];
        const timePattern = /(?:\d+[hms]\s*)+|(?:\d+\s+(?:hr|min|sec)\s*)+|Ready/gi;

        // Chercher tous les éléments avec du texte temporel
        const walker = document.createTreeWalker(
            document.body,
            NodeFilter.SHOW_TEXT,
            {
                acceptNode: (node) => {
                    const text = node.textContent?.trim() || '';
                    return timePattern.test(text) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
                }
            }
        );

        let textNode: Text | null;
        while (textNode = walker.nextNode() as Text) {
            const element = textNode.parentElement;
            if (!element) continue;

            const text = textNode.textContent?.trim() || '';
            const matches = text.match(timePattern);

            if (matches) {
                const rect = element.getBoundingClientRect();
                const timeRemaining = this.parseTimeRemaining(text);
                const timer: ExtractedTimer = {
                    id: this.generateId(element),
                    position: { x: rect.left, y: rect.top },
                    state: text.toLowerCase() === 'ready' ? 'ready' : 'growing',
                    timeText: text,
                    timeRemaining: timeRemaining || 0,
                    element: element,
                    lastUpdated: Date.now(),
                    extractionMethod: this.name
                };

                // Tenter de détecter le type de crop par l'image parente
                const cropImage = element.closest('div')?.querySelector('img[src*="crops/"]') as HTMLImageElement;
                if (cropImage) {
                    timer.cropType = this.extractCropTypeFromSrc(cropImage.src);
                }

                timers.push(timer);
            }
        }

        return timers;
    }

    private generateId(element: HTMLElement): string {
        const rect = element.getBoundingClientRect();
        return `text-${Math.round(rect.left)}-${Math.round(rect.top)}-${Date.now()}`;
    }

    private parseTimeRemaining(text: string): number | undefined {
        if (text.toLowerCase() === 'ready') {
            return 0;
        }

        let totalSeconds = 0;

        // Parse format court (2h 30m 45s)
        const shortMatch = text.match(/(?:(\d+)h\s*)?(?:(\d+)m\s*)?(?:(\d+)s\s*)?/);
        if (shortMatch) {
            const hours = parseInt(shortMatch[1] || '0');
            const minutes = parseInt(shortMatch[2] || '0');
            const seconds = parseInt(shortMatch[3] || '0');
            totalSeconds = hours * 3600 + minutes * 60 + seconds;
        }

        // Parse format medium (2 hr 30 min 45 sec)
        const mediumMatch = text.match(/(?:(\d+)\s*hr\s*)?(?:(\d+)\s*min\s*)?(?:(\d+)\s*sec\s*)?/);
        if (mediumMatch && totalSeconds === 0) {
            const hours = parseInt(mediumMatch[1] || '0');
            const minutes = parseInt(mediumMatch[2] || '0');
            const seconds = parseInt(mediumMatch[3] || '0');
            totalSeconds = hours * 3600 + minutes * 60 + seconds;
        }

        return totalSeconds > 0 ? totalSeconds : undefined;
    }

    private extractCropTypeFromSrc(src: string): string {
        const match = src.match(/crops\/([^\/]+)\./);
        return match && match[1] ? match[1] : 'unknown';
    }
}

// Stratégie : Détection par contexte d'image
class ImageContextStrategy implements ExtractionStrategy {
    name = 'ImageContext';

    isAvailable(): boolean {
        return document.querySelector('img[src*="crops/"]') !== null;
    }

    extract(): ExtractedTimer[] {
        const timers: ExtractedTimer[] = [];
        const cropImages = document.querySelectorAll('img[src*="crops/"]') as NodeListOf<HTMLImageElement>;

        for (const img of Array.from(cropImages)) {
            const container = img.closest('div');
            if (!container) continue;

            // Chercher du texte temporel dans le conteneur ou ses voisins
            const timeElement = this.findTimeTextInContainer(container);
            if (timeElement) {
                const rect = img.getBoundingClientRect();
                const text = timeElement.textContent?.trim() || '';
                const timeRemaining = this.parseTimeRemaining(text);

                const timer: ExtractedTimer = {
                    id: this.generateId(img),
                    position: { x: rect.left, y: rect.top },
                    cropType: this.extractCropTypeFromSrc(img.src),
                    state: text.toLowerCase() === 'ready' ? 'ready' : 'growing',
                    timeText: text,
                    timeRemaining: timeRemaining || 0,
                    element: img,
                    lastUpdated: Date.now(),
                    extractionMethod: this.name
                };

                timers.push(timer);
            }
        }

        return timers;
    }

    private findTimeTextInContainer(container: Element): Element | null {
        const timePattern = /(?:\d+[hms]\s*)+|(?:\d+\s+(?:hr|min|sec)\s*)+|Ready/i;

        // Chercher dans le conteneur lui-même
        if (timePattern.test(container.textContent || '')) {
            const textElements = container.querySelectorAll('*');
            for (const element of Array.from(textElements)) {
                if (timePattern.test(element.textContent || '')) {
                    return element;
                }
            }
        }

        // Chercher dans les conteneurs siblings
        let sibling = container.nextElementSibling;
        while (sibling) {
            if (timePattern.test(sibling.textContent || '')) {
                return sibling;
            }
            sibling = sibling.nextElementSibling;
        }

        return null;
    }

    private generateId(element: HTMLElement): string {
        const rect = element.getBoundingClientRect();
        return `image-${Math.round(rect.left)}-${Math.round(rect.top)}-${Date.now()}`;
    }

    private extractCropTypeFromSrc(src: string): string {
        const match = src.match(/crops\/([^\/]+)\./);
        return match && match[1] ? match[1] : 'unknown';
    }

    private parseTimeRemaining(text: string): number | undefined {
        // Même logique que TextPatternStrategy
        if (text.toLowerCase() === 'ready') {
            return 0;
        }

        let totalSeconds = 0;
        const shortMatch = text.match(/(?:(\d+)h\s*)?(?:(\d+)m\s*)?(?:(\d+)s\s*)?/);
        if (shortMatch) {
            const hours = parseInt(shortMatch[1] || '0');
            const minutes = parseInt(shortMatch[2] || '0');
            const seconds = parseInt(shortMatch[3] || '0');
            totalSeconds = hours * 3600 + minutes * 60 + seconds;
        }

        return totalSeconds > 0 ? totalSeconds : undefined;
    }
}

// Stratégie : Détection des popovers de timer
class PopoverDetectionStrategy implements ExtractionStrategy {
    name = 'PopoverDetection';

    isAvailable(): boolean {
        return document.querySelector('[role="tooltip"]') !== null;
    }

    extract(): ExtractedTimer[] {
        const timers: ExtractedTimer[] = [];
        const popovers = document.querySelectorAll('[role="tooltip"]');

        for (const popover of Array.from(popovers)) {
            const timeText = this.extractTimeFromPopover(popover);
            if (timeText) {
                const rect = popover.getBoundingClientRect();
                const timeRemaining = this.parseTimeRemaining(timeText);

                const timer: ExtractedTimer = {
                    id: this.generateId(popover as HTMLElement),
                    position: { x: rect.left, y: rect.top },
                    state: timeText.toLowerCase() === 'ready' ? 'ready' : 'growing',
                    timeText: timeText,
                    timeRemaining: timeRemaining || 0,
                    element: popover as HTMLElement,
                    lastUpdated: Date.now(),
                    extractionMethod: this.name
                };

                // Tenter d'extraire le type de crop depuis l'image du popover
                const cropImage = popover.querySelector('img[src*="crops/"]') as HTMLImageElement;
                if (cropImage) {
                    timer.cropType = this.extractCropTypeFromSrc(cropImage.src);
                }

                timers.push(timer);
            }
        }

        return timers;
    }

    private extractTimeFromPopover(popover: Element): string | null {
        const timePattern = /(?:\d+[hms]\s*)+|(?:\d+\s+(?:hr|min|sec)\s*)+|Ready/i;
        const text = popover.textContent || '';
        const match = text.match(timePattern);
        return match ? match[0] : null;
    }

    private generateId(element: HTMLElement): string {
        const rect = element.getBoundingClientRect();
        return `popover-${Math.round(rect.left)}-${Math.round(rect.top)}-${Date.now()}`;
    }

    private extractCropTypeFromSrc(src: string): string {
        const match = src.match(/crops\/([^\/]+)\./);
        return match && match[1] ? match[1] : 'unknown';
    }

    private parseTimeRemaining(text: string): number | undefined {
        if (text.toLowerCase() === 'ready') {
            return 0;
        }

        let totalSeconds = 0;
        const shortMatch = text.match(/(?:(\d+)h\s*)?(?:(\d+)m\s*)?(?:(\d+)s\s*)?/);
        if (shortMatch) {
            const hours = parseInt(shortMatch[1] || '0');
            const minutes = parseInt(shortMatch[2] || '0');
            const seconds = parseInt(shortMatch[3] || '0');
            totalSeconds = hours * 3600 + minutes * 60 + seconds;
        }

        return totalSeconds > 0 ? totalSeconds : undefined;
    }
}

// Stratégie : Détection des barres de progression
class ProgressBarStrategy implements ExtractionStrategy {
    name = 'ProgressBar';

    isAvailable(): boolean {
        return document.querySelector('[class*="progress"], [class*="bar"]') !== null;
    }

    extract(): ExtractedTimer[] {
        const timers: ExtractedTimer[] = [];
        
        // Chercher les éléments qui ressemblent à des barres de progression
        const progressElements = document.querySelectorAll(
            '[class*="progress"], [class*="bar"], [style*="width:"], [style*="transform:"]'
        );

        for (const element of Array.from(progressElements)) {
            // Vérifier si l'élément ou un parent contient du texte temporel
            const timeElement = this.findTimeTextNearProgress(element);
            if (timeElement) {
                const rect = element.getBoundingClientRect();
                const text = timeElement.textContent?.trim() || '';
                const timeRemaining = this.parseTimeRemaining(text);

                const timer: ExtractedTimer = {
                    id: this.generateId(element as HTMLElement),
                    position: { x: rect.left, y: rect.top },
                    state: this.determineStateFromProgress(element, text),
                    timeText: text,
                    timeRemaining: timeRemaining || 0,
                    element: element as HTMLElement,
                    lastUpdated: Date.now(),
                    extractionMethod: this.name
                };

                timers.push(timer);
            }
        }

        return timers;
    }

    private findTimeTextNearProgress(element: Element): Element | null {
        const timePattern = /(?:\d+[hms]\s*)+|(?:\d+\s+(?:hr|min|sec)\s*)+|Ready/i;

        // Chercher dans l'élément lui-même
        if (timePattern.test(element.textContent || '')) {
            return element;
        }

        // Chercher dans le parent
        const parent = element.parentElement;
        if (parent && timePattern.test(parent.textContent || '')) {
            const timeElements = parent.querySelectorAll('*');
            for (const child of Array.from(timeElements)) {
                if (timePattern.test(child.textContent || '')) {
                    return child;
                }
            }
        }

        return null;
    }

    private determineStateFromProgress(element: Element, text: string): 'ready' | 'growing' | 'unknown' {
        if (text.toLowerCase() === 'ready') {
            return 'ready';
        }

        // Analyser le style pour déterminer le pourcentage de progression
        const style = getComputedStyle(element);
        const width = style.width;
        const transform = style.transform;

        // Si la largeur est proche de 100% ou transform scale proche de 1, considérer comme prêt
        if (width.includes('100%') || transform.includes('scale(1')) {
            return 'ready';
        }

        return 'growing';
    }

    private generateId(element: HTMLElement): string {
        const rect = element.getBoundingClientRect();
        return `progress-${Math.round(rect.left)}-${Math.round(rect.top)}-${Date.now()}`;
    }

    private parseTimeRemaining(text: string): number | undefined {
        if (text.toLowerCase() === 'ready') {
            return 0;
        }

        let totalSeconds = 0;
        const shortMatch = text.match(/(?:(\d+)h\s*)?(?:(\d+)m\s*)?(?:(\d+)s\s*)?/);
        if (shortMatch) {
            const hours = parseInt(shortMatch[1] || '0');
            const minutes = parseInt(shortMatch[2] || '0');
            const seconds = parseInt(shortMatch[3] || '0');
            totalSeconds = hours * 3600 + minutes * 60 + seconds;
        }

        return totalSeconds > 0 ? totalSeconds : undefined;
    }
}
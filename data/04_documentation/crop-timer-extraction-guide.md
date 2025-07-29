# Guide de Récupération des Temps de Crops - Sunflower Land

## Vue d'ensemble

Ce guide détaille comment récupérer et observer les temps des crops affichés dans l'interface web de Sunflower Land pour les implémenter dans l'extension Chrome.

## 🔍 Analyse du Code Source

### Fonctions de Formatage des Temps

#### `secondsToString(seconds, options)` - Fonction Principale
**Localisation** : `code.js:201871`

```javascript
function secondsToString(seconds, options = {}) {
    // Options supportées :
    // - length: "short" | "medium" | "full"
    // - isShortFormat: boolean
    // - removeTrailingZeros: boolean
}
```

**Formats supportés** :
- **Format court** : `"2h 30m"` (avec `isShortFormat: true`)
- **Format medium** : `"2 hr 30 min"` (par défaut)
- **Format full** : `"2 hours 30 minutes"`

#### Unités de Temps Utilisées
```javascript
// Format court (code.js:107280-107282)
const shortUnits = {
    days: "d",
    hours: "h", 
    minutes: "m",
    seconds: "s"
};

// Format medium (code.js:107272-107273)
const mediumUnits = {
    days: "day",
    hours: "hr",
    minutes: "min", 
    seconds: "sec"
};
```

### Logique de Calcul des Temps

#### Détection de l'État des Crops
**Localisation** : `code.js:460021`

```javascript
function getCropState(currentTime, crop, cropData) {
    const progress = (currentTime - crop.plantedAt) / (cropData.harvestSeconds * 1000);
    
    if (progress >= 1.0) return "ready";      // 100%+ - Prêt à récolter
    if (progress >= 0.5) return "almost";    // 50%+ - Presque prêt
    if (progress >= 0.25) return "halfway";  // 25%+ - À mi-chemin
    return "seedling";                       // <25% - Jeune pousse
}
```

#### Calcul du Temps Restant
**Localisation** : `code.js:460011`

```javascript
function calculateTimeLeft(crop, cropData) {
    const endTime = crop.plantedAt + (cropData.harvestSeconds * 1000);
    const timeLeft = endTime > Date.now() ? (endTime - Date.now()) / 1000 : 0;
    return Math.max(0, timeLeft);
}
```

## 🎨 Composants d'Interface

### TimerPopover - Affichage Principal
**Localisation** : `code.js:459968`

```typescript
interface TimerPopover {
    // Affiché au survol des crops en croissance
    // Contient : image du crop + nom + temps restant
    children: secondsToString(timeLeft, { length: "medium" })
}
```

**Conditions d'affichage** :
```javascript
const showTimerPopover = showTimers && cropGrowing && onMouseEnter;
```

### ProgressBar - Barre de Progression
**Localisation** : `code.js:295620`

```typescript
interface ProgressBar {
    // Affiche le temps restant au-dessus de la barre
    timeDisplay: secondsToString(timeLeft, { isShortFormat: true })
}
```

### État "Ready" 
**Localisation** : `code.js:103659, code.js:463462`

```javascript
// Variable globale
const ready$d = "Ready";

// Rendu dans l'interface
if (cropState === "ready") {
    return { children: "Ready" };
}
```

## 🔧 Méthodes d'Extraction pour l'Extension

### 1. Observation des Éléments DOM

#### Sélecteurs CSS Recommandés
```css
/* Crops prêts à récolter */
.ready { }

/* Crops avec timers */
.cursor-pointer.hover\\:img-highlight { }

/* Popovers de timer */
[role="tooltip"] { }
```

#### Recherche par Contenu Textuel
```javascript
// Détecter les crops prêts
const readyCrops = document.querySelectorAll('*:contains("Ready")');

// Détecter les formats de temps
const timeElements = document.querySelectorAll('*').filter(el => {
    return /\d+[hms]|\d+\s+(hr|min|sec)/.test(el.textContent);
});
```

### 2. Interception des Fonctions JavaScript

#### Hook sur secondsToString
```javascript
// Intercepter la fonction de formatage
const originalSecondsToString = window.secondsToString;
window.secondsToString = function(seconds, options) {
    console.log('Timer formaté:', seconds, options);
    return originalSecondsToString.call(this, seconds, options);
};
```

#### Observer les Calculs de Temps
```javascript
// Observer les calculs de timeLeft
const observerPattern = /timeLeft.*=.*\(.*\)\s*\/\s*1000/;
// Chercher dans le code évalué ou via mutation observers
```

### 3. Mutation Observer pour l'Interface Dynamique

```javascript
const timerObserver = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
            if (node.nodeType === Node.ELEMENT_NODE) {
                // Chercher les timers dans les nouveaux éléments
                const timers = node.querySelectorAll('[data-timer], .timer-text');
                const readyElements = [...node.querySelectorAll('*')]
                    .filter(el => el.textContent?.includes('Ready'));
                
                // Traiter les timers trouvés
                timers.forEach(processTimer);
                readyElements.forEach(processReadyCrop);
            }
        });
    });
});

timerObserver.observe(document.body, {
    childList: true,
    subtree: true,
    characterData: true
});
```

## 📊 Patterns de Détection

### Formats de Temps Reconnus
```javascript
const timePatterns = {
    short: /(\d+)h\s*(\d+)m|\d+[hms]/g,           // "2h 30m", "45m", "10s"
    medium: /(\d+)\s+hr\s+(\d+)\s+min/g,          // "2 hr 30 min"
    ready: /^Ready$/i,                             // "Ready"
    almost: /almost|presque/i,                     // États intermédiaires
};
```

### Localisation des Crops
```javascript
// Méthodes de localisation des éléments crop
const cropLocators = {
    // Par classes CSS
    byClass: document.querySelectorAll('.crop, [class*="crop"]'),
    
    // Par structure de position
    byPosition: document.querySelectorAll('[style*="calc(50%"]'), // Coords relatives
    
    // Par images de crops
    byImages: document.querySelectorAll('img[src*="crops/"], img[src*="seeds/"]'),
    
    // Par popovers de timer
    byTimerPopover: document.querySelectorAll('[role="tooltip"]'),
};
```

## 🛠️ Implémentation Recommandée

### Strategy Pattern pour l'Extraction
```javascript
class CropTimerExtractor {
    constructor() {
        this.strategies = [
            new DOMObservationStrategy(),
            new JSInterceptionStrategy(), 
            new MutationObserverStrategy()
        ];
    }
    
    extractTimers() {
        const results = [];
        this.strategies.forEach(strategy => {
            try {
                const timers = strategy.extract();
                results.push(...timers);
            } catch (error) {
                console.warn('Strategy failed:', strategy.name, error);
            }
        });
        return this.deduplicateTimers(results);
    }
}

class DOMObservationStrategy {
    extract() {
        // Scan périodique du DOM pour les timers
        return this.scanForTimers();
    }
    
    scanForTimers() {
        const timers = [];
        
        // Méthode 1 : Par contenu textuel
        document.querySelectorAll('*').forEach(el => {
            const text = el.textContent?.trim();
            if (this.isTimeFormat(text)) {
                timers.push(this.createTimerFromElement(el));
            }
        });
        
        // Méthode 2 : Par images de crops
        document.querySelectorAll('img[src*="crops/"]').forEach(img => {
            const timer = this.extractTimerFromCropImage(img);
            if (timer) timers.push(timer);
        });
        
        return timers;
    }
    
    isTimeFormat(text) {
        return /\d+[hms]|\d+\s+(hr|min|sec)|Ready/i.test(text);
    }
}
```

### Structure de Données Recommandée
```typescript
interface ExtractedTimer {
    id: string;                    // ID unique du crop
    position: {                    // Position dans l'interface
        x: number;
        y: number;
    };
    cropType: string;              // Type de crop (détecté par l'image)
    state: 'ready' | 'growing';    // État actuel
    timeText: string;              // Texte affiché ("Ready", "2h 30m")
    timeRemaining?: number;        // Secondes restantes (si calculable)
    element: HTMLElement;          // Référence DOM
    lastUpdated: number;           // Timestamp de dernière MAJ
}
```

## 🚨 Limitations et Considérations

### Défis Techniques
1. **Interface Dynamique** : React génère le DOM dynamiquement
2. **Code Minifié** : Noms de fonctions et variables obscurcis
3. **Mise à Jour en Temps Réel** : Les timers changent constamment
4. **Localisation des Éléments** : Pas d'IDs stables ou de data-attributes

### Solutions Recommandées
1. **Multiple Strategies** : Combiner plusieurs méthodes d'extraction
2. **Polling + Observation** : Scanner périodiquement + observer les mutations
3. **Pattern Recognition** : Reconnaître les formats plutôt que chercher des IDs
4. **Fallback Systems** : Avoir des méthodes de secours si une méthode échoue

### Performance
- **Fréquence de scan** : Max 1 scan/seconde pour éviter la surcharge
- **Debouncing** : Éviter les traitements multiples sur les mêmes éléments
- **Cleanup** : Nettoyer les observers et intervals lors du déchargement

## 📝 Exemple d'Intégration

```javascript
// Dans l'extension Chrome
class SunflowerTimerWatcher {
    constructor() {
        this.extractor = new CropTimerExtractor();
        this.lastTimers = [];
        this.scanInterval = null;
    }
    
    start() {
        // Scanner initial
        this.scanTimers();
        
        // Scanner périodique (toutes les 2 secondes)
        this.scanInterval = setInterval(() => {
            this.scanTimers();
        }, 2000);
        
        // Observer les changements de DOM
        this.setupMutationObserver();
    }
    
    scanTimers() {
        const timers = this.extractor.extractTimers();
        
        // Détecter les changements
        const changes = this.detectChanges(this.lastTimers, timers);
        
        if (changes.length > 0) {
            // Envoyer au background script
            chrome.runtime.sendMessage({
                action: 'TIMERS_UPDATED',
                data: { timers, changes }
            });
        }
        
        this.lastTimers = timers;
    }
    
    stop() {
        if (this.scanInterval) {
            clearInterval(this.scanInterval);
        }
        this.extractor.cleanup();
    }
}

// Démarrer l'observateur
const timerWatcher = new SunflowerTimerWatcher();
timerWatcher.start();
```

Ce guide fournit une base complète pour récupérer les temps des crops affichés dans l'interface de Sunflower Land et les intégrer dans l'extension Chrome.
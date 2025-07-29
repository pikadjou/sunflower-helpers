# Guide d'Extraction Simple des Timers - Basé sur l'HTML Affiché

## Vue d'ensemble

L'extension **Sunflower Helpers** utilise maintenant une approche simplifiée pour extraire les temps des crops : elle se contente de chercher et capturer **exactement ce qui est affiché** dans l'interface HTML, sans calculs complexes.

## 🎯 Principe de Fonctionnement

### Approche Simplifiée
```
HTML Affiché → Patterns de Reconnaissance → Extraction → Logs Console
```

1. **Scanner le DOM** : Chercher tout texte visible correspondant aux patterns de temps
2. **Patterns de temps** : `"2h 30m"`, `"45m"`, `"Ready"`, `"2 hr 30 min"`, etc.
3. **Extraction brute** : Récupérer exactement le texte tel qu'affiché
4. **Logs simples** : Afficher ce qui a été trouvé

### Patterns Reconnus
```typescript
const TIME_PATTERNS = [
    /\b\d+h\s*\d*m?\b/gi,           // "2h 30m", "2h"
    /\b\d+m\s*\d*s?\b/gi,           // "30m", "30m 45s"
    /\b\d+s\b/gi,                   // "45s"
    /\b\d+\s*hr\s*\d*\s*min?\b/gi,  // "2 hr 30 min"
    /\b\d+\s*min\s*\d*\s*sec?\b/gi, // "30 min 45 sec"
    /\bReady\b/gi                   // "Ready"
];
```

## 🔍 Méthodes d'Extraction

### 1. Scan de Tout le Texte Visible
```typescript
// Utilise TreeWalker pour parcourir tous les nœuds texte
const walker = document.createTreeWalker(
    document.body,
    NodeFilter.SHOW_TEXT,
    {
        acceptNode: (node) => {
            // Ignorer les éléments cachés
            const parent = node.parentElement;
            const style = getComputedStyle(parent);
            if (style.display === 'none' || style.visibility === 'hidden') {
                return NodeFilter.FILTER_REJECT;
            }
            
            // Accepter si le texte contient un pattern de temps
            const text = node.textContent?.trim() || '';
            return TIME_PATTERNS.some(pattern => pattern.test(text));
        }
    }
);
```

### 2. Scan d'Éléments Spécifiques
```typescript
// Cibler les éléments susceptibles de contenir des timers
const selectors = [
    '[role="tooltip"]',           // Popovers
    '.timer', '.countdown',       // Classes communes
    '.progress',                  // Barres de progression
    'div[class*="timer"]',        // Divs timer
    'span[class*="time"]',        // Spans time
    'div', 'span', 'p'           // Éléments génériques
];
```

## 📊 Structure des Données Extraites

### DisplayedTimer
```typescript
interface DisplayedTimer {
    id: string;                    // "timer-123-456-Ready-1234567"
    text: string;                  // Texte exact: "2h 30m", "Ready"
    element: HTMLElement;          // Élément DOM source
    position: { x: number; y: number }; // Position centre écran
    isReady: boolean;              // true si text === "Ready"
    lastSeen: number;              // Timestamp de détection
}
```

### TimerDisplayResult
```typescript
interface TimerDisplayResult {
    timers: DisplayedTimer[];      // Liste des timers trouvés
    timestamp: number;             // Timestamp du scan
    readyCount: number;            // Nombre de "Ready"
    growingCount: number;          // Nombre en cours de croissance
}
```

## 🚀 Utilisation et Test

### 1. Chargement de l'Extension
1. Compiler : `npm run build`
2. Aller dans Chrome : `chrome://extensions/`
3. Activer "Mode développeur"
4. Cliquer "Charger l'extension non empaquetée"
5. Sélectionner le dossier du projet

### 2. Test sur Sunflower Land
1. Naviguer vers `https://sunflower-land.com`
2. Se connecter et aller sur sa ferme
3. Ouvrir la Console DevTools (F12)
4. Chercher les logs avec `🎯`

### 3. Logs Attendus
```javascript
// Log d'initialisation
🎯 SimpleTimerExtractor initialisé
🎯 TimerManager (Simple) initialisé
🎯 Initialisation TimerManager (immédiate)
🎯 TimerManager (Simple) démarré

// Logs d'extraction (toutes les 2 secondes)
🎯 Temps affichés extraits: {
  total: 3,
  ready: 1,
  growing: 2,
  timestamp: "14:30:25"
}

🎯 Timer 1: { text: "Ready", isReady: true, position: {x: 245, y: 178} }
🎯 Timer 2: { text: "2h 30m", isReady: false, position: {x: 367, y: 203} }
🎯 Timer 3: { text: "45m", isReady: false, position: {x: 489, y: 156} }
```

### 4. Vérification du Stockage
```javascript
// Dans la console DevTools, vérifier le stockage
chrome.storage.local.get(['timerData'], (result) => {
    console.log('Données stockées:', result.timerData);
});
```

## 🔧 Configuration

### Intervalle de Scan
```typescript
// Par défaut : 2 secondes
timerManager.start(2000);

// Plus rapide : 1 seconde (plus de CPU)
timerManager.start(1000);

// Plus lent : 5 secondes (moins de CPU)  
timerManager.start(5000);
```

### Observer les Mutations
```typescript
// L'extracteur observe automatiquement les changements DOM
this.mutationObserver.observe(document.body, {
    childList: true,     // Nouveaux éléments
    subtree: true,       // Récursif
    characterData: true  // Changements de texte
});
```

## 🐛 Debugging

### Vérifier le Status
```javascript
// Depuis la console du navigateur
window.__sunflowerTimerManager.getStatus();
// Retourne: { isActive: true, extractorStatus: { isRunning: true, lastTimersCount: 3 } }
```

### Contrôle Manuel
```javascript
// Arrêter
window.__sunflowerTimerManager.stop();

// Redémarrer avec intervalle personnalisé
window.__sunflowerTimerManager.start(1500); // 1.5 secondes
```

### Logs Détaillés
Si aucun timer n'est trouvé, vérifier :
1. **Êtes-vous sur la ferme ?** (pas sur le menu principal)
2. **Y a-t-il des crops plantés ?** (texte temps visible)
3. **Console d'erreurs ?** (erreurs JavaScript qui bloquent)

## 📈 Avantages de l'Approche Simple

### ✅ Avantages
- **Simplicité** : Pas de calculs complexes, juste de l'extraction de texte
- **Fiabilité** : Se base sur ce qui est réellement affiché
- **Performance** : Léger et rapide
- **Maintenance** : Moins de code à maintenir
- **Robustesse** : Fonctionne même si les mécaniques de jeu changent

### ⚠️ Limitations
- **Pas de prédictions** : N'anticipe pas les temps futurs
- **Dépendant de l'affichage** : Si le jeu ne montre pas le temps, on ne le voit pas
- **Pas de bonus calculés** : N'applique pas les bonus/malus automatiquement

## 🎯 Cas d'Usage

### Monitoring Simple
```javascript
// L'extension détecte automatiquement :
✅ "Ready" → Crop prêt à récolter
✅ "2h 30m" → Temps restant affiché
✅ "45m" → Temps restant court
✅ "2 hr 30 min" → Format long
```

### Intégration avec d'Autres Outils
```javascript
// Les données sont stockées et peuvent être utilisées par :
- Interface popup de l'extension
- Outils externes via Chrome Storage API
- Scripts utilisateur personnalisés
- Notifications système
```

Cette approche garantit que l'extension capture fidèlement ce que l'utilisateur voit à l'écran, sans interprétation ni calcul supplémentaire.
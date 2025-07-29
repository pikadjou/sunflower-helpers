# Sunflower Land - Data Repository

## Vue d'ensemble

Ce dossier contient l'ensemble des données extraites, analysées et documentées du jeu **Sunflower Land** pour le développement de l'extension Chrome **Sunflower Helpers**. Ces ressources permettent d'implémenter fidèlement les mécaniques de jeu dans l'extension.

## Structure du Repository

```
data/
├── 01_game_client/          # Code source extrait du client de jeu
├── 02_api_samples/          # Exemples de réponses API du jeu
├── 03_game_data/            # Données de jeu structurées (JSON)
├── 04_documentation/        # Documentation technique détaillée
├── 05_verification/         # Rapports de vérification et validation
└── README.md               # Ce fichier
```

---

## 📁 01_game_client/ - Code Source du Jeu

### Contenu
- `code.html` - Page principale extraite de sunflower-land.com (105K+ tokens)
- `code.js` - Code JavaScript compilé du client de jeu (minifié)

### Description
Code source original extrait directement du client web de Sunflower Land. Ces fichiers contiennent :
- **Logique de jeu complète** : Calculs de temps, bonus, mécaniques
- **Interface utilisateur** : Composants React/Vue du jeu
- **API endpoints** : Définitions des appels serveur
- **Assets et ressources** : Images, sons, configurations

### Usage pour le développement
- **Reverse engineering** : Comprendre les mécaniques exactes du jeu
- **Validation** : Vérifier que nos calculs correspondent au code officiel
- **Découverte** : Identifier de nouveaux éléments de jeu non documentés

---

## 📁 02_api_samples/ - Échantillons d'API

### Contenu
- `ex.json` - Exemple de réponse API complète du jeu

### Structure de ex.json
```json
{
  "method": "POST",
  "requestBody": {
    "clientVersion": "2025-07-23T03:17",
    "timezone": "Europe/Brussels", 
    "wallet": "SafePal"
  },
  "responseBody": {
    "analyticsId": "147896",
    "announcements": { ... },
    "game": {
      "inventory": { ... },
      "collectibles": { ... },
      "crops": { ... },
      "bumpkin": { ... }
    }
  }
}
```

### Usage pour le développement
- **Format des données** : Comprendre la structure exacte des réponses API
- **Tests d'intégration** : Utiliser comme données de test réalistes
- **Parsing** : Développer les fonctions d'extraction de données
- **Debugging** : Comparer avec les données interceptées par l'extension

---

## 📁 03_game_data/ - Données de Jeu Structurées

### Contenu
- `sunflower_land_complete_game_data.json` - Base de données complète du jeu
- `sunflower_land_crops_data.json` - Données spécifiques aux cultures

### sunflower_land_complete_game_data.json
Base de données exhaustive extraite du code source, contenant :

#### Crops (Cultures)
```json
{
  "crops": {
    "basic_crops": {
      "sunflower": {
        "name": "Sunflower",
        "seed_price": 0.01,
        "sell_price": 0.02,
        "plant_seconds": 60,
        "harvest_seconds": 60,
        "bumpkin_level_required": 1,
        "category": "basic"
      }
    }
  }
}
```

#### Collectibles & Items
- **Tools** : Outils de ferme (axes, pickaxes, rods)
- **Decorations** : Éléments décoratifs avec bonus
- **Buildings** : Structures et bâtiments
- **Resources** : Matériaux et ressources
- **Seeds** : Graines de toutes les cultures
- **Consumables** : Nourriture et potions

#### Skills & Progression
- **Bumpkin Skills** : Compétences déblocables
- **Experience** : Système de progression
- **Achievements** : Succès et récompenses

### Usage pour le développement
- **Calculs de temps** : Utiliser `harvest_seconds` pour les timers
- **Calculs de yield** : Appliquer les bonus des collectibles
- **Validation** : S'assurer que nos données correspondent au jeu
- **Interface** : Afficher les noms, prix et descriptions corrects

---

## 📁 04_documentation/ - Documentation Technique

### Contenu
- `crop-calculation-documentation.md` - Documentation complète du système de calcul

### crop-calculation-documentation.md
Documentation technique de 446 lignes couvrant :

#### Architecture du Système
```typescript
interface ActiveTimer {
  id: string;                    // "crop-1", "crop-2"
  type: 'crop';                  
  name: string;                  // "Kale x2.5 (+150% yield)"
  remainingTime: number;         // Millisecondes restantes
  totalTime: number;             // Temps total avec bonus
  isReady: boolean;             // Prêt à récolter
  baseYield: number;            // Quantité plantée
  expectedYield: number;        // Quantité finale avec bonus
  yieldBonus: number;           // Pourcentage de bonus
}
```

#### Fonctions Principales
1. **getCropGrowthTime()** : Temps de croissance de base
2. **getCropSpeedMultiplier()** : Calcul des bonus de vitesse
3. **getCropYieldMultiplier()** : Calcul des bonus de rendement
4. **formatTime()** : Formatage des durées

#### Types de Bonus Documentés
- **Bonus Globaux** : Lunar Calendar, Nancy, Skills
- **Bonus par Catégorie** : Basic/Medium/Advanced crops
- **Bonus Spécifiques** : Items pour crops individuels
- **Fertilizers** : Sprout Mix, compost, etc.

#### Exemples de Calcul
Calculs détaillés avec données réelles pour valider l'implémentation.

### Usage pour le développement
- **Implémentation** : Guide complet pour coder les fonctions de calcul
- **Architecture** : Structure de données et flux de traitement
- **Validation** : Exemples pour tester les calculs
- **Maintenance** : Référence pour les futures modifications

---

## 📁 05_verification/ - Rapports de Validation

### Contenu
- `final_verification_summary.txt` - Résumé de validation finale
- `verification_bonus_calculations.txt` - Vérifications des calculs de bonus
- `verification_crop_times.txt` - Vérifications des temps de croissance

### final_verification_summary.txt
Rapport de validation complet confirmant :

#### ✅ Conformité Vérifiée
- **Temps de croissance** : Tous les crops correspondent parfaitement
- **Calculs de bonus** : Méthodes additive (yield) et multiplicative (speed) correctes
- **Structure des données** : Types TypeScript et interfaces conformes

#### ⚠️ Points d'Amélioration Identifiés
- **Crops obsolètes** : Certains crops du code ne sont plus dans le jeu
- **Catégorisation** : Améliorer la classification Basic/Medium/Advanced

#### 🎯 Conclusion
```
LE CODE EST CONFORME ET FONCTIONNEL
✅ Tous les calculs critiques sont corrects
✅ Prêt pour la production
```

### Usage pour le développement
- **Validation** : Confirmer que l'implémentation est correcte
- **Tests** : Données de référence pour les tests unitaires
- **Maintenance** : Identifier les points d'amélioration futurs
- **Qualité** : Assurance qualité du code produit

---

## 🔧 Guide d'Utilisation pour le Développement

### 1. Développement de Nouvelles Fonctionnalités

#### Étape 1 : Consulter la Documentation
```bash
# Lire la documentation technique
cat 04_documentation/crop-calculation-documentation.md
```

#### Étape 2 : Utiliser les Données de Référence
```typescript
// Importer les données de jeu
import gameData from './03_game_data/sunflower_land_complete_game_data.json';

// Utiliser pour les calculs
const cropData = gameData.crops.basic_crops.sunflower;
const harvestTime = cropData.harvest_seconds * 1000; // Convertir en ms
```

#### Étape 3 : Tester avec les Échantillons API
```typescript
// Utiliser les données réalistes pour les tests
import apiSample from './02_api_samples/ex.json';
const gameState = apiSample.responseBody.game;
```

#### Étape 4 : Valider avec les Rapports
```bash
# Vérifier que les calculs correspondent aux validations
diff my_calculations 05_verification/verification_crop_times.txt
```

### 2. Maintenance et Mise à Jour

#### Mise à Jour des Données de Jeu
1. Extraire le nouveau code source du jeu → `01_game_client/`
2. Parser les nouvelles données → `03_game_data/`
3. Mettre à jour la documentation → `04_documentation/`
4. Valider les changements → `05_verification/`

#### Ajout de Nouvelles Mécaniques
1. Analyser le code source dans `01_game_client/`
2. Documenter la nouvelle mécanique dans `04_documentation/`
3. Implémenter en suivant les patterns existants
4. Créer des rapports de validation dans `05_verification/`

### 3. Debugging et Troubleshooting

#### Problèmes de Calcul
1. Comparer avec `05_verification/verification_bonus_calculations.txt`
2. Vérifier les données dans `03_game_data/`
3. Analyser le code original dans `01_game_client/`

#### Problèmes d'API
1. Comparer la structure avec `02_api_samples/ex.json`
2. Vérifier les champs attendus et leurs types
3. Tester avec des données réalistes

---

## 📊 Statistiques du Repository

### Volume de Données
- **Code source** : 105K+ tokens (code.html)
- **Documentation** : 446 lignes de documentation technique
- **Données structurées** : JSON complet avec 25+ crops, 100+ items
- **Validation** : 3 rapports de vérification détaillés

### Couverture Fonctionnelle
- **✅ Crops** : 25 cultures avec temps exacts
- **✅ Bonus de vitesse** : 15+ types de bonus validés
- **✅ Bonus de yield** : 20+ types de bonus validés  
- **✅ Skills** : Système de compétences Bumpkin
- **✅ Collectibles** : 100+ items avec effets documentés

### Niveau de Validation
- **✅ Conformité** : Code validé contre le jeu officiel
- **✅ Précision** : Calculs vérifiés avec exemples réels
- **✅ Complétude** : Documentation exhaustive
- **✅ Maintenance** : Structure organisée pour les mises à jour

---

## 🚀 Prochaines Étapes

### Développement de l'Extension
1. **Utiliser `04_documentation/`** comme guide d'implémentation
2. **Importer `03_game_data/`** pour les données de référence
3. **Tester avec `02_api_samples/`** pour la validation
4. **Suivre `05_verification/`** pour la conformité

### Fonctionnalités Prioritaires
1. **Timer System** : Implémentation des calculs de temps
2. **Yield Calculator** : Système de calcul des rendements
3. **API Parser** : Extraction des données depuis les appels interceptés
4. **UI Components** : Interface utilisateur pour afficher les timers

### Maintenance Continue
1. **Monitoring** : Détecter les changements du jeu
2. **Updates** : Maintenir les données à jour
3. **Validation** : Vérifier régulièrement la conformité
4. **Documentation** : Tenir à jour la documentation technique

---

Ce repository constitue la base de données complète et validée pour le développement de l'extension **Sunflower Helpers**, garantissant une implémentation fidèle et maintenue des mécaniques du jeu **Sunflower Land**.
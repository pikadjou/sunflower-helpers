import { SunflowerGameData } from '../types/extension';


export interface TimerData {
  activeTimers: ActiveTimer[];
  scheduledActivities: ScheduledActivity[];
  harvestCalendar: HarvestEvent[];
  optimizationSuggestions: OptimizationSuggestion[];
}

export interface ActiveTimer {
  id: string;
  type: 'crop' | 'building' | 'beehive' | 'resource' | 'fruit';
  name: string;
  remainingTime: number;
  totalTime: number;
  isReady: boolean;
}

export interface ScheduledActivity {
  id: string;
  type: string;
  name: string;
  scheduledTime: number;
  estimatedDuration: number;
  priority: number;
}

export interface HarvestEvent {
  id: string;
  cropType: string;
  location: string;
  harvestTime: number;
  value: number;
}

export interface OptimizationSuggestion {
  type: 'efficiency' | 'timing' | 'resource';
  title: string;
  description: string;
  impact: 'high' | 'medium' | 'low';
  action: string;
}


export class TimerManager {
  static calculateTimers(gameData: SunflowerGameData): TimerData {
    console.log('🔍 TimerManager.calculateTimers démarré avec:', {
      gameData: !!gameData,
      crops: gameData?.crops ? Object.keys(gameData.crops) : 'undefined',
      beehives: gameData?.beehives ? Object.keys(gameData.beehives) : 'undefined',
      buildings: gameData?.buildings ? Object.keys(gameData.buildings) : 'undefined'
    });

    // Ensure gameData exists before proceeding
    if (!gameData) {
      console.log('❌ Pas de gameData, retour de données vides');
      return {
        activeTimers: [],
        scheduledActivities: [],
        harvestCalendar: [],
        optimizationSuggestions: []
      };
    }

    const activeTimers: ActiveTimer[] = [];
    const scheduledActivities: ScheduledActivity[] = [];
    const harvestCalendar: HarvestEvent[] = [];
    const optimizationSuggestions: OptimizationSuggestion[] = [];

    try {
      // Analyse des cultures
      console.log('🌾 Analyse des cultures...');
      this.analyzeCrops(gameData, activeTimers);
      console.log('🌾 Cultures analysées, timers trouvés:', activeTimers.length);
      
      // Analyse des bâtiments (cuisson)
      this.analyzeBuildings(gameData, activeTimers);
      
      // Analyse des ruches (miel)
      this.analyzeBeehives(gameData, activeTimers, scheduledActivities);
      
      // Analyse des ressources (bois, pierre, etc.)
      this.analyzeResources(gameData, activeTimers, scheduledActivities);
      
      // Analyse des arbres fruitiers
      this.analyzeFruitTrees(gameData, activeTimers, harvestCalendar);
      
      // Générer des suggestions d'optimisation
      this.generateOptimizationSuggestions(gameData, optimizationSuggestions);
    } catch (error) {
      console.error('❌ Erreur lors de l\'analyse des timers:', error);
    }

    return {
      activeTimers: activeTimers.sort((a, b) => a.remainingTime - b.remainingTime),
      scheduledActivities: scheduledActivities.sort((a, b) => a.scheduledTime - b.scheduledTime),
      harvestCalendar: harvestCalendar.sort((a, b) => a.harvestTime - b.harvestTime),
      optimizationSuggestions
    };
  }

  private static analyzeCrops(gameData: SunflowerGameData, timers: ActiveTimer[]): void {
    const crops = gameData.crops || {};
    const now = Date.now();
    
    console.log('🌾 Analyse des crops - structures trouvées:', {
      gameDataKeys: Object.keys(gameData),
      cropsCount: Object.keys(crops).length,
      firstCrop: Object.values(crops)[0],
      state: gameData['state'] ? Object.keys(gameData['state']) : 'undefined'
    });
    
    // Si pas de crops direct, chercher dans state
    if (Object.keys(crops).length === 0 && gameData['state']) {
      console.log('🌾 Recherche dans gameData.state:', gameData['state']);
    }
    
    Object.entries(crops).forEach(([id, plotData]: [string, any]) => {
      console.log(`🌾 Plot ${id}:`, plotData);
      
      // Dans Sunflower Land, l'info de crop est dans plotData.crop
      const crop = plotData.crop;
      if (!crop) {
        console.log(`🌾 Plot ${id} vide - pas de crop`);
        return;
      }
      
      const plantedAt = crop.plantedAt || crop.planted_at || crop.createdAt;
      const cropName = crop.name || crop.type;
      const amount = crop.amount || crop.quantity || 1;
      
      
      if (plantedAt && cropName) {
        let remainingTime: number;
        let totalTime: number;
        let isCurrentlyReady: boolean;
        
        // Utiliser currentTime et expectedEndTime pour calculer précisément
        if (crop.currentTime && crop.expectedEndTime) {
          // Calculer la différence entre expectedEndTime et currentTime du jeu
          const gameDuration = crop.expectedEndTime - crop.currentTime;
          // Ajouter cette durée à la date actuelle réelle
          const realEndTime = now + gameDuration;
          remainingTime = Math.max(0, realEndTime - now);
          totalTime = crop.totalTime || gameDuration;
          isCurrentlyReady = remainingTime === 0;
          
          console.log(`🌾 ${cropName}: gameDuration=${gameDuration}ms, remainingTime=${remainingTime}ms`);
        } else if (crop.remainingTime !== undefined && crop.totalTime !== undefined) {
          // Fallback: utiliser les données pré-calculées
          remainingTime = crop.remainingTime;
          totalTime = crop.totalTime;
          isCurrentlyReady = crop.isReady || remainingTime === 0;
        } else {
          // Fallback: calculer manuellement (données brutes uniquement)
          console.warn(`⚠️ Pas de timing pour ${cropName}, calcul manuel`);
          const plantedTime = plantedAt;
          const growthTime = this.getCropGrowthTime(cropName);
          const harvestTime = plantedTime + growthTime;
          remainingTime = Math.max(0, harvestTime - now);
          totalTime = growthTime;
          isCurrentlyReady = remainingTime === 0;
        }
        
        timers.push({
          id: `crop-${id}`,
          type: 'crop',
          name: `${cropName} x${amount}`,
          remainingTime,
          totalTime,
          isReady: isCurrentlyReady
        });
        
        console.log(`🌾 Timer ajouté pour ${cropName}: ${remainingTime > 0 ? 'en cours' : 'prêt'}`);
      } else {
        console.log(`🌾 Crop ${id} ignoré - pas de plantedAt (${plantedAt}) ou cropName (${cropName})`);
      }
    });
  }


  private static analyzeBuildings(gameData: SunflowerGameData, timers: ActiveTimer[]): void {
    const buildings = gameData.buildings || {};
    const now = Date.now();
    
    console.log('🏠 Analyse des buildings:', {
      buildingsCount: Object.keys(buildings).length,
      sampleBuilding: Object.values(buildings)[0],
      allBuildings: buildings
    });
    
    Object.entries(buildings).forEach(([id, building]: [string, any]) => {
      console.log(`🏠 Building ${id}:`, building);
      
      // Essayer différentes structures possibles pour le cooking
      const crafting = building.crafting || building.cooking || building.production;
      
      if (crafting) {
        const startTime = crafting.startedAt || crafting.started_at || crafting.createdAt;
        const duration = (crafting.timeRequired || crafting.duration || crafting.time) * 1000;
        const item = crafting.item || crafting.recipe || crafting.product || 'Item';
        const buildingName = building.name || building.type || 'Bâtiment';
        
        const endTime = startTime + duration;
        const remainingTime = Math.max(0, endTime - now);
        
        timers.push({
          id: `building-${id}`,
          type: 'building',
          name: `${buildingName} (${item})`,
          remainingTime,
          totalTime: duration,
          isReady: remainingTime === 0
        });
        
        console.log(`🏠 Timer ajouté pour ${buildingName}: ${item} - ${remainingTime > 0 ? 'en cours' : 'prêt'}`);
      } else {
        console.log(`🏠 Building ${id} ignoré - pas de crafting/cooking en cours`);
      }
    });
  }

  private static generateOptimizationSuggestions(gameData: SunflowerGameData, suggestions: OptimizationSuggestion[]): void {
    // Suggestion d'efficacité des cultures
    const crops = gameData.crops || {};
    const emptyPlots = 50 - Object.keys(crops).length;
    
    if (emptyPlots > 0) {
      suggestions.push({
        type: 'efficiency',
        title: 'Parcelles inutilisées',
        description: `Vous avez ${emptyPlots} parcelles vides. Plantez des cultures pour augmenter vos revenus.`,
        impact: 'high',
        action: 'Planter des cultures'
      });
    }
    
    
    // Suggestion de timing pour les ruches
    const beehives = gameData.beehives || {};
    const beehiveCount = Object.keys(beehives).length;
    
    if (beehiveCount < 5) {
      suggestions.push({
        type: 'timing',
        title: 'Production de miel limitée',
        description: 'Construisez plus de ruches pour augmenter la production de miel.',
        impact: 'medium',
        action: 'Construire des ruches'
      });
    }
  }

  private static getCropGrowthTime(cropType: string): number {
    // Fonction de fallback pour les données sans timing pré-calculé
    console.warn(`⚠️ Utilisation du fallback getCropGrowthTime pour "${cropType}"`);
    return 60 * 60 * 1000; // Par défaut 1 heure
  }

  /* private static estimateCropValue(cropType: string, amount: number): number {
    const cropValues: Record<string, number> = {
      'Sunflower': 0.02,
      'Potato': 0.14,
      'Pumpkin': 0.4,
      'Carrot': 0.8,
      'Cabbage': 1.5,
      'Beetroot': 2.8,
      'Cauliflower': 4.25,
      'Parsnip': 6.5,
      'Eggplant': 8,
      'Corn': 9,
      'Radish': 9.5,
      'Wheat': 7,
      'Kale': 10
    };
    
    return (cropValues[cropType] || 1) * amount;
  } */

  private static analyzeBeehives(gameData: SunflowerGameData, timers: ActiveTimer[], activities: ScheduledActivity[]): void {
    const beehives = gameData.beehives || {};
    const now = Date.now();
    
    Object.entries(beehives).forEach(([id, beehive]: [string, any]) => {
      if (beehive.honey) {
        const lastUpdated = beehive.honey.updatedAt || 0;
        const honeyProduced = beehive.honey.produced || 0;
        
        // Production de miel (1 miel par heure)
        const honeyProductionRate = 60 * 60 * 1000; // 1 heure
        const nextHoneyTime = lastUpdated + honeyProductionRate;
        const remainingTime = Math.max(0, nextHoneyTime - now);
        
        if (remainingTime > 0) {
          timers.push({
            id: `beehive-${id}`,
            type: 'beehive',
            name: `Ruche ${id} (${honeyProduced.toFixed(1)} miel)`,
            remainingTime,
            totalTime: honeyProductionRate,
            isReady: false
          });
        } else {
          timers.push({
            id: `beehive-${id}`,
            type: 'beehive',
            name: `Ruche ${id} (${honeyProduced.toFixed(1)} miel) - PRÊTE`,
            remainingTime: 0,
            totalTime: honeyProductionRate,
            isReady: true
          });
        }
        
        // Activité de collecte programmée
        activities.push({
          id: `collect-honey-${id}`,
          type: 'collection',
          name: `Collecter miel de la ruche ${id}`,
          scheduledTime: nextHoneyTime,
          estimatedDuration: 2 * 60 * 1000, // 2 minutes
          priority: remainingTime === 0 ? 3 : 1
        });
      }
    });
  }

  private static analyzeResources(gameData: SunflowerGameData, timers: ActiveTimer[], activities: ScheduledActivity[]): void {
    const now = Date.now();
    
    console.log('🪨 Analyse des resources:', {
      gameDataKeys: Object.keys(gameData),
      stones: gameData.stones ? Object.keys(gameData.stones).length : 0,
      trees: gameData.trees ? Object.keys(gameData.trees).length : 0,
      iron: gameData.iron ? Object.keys(gameData.iron).length : 0,
      gold: gameData.gold ? Object.keys(gameData.gold).length : 0
    });
    
    // Analyse des pierres
    const stones = gameData.stones || {};
    Object.entries(stones).forEach(([id, stone]: [string, any]) => {
      if (stone.minedAt) {
        const minedTime = stone.minedAt;
        const respawnTime = 2 * 60 * 60 * 1000; // 2 heures pour respawn
        const nextRespawn = minedTime + respawnTime;
        const remainingTime = Math.max(0, nextRespawn - now);
        
        if (remainingTime > 0) {
          timers.push({
            id: `stone-${id}`,
            type: 'resource',
            name: `Pierre ${id} (respawn)`,
            remainingTime,
            totalTime: respawnTime,
            isReady: false
          });
        }
        
        activities.push({
          id: `stone-respawn-${id}`,
          type: 'respawn',
          name: `Pierre ${id} disponible`,
          scheduledTime: nextRespawn,
          estimatedDuration: 0,
          priority: 1
        });
      }
    });
    
    // Analyse du bois
    const wood = gameData['wood'] || {};
    Object.entries(wood).forEach(([id, woodNode]: [string, any]) => {
      if (woodNode.choppedAt) {
        const choppedTime = woodNode.choppedAt;
        const respawnTime = 2 * 60 * 60 * 1000; // 2 heures pour respawn
        const nextRespawn = choppedTime + respawnTime;
        const remainingTime = Math.max(0, nextRespawn - now);
        
        if (remainingTime > 0) {
          timers.push({
            id: `wood-${id}`,
            type: 'resource',
            name: `Bois ${id} (respawn)`,
            remainingTime,
            totalTime: respawnTime,
            isReady: false
          });
        }
        
        activities.push({
          id: `wood-respawn-${id}`,
          type: 'respawn',
          name: `Bois ${id} disponible`,
          scheduledTime: nextRespawn,
          estimatedDuration: 0,
          priority: 1
        });
      }
    });
    
    // Analyse du fer
    const iron = gameData.iron || {};
    Object.entries(iron).forEach(([id, ironNode]: [string, any]) => {
      if (ironNode.minedAt) {
        const minedTime = ironNode.minedAt;
        const respawnTime = 4 * 60 * 60 * 1000; // 4 heures pour le fer
        const nextRespawn = minedTime + respawnTime;
        const remainingTime = Math.max(0, nextRespawn - now);
        
        if (remainingTime > 0) {
          timers.push({
            id: `iron-${id}`,
            type: 'resource',
            name: `Fer ${id} (respawn)`,
            remainingTime,
            totalTime: respawnTime,
            isReady: false
          });
        }
        
        activities.push({
          id: `iron-respawn-${id}`,
          type: 'respawn',
          name: `Fer ${id} disponible`,
          scheduledTime: nextRespawn,
          estimatedDuration: 0,
          priority: 1
        });
      }
    });
    
    // Analyse de l'or
    const gold = gameData.gold || {};
    Object.entries(gold).forEach(([id, goldNode]: [string, any]) => {
      if (goldNode.minedAt) {
        const minedTime = goldNode.minedAt;
        const respawnTime = 8 * 60 * 60 * 1000; // 8 heures pour l'or
        const nextRespawn = minedTime + respawnTime;
        const remainingTime = Math.max(0, nextRespawn - now);
        
        if (remainingTime > 0) {
          timers.push({
            id: `gold-${id}`,
            type: 'resource',
            name: `Or ${id} (respawn)`,
            remainingTime,
            totalTime: respawnTime,
            isReady: false
          });
        }
        
        activities.push({
          id: `gold-respawn-${id}`,
          type: 'respawn',
          name: `Or ${id} disponible`,
          scheduledTime: nextRespawn,
          estimatedDuration: 0,
          priority: 1
        });
      }
    });
  }

  private static analyzeFruitTrees(gameData: SunflowerGameData, timers: ActiveTimer[], calendar: HarvestEvent[]): void {
    const fruitPatches = gameData.fruitPatches || {};
    const now = Date.now();
    
    Object.entries(fruitPatches).forEach(([id, patch]: [string, any]) => {
      if (patch.fruit) {
        // Utiliser harvestedAt si disponible, sinon calculer le temps de croissance
        let harvestTime: number;
        let remainingTime: number;
        const fruitType = patch.fruit.name || 'Fruit';
        
        if (patch.fruit.harvestedAt) {
          // Calculer le prochain temps de récolte basé sur harvestedAt
          const lastHarvest = patch.fruit.harvestedAt;
          const growthTime = this.getFruitGrowthTime(fruitType);
          harvestTime = lastHarvest + growthTime;
          remainingTime = Math.max(0, harvestTime - now);
        } else if (patch.fruit.plantedAt) {
          // Calculer basé sur le temps de plantation
          const plantedTime = patch.fruit.plantedAt;
          const growthTime = this.getFruitGrowthTime(fruitType);
          harvestTime = plantedTime + growthTime;
          remainingTime = Math.max(0, harvestTime - now);
        } else {
          // Pas d'information de timing disponible
          return;
        }
        
        if (remainingTime > 0) {
          timers.push({
            id: `fruit-${id}`,
            type: 'fruit',
            name: `${fruitType} ${id}`,
            remainingTime,
            totalTime: this.getFruitGrowthTime(fruitType),
            isReady: false
          });
        } else {
          timers.push({
            id: `fruit-${id}`,
            type: 'fruit',
            name: `${fruitType} ${id} - PRÊT`,
            remainingTime: 0,
            totalTime: this.getFruitGrowthTime(fruitType),
            isReady: true
          });
        }
        
        calendar.push({
          id: `fruit-${id}`,
          cropType: fruitType,
          location: `Arbre ${id}`,
          harvestTime,
          value: this.estimateFruitValue(fruitType, patch.fruit.amount || 1)
        });
      }
    });
  }

  private static getFruitGrowthTime(fruitType: string): number {
    const growthTimes: Record<string, number> = {
      'Apple': 24 * 60 * 60 * 1000,      // 24 heures
      'Orange': 36 * 60 * 60 * 1000,     // 36 heures
      'Blueberry': 6 * 60 * 60 * 1000,   // 6 heures
      'Banana': 12 * 60 * 60 * 1000      // 12 heures
    };
    
    return growthTimes[fruitType] || 24 * 60 * 60 * 1000;
  }

  private static estimateFruitValue(fruitType: string, amount: number): number {
    const fruitValues: Record<string, number> = {
      'Apple': 2.5,
      'Orange': 3,
      'Blueberry': 1,
      'Banana': 1.5
    };
    
    return (fruitValues[fruitType] || 2) * amount;
  }
}
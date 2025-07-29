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
  remainingTimeFormatted: string;
  totalTime: number;
  totalTimeFormatted: string;
  isReady: boolean;
  baseYield?: number;      // Quantité de base (sans bonus)
  expectedYield?: number;  // Quantité attendue (avec bonus)
  yieldBonus?: number;     // Pourcentage de bonus appliqué
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
    if (!gameData) {
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
      this.analyzeCrops(gameData, activeTimers);
      
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
    }

    return {
      activeTimers: this.sortTimers(activeTimers),
      scheduledActivities: scheduledActivities.sort((a, b) => a.scheduledTime - b.scheduledTime),
      harvestCalendar: harvestCalendar.sort((a, b) => a.harvestTime - b.harvestTime),
      optimizationSuggestions
    };
  }

  private static analyzeCrops(gameData: SunflowerGameData, timers: ActiveTimer[]): void {
    const crops = gameData.crops || {};
    const now = Date.now();
    
    // Pour l'instant, utiliser seulement les données JSON pour garantir l'affichage
    this.processJsonOnly(crops, now, timers);
  }
  
  private static processJsonOnly(crops: any, now: number, timers: ActiveTimer[]): void {
    Object.entries(crops).forEach(([plotId, plotData]: [string, any]) => {
      this.processJsonCrop(plotId, plotData, now, timers, '');
    });
  }
  
  private static processJsonCrop(plotId: string, plotData: any, now: number, timers: ActiveTimer[], _suffix: string): void {
    const crop = plotData.crop;
    if (!crop) return;
    
    const plantedAt = crop.plantedAt || crop.planted_at || crop.createdAt;
    const cropName = crop.name || crop.type;
    
    if (plantedAt && cropName) {
      let harvestTime;
      let remainingTime;
      let isCurrentlyReady;
      
      if (crop.readyAt) {
        harvestTime = crop.readyAt;
        remainingTime = Math.max(0, harvestTime - now);
        isCurrentlyReady = remainingTime === 0;
      } else if (crop.harvestAt) {
        harvestTime = crop.harvestAt;
        remainingTime = Math.max(0, harvestTime - now);
        isCurrentlyReady = remainingTime === 0;
      } else if (crop.harvestedAt) {
        return;
      } else if (crop.amount === 0 || crop.quantity === 0) {
        return;
      } else {
        const baseGrowthTime = this.getCropGrowthTime(cropName);
        harvestTime = plantedAt + baseGrowthTime;
        remainingTime = Math.max(0, harvestTime - now);
        isCurrentlyReady = remainingTime === 0;
      }
      
      timers.push({
        id: `crop-${plotId}`,
        type: 'crop',
        name: cropName,
        remainingTime,
        remainingTimeFormatted: this.formatTime(remainingTime),
        totalTime: harvestTime - (plantedAt || 0),
        totalTimeFormatted: this.formatTime(harvestTime - (plantedAt || 0)),
        isReady: isCurrentlyReady
      });
    }
  }


  private static analyzeBuildings(gameData: SunflowerGameData, timers: ActiveTimer[]): void {
    const buildings = gameData.buildings || {};
    const now = Date.now();
    
    Object.entries(buildings).forEach(([id, building]: [string, any]) => {
      
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
          remainingTimeFormatted: this.formatTime(remainingTime),
          totalTime: duration,
          totalTimeFormatted: this.formatTime(duration),
          isReady: remainingTime === 0
        });
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
    // Charger les données du JSON
    const cropData = this.loadCropData();
    
    // Chercher dans toutes les catégories
    for (const category of ['basic', 'medium', 'advanced']) {
      const categoryData = cropData.crops?.[category];
      if (categoryData && categoryData[cropType]) {
        const seconds = categoryData[cropType].harvestSeconds?.seconds;
        if (seconds) {
          return seconds * 1000; // Convertir secondes en millisecondes
        }
      }
    }
    
    return 60 * 60 * 1000; // Par défaut 1 heure
  }

  private static loadCropData(): any {
    // En attendant l'import du JSON, retourner les données de base
    // TODO: Implémenter le chargement dynamique du JSON
    try {
      // Simuler les données principales du JSON pour validation immédiate
      return {
        crops: {
          basic: {
            'Sunflower': { harvestSeconds: { seconds: 60 } },
            'Potato': { harvestSeconds: { seconds: 300 } },
            'Rhubarb': { harvestSeconds: { seconds: 600 } },
            'Pumpkin': { harvestSeconds: { seconds: 1800 } },
            'Carrot': { harvestSeconds: { seconds: 3600 } },
            'Cabbage': { harvestSeconds: { seconds: 7200 } },
            'Beetroot': { harvestSeconds: { seconds: 14400 } },
            'Cauliflower': { harvestSeconds: { seconds: 28800 } },
            'Parsnip': { harvestSeconds: { seconds: 43200 } },
            'Radish': { harvestSeconds: { seconds: 86400 } },
            'Wheat': { harvestSeconds: { seconds: 86400 } }
          },
          medium: {
            'Zucchini': { harvestSeconds: { seconds: 1800 } },
            'Yam': { harvestSeconds: { seconds: 3600 } },
            'Broccoli': { harvestSeconds: { seconds: 7200 } },
            'Soybean': { harvestSeconds: { seconds: 10800 } },
            'Pepper': { harvestSeconds: { seconds: 14400 } },
            'Turnip': { harvestSeconds: { seconds: 86400 } }
          },
          advanced: {
            'Eggplant': { harvestSeconds: { seconds: 57600 } },
            'Corn': { harvestSeconds: { seconds: 72000 } },
            'Onion': { harvestSeconds: { seconds: 72000 } },
            'Kale': { harvestSeconds: { seconds: 129600 } },
            'Artichoke': { harvestSeconds: { seconds: 129600 } },
            'Barley': { harvestSeconds: { seconds: 172800 } },
            'Rice': { harvestSeconds: { seconds: 115200 } },
            'Olive': { harvestSeconds: { seconds: 158400 } }
          }
        }
      };
    } catch (error) {
      return { crops: {} };
    }
  }

  // FONCTION SUPPRIMÉE - Plus de calcul de bonus
  
  // FONCTIONS SUPPRIMÉES - Plus de calcul de bonus
  

  // FONCTIONS SUPPRIMÉES - Plus de calcul de bonus

  private static formatTime(milliseconds: number): string {
    if (milliseconds <= 0) return '0s';
    
    const totalSeconds = Math.floor(milliseconds / 1000);
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    
    let parts = [];
    if (days > 0) parts.push(`${days}j`);
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0) parts.push(`${minutes}m`);
    if (seconds > 0 && days === 0) parts.push(`${seconds}s`); // Ne pas afficher secondes si > 1 jour
    
    if (parts.length === 0) parts.push('0s');
    
    // Limiter à 2 unités maximum pour éviter "1j 2h 3m 4s"
    return parts.slice(0, 2).join(' ');
  }

  private static sortTimers(timers: ActiveTimer[]): ActiveTimer[] {
    // Séparer les crops prêts des autres
    const readyCrops = timers.filter(t => t.isReady && t.type === 'crop');
    const otherTimers = timers.filter(t => !(t.isReady && t.type === 'crop'));
    
    // Grouper les crops prêts par type de crop
    const groupedReadyCrops = this.groupReadyCrops(readyCrops);
    
    // Trier les autres timers normalement
    const sortedOthers = otherTimers.sort((a, b) => {
      if (a.isReady !== b.isReady) {
        return a.isReady ? -1 : 1;
      }
      
      if (a.isReady && b.isReady) {
        return a.name.localeCompare(b.name);
      } else {
        return a.remainingTime - b.remainingTime;
      }
    });
    
    // Combiner: crops groupés d'abord, puis autres timers
    return [...groupedReadyCrops, ...sortedOthers];
  }

  private static groupReadyCrops(readyCrops: ActiveTimer[]): ActiveTimer[] {
    // Grouper par nom de crop (sans la quantité)
    const groups: Map<string, ActiveTimer[]> = new Map();
    
    readyCrops.forEach(timer => {
      // Extraire le nom du crop sans les informations de quantité/bonus
      const nameWithoutQuantity = timer.name.split(' x')[0];
      const cropName = nameWithoutQuantity ? nameWithoutQuantity.split(' (')[0] : timer.name;
      
      if (cropName && !groups.has(cropName)) {
        groups.set(cropName, []);
      }
      if (cropName) {
        const group = groups.get(cropName);
        if (group) {
          group.push(timer);
        }
      }
    });
    
    // Créer des timers groupés
    const groupedTimers: ActiveTimer[] = [];
    
    groups.forEach((cropTimers, cropName) => {
      if (cropTimers.length === 1) {
        // Un seul crop, garder tel quel
        const singleTimer = cropTimers[0];
        if (singleTimer) {
          groupedTimers.push(singleTimer);
        }
      } else {
        // Plusieurs crops du même type, créer un timer groupé
        const totalExpectedYield = cropTimers.reduce((sum, timer) => sum + (timer.expectedYield || 0), 0);
        const totalBaseYield = cropTimers.reduce((sum, timer) => sum + (timer.baseYield || 0), 0);
        const avgYieldBonus = cropTimers.reduce((sum, timer) => sum + (timer.yieldBonus || 0), 0) / cropTimers.length;
        
        const firstTimer = cropTimers[0];
        if (firstTimer) {
          const groupedTimer: ActiveTimer = {
            id: `grouped-${cropName}`,
            type: 'crop',
            name: `${cropName} x${totalExpectedYield.toFixed(1)} (${cropTimers.length} parcelles)`,
            remainingTime: 0,
            remainingTimeFormatted: 'PRÊT',
            totalTime: firstTimer.totalTime,
            totalTimeFormatted: firstTimer.totalTimeFormatted,
            isReady: true,
            baseYield: totalBaseYield,
            expectedYield: totalExpectedYield,
            yieldBonus: Math.round(avgYieldBonus)
          };
          
          groupedTimers.push(groupedTimer);
        }
      }
    });
    
    // Trier les crops groupés par nom
    return groupedTimers.sort((a, b) => a.name.localeCompare(b.name));
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
            remainingTimeFormatted: this.formatTime(remainingTime),
            totalTime: honeyProductionRate,
            totalTimeFormatted: this.formatTime(honeyProductionRate),
            isReady: false
          });
        } else {
          timers.push({
            id: `beehive-${id}`,
            type: 'beehive',
            name: `Ruche ${id} (${honeyProduced.toFixed(1)} miel) - PRÊTE`,
            remainingTime: 0,
            remainingTimeFormatted: this.formatTime(0),
            totalTime: honeyProductionRate,
            totalTimeFormatted: this.formatTime(honeyProductionRate),
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
            remainingTimeFormatted: this.formatTime(remainingTime),
            totalTime: respawnTime,
            totalTimeFormatted: this.formatTime(respawnTime),
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
            remainingTimeFormatted: this.formatTime(remainingTime),
            totalTime: respawnTime,
            totalTimeFormatted: this.formatTime(respawnTime),
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
            remainingTimeFormatted: this.formatTime(remainingTime),
            totalTime: respawnTime,
            totalTimeFormatted: this.formatTime(respawnTime),
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
            remainingTimeFormatted: this.formatTime(remainingTime),
            totalTime: respawnTime,
            totalTimeFormatted: this.formatTime(respawnTime),
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
            remainingTimeFormatted: this.formatTime(remainingTime),
            totalTime: this.getFruitGrowthTime(fruitType),
            totalTimeFormatted: this.formatTime(this.getFruitGrowthTime(fruitType)),
            isReady: false
          });
        } else {
          timers.push({
            id: `fruit-${id}`,
            type: 'fruit',
            name: `${fruitType} ${id} - PRÊT`,
            remainingTime: 0,
            remainingTimeFormatted: this.formatTime(0),
            totalTime: this.getFruitGrowthTime(fruitType),
            totalTimeFormatted: this.formatTime(this.getFruitGrowthTime(fruitType)),
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
import { ActiveTimer } from './analytics-utils';

export interface CropGroup {
  name: string;
  icon: string;
  crops: CropItem[];
  totalQuantity: number;
  readyQuantity: number;
  readyCount: number;
}

export interface CropItem {
  id: string;
  name: string;
  quantity: number;
  remainingTime: number;
  totalTime: number;
  isReady: boolean;
  timeText: string;
  statusClass: string;
}

export interface TabData {
  tabId: string;
  name: string;
  icon: string;
  count: number;
  readyCount: number;
  hasReady: boolean;
  activeClass: string;
}

export interface PanelData {
  tabId: string;
  name: string;
  icon: string;
  stats: string;
  activeClass: string;
  items: CropItem[];
}

export class CropDataManager {
  private static readonly CROP_ICONS: Record<string, string> = {
    'Artichoke': '🥬',
    'Soybean': '🌱', 
    'Wheat': '🌾',
    'Corn': '🌽',
    'Carrot': '🥕',
    'Sunflower': '🌻',
    'Potato': '🥔',
    'Pumpkin': '🎃',
    'Kale': '🥬',
    'Turnip': '🟣'
  };

  /**
   * Group crops by type and calculate statistics
   */
  static groupCropsByType(crops: ActiveTimer[]): Map<string, CropGroup> {
    const groups = new Map<string, CropGroup>();

    crops.forEach(crop => {
      const cropName = this.extractCropName(crop.name);
      
      if (!groups.has(cropName)) {
        groups.set(cropName, {
          name: cropName,
          icon: this.getCropIcon(cropName),
          crops: [],
          totalQuantity: 0,
          readyQuantity: 0,
          readyCount: 0
        });
      }

      const group = groups.get(cropName)!;
      const cropItem = this.createCropItem(crop);
      
      group.crops.push(cropItem);
      group.totalQuantity += cropItem.quantity;
      
      if (cropItem.isReady) {
        group.readyQuantity += cropItem.quantity;
        group.readyCount++;
      }
    });

    // Sort crops within each group: ready first, then by remaining time
    groups.forEach(group => {
      group.crops.sort((a, b) => {
        if (a.isReady && !b.isReady) return -1;
        if (!a.isReady && b.isReady) return 1;
        return a.remainingTime - b.remainingTime;
      });
    });

    return groups;
  }

  /**
   * Create tab data for template rendering
   */
  static createTabData(cropGroups: Map<string, CropGroup>, tabsId: string): TabData[] {
    const tabs: TabData[] = [];
    let isFirst = true;

    cropGroups.forEach((group, cropName) => {
      tabs.push({
        tabId: `${tabsId}-${cropName}`,
        name: cropName,
        icon: group.icon,
        count: group.crops.length,
        readyCount: group.readyCount,
        hasReady: group.readyCount > 0,
        activeClass: isFirst ? 'active' : ''
      });
      isFirst = false;
    });

    // Sort tabs alphabetically
    return tabs.sort((a, b) => a.name.localeCompare(b.name));
  }

  /**
   * Create panel data for template rendering
   */
  static createPanelData(cropGroups: Map<string, CropGroup>, tabsId: string): PanelData[] {
    const panels: PanelData[] = [];
    let isFirst = true;

    const sortedGroups = Array.from(cropGroups.entries()).sort((a, b) => a[0].localeCompare(b[0]));

    sortedGroups.forEach(([cropName, group]) => {
      panels.push({
        tabId: `${tabsId}-${cropName}`,
        name: cropName,
        icon: group.icon,
        stats: this.formatCropStats(group),
        activeClass: isFirst ? 'active' : '',
        items: group.crops
      });
      isFirst = false;
    });

    return panels;
  }

  /**
   * Extract crop name from timer name
   */
  private static extractCropName(timerName?: string): string {
    if (!timerName) return 'Culture';
    return timerName.split(' x')[0] || 'Culture';
  }

  /**
   * Get icon for crop type
   */
  private static getCropIcon(cropName: string): string {
    return this.CROP_ICONS[cropName] || '🌱';
  }

  /**
   * Create crop item from active timer
   */
  private static createCropItem(timer: ActiveTimer): CropItem {
    const quantity = this.extractQuantity(timer.name);
    const cropName = this.extractCropName(timer.name);
    
    // 🔍 DEBUG SPÉCIAL POUR TURNIP vs KALE
    if (cropName === 'Turnip' || cropName === 'Kale') {
      console.log(`🔍 CROP-DATA-MANAGER ${cropName.toUpperCase()}:`, {
        timerId: timer.id,
        timerName: timer.name,
        extractedCropName: cropName,
        quantity: quantity,
        remainingTime: timer.remainingTime,
        remainingTimeHours: timer.remainingTime / (60 * 60 * 1000),
        totalTime: timer.totalTime,
        totalTimeHours: timer.totalTime / (60 * 60 * 1000),
        isReady: timer.isReady,
        currentTime: Date.now(),
        expectedEndTime: Date.now() + timer.remainingTime
      });
    }
    
    return {
      id: timer.id,
      name: timer.name || 'Culture',
      quantity,
      remainingTime: timer.remainingTime,
      totalTime: timer.totalTime,
      isReady: timer.isReady,
      timeText: this.formatTimeText(timer),
      statusClass: timer.isReady ? 'ready' : 'active'
    };
  }

  /**
   * Extract quantity from timer name
   */
  private static extractQuantity(timerName?: string): number {
    if (!timerName) return 1;
    const match = timerName.match(/x(\d+\.?\d*)/);
    return match && match[1] ? parseFloat(match[1]) : 1;
  }

  /**
   * Format time text for display
   */
  private static formatTimeText(timer: ActiveTimer): string {
    const cropName = this.extractCropName(timer.name);
    
    if (timer.isReady) {
      // 🔍 DEBUG POUR TURNIP vs KALE - CAS PRÊT
      if (cropName === 'Turnip' || cropName === 'Kale') {
        console.log(`🔍 FORMAT-TIME ${cropName.toUpperCase()} PRÊT:`, {
          timerId: timer.id,
          timerName: timer.name,
          isReady: timer.isReady,
          remainingTime: timer.remainingTime
        });
      }
      return '✅ Prêt à récolter';
    }

    const remainingHours = Math.floor(timer.remainingTime / (60 * 60 * 1000));
    const remainingMinutes = Math.floor((timer.remainingTime % (60 * 60 * 1000)) / (60 * 1000));
    
    let timeDisplay = '';
    if (remainingHours > 0) {
      timeDisplay = `${remainingHours}h ${remainingMinutes}m`;
    } else if (remainingMinutes > 0) {
      timeDisplay = `${remainingMinutes}m`;
    } else {
      timeDisplay = `${Math.ceil(timer.remainingTime / 1000)}s`;
    }
    
    const endTime = new Date(Date.now() + timer.remainingTime);
    const formattedTime = `🌱 En cours (${timeDisplay}) | Fin: ${endTime.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })}`;
    
    // 🔍 DEBUG POUR TURNIP vs KALE - CAS EN COURS
    if (cropName === 'Turnip' || cropName === 'Kale') {
      console.log(`🔍 FORMAT-TIME ${cropName.toUpperCase()} EN COURS:`, {
        timerId: timer.id,
        timerName: timer.name,
        isReady: timer.isReady,
        remainingTime: timer.remainingTime,
        remainingHours: remainingHours,
        remainingMinutes: remainingMinutes,
        timeDisplay: timeDisplay,
        endTime: endTime,
        formattedTime: formattedTime
      });
    }
    
    return formattedTime;
  }

  /**
   * Format crop statistics for display
   */
  private static formatCropStats(group: CropGroup): string {
    const total = `Total: ${group.totalQuantity.toFixed(1)}`;
    const ready = group.readyCount > 0 ? ` | Prêt: ${group.readyQuantity.toFixed(1)}` : '';
    return `${total}${ready}`;
  }
}
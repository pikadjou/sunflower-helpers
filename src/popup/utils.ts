export class UIUtils {
  static updateElement(id: string, value: string): void {
    const element = document.getElementById(id);
    if (element) {
      element.textContent = value;
    }
  }

  static formatNumber(num: number): string {
    return new Intl.NumberFormat('fr-FR').format(num);
  }

  static escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  static showNoDataMessage(containerId: string, message: string): void {
    const container = document.getElementById(containerId);
    if (container) {
      container.innerHTML = `<div class="activity-item">${message}</div>`;
    }
  }
}

export class TimeUtils {
  static getTimeUntilReady(readyAt: number): string {
    if (!readyAt) return 'Temps inconnu';
    
    const now = Date.now();
    const timeLeft = readyAt - now;
    
    if (timeLeft <= 0) return 'Prêt!';
    
    const minutes = Math.floor(timeLeft / (1000 * 60));
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (days > 0) return `${days}j ${hours % 24}h`;
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    return `${minutes}m`;
  }

  static isReady(readyAt: number): boolean {
    const now = Date.now();
    if (!readyAt) return false;
    return now >= readyAt;
  }
}

export class IconUtils {
  static getItemIcon(itemName: string): string {
    const iconMap: Record<string, string> = {
      'Wood': '🪵',
      'Stone': '🪨',
      'Iron': '⚙️',
      'Gold': '🟡',
      'Egg': '🥚',
      'Chicken': '🐔',
      'Sunflower': '🌻',
      'Potato': '🥔',
      'Pumpkin': '🎃',
      'Carrot': '🥕',
      'Cabbage': '🥬',
      'Axe': '🪓',
      'Pickaxe': '⛏️',
      'Flour': '🌾',
      'Cake': '🎂',
      'Bread': '🍞'
    };
    
    return iconMap[itemName] || '📦';
  }

  static getMiningIcon(type: string): string {
    const iconMap: Record<string, string> = {
      'stones': '🗿',
      'trees': '🌳',
      'iron': '⚙️',
      'gold': '🟡',
      'crimstones': '🔴',
      'sunstones': '🟠',
      'oil': '🛢️'
    };
    
    return iconMap[type] || '⛏️';
  }

  static getCollectibleIcon(type: string, data: any): string {
    const iconMap: Record<string, string> = {
      'beehives': '🐝',
      'trees': '🌳',
      'fruitPatches': '🍇',
      'flowers': '🌸',
      'crops': '🌱'
    };
    
    if (type === 'trees' && data.wood) {
      return '🌲';
    }
    if (type === 'crops' && data.crop) {
      return IconUtils.getItemIcon(data.crop.name || 'crop');
    }
    
    return iconMap[type] || '📦';
  }
}
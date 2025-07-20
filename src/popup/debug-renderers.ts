import { SunflowerSessionData, SunflowerGameData } from '../types/extension';
import { UIUtils } from './utils';

export class RawDataRenderer {
  static render(sessionData: SunflowerSessionData[]): void {
    const container = document.getElementById('rawDataContainer');
    if (!container) return;

    container.innerHTML = '';
    
    if (sessionData.length === 0) {
      container.innerHTML = '<div class="raw-session-item">Aucune donnée interceptée. Visitez Sunflower Land pour capturer des données.</div>';
      return;
    }

    const sortedData = [...sessionData].reverse();
    sortedData.forEach((session, index) => {
      const sessionElement = RawDataRenderer.createRawSessionItem(session, index + 1);
      container.appendChild(sessionElement);
    });
  }

  private static createRawSessionItem(session: SunflowerSessionData, index: number): HTMLElement {
    const div = document.createElement('div');
    div.className = 'raw-session-item';
    
    const timestamp = new Date(session.timestamp).toLocaleString();
    
    div.innerHTML = `
      <div class="raw-session-header">
        <span>Session #${index} - ${session.method} ${session.url}</span>
        <span class="raw-session-timestamp">${timestamp}</span>
      </div>
      <div class="raw-session-data">${JSON.stringify(session, null, 2)}</div>
    `;
    
    return div;
  }
}

export class DebugRenderer {
  static render(sessionData: SunflowerSessionData[], gameData: SunflowerGameData | null): void {
    const container = document.getElementById('debugContainer');
    if (!container) return;

    container.innerHTML = '';
    
    DebugRenderer.addDebugItem(container, 'Nombre de sessions', sessionData.length.toString());
    DebugRenderer.addDebugItem(container, 'Données de jeu extraites', gameData ? 'Oui' : 'Non');
    
    if (sessionData.length > 0) {
      const latestSession = sessionData[sessionData.length - 1];
      if (latestSession) {
        DebugRenderer.addDebugItem(container, 'Dernière session URL', latestSession.url);
        DebugRenderer.addDebugItem(container, 'Dernière session méthode', latestSession.method);
        DebugRenderer.addDebugItem(container, 'Dernière session status', latestSession.statusCode?.toString() || 'N/A');
        DebugRenderer.addDebugItem(container, 'Response body existe', latestSession.responseBody ? 'Oui' : 'Non');
        
        if (latestSession.responseBody) {
          const responseKeys = Object.keys(latestSession.responseBody);
          DebugRenderer.addDebugItem(container, 'Clés de la réponse', responseKeys.join(', '));
          
          if (latestSession.responseBody.farm) {
            const farmKeys = Object.keys(latestSession.responseBody.farm);
            DebugRenderer.addDebugItem(container, 'Clés de farm trouvées', farmKeys.join(', '));
            
            const farmPreview = DebugRenderer.createDataPreview(latestSession.responseBody.farm);
            DebugRenderer.addDebugItem(container, 'Aperçu des données de ferme', farmPreview);
          } else {
            DebugRenderer.addDebugItem(container, 'farm dans responseBody', 'NON TROUVÉ');
          }
          
          const preview = DebugRenderer.createDataPreview(latestSession.responseBody);
          DebugRenderer.addDebugItem(container, 'Aperçu complet', preview);
        }
      }
    }
    
    if (gameData) {
      const gameDataKeys = Object.keys(gameData);
      DebugRenderer.addDebugItem(container, 'Clés des données de jeu', gameDataKeys.join(', '));
      
      if (gameData.inventory) {
        const inventoryKeys = Object.keys(gameData.inventory);
        DebugRenderer.addDebugItem(container, 'Clés de l\'inventaire', `${inventoryKeys.length} éléments: ${inventoryKeys.slice(0, 10).join(', ')}${inventoryKeys.length > 10 ? '...' : ''}`);
      }
    }
  }

  private static addDebugItem(container: HTMLElement, label: string, value: string): void {
    const div = document.createElement('div');
    div.className = 'debug-item';
    
    div.innerHTML = `
      <div class="debug-label">${label}:</div>
      <div class="debug-value">${UIUtils.escapeHtml(value)}</div>
    `;
    
    container.appendChild(div);
  }

  private static createDataPreview(data: any): string {
    if (!data || typeof data !== 'object') {
      return String(data);
    }
    
    const preview: string[] = [];
    for (const [key, value] of Object.entries(data)) {
      if (typeof value === 'object' && value !== null) {
        const subKeys = Object.keys(value);
        preview.push(`${key}: {${subKeys.length} clés: ${subKeys.slice(0, 3).join(', ')}${subKeys.length > 3 ? '...' : ''}}`);
      } else {
        const valueStr = String(value);
        preview.push(`${key}: ${valueStr.length > 50 ? valueStr.substring(0, 50) + '...' : valueStr}`);
      }
      
      if (preview.length >= 10) {
        preview.push('...');
        break;
      }
    }
    
    return preview.join('\n');
  }
}
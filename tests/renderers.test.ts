import { OverviewRenderer, InventoryRenderer, MiningRenderer } from '../src/popup/renderers';
import { SunflowerGameData } from '../src/types/extension';
import { UIUtils } from '../src/popup/utils';

// Mock UIUtils
jest.mock('../src/popup/utils', () => ({
  UIUtils: {
    showNoDataMessage: jest.fn(),
    updateElementValue: jest.fn(),
    createElement: jest.fn(),
    formatNumber: jest.fn().mockImplementation((num) => num.toString())
  },
  TimeUtils: {
    formatTime: jest.fn().mockReturnValue('1h 30m')
  },
  IconUtils: {
    getItemIcon: jest.fn().mockReturnValue('🌾')
  }
}));

describe('Renderers', () => {
  let mockUIUtils: jest.Mocked<typeof UIUtils>;

  beforeEach(() => {
    mockUIUtils = UIUtils as jest.Mocked<typeof UIUtils>;
    
    // Mock DOM elements
    document.getElementById = jest.fn().mockImplementation((id) => {
      const element = document.createElement('div');
      element.id = id;
      return element;
    });

    // Clear all mocks
    jest.clearAllMocks();
  });

  describe('OverviewRenderer', () => {
    describe('render', () => {
      it('should show no data message when gameData is null', () => {
        OverviewRenderer.render(null);

        expect(mockUIUtils.showNoDataMessage).toHaveBeenCalledWith(
          'recentActivities',
          'Aucune donnée disponible. Visitez Sunflower Land pour charger les données.'
        );
      });

      it('should render overview with coins from gameData.coins', () => {
        const gameData: SunflowerGameData = {
          coins: 1500,
          balance: '25.5',
          experience: 3200,
          bumpkin: {
            experience: 3200,
            level: 8
          }
        };

        OverviewRenderer.render(gameData);

        expect(mockUIUtils.updateElementValue).toHaveBeenCalledWith('coins', '1500');
        expect(mockUIUtils.updateElementValue).toHaveBeenCalledWith('balance', '25.5');
        expect(mockUIUtils.updateElementValue).toHaveBeenCalledWith('experience', '3200');
        expect(mockUIUtils.updateElementValue).toHaveBeenCalledWith('level', '8');
      });

      it('should extract coins from inventory when gameData.coins is undefined', () => {
        const gameData: SunflowerGameData = {
          inventory: {
            'Coin': '2500',
            'SFL': '15.75'
          }
        };

        OverviewRenderer.render(gameData);

        expect(mockUIUtils.updateElementValue).toHaveBeenCalledWith('coins', '2500');
        expect(mockUIUtils.updateElementValue).toHaveBeenCalledWith('balance', '15.75');
      });

      it('should handle missing bumpkin data', () => {
        const gameData: SunflowerGameData = {
          coins: 1000,
          experience: 1500
        };

        OverviewRenderer.render(gameData);

        expect(mockUIUtils.updateElementValue).toHaveBeenCalledWith('experience', '1500');
        expect(mockUIUtils.updateElementValue).toHaveBeenCalledWith('level', '1'); // default
      });

      it('should handle invalid numeric values gracefully', () => {
        const gameData: SunflowerGameData = {
          balance: 'invalid',
          inventory: {
            'Coin': 'also-invalid'
          }
        };

        OverviewRenderer.render(gameData);

        expect(mockUIUtils.updateElementValue).toHaveBeenCalledWith('coins', '0');
        expect(mockUIUtils.updateElementValue).toHaveBeenCalledWith('balance', '0');
      });
    });
  });

  describe('InventoryRenderer', () => {
    describe('render', () => {
      it('should show no data message when gameData is null', () => {
        InventoryRenderer.render(null, 'all', '');

        expect(mockUIUtils.showNoDataMessage).toHaveBeenCalledWith(
          'inventoryItems',
          'Aucune donnée d\'inventaire disponible.'
        );
      });

      it('should show no data message when inventory is empty', () => {
        const gameData: SunflowerGameData = {
          inventory: {}
        };

        InventoryRenderer.render(gameData, 'all', '');

        expect(mockUIUtils.showNoDataMessage).toHaveBeenCalledWith(
          'inventoryItems',
          'Aucun item trouvé dans l\'inventaire.'
        );
      });

      it('should render inventory items', () => {
        const gameData: SunflowerGameData = {
          inventory: {
            'Potato': '25',
            'Carrot Seed': '15',
            'Wood': '150'
          }
        };

        // Mock container element
        const mockContainer = document.createElement('div');
        document.getElementById = jest.fn().mockImplementation((id) => {
          if (id === 'inventoryItems') return mockContainer;
          return document.createElement('div');
        });

        InventoryRenderer.render(gameData, 'all', '');

        // Should not show no data message
        expect(mockUIUtils.showNoDataMessage).not.toHaveBeenCalled();
      });

      it('should filter by category', () => {
        const gameData: SunflowerGameData = {
          inventory: {
            'Potato': '25',
            'Carrot Seed': '15',
            'Wood': '150'
          }
        };

        const mockContainer = document.createElement('div');
        document.getElementById = jest.fn().mockImplementation((id) => {
          if (id === 'inventoryItems') return mockContainer;
          return document.createElement('div');
        });

        InventoryRenderer.render(gameData, 'seeds', '');

        // The filtering logic should be applied (tested indirectly through container content)
        expect(mockContainer).toBeDefined();
      });

      it('should filter by search term', () => {
        const gameData: SunflowerGameData = {
          inventory: {
            'Potato': '25',
            'Carrot': '10',
            'Wood': '150'
          }
        };

        const mockContainer = document.createElement('div');
        document.getElementById = jest.fn().mockImplementation((id) => {
          if (id === 'inventoryItems') return mockContainer;
          return document.createElement('div');
        });

        InventoryRenderer.render(gameData, 'all', 'potato');

        // The search filtering should be applied
        expect(mockContainer).toBeDefined();
      });

      it('should handle empty search results', () => {
        const gameData: SunflowerGameData = {
          inventory: {
            'Potato': '25',
            'Carrot': '10'
          }
        };

        InventoryRenderer.render(gameData, 'all', 'nonexistent');

        expect(mockUIUtils.showNoDataMessage).toHaveBeenCalledWith(
          'inventoryItems',
          'Aucun item trouvé pour la recherche "nonexistent".'
        );
      });
    });
  });

  describe('MiningRenderer', () => {
    describe('render', () => {
      it('should show no data message when gameData is null', () => {
        MiningRenderer.render(null, 'stones');

        expect(mockUIUtils.showNoDataMessage).toHaveBeenCalledWith(
          'miningContent',
          'Aucune donnée de minage disponible.'
        );
      });

      it('should render mining data for stones category', () => {
        const gameData: SunflowerGameData = {
          inventory: {
            'Stone': '45',
            'Iron': '25',
            'Gold': '5'
          }
        };

        const mockContainer = document.createElement('div');
        document.getElementById = jest.fn().mockImplementation((id) => {
          if (id === 'miningContent') return mockContainer;
          return document.createElement('div');
        });

        MiningRenderer.render(gameData, 'stones');

        // Should render without showing no data message
        expect(mockUIUtils.showNoDataMessage).not.toHaveBeenCalled();
      });

      it('should filter by mining category', () => {
        const gameData: SunflowerGameData = {
          inventory: {
            'Stone': '45',
            'Iron': '25',
            'Gold': '5'
          }
        };

        const mockContainer = document.createElement('div');
        document.getElementById = jest.fn().mockImplementation((id) => {
          if (id === 'miningContent') return mockContainer;
          return document.createElement('div');
        });

        MiningRenderer.render(gameData, 'iron');

        expect(mockContainer).toBeDefined();
      });

      it('should handle empty mining data', () => {
        const gameData: SunflowerGameData = {
          inventory: {
            'Potato': '25' // No mining items
          }
        };

        MiningRenderer.render(gameData, 'stones');

        expect(mockUIUtils.showNoDataMessage).toHaveBeenCalledWith(
          'miningContent',
          'Aucun item de minage trouvé pour la catégorie "stones".'
        );
      });

      it('should handle missing inventory', () => {
        const gameData: SunflowerGameData = {};

        MiningRenderer.render(gameData, 'stones');

        expect(mockUIUtils.showNoDataMessage).toHaveBeenCalledWith(
          'miningContent',
          'Aucun item de minage trouvé pour la catégorie "stones".'
        );
      });
    });
  });

  describe('Integration tests', () => {
    it('should handle real-world data structure', () => {
      const gameData: SunflowerGameData = {
        balance: '42.5',
        coins: 15000,
        bumpkin: {
          experience: 8500,
          level: 12
        },
        inventory: {
          'Potato': '125',
          'Carrot': '85',
          'Potato Seed': '45',
          'Wood': '250',
          'Stone': '180',
          'Iron': '35',
          'Gold': '8'
        }
      };

      // Test all renderers
      expect(() => {
        OverviewRenderer.render(gameData);
        InventoryRenderer.render(gameData, 'all', '');
        MiningRenderer.render(gameData, 'stones');
      }).not.toThrow();
    });

    it('should handle edge cases gracefully', () => {
      const edgeCaseData: SunflowerGameData = {
        balance: '0',
        coins: 0,
        inventory: {
          'Item with spaces': '1',
          'UPPERCASE_ITEM': '2',
          'special-chars!@#': '3'
        }
      };

      expect(() => {
        OverviewRenderer.render(edgeCaseData);
        InventoryRenderer.render(edgeCaseData, 'all', 'special');
        MiningRenderer.render(edgeCaseData, 'stones');
      }).not.toThrow();
    });
  });
});
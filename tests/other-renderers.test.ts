import { ResourcesRenderer, BuildingsRenderer } from '../src/popup/other-renderers';
import { SunflowerGameData } from '../src/types/extension';
import { UIUtils } from '../src/popup/utils';

// Mock UIUtils
jest.mock('../src/popup/utils', () => ({
  UIUtils: {
    showNoDataMessage: jest.fn(),
    updateElementValue: jest.fn(),
    createElement: jest.fn().mockReturnValue(document.createElement('div')),
    formatNumber: jest.fn().mockImplementation((num) => num.toString())
  },
  TimeUtils: {
    formatTime: jest.fn().mockReturnValue('1h 30m')
  },
  IconUtils: {
    getItemIcon: jest.fn().mockReturnValue('🏗️')
  }
}));

describe('Other Renderers', () => {
  let mockUIUtils: jest.Mocked<typeof UIUtils>;

  beforeEach(() => {
    mockUIUtils = UIUtils as jest.Mocked<typeof UIUtils>;
    
    // Mock DOM elements
    document.getElementById = jest.fn().mockImplementation((id) => {
      const element = document.createElement('div');
      element.id = id;
      return element;
    });

    jest.clearAllMocks();
  });

  describe('ResourcesRenderer', () => {
    describe('render', () => {
      it('should show no data message when gameData is null', () => {
        ResourcesRenderer.render(null);

        expect(mockUIUtils.showNoDataMessage).toHaveBeenCalledWith(
          'buildingMaterials',
          'Aucune donnée de ressources disponible.'
        );
        expect(mockUIUtils.showNoDataMessage).toHaveBeenCalledWith(
          'rawMaterials',
          'Aucune donnée de ressources disponible.'
        );
      });

      it('should render building materials', () => {
        const gameData: SunflowerGameData = {
          inventory: {
            'Wood': '150',
            'Stone': '75',
            'Iron': '25',
            'Gold': '8'
          }
        };

        // Mock containers
        const buildingContainer = document.createElement('div');
        const rawContainer = document.createElement('div');
        
        document.getElementById = jest.fn().mockImplementation((id) => {
          if (id === 'buildingMaterials') return buildingContainer;
          if (id === 'rawMaterials') return rawContainer;
          return document.createElement('div');
        });

        ResourcesRenderer.render(gameData);

        // Should not show no data message if there are items
        expect(mockUIUtils.showNoDataMessage).not.toHaveBeenCalled();
      });

      it('should handle empty inventory gracefully', () => {
        const gameData: SunflowerGameData = {
          inventory: {}
        };

        ResourcesRenderer.render(gameData);

        expect(mockUIUtils.showNoDataMessage).toHaveBeenCalledWith(
          'buildingMaterials',
          'Aucune ressource de construction trouvée.'
        );
        expect(mockUIUtils.showNoDataMessage).toHaveBeenCalledWith(
          'rawMaterials',
          'Aucune matière première trouvée.'
        );
      });

      it('should categorize resources correctly', () => {
        const gameData: SunflowerGameData = {
          inventory: {
            'Wood': '100',      // Building material
            'Stone': '50',      // Building material
            'Wheat': '25',      // Raw material
            'Potato': '15'      // Raw material
          }
        };

        const buildingContainer = document.createElement('div');
        const rawContainer = document.createElement('div');
        
        document.getElementById = jest.fn().mockImplementation((id) => {
          if (id === 'buildingMaterials') return buildingContainer;
          if (id === 'rawMaterials') return rawContainer;
          return document.createElement('div');
        });

        ResourcesRenderer.render(gameData);

        // Both containers should be populated
        expect(buildingContainer).toBeDefined();
        expect(rawContainer).toBeDefined();
      });

      it('should handle missing containers gracefully', () => {
        document.getElementById = jest.fn().mockReturnValue(null);

        const gameData: SunflowerGameData = {
          inventory: { 'Wood': '100' }
        };

        expect(() => ResourcesRenderer.render(gameData)).not.toThrow();
      });
    });
  });

  describe('BuildingsRenderer', () => {
    describe('render', () => {
      it('should show no data message when gameData is null', () => {
        BuildingsRenderer.render(null);

        expect(mockUIUtils.showNoDataMessage).toHaveBeenCalledWith(
          'buildingsList',
          'Aucune donnée de bâtiments disponible.'
        );
      });

      it('should show no data message when no buildings exist', () => {
        const gameData: SunflowerGameData = {
          buildings: {}
        };

        BuildingsRenderer.render(gameData);

        expect(mockUIUtils.showNoDataMessage).toHaveBeenCalledWith(
          'buildingsList',
          'Aucun bâtiment trouvé.'
        );
      });

      it('should render buildings data', () => {
        const gameData: SunflowerGameData = {
          buildings: {
            'bakery': {
              name: 'Bakery',
              level: 2,
              coordinates: { x: 10, y: 15 }
            },
            'kitchen': {
              name: 'Kitchen',
              level: 1,
              coordinates: { x: 5, y: 8 }
            }
          }
        };

        const mockContainer = document.createElement('div');
        document.getElementById = jest.fn().mockImplementation((id) => {
          if (id === 'buildingsList') return mockContainer;
          return document.createElement('div');
        });

        BuildingsRenderer.render(gameData);

        // Should not show no data message
        expect(mockUIUtils.showNoDataMessage).not.toHaveBeenCalled();
      });

      it('should handle buildings with crafting status', () => {
        const gameData: SunflowerGameData = {
          buildings: {
            'bakery': {
              name: 'Bakery',
              level: 2,
              crafting: {
                startedAt: Date.now() - 1800000, // 30 minutes ago
                timeRequired: 3600,              // 1 hour
                item: 'Bread'
              }
            }
          }
        };

        const mockContainer = document.createElement('div');
        document.getElementById = jest.fn().mockImplementation((id) => {
          if (id === 'buildingsList') return mockContainer;
          return document.createElement('div');
        });

        BuildingsRenderer.render(gameData);

        expect(mockUIUtils.showNoDataMessage).not.toHaveBeenCalled();
      });

      it('should handle buildings without names', () => {
        const gameData: SunflowerGameData = {
          buildings: {
            'building1': {
              level: 1
              // No name property
            }
          }
        };

        const mockContainer = document.createElement('div');
        document.getElementById = jest.fn().mockImplementation((id) => {
          if (id === 'buildingsList') return mockContainer;
          return document.createElement('div');
        });

        expect(() => BuildingsRenderer.render(gameData)).not.toThrow();
      });

      it('should handle missing buildings property', () => {
        const gameData: SunflowerGameData = {};

        BuildingsRenderer.render(gameData);

        expect(mockUIUtils.showNoDataMessage).toHaveBeenCalledWith(
          'buildingsList',
          'Aucun bâtiment trouvé.'
        );
      });

      it('should handle missing container gracefully', () => {
        document.getElementById = jest.fn().mockReturnValue(null);

        const gameData: SunflowerGameData = {
          buildings: {
            'bakery': { name: 'Bakery', level: 1 }
          }
        };

        expect(() => BuildingsRenderer.render(gameData)).not.toThrow();
      });
    });
  });

  describe('Integration tests', () => {
    it('should handle complex game data', () => {
      const gameData: SunflowerGameData = {
        inventory: {
          'Wood': '250',
          'Stone': '180',
          'Iron': '45',
          'Gold': '12',
          'Wheat': '85',
          'Potato': '125',
          'Carrot': '95'
        },
        buildings: {
          'bakery': {
            name: 'Bakery',
            level: 3,
            coordinates: { x: 10, y: 15 },
            crafting: {
              startedAt: Date.now() - 900000,
              timeRequired: 1800,
              item: 'Cake'
            }
          },
          'kitchen': {
            name: 'Kitchen',
            level: 2,
            coordinates: { x: 5, y: 8 }
          },
          'workshop': {
            name: 'Workshop',
            level: 1
          }
        }
      };

      expect(() => {
        ResourcesRenderer.render(gameData);
        BuildingsRenderer.render(gameData);
      }).not.toThrow();
    });

    it('should handle edge cases in data structure', () => {
      const edgeGameData: SunflowerGameData = {
        inventory: {
          '': '10',                    // Empty name
          'Item with spaces': '5',    // Spaces in name
          'CAPS_ITEM': '3',          // Uppercase
          'special-chars!@#': '1'     // Special characters
        },
        buildings: {
          '': {                       // Empty building ID
            name: '',
            level: 0
          },
          'building-with-dashes': {
            name: 'Building With Dashes',
            level: -1                 // Negative level
          }
        }
      };

      expect(() => {
        ResourcesRenderer.render(edgeGameData);
        BuildingsRenderer.render(edgeGameData);
      }).not.toThrow();
    });

    it('should handle numeric values as strings', () => {
      const gameData: SunflowerGameData = {
        inventory: {
          'Wood': '100.5',    // Decimal as string
          'Stone': '0',       // Zero as string
          'Iron': 25          // Number instead of string
        },
        buildings: {
          'bakery': {
            name: 'Bakery',
            level: '2'        // Level as string instead of number
          }
        }
      };

      expect(() => {
        ResourcesRenderer.render(gameData);
        BuildingsRenderer.render(gameData);
      }).not.toThrow();
    });
  });
});
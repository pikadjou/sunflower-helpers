import { TimerManager, TimerData, ActiveTimer } from '../src/popup/analytics-utils';
import { SunflowerGameData } from '../src/types/extension';

describe('TimerManager', () => {
  // Mock date for consistent testing
  const mockNow = new Date('2024-01-15T10:00:00.000Z').getTime();
  
  beforeEach(() => {
    jest.spyOn(Date, 'now').mockReturnValue(mockNow);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('calculateTimers', () => {
    it('should return empty data for null gameData', () => {
      const result = TimerManager.calculateTimers(null as any);
      
      expect(result).toEqual({
        activeTimers: [],
        scheduledActivities: [],
        harvestCalendar: [],
        optimizationSuggestions: []
      });
    });

    it('should return empty data for undefined gameData', () => {
      const result = TimerManager.calculateTimers(undefined as any);
      
      expect(result).toEqual({
        activeTimers: [],
        scheduledActivities: [],
        harvestCalendar: [],
        optimizationSuggestions: []
      });
    });

    it('should process crops correctly', () => {
      const gameData: SunflowerGameData = {
        crops: {
          '1': {
            crop: {
              name: 'Potato',
              plantedAt: mockNow - 3600000, // 1 hour ago
              readyAt: mockNow + 3600000,   // 1 hour from now
              amount: 1
            },
            coordinates: { x: 100, y: 100 }
          },
          '2': {
            crop: {
              name: 'Carrot', 
              plantedAt: mockNow - 7200000, // 2 hours ago
              readyAt: mockNow - 1800000,   // 30 minutes ago (ready)
              amount: 1
            },
            coordinates: { x: 200, y: 200 }
          }
        }
      };

      const result = TimerManager.calculateTimers(gameData);
      
      expect(result.activeTimers).toHaveLength(2);
      
      // Check ready crop
      const readyCrop = result.activeTimers.find(t => t.name === 'Carrot');
      expect(readyCrop).toBeDefined();
      expect(readyCrop?.isReady).toBe(true);
      expect(readyCrop?.remainingTime).toBe(0);
      expect(readyCrop?.type).toBe('crop');
      
      // Check growing crop
      const growingCrop = result.activeTimers.find(t => t.name === 'Potato');
      expect(growingCrop).toBeDefined();
      expect(growingCrop?.isReady).toBe(false);
      expect(growingCrop?.remainingTime).toBe(3600000); // 1 hour
      expect(growingCrop?.type).toBe('crop');
    });

    it('should process buildings correctly', () => {
      const gameData: SunflowerGameData = {
        buildings: {
          'bakery': {
            name: 'Bakery',
            crafting: {
              startedAt: mockNow - 1800000, // 30 minutes ago
              timeRequired: 3600,           // 1 hour (in seconds)
              item: 'Bread'
            }
          }
        }
      };

      const result = TimerManager.calculateTimers(gameData);
      
      expect(result.activeTimers).toHaveLength(1);
      
      const building = result.activeTimers[0];
      expect(building.type).toBe('building');
      expect(building.name).toBe('Bakery (Bread)');
      expect(building.remainingTime).toBe(1800000); // 30 minutes remaining
      expect(building.isReady).toBe(false);
    });

    it('should process beehives correctly', () => {
      const gameData: SunflowerGameData = {
        beehives: {
          '1': {
            honey: {
              produced: 5.5,
              updatedAt: mockNow - 3600000 // 1 hour ago
            }
          }
        }
      };

      const result = TimerManager.calculateTimers(gameData);
      
      expect(result.activeTimers.length).toBeGreaterThan(0);
      
      const beehive = result.activeTimers.find(t => t.type === 'beehive');
      expect(beehive).toBeDefined();
      expect(beehive?.name).toContain('Ruche');
    });

    it('should generate optimization suggestions', () => {
      const gameData: SunflowerGameData = {
        crops: {
          '1': {
            crop: {
              name: 'Potato',
              plantedAt: mockNow,
              amount: 1
            }
          }
        }
      };

      const result = TimerManager.calculateTimers(gameData);
      
      expect(result.optimizationSuggestions.length).toBeGreaterThan(0);
      expect(result.optimizationSuggestions[0]).toHaveProperty('type');
      expect(result.optimizationSuggestions[0]).toHaveProperty('title');
      expect(result.optimizationSuggestions[0]).toHaveProperty('description');
      expect(result.optimizationSuggestions[0]).toHaveProperty('impact');
      expect(result.optimizationSuggestions[0]).toHaveProperty('action');
    });

    it('should sort timers correctly', () => {
      const gameData: SunflowerGameData = {
        crops: {
          '1': {
            crop: {
              name: 'Potato',
              plantedAt: mockNow,
              readyAt: mockNow + 7200000, // 2 hours
              amount: 1
            }
          },
          '2': {
            crop: {
              name: 'Carrot',
              plantedAt: mockNow,
              readyAt: mockNow + 3600000, // 1 hour
              amount: 1
            }
          },
          '3': {
            crop: {
              name: 'Cabbage',
              plantedAt: mockNow,
              readyAt: mockNow - 1800000, // Ready (30 min ago)
              amount: 1
            }
          }
        }
      };

      const result = TimerManager.calculateTimers(gameData);
      
      // Ready crops should come first
      expect(result.activeTimers[0].isReady).toBe(true);
      expect(result.activeTimers[0].name).toBe('Cabbage');
      
      // Growing crops sorted by remaining time
      expect(result.activeTimers[1].remainingTime).toBeLessThan(result.activeTimers[2].remainingTime);
    });

    it('should handle crops with different time structures', () => {
      const gameData: SunflowerGameData = {
        crops: {
          '1': {
            crop: {
              name: 'Potato',
              planted_at: mockNow - 1800000, // Alternative naming
              harvestAt: mockNow + 1800000,   // Alternative naming
              amount: 1
            }
          },
          '2': {
            crop: {
              name: 'Carrot',
              createdAt: mockNow - 3600000,  // Alternative naming
              amount: 0  // Should be filtered out
            }
          }
        }
      };

      const result = TimerManager.calculateTimers(gameData);
      
      // Only potato should be included (carrot has amount 0)
      expect(result.activeTimers).toHaveLength(1);
      expect(result.activeTimers[0].name).toBe('Potato');
    });
  });

  describe('formatTime', () => {
    // Test the private formatTime method indirectly through calculateTimers
    it('should format time correctly in timer results', () => {
      const gameData: SunflowerGameData = {
        crops: {
          '1': {
            crop: {
              name: 'Potato',
              plantedAt: mockNow,
              readyAt: mockNow + 3661000, // 1h 1m 1s
              amount: 1
            }
          }
        }
      };

      const result = TimerManager.calculateTimers(gameData);
      
      expect(result.activeTimers[0].remainingTimeFormatted).toBe('1h 1m');
    });
  });

  describe('getCropGrowthTime', () => {
    it('should handle unknown crops with default growth time', () => {
      const gameData: SunflowerGameData = {
        crops: {
          '1': {
            crop: {
              name: 'UnknownCrop',
              plantedAt: mockNow,
              amount: 1
              // No readyAt, should use default growth time
            }
          }
        }
      };

      const result = TimerManager.calculateTimers(gameData);
      
      expect(result.activeTimers).toHaveLength(1);
      expect(result.activeTimers[0].name).toBe('UnknownCrop');
      expect(result.activeTimers[0].remainingTime).toBeGreaterThan(0);
    });
  });
});
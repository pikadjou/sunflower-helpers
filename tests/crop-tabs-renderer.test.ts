import { CropTabsRenderer } from '../src/popup/crop-tabs-renderer';
import { TimerManager } from '../src/popup/analytics-utils';
import { SunflowerGameData } from '../src/types/extension';

// Mock TimerManager
jest.mock('../src/popup/analytics-utils', () => ({
  TimerManager: {
    calculateTimers: jest.fn()
  }
}));

describe('CropTabsRenderer', () => {
  let mockContainer: HTMLElement;
  let mockTimerManager: jest.Mocked<typeof TimerManager>;

  beforeEach(() => {
    // Create mock container
    mockContainer = document.createElement('div');
    mockContainer.id = 'activeTimers';
    document.body.appendChild(mockContainer);

    // Mock getElementById
    document.getElementById = jest.fn().mockImplementation((id) => {
      if (id === 'activeTimers') return mockContainer;
      return null;
    });

    mockTimerManager = TimerManager as jest.Mocked<typeof TimerManager>;
    
    // Reset mocks
    jest.clearAllMocks();
  });

  afterEach(() => {
    document.body.removeChild(mockContainer);
    jest.restoreAllMocks();
  });

  describe('render', () => {
    it('should render no data message when gameData is null', async () => {
      await CropTabsRenderer.render(null);

      expect(mockContainer.innerHTML).toContain('Aucune culture en cours');
    });

    it('should render no data message when gameData is undefined', async () => {
      await CropTabsRenderer.render(undefined as any);

      expect(mockContainer.innerHTML).toContain('Aucune culture en cours');
    });

    it('should render no data when no crop timers exist', async () => {
      const mockGameData: SunflowerGameData = {};
      
      mockTimerManager.calculateTimers.mockReturnValue({
        activeTimers: [
          {
            id: 'building-1',
            type: 'building',
            name: 'Bakery',
            remainingTime: 3600000,
            remainingTimeFormatted: '1h',
            totalTime: 7200000,
            totalTimeFormatted: '2h',
            isReady: false
          }
        ],
        scheduledActivities: [],
        harvestCalendar: [],
        optimizationSuggestions: []
      });

      await CropTabsRenderer.render(mockGameData);

      expect(mockContainer.innerHTML).toContain('Aucune culture en cours');
    });

    it('should render crop timers when crop data exists', async () => {
      const mockGameData: SunflowerGameData = {};
      
      mockTimerManager.calculateTimers.mockReturnValue({
        activeTimers: [
          {
            id: 'crop-1',
            type: 'crop',
            name: 'Potato',
            remainingTime: 3600000,
            remainingTimeFormatted: '1h',
            totalTime: 7200000, 
            totalTimeFormatted: '2h',
            isReady: false
          },
          {
            id: 'crop-2',
            type: 'crop',
            name: 'Potato',
            remainingTime: 0,
            remainingTimeFormatted: 'PRÊT',
            totalTime: 7200000,
            totalTimeFormatted: '2h',
            isReady: true
          }
        ],
        scheduledActivities: [],
        harvestCalendar: [],
        optimizationSuggestions: []
      });

      await CropTabsRenderer.render(mockGameData);

      expect(mockContainer.innerHTML).toContain('Cultures en cours');
      expect(mockContainer.innerHTML).toContain('2 parcelles');
      expect(mockContainer.innerHTML).toContain('Potato');
      expect(mockContainer.innerHTML).toContain('1 prêtes');
      expect(mockContainer.innerHTML).toContain('1 en cours');
    });

    it('should group timers by crop type', async () => {
      const mockGameData: SunflowerGameData = {};
      
      mockTimerManager.calculateTimers.mockReturnValue({
        activeTimers: [
          {
            id: 'crop-1',
            type: 'crop',
            name: 'Potato',
            remainingTime: 3600000,
            remainingTimeFormatted: '1h',
            totalTime: 7200000,
            totalTimeFormatted: '2h',
            isReady: false
          },
          {
            id: 'crop-2',
            type: 'crop',
            name: 'Carrot',
            remainingTime: 1800000,
            remainingTimeFormatted: '30m',
            totalTime: 3600000,
            totalTimeFormatted: '1h',
            isReady: false
          }
        ],
        scheduledActivities: [],
        harvestCalendar: [],
        optimizationSuggestions: []
      });

      await CropTabsRenderer.render(mockGameData);

      expect(mockContainer.innerHTML).toContain('Potato');
      expect(mockContainer.innerHTML).toContain('Carrot');
      expect(mockContainer.innerHTML).toContain('crop-group');
    });

    it('should render expand/collapse indicators', async () => {
      const mockGameData: SunflowerGameData = {};
      
      mockTimerManager.calculateTimers.mockReturnValue({
        activeTimers: [
          {
            id: 'crop-1',
            type: 'crop',
            name: 'Potato',
            remainingTime: 3600000,
            remainingTimeFormatted: '1h',
            totalTime: 7200000,
            totalTimeFormatted: '2h',
            isReady: false
          }
        ],
        scheduledActivities: [],
        harvestCalendar: [],
        optimizationSuggestions: []
      });

      await CropTabsRenderer.render(mockGameData);

      expect(mockContainer.innerHTML).toContain('collapse-indicator');
      expect(mockContainer.innerHTML).toMatch(/▼|▶/); // Should contain arrow
    });

    it('should show next harvest time', async () => {
      const mockGameData: SunflowerGameData = {};
      const mockNow = new Date('2024-01-15T10:00:00.000Z').getTime();
      jest.spyOn(Date, 'now').mockReturnValue(mockNow);
      
      mockTimerManager.calculateTimers.mockReturnValue({
        activeTimers: [
          {
            id: 'crop-1',
            type: 'crop',
            name: 'Potato',
            remainingTime: 0,
            remainingTimeFormatted: 'PRÊT',
            totalTime: 7200000,
            totalTimeFormatted: '2h',
            isReady: true
          }
        ],
        scheduledActivities: [],
        harvestCalendar: [],
        optimizationSuggestions: []
      });

      await CropTabsRenderer.render(mockGameData);

      expect(mockContainer.innerHTML).toContain('🕰️');
      expect(mockContainer.innerHTML).toContain('Maintenant');
    });

    it('should auto-collapse groups with many growing crops and no ready ones', async () => {
      const mockGameData: SunflowerGameData = {};
      
      // Create 5 growing crops (more than 3)
      const growingCrops = Array.from({ length: 5 }, (_, i) => ({
        id: `crop-${i}`,
        type: 'crop' as const,
        name: 'Potato',
        remainingTime: 3600000 + i * 1000,
        remainingTimeFormatted: '1h',
        totalTime: 7200000,
        totalTimeFormatted: '2h',
        isReady: false
      }));
      
      mockTimerManager.calculateTimers.mockReturnValue({
        activeTimers: growingCrops,
        scheduledActivities: [],
        harvestCalendar: [],
        optimizationSuggestions: []
      });

      await CropTabsRenderer.render(mockGameData);

      expect(mockContainer.innerHTML).toContain('collapsed');
      expect(mockContainer.innerHTML).toContain('display: none');
    });

    it('should handle missing container gracefully', async () => {
      document.getElementById = jest.fn().mockReturnValue(null);

      await expect(CropTabsRenderer.render({} as SunflowerGameData)).resolves.not.toThrow();
    });
  });

  describe('crop icons', () => {
    it('should display correct icons for known crops', async () => {
      const mockGameData: SunflowerGameData = {};
      
      mockTimerManager.calculateTimers.mockReturnValue({
        activeTimers: [
          {
            id: 'crop-1',
            type: 'crop',
            name: 'Potato',
            remainingTime: 3600000,
            remainingTimeFormatted: '1h',
            totalTime: 7200000,
            totalTimeFormatted: '2h',
            isReady: false
          }
        ],
        scheduledActivities: [],
        harvestCalendar: [],
        optimizationSuggestions: []
      });

      await CropTabsRenderer.render(mockGameData);

      expect(mockContainer.innerHTML).toContain('🥔'); // Potato icon
    });

    it('should use default icon for unknown crops', async () => {
      const mockGameData: SunflowerGameData = {};
      
      mockTimerManager.calculateTimers.mockReturnValue({
        activeTimers: [
          {
            id: 'crop-1',
            type: 'crop',
            name: 'UnknownCrop',
            remainingTime: 3600000,
            remainingTimeFormatted: '1h',
            totalTime: 7200000,
            totalTimeFormatted: '2h',
            isReady: false
          }
        ],
        scheduledActivities: [],
        harvestCalendar: [],
        optimizationSuggestions: []
      });

      await CropTabsRenderer.render(mockGameData);

      expect(mockContainer.innerHTML).toContain('🌱'); // Default icon
    });
  });

  describe('time formatting', () => {
    beforeEach(() => {
      // Mock Date for consistent testing
      const mockNow = new Date('2024-01-15T10:00:00.000Z').getTime();
      jest.spyOn(Date, 'now').mockReturnValue(mockNow);
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('should format next harvest time for ready crops', async () => {
      const mockGameData: SunflowerGameData = {};
      
      mockTimerManager.calculateTimers.mockReturnValue({
        activeTimers: [
          {
            id: 'crop-1',
            type: 'crop',
            name: 'Potato',
            remainingTime: 0,
            remainingTimeFormatted: 'PRÊT',
            totalTime: 7200000,
            totalTimeFormatted: '2h',
            isReady: true
          }
        ],
        scheduledActivities: [],
        harvestCalendar: [],
        optimizationSuggestions: []
      });

      await CropTabsRenderer.render(mockGameData);

      expect(mockContainer.innerHTML).toContain('Maintenant');
    });

    it('should format time in minutes for short durations', async () => {
      const mockGameData: SunflowerGameData = {};
      
      mockTimerManager.calculateTimers.mockReturnValue({
        activeTimers: [
          {
            id: 'crop-1',
            type: 'crop',
            name: 'Potato',
            remainingTime: 1800000, // 30 minutes
            remainingTimeFormatted: '30m',
            totalTime: 7200000,
            totalTimeFormatted: '2h',
            isReady: false
          }
        ],
        scheduledActivities: [],
        harvestCalendar: [],
        optimizationSuggestions: []
      });

      await CropTabsRenderer.render(mockGameData);

      expect(mockContainer.innerHTML).toContain('dans 30min');
    });
  });

  describe('event listeners', () => {
    it('should attach expand/collapse event listeners', async () => {
      const mockGameData: SunflowerGameData = {};
      
      mockTimerManager.calculateTimers.mockReturnValue({
        activeTimers: [
          {
            id: 'crop-1',
            type: 'crop',
            name: 'Potato',
            remainingTime: 3600000,
            remainingTimeFormatted: '1h',
            totalTime: 7200000,
            totalTimeFormatted: '2h',
            isReady: false
          }
        ],
        scheduledActivities: [],
        harvestCalendar: [],
        optimizationSuggestions: []
      });

      await CropTabsRenderer.render(mockGameData);

      const header = mockContainer.querySelector('.crop-group-header');
      expect(header).toBeTruthy();
      expect(header?.getAttribute('data-toggle')).toBeTruthy();
    });

    it('should toggle collapse state when header is clicked', async () => {
      const mockGameData: SunflowerGameData = {};
      
      mockTimerManager.calculateTimers.mockReturnValue({
        activeTimers: [
          {
            id: 'crop-1',
            type: 'crop',
            name: 'Potato',
            remainingTime: 3600000,
            remainingTimeFormatted: '1h',
            totalTime: 7200000,
            totalTimeFormatted: '2h',
            isReady: false
          }
        ],
        scheduledActivities: [],
        harvestCalendar: [],
        optimizationSuggestions: []
      });

      await CropTabsRenderer.render(mockGameData);

      const header = mockContainer.querySelector('.crop-group-header') as HTMLElement;
      const content = mockContainer.querySelector('.crop-timers') as HTMLElement;
      
      expect(header).toBeTruthy();
      expect(content).toBeTruthy();
      
      // Initial state should be expanded
      expect(content.style.display).not.toBe('none');
      
      // Click to collapse
      header.click();
      
      expect(content.style.display).toBe('none');
      expect(header.classList.contains('collapsed')).toBe(true);
    });
  });
});
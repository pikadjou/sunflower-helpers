import { PureDOMExtractor, DOMTimerData, DOMExtractionResult } from '../src/content/pure-dom-extractor';

describe('PureDOMExtractor', () => {
  let extractor: PureDOMExtractor;
  let mockElements: HTMLElement[];

  beforeEach(() => {
    extractor = new PureDOMExtractor();
    mockElements = [];
    
    // Mock DOM methods
    document.querySelectorAll = jest.fn().mockReturnValue(mockElements);
    
    // Mock getBoundingClientRect
    HTMLElement.prototype.getBoundingClientRect = jest.fn().mockReturnValue({
      left: 100,
      top: 100,
      width: 50,
      height: 20,
      right: 150,
      bottom: 120
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('constructor', () => {
    it('should create an instance with empty callbacks', () => {
      const newExtractor = new PureDOMExtractor();
      expect(newExtractor).toBeDefined();
    });
  });

  describe('addCallback', () => {
    it('should add callback to the callbacks array', () => {
      const callback = jest.fn();
      extractor.addCallback(callback);
      
      // Verify callback is added by triggering scanOnce
      const result = extractor.scanOnce();
      // Since we don't have a way to directly test the callbacks array,
      // we test indirectly by ensuring the extractor works
      expect(result).toBeDefined();
    });
  });

  describe('scanOnce', () => {
    it('should return empty result when no elements found', () => {
      const result = extractor.scanOnce();
      
      expect(result).toMatchObject({
        foundElements: [],
        totalFound: 0
      });
      expect(result.scanTimestamp).toBeGreaterThan(0);
    });

    it('should find visible elements with text content', () => {
      // Create mock elements
      const mockElement1 = document.createElement('div');
      mockElement1.textContent = '2h 30m';
      mockElement1.className = 'timer-display';
      mockElement1.id = 'timer-1';
      mockElement1.innerHTML = '2h 30m';
      
      const mockElement2 = document.createElement('span');
      mockElement2.textContent = 'Ready';
      mockElement2.className = 'ready-indicator';
      mockElement2.id = 'ready-1';
      mockElement2.innerHTML = 'Ready';

      mockElements = [mockElement1, mockElement2];
      document.querySelectorAll = jest.fn().mockReturnValue(mockElements);

      const result = extractor.scanOnce();

      expect(result.foundElements).toHaveLength(2);
      expect(result.totalFound).toBe(2);
      
      // Check first element
      expect(result.foundElements[0]).toMatchObject({
        displayedText: '2h 30m',
        position: { x: 125, y: 110 }, // center of mocked rect
        elementInfo: {
          tagName: 'DIV',
          className: 'timer-display',
          id: 'timer-1',
          innerHTML: '2h 30m'
        }
      });

      // Check second element
      expect(result.foundElements[1]).toMatchObject({
        displayedText: 'Ready',
        position: { x: 125, y: 110 },
        elementInfo: {
          tagName: 'SPAN',
          className: 'ready-indicator',
          id: 'ready-1',
          innerHTML: 'Ready'
        }
      });
    });

    it('should skip elements with no text content', () => {
      const mockElement = document.createElement('div');
      mockElement.textContent = ''; // Empty text
      mockElements = [mockElement];
      document.querySelectorAll = jest.fn().mockReturnValue(mockElements);

      const result = extractor.scanOnce();

      expect(result.foundElements).toHaveLength(0);
      expect(result.totalFound).toBe(0);
    });

    it('should skip invisible elements', () => {
      const mockElement = document.createElement('div');
      mockElement.textContent = '2h 30m';
      
      // Mock invisible element (zero dimensions)
      mockElement.getBoundingClientRect = jest.fn().mockReturnValue({
        left: 0,
        top: 0, 
        width: 0,
        height: 0,
        right: 0,
        bottom: 0
      });

      mockElements = [mockElement];
      document.querySelectorAll = jest.fn().mockReturnValue(mockElements);

      const result = extractor.scanOnce();

      expect(result.foundElements).toHaveLength(0);
    });

    it('should skip elements with hidden CSS styles', () => {
      const mockElement = document.createElement('div');
      mockElement.textContent = '2h 30m';
      
      // Mock getComputedStyle to return hidden styles
      window.getComputedStyle = jest.fn().mockReturnValue({
        display: 'none',
        visibility: 'visible',
        opacity: '1'
      });

      mockElements = [mockElement];
      document.querySelectorAll = jest.fn().mockReturnValue(mockElements);

      const result = extractor.scanOnce();

      expect(result.foundElements).toHaveLength(0);
    });

    it('should truncate long innerHTML', () => {
      const mockElement = document.createElement('div');
      mockElement.textContent = 'Timer';
      const longHTML = 'a'.repeat(150); // Longer than 100 chars
      mockElement.innerHTML = longHTML;

      mockElements = [mockElement];
      document.querySelectorAll = jest.fn().mockReturnValue(mockElements);

      const result = extractor.scanOnce();

      expect(result.foundElements[0].elementInfo.innerHTML).toHaveLength(100);
      expect(result.foundElements[0].elementInfo.innerHTML).toBe('a'.repeat(100));
    });

    it('should handle elements with no className or id', () => {
      const mockElement = document.createElement('p');
      mockElement.textContent = 'Timer text';
      // No className or id set

      mockElements = [mockElement];
      document.querySelectorAll = jest.fn().mockReturnValue(mockElements);

      const result = extractor.scanOnce();

      expect(result.foundElements[0].elementInfo).toMatchObject({
        tagName: 'P',
        className: '',
        id: '',
      });
    });

    it('should include timestamp in results', () => {
      const mockTimestamp = 1642248000000;
      jest.spyOn(Date, 'now').mockReturnValue(mockTimestamp);

      const result = extractor.scanOnce();

      expect(result.scanTimestamp).toBe(mockTimestamp);
      // If elements were found, they should have the same timestamp
      if (result.foundElements.length > 0) {
        result.foundElements.forEach(element => {
          expect(element.timestamp).toBe(mockTimestamp);
        });
      }
    });
  });

  describe('getStatus', () => {
    it('should return status with lastScanTime', () => {
      const status = extractor.getStatus();
      
      expect(status).toHaveProperty('lastScanTime');
      expect(typeof status.lastScanTime).toBe('number');
      expect(status.lastScanTime).toBeGreaterThan(0);
    });
  });

  describe('static utility methods', () => {
    let testElements: DOMTimerData[];

    beforeEach(() => {
      testElements = [
        {
          displayedText: '2h 30m',
          position: { x: 100, y: 100 },
          timestamp: Date.now(),
          elementInfo: {
            tagName: 'DIV',
            className: 'timer-class',
            id: 'timer-1',
            innerHTML: '2h 30m'
          }
        },
        {
          displayedText: 'Ready',
          position: { x: 200, y: 150 },
          timestamp: Date.now(),
          elementInfo: {
            tagName: 'SPAN',
            className: 'ready-class',
            id: 'ready-1', 
            innerHTML: 'Ready'
          }
        }
      ];
    });

    describe('filterByText', () => {
      it('should filter elements by text pattern', () => {
        const result = PureDOMExtractor.filterByText(testElements, /Ready/);
        
        expect(result).toHaveLength(1);
        expect(result[0].displayedText).toBe('Ready');
      });

      it('should return empty array for non-matching pattern', () => {
        const result = PureDOMExtractor.filterByText(testElements, /NotFound/);
        
        expect(result).toHaveLength(0);
      });
    });

    describe('filterByTag', () => {
      it('should filter elements by tag name', () => {
        const result = PureDOMExtractor.filterByTag(testElements, 'div');
        
        expect(result).toHaveLength(1);
        expect(result[0].elementInfo.tagName).toBe('DIV');
      });

      it('should be case insensitive', () => {
        const result = PureDOMExtractor.filterByTag(testElements, 'SPAN');
        
        expect(result).toHaveLength(1);
        expect(result[0].elementInfo.tagName).toBe('SPAN');
      });
    });

    describe('filterByClass', () => {
      it('should filter elements by class name', () => {
        const result = PureDOMExtractor.filterByClass(testElements, 'timer-class');
        
        expect(result).toHaveLength(1);
        expect(result[0].elementInfo.className).toBe('timer-class');
      });

      it('should work with partial class names', () => {
        const result = PureDOMExtractor.filterByClass(testElements, 'timer');
        
        expect(result).toHaveLength(1);
      });
    });

    describe('filterByPosition', () => {
      it('should filter elements within position bounds', () => {
        const result = PureDOMExtractor.filterByPosition(testElements, 50, 150, 50, 120);
        
        expect(result).toHaveLength(1);
        expect(result[0].position).toEqual({ x: 100, y: 100 });
      });

      it('should return empty array when no elements in bounds', () => {
        const result = PureDOMExtractor.filterByPosition(testElements, 300, 400, 300, 400);
        
        expect(result).toHaveLength(0);
      });
    });
  });
});
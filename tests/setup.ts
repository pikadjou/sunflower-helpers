// Mock Chrome APIs - Simpler version
/// <reference types="jest" />
declare const global: any;

global.chrome = {
  runtime: {
    sendMessage: jest.fn().mockResolvedValue({}),
    onMessage: {
      addListener: jest.fn()
    },
    getURL: jest.fn().mockReturnValue('chrome-extension://test')
  },
  storage: {
    local: {
      get: jest.fn().mockResolvedValue({}),
      set: jest.fn().mockResolvedValue(undefined)
    }
  },
  tabs: {
    create: jest.fn()
  }
};

// Mock window.postMessage
global.window = Object.create(window);
Object.defineProperty(window, 'postMessage', {
  value: jest.fn(),
  writable: true
});

// Mock DOM methods
Object.defineProperty(window, 'getComputedStyle', {
  value: () => ({
    display: 'block',
    visibility: 'visible',
    opacity: '1'
  })
});

// Mock Date.now for consistent testing
const mockDate = new Date('2024-01-15T10:00:00.000Z');
jest.spyOn(Date, 'now').mockReturnValue(mockDate.getTime());
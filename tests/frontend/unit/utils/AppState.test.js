// Mock the constants module first
jest.mock('../../../../public/js/utils/constants.js', () => ({
  QUALITY_LOADING_STATE: 'Loading...',
  QUALITY_UNKNOWN_STATE: 'Unknown'
}));

// Import using dynamic import to handle ES6 modules
let AppState;
beforeAll(async () => {
  const module = await import('../../../../public/js/utils/AppState.js');
  AppState = module.AppState;
});

describe('AppState', () => {
  let appState;

  beforeEach(() => {
    appState = new AppState();
  });

  describe('get/set operations', () => {
    it('should set and get simple values', () => {
      appState.set('testKey', 'testValue');
      expect(appState.get('testKey')).toBe('testValue');
    });

    it('should handle nested paths', () => {
      appState.set('user.profile.name', 'John Doe');
      expect(appState.get('user.profile.name')).toBe('John Doe');
      expect(appState.get('user.profile')).toEqual({ name: 'John Doe' });
    });

    it('should return undefined for non-existent keys', () => {
      expect(appState.get('nonExistent')).toBeUndefined();
    });

    it('should overwrite existing values', () => {
      appState.set('key', 'value1');
      appState.set('key', 'value2');
      expect(appState.get('key')).toBe('value2');
    });

    it('should handle null and undefined values', () => {
      appState.set('nullKey', null);
      appState.set('undefinedKey', undefined);
      expect(appState.get('nullKey')).toBeNull();
      expect(appState.get('undefinedKey')).toBeUndefined();
    });
  });

  describe('setBatch operations', () => {
    it('should set multiple values at once', () => {
      appState.setBatch({
        'key1': 'value1',
        'key2': 'value2',
        'nested.key': 'nestedValue'
      });

      expect(appState.get('key1')).toBe('value1');
      expect(appState.get('key2')).toBe('value2');
      expect(appState.get('nested.key')).toBe('nestedValue');
    });

    it('should trigger callbacks for all changed values', () => {
      const callback1 = jest.fn();
      const callback2 = jest.fn();

      appState.subscribe('key1', callback1);
      appState.subscribe('key2', callback2);

      appState.setBatch({
        'key1': 'value1',
        'key2': 'value2'
      });

      expect(callback1).toHaveBeenCalledWith('value1', undefined);
      expect(callback2).toHaveBeenCalledWith('value2', undefined);
    });
  });

  describe('subscription system', () => {
    it('should notify subscribers on value change', () => {
      const callback = jest.fn();
      appState.subscribe('testKey', callback);

      appState.set('testKey', 'newValue');

      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback).toHaveBeenCalledWith('newValue', undefined);
    });

    it('should pass old value to callback', () => {
      const callback = jest.fn();
      appState.set('testKey', 'oldValue');
      appState.subscribe('testKey', callback);

      appState.set('testKey', 'newValue');

      expect(callback).toHaveBeenCalledWith('newValue', 'oldValue');
    });

    it('should support multiple subscribers for same key', () => {
      const callback1 = jest.fn();
      const callback2 = jest.fn();

      appState.subscribe('testKey', callback1);
      appState.subscribe('testKey', callback2);

      appState.set('testKey', 'value');

      expect(callback1).toHaveBeenCalled();
      expect(callback2).toHaveBeenCalled();
    });

    it('should notify even if value does not change (current implementation)', () => {
      const callback = jest.fn();
      appState.set('testKey', 'value');
      appState.subscribe('testKey', callback);

      appState.set('testKey', 'value'); // Same value

      // Current implementation doesn't check for value equality
      expect(callback).toHaveBeenCalledWith('value', 'value');
    });

    it('should handle nested path subscriptions', () => {
      const callback = jest.fn();
      appState.subscribe('user.profile.name', callback);

      appState.set('user.profile.name', 'Jane Doe');

      expect(callback).toHaveBeenCalledWith('Jane Doe', undefined);
    });

    it('should unsubscribe correctly', () => {
      const callback = jest.fn();
      const unsubscribe = appState.subscribe('testKey', callback);

      appState.set('testKey', 'value1');
      expect(callback).toHaveBeenCalledTimes(1);

      unsubscribe();
      appState.set('testKey', 'value2');
      expect(callback).toHaveBeenCalledTimes(1); // Should not be called again
    });
  });

  // Wildcard subscriptions not implemented in current AppState
  describe('exact key subscriptions only', () => {
    it('does not support wildcard subscriptions', () => {
      const callback = jest.fn();
      appState.subscribe('user.*', callback);

      appState.set('user.name', 'John');
      appState.set('user.email', 'john@example.com');

      // Wildcard listeners won't be triggered
      expect(callback).not.toHaveBeenCalled();
    });

    it('requires exact key match', () => {
      const callback = jest.fn();
      appState.subscribe('user.name', callback);

      appState.set('user.name', 'John');
      appState.set('user.email', 'john@example.com');

      // Only exact match triggers
      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback).toHaveBeenCalledWith('John', undefined);
    });
  });

  // Methods not implemented in current AppState
  describe('additional utility methods', () => {
    it('has getUserIdentifier method', () => {
      // Reset localStorage mock
      if (global.localStorage.getItem.mockReturnValue) {
        global.localStorage.getItem.mockReturnValue(null);
      }

      const userId = appState.getUserIdentifier();

      expect(userId).toMatch(/^user-[a-z0-9]{9}$/);
      // Just verify the method works
      expect(typeof userId).toBe('string');
    });

    it('has getCurrentSongId method', () => {
      appState.set('currentTrack.artist', 'Test Artist');
      appState.set('currentTrack.title', 'Test Song');

      const songId = appState.getCurrentSongId();

      expect(songId).toBe('test-artist-test-song');
    });
  });

  describe('edge cases', () => {
    it('should handle arrays as values', () => {
      const array = [1, 2, 3];
      appState.set('array', array);
      expect(appState.get('array')).toEqual(array);
    });

    it('should handle objects as values', () => {
      const obj = { a: 1, b: { c: 2 } };
      appState.set('object', obj);
      expect(appState.get('object')).toEqual(obj);
    });

    it('should handle empty string keys gracefully', () => {
      expect(() => appState.set('', 'value')).not.toThrow();
      expect(appState.get('')).toBe('value');
    });

    it('should handle special characters in keys', () => {
      appState.set('key-with-dash', 'value1');
      appState.set('key.with.dots', 'value2');
      appState.set('key_with_underscore', 'value3');

      expect(appState.get('key-with-dash')).toBe('value1');
      expect(appState.get('key.with.dots')).toBe('value2');
      expect(appState.get('key_with_underscore')).toBe('value3');
    });
  });
});
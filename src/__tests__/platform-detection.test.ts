/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * Tests for platform detection helpers (isTVOS, isMacOS, isStandardIOS)
 * and promotedProductListenerIOS behavior on different Apple platforms.
 *
 * These tests require module resets to properly test Platform detection
 * as the Platform object is read at module load time.
 */

// Minimal Nitro IAP mock
const mockIap: any = {
  initConnection: jest.fn(async () => true),
  endConnection: jest.fn(async () => true),
  fetchProducts: jest.fn(async () => []),
  requestPurchase: jest.fn(async () => undefined),
  getAvailablePurchases: jest.fn(async () => []),
  finishTransaction: jest.fn(async () => true),
  addPurchaseUpdatedListener: jest.fn(),
  removePurchaseUpdatedListener: jest.fn(),
  addPurchaseErrorListener: jest.fn(),
  removePurchaseErrorListener: jest.fn(),
  addPromotedProductListenerIOS: jest.fn(),
  removePromotedProductListenerIOS: jest.fn(),
};

describe('Platform detection helpers', () => {
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
  });

  describe('isTVOS', () => {
    it('returns true on tvOS (iOS with isTV=true)', () => {
      jest.doMock('react-native', () => ({
        Platform: {OS: 'ios', isTV: true, select: (obj: any) => obj.ios},
      }));
      jest.doMock('react-native-nitro-modules', () => ({
        NitroModules: {createHybridObject: jest.fn(() => mockIap)},
      }));
      const {isTVOS} = require('../index');
      expect(isTVOS()).toBe(true);
    });

    it('returns false on standard iOS', () => {
      jest.doMock('react-native', () => ({
        Platform: {OS: 'ios', isTV: false, select: (obj: any) => obj.ios},
      }));
      jest.doMock('react-native-nitro-modules', () => ({
        NitroModules: {createHybridObject: jest.fn(() => mockIap)},
      }));
      const {isTVOS} = require('../index');
      expect(isTVOS()).toBe(false);
    });

    it('returns false on Android', () => {
      jest.doMock('react-native', () => ({
        Platform: {OS: 'android', select: (obj: any) => obj.android},
      }));
      jest.doMock('react-native-nitro-modules', () => ({
        NitroModules: {createHybridObject: jest.fn(() => mockIap)},
      }));
      const {isTVOS} = require('../index');
      expect(isTVOS()).toBe(false);
    });
  });

  describe('isMacOS', () => {
    it('returns true on native macOS', () => {
      jest.doMock('react-native', () => ({
        Platform: {OS: 'macos', select: (obj: any) => obj.macos},
      }));
      jest.doMock('react-native-nitro-modules', () => ({
        NitroModules: {createHybridObject: jest.fn(() => mockIap)},
      }));
      const {isMacOS} = require('../index');
      expect(isMacOS()).toBe(true);
    });

    it('returns true on macOS Catalyst', () => {
      jest.doMock('react-native', () => ({
        Platform: {
          OS: 'ios',
          isMacCatalyst: true,
          select: (obj: any) => obj.ios,
        },
      }));
      jest.doMock('react-native-nitro-modules', () => ({
        NitroModules: {createHybridObject: jest.fn(() => mockIap)},
      }));
      const {isMacOS} = require('../index');
      expect(isMacOS()).toBe(true);
    });

    it('returns false on standard iOS', () => {
      jest.doMock('react-native', () => ({
        Platform: {
          OS: 'ios',
          isMacCatalyst: false,
          select: (obj: any) => obj.ios,
        },
      }));
      jest.doMock('react-native-nitro-modules', () => ({
        NitroModules: {createHybridObject: jest.fn(() => mockIap)},
      }));
      const {isMacOS} = require('../index');
      expect(isMacOS()).toBe(false);
    });
  });

  describe('isStandardIOS', () => {
    it('returns true on iPhone/iPad', () => {
      jest.doMock('react-native', () => ({
        Platform: {
          OS: 'ios',
          isTV: false,
          isMacCatalyst: false,
          select: (obj: any) => obj.ios,
        },
      }));
      jest.doMock('react-native-nitro-modules', () => ({
        NitroModules: {createHybridObject: jest.fn(() => mockIap)},
      }));
      const {isStandardIOS} = require('../index');
      expect(isStandardIOS()).toBe(true);
    });

    it('returns false on tvOS', () => {
      jest.doMock('react-native', () => ({
        Platform: {OS: 'ios', isTV: true, select: (obj: any) => obj.ios},
      }));
      jest.doMock('react-native-nitro-modules', () => ({
        NitroModules: {createHybridObject: jest.fn(() => mockIap)},
      }));
      const {isStandardIOS} = require('../index');
      expect(isStandardIOS()).toBe(false);
    });

    it('returns false on macOS Catalyst', () => {
      jest.doMock('react-native', () => ({
        Platform: {
          OS: 'ios',
          isMacCatalyst: true,
          select: (obj: any) => obj.ios,
        },
      }));
      jest.doMock('react-native-nitro-modules', () => ({
        NitroModules: {createHybridObject: jest.fn(() => mockIap)},
      }));
      const {isStandardIOS} = require('../index');
      expect(isStandardIOS()).toBe(false);
    });

    it('returns false on Android', () => {
      jest.doMock('react-native', () => ({
        Platform: {OS: 'android', select: (obj: any) => obj.android},
      }));
      jest.doMock('react-native-nitro-modules', () => ({
        NitroModules: {createHybridObject: jest.fn(() => mockIap)},
      }));
      const {isStandardIOS} = require('../index');
      expect(isStandardIOS()).toBe(false);
    });
  });

  describe('promotedProductListenerIOS on Apple platforms', () => {
    it('attaches listener on standard iOS', () => {
      jest.doMock('react-native', () => ({
        Platform: {
          OS: 'ios',
          isTV: false,
          isMacCatalyst: false,
          select: (obj: any) => obj.ios,
        },
      }));
      jest.doMock('react-native-nitro-modules', () => ({
        NitroModules: {createHybridObject: jest.fn(() => mockIap)},
      }));
      mockIap.addPromotedProductListenerIOS.mockClear();
      const {promotedProductListenerIOS} = require('../index');
      const sub = promotedProductListenerIOS(jest.fn());
      expect(typeof sub.remove).toBe('function');
      expect(mockIap.addPromotedProductListenerIOS).toHaveBeenCalled();
    });

    it('does not attach listener on tvOS', () => {
      jest.doMock('react-native', () => ({
        Platform: {OS: 'ios', isTV: true, select: (obj: any) => obj.ios},
      }));
      jest.doMock('react-native-nitro-modules', () => ({
        NitroModules: {createHybridObject: jest.fn(() => mockIap)},
      }));
      mockIap.addPromotedProductListenerIOS.mockClear();
      const {promotedProductListenerIOS} = require('../index');
      const sub = promotedProductListenerIOS(jest.fn());
      expect(typeof sub.remove).toBe('function');
      expect(mockIap.addPromotedProductListenerIOS).not.toHaveBeenCalled();
    });

    it('does not attach listener on macOS Catalyst', () => {
      jest.doMock('react-native', () => ({
        Platform: {
          OS: 'ios',
          isMacCatalyst: true,
          select: (obj: any) => obj.ios,
        },
      }));
      jest.doMock('react-native-nitro-modules', () => ({
        NitroModules: {createHybridObject: jest.fn(() => mockIap)},
      }));
      mockIap.addPromotedProductListenerIOS.mockClear();
      const {promotedProductListenerIOS} = require('../index');
      const sub = promotedProductListenerIOS(jest.fn());
      expect(typeof sub.remove).toBe('function');
      expect(mockIap.addPromotedProductListenerIOS).not.toHaveBeenCalled();
    });

    it('does not attach listener on native macOS', () => {
      jest.doMock('react-native', () => ({
        Platform: {OS: 'macos', select: (obj: any) => obj.macos},
      }));
      jest.doMock('react-native-nitro-modules', () => ({
        NitroModules: {createHybridObject: jest.fn(() => mockIap)},
      }));
      mockIap.addPromotedProductListenerIOS.mockClear();
      const {promotedProductListenerIOS} = require('../index');
      const sub = promotedProductListenerIOS(jest.fn());
      expect(typeof sub.remove).toBe('function');
      expect(mockIap.addPromotedProductListenerIOS).not.toHaveBeenCalled();
    });
  });

  describe('isNitroReady', () => {
    it('returns true when Nitro module can be created', () => {
      jest.doMock('react-native', () => ({
        Platform: {OS: 'ios', select: (obj: any) => obj.ios},
      }));
      jest.doMock('react-native-nitro-modules', () => ({
        NitroModules: {createHybridObject: jest.fn(() => mockIap)},
      }));
      const {isNitroReady} = require('../index');
      expect(isNitroReady()).toBe(true);
    });

    it('returns false when Nitro module creation fails', () => {
      jest.doMock('react-native', () => ({
        Platform: {OS: 'ios', select: (obj: any) => obj.ios},
      }));
      jest.doMock('react-native-nitro-modules', () => ({
        NitroModules: {
          createHybridObject: jest.fn(() => {
            throw new Error('Nitro not ready');
          }),
        },
      }));
      const {isNitroReady} = require('../index');
      expect(isNitroReady()).toBe(false);
    });
  });
});

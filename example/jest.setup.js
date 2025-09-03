// Jest setup file for react-native-iap example app

// Set up global mocks first
global.__fbBatchedBridgeConfig = {
  remoteModuleConfig: [],
  localModulesConfig: [],
};

// Mock react-native-nitro-modules
jest.mock('react-native-nitro-modules', () => ({
  NitroModules: {
    hasHybridObject: jest.fn(() => true),
    createHybridObject: jest.fn(() => ({
      initConnection: jest.fn(() => Promise.resolve(true)),
      endConnection: jest.fn(() => Promise.resolve()),
      getProducts: jest.fn(() => Promise.resolve([])),
      getSubscriptions: jest.fn(() => Promise.resolve([])),
      requestPurchase: jest.fn(() => Promise.resolve()),
      requestSubscription: jest.fn(() => Promise.resolve()),
      finishTransaction: jest.fn(() => Promise.resolve()),
      getAvailablePurchases: jest.fn(() => Promise.resolve([])),
      getPurchaseHistory: jest.fn(() => Promise.resolve([])),
      acknowledgePurchaseAndroid: jest.fn(() => Promise.resolve()),
      consumePurchaseAndroid: jest.fn(() => Promise.resolve()),
      clearTransactionIOS: jest.fn(() => Promise.resolve()),
      clearProductsIOS: jest.fn(() => Promise.resolve()),
      promotedProductIOS: jest.fn(() => Promise.resolve()),
      buyPromotedProductIOS: jest.fn(() => Promise.resolve()),
      requestPromotedProductIOS: jest.fn(() => Promise.resolve()),
      validateReceiptIos: jest.fn(() => Promise.resolve()),
      getReceiptIOS: jest.fn(() => Promise.resolve()),
      getPendingPurchasesIOS: jest.fn(() => Promise.resolve()),
      flushFailedPurchasesCachedAsPendingAndroid: jest.fn(() =>
        Promise.resolve(),
      ),
      deepLinkingGetPendingPurchases: jest.fn(() => Promise.resolve()),
      presentCodeRedemptionSheetIOS: jest.fn(() => Promise.resolve()),
      openRedeemOfferCodeAndroid: jest.fn(() => Promise.resolve()),
    })),
  },
}));

// Mock the actual IAP module functions
jest.mock('../src/index', () => ({
  // Core functions
  initConnection: jest.fn(() => Promise.resolve(true)),
  endConnection: jest.fn(() => Promise.resolve()),
  getProducts: jest.fn(() => Promise.resolve([])),
  getSubscriptions: jest.fn(() => Promise.resolve([])),
  fetchProducts: jest.fn(() => Promise.resolve([])),
  requestPurchase: jest.fn(() => Promise.resolve()),
  requestSubscription: jest.fn(() => Promise.resolve()),
  finishTransaction: jest.fn(() => Promise.resolve()),
  getAvailablePurchases: jest.fn(() => Promise.resolve([])),
  getPurchaseHistory: jest.fn(() => Promise.resolve([])),

  // Android specific
  acknowledgePurchaseAndroid: jest.fn(() => Promise.resolve()),
  consumePurchaseAndroid: jest.fn(() => Promise.resolve()),
  flushFailedPurchasesCachedAsPendingAndroid: jest.fn(() => Promise.resolve()),
  deepLinkingGetPendingPurchases: jest.fn(() => Promise.resolve()),
  validateReceiptAndroid: jest.fn(() => Promise.resolve()),

  // iOS specific
  clearTransactionIOS: jest.fn(() => Promise.resolve()),
  clearProductsIOS: jest.fn(() => Promise.resolve()),
  promotedProductIOS: jest.fn(() => Promise.resolve()),
  buyPromotedProductIOS: jest.fn(() => Promise.resolve()),
  requestPromotedProductIOS: jest.fn(() => Promise.resolve(null)),
  beginRefundRequestIOS: jest.fn(() => Promise.resolve(null)),
  validateReceiptIos: jest.fn(() => Promise.resolve()),
  getReceiptIOS: jest.fn(() => Promise.resolve()),
  getPendingPurchasesIOS: jest.fn(() => Promise.resolve()),
  presentCodeRedemptionSheetIOS: jest.fn(() => Promise.resolve()),
  openRedeemOfferCodeAndroid: jest.fn(() => Promise.resolve()),

  // Event listeners
  purchaseUpdatedListener: jest.fn((callback) => ({remove: jest.fn()})),
  purchaseErrorListener: jest.fn((callback) => ({remove: jest.fn()})),

  // Hook
  useIAP: jest.fn(() => ({
    isInitialized: false,
    products: [],
    subscriptions: [],
    availablePurchases: [],
    currentPurchase: undefined,
    currentPurchaseError: undefined,
    initConnectionAndListen: jest.fn(() => Promise.resolve(true)),
    getProducts: jest.fn(() => Promise.resolve([])),
    getSubscriptions: jest.fn(() => Promise.resolve([])),
    getAvailablePurchases: jest.fn(() => Promise.resolve([])),
    requestPurchase: jest.fn(() => Promise.resolve()),
    requestSubscription: jest.fn(() => Promise.resolve()),
    finishTransaction: jest.fn(() => Promise.resolve()),
  })),

  // Utility functions
  parseErrorStringToJsonObj: jest.fn((error) => {
    if (typeof error === 'string') {
      try {
        return JSON.parse(error);
      } catch {
        return {message: error};
      }
    }
    return error;
  }),
  isUserCancelledError: jest.fn((error) => {
    return error?.code === 'E_USER_CANCELLED';
  }),

  // Enums and constants
  ErrorCode: {
    E_USER_CANCELLED: 'E_USER_CANCELLED',
    E_ITEM_UNAVAILABLE: 'E_ITEM_UNAVAILABLE',
    E_NETWORK_ERROR: 'E_NETWORK_ERROR',
    E_SERVICE_ERROR: 'E_SERVICE_ERROR',
    E_DEVELOPER_ERROR: 'E_DEVELOPER_ERROR',
    E_NOT_PREPARED: 'E_NOT_PREPARED',
    E_UNKNOWN: 'E_UNKNOWN',
  },
  ProrationMode: {
    IMMEDIATE_WITHOUT_PRORATION: 'IMMEDIATE_WITHOUT_PRORATION',
    IMMEDIATE_WITH_TIME_PRORATION: 'IMMEDIATE_WITH_TIME_PRORATION',
    IMMEDIATE_AND_CHARGE_PRORATED_PRICE: 'IMMEDIATE_AND_CHARGE_PRORATED_PRICE',
    IMMEDIATE_AND_CHARGE_FULL_PRICE: 'IMMEDIATE_AND_CHARGE_FULL_PRICE',
    DEFERRED: 'DEFERRED',
  },
  InstallSourceAndroid: {
    GOOGLE_PLAY: 'GOOGLE_PLAY',
    AMAZON: 'AMAZON',
    NOT_SET: 'NOT_SET',
  },
  PurchaseAndroidState: {
    UNSPECIFIED_STATE: 0,
    PURCHASED: 1,
    PENDING: 2,
  },
}));

// Mock @react-native-clipboard/clipboard
jest.mock('@react-native-clipboard/clipboard', () => ({
  default: {
    setString: jest.fn(),
    getString: jest.fn(() => Promise.resolve('')),
    hasString: jest.fn(() => Promise.resolve(false)),
    hasURL: jest.fn(() => Promise.resolve(false)),
    hasNumber: jest.fn(() => Promise.resolve(false)),
    hasWebURL: jest.fn(() => Promise.resolve(false)),
  },
}));

// Mock react-navigation
jest.mock('@react-navigation/native', () => {
  const actualNav = jest.requireActual('@react-navigation/native');
  return {
    ...actualNav,
    useNavigation: () => ({
      navigate: jest.fn(),
      goBack: jest.fn(),
      dispatch: jest.fn(),
      setOptions: jest.fn(),
      addListener: jest.fn(),
      removeListener: jest.fn(),
      canGoBack: jest.fn(),
      isFocused: jest.fn(),
    }),
    useRoute: () => ({
      key: 'test-route-key',
      name: 'TestRoute',
      params: {},
    }),
    useIsFocused: () => true,
    useFocusEffect: jest.fn(),
  };
});

// Mock Alert
global.Alert = {
  alert: jest.fn(),
  prompt: jest.fn(),
};

// Mock console methods to reduce test output noise
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

console.error = (...args) => {
  if (
    args[0]?.includes?.('Warning: ReactTestRenderer') ||
    args[0]?.includes?.('Warning: An update to') ||
    args[0]?.includes?.('Warning: You called act')
  ) {
    return;
  }
  originalConsoleError(...args);
};

console.warn = (...args) => {
  if (args[0]?.includes?.('Warning:') || args[0]?.includes?.('Deprecation')) {
    return;
  }
  originalConsoleWarn(...args);
};

// Add global test utilities
global.flushPromises = () => new Promise((resolve) => setImmediate(resolve));

// Setup fetch mock
global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve({}),
    text: () => Promise.resolve(''),
    status: 200,
  }),
);

// Mock timers
jest.useFakeTimers();

// Mock Linking
jest.mock('react-native/Libraries/Linking/Linking', () => ({
  openURL: jest.fn(() => Promise.resolve()),
  canOpenURL: jest.fn(() => Promise.resolve(true)),
  getInitialURL: jest.fn(() => Promise.resolve(null)),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
}));

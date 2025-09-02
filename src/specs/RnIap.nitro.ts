import type {HybridObject} from 'react-native-nitro-modules';

// ╔══════════════════════════════════════════════════════════════════════════╗
// ║                                  PARAMS                                  ║
// ╚══════════════════════════════════════════════════════════════════════════╝

// Purchase request parameters

/**
 * iOS-specific purchase request parameters
 */
interface NitroRequestPurchaseIos {
  sku: string;
  andDangerouslyFinishTransactionAutomatically?: boolean;
  appAccountToken?: string;
  quantity?: number;
  withOffer?: Record<string, string>;
}

/**
 * Android subscription offer structure
 */
interface NitroSubscriptionOffer {
  sku: string;
  offerToken: string;
}


/**
 * Android-specific purchase request parameters
 */
interface NitroRequestPurchaseAndroid {
  skus: string[];
  obfuscatedAccountIdAndroid?: string;
  obfuscatedProfileIdAndroid?: string;
  isOfferPersonalized?: boolean;
  subscriptionOffers?: NitroSubscriptionOffer[];
  replacementModeAndroid?: number;
  purchaseTokenAndroid?: string;
}

/**
 * Unified purchase request with platform-specific options
 */
interface NitroPurchaseRequest {
  ios?: NitroRequestPurchaseIos;
  android?: NitroRequestPurchaseAndroid;
}

// Available purchases parameters

/**
 * iOS-specific options for getting available purchases
 */
interface NitroAvailablePurchasesIosOptions {
  alsoPublishToEventListener?: boolean;
  onlyIncludeActiveItems?: boolean;
}

/**
 * Android-specific options for getting available purchases
 */
interface NitroAvailablePurchasesAndroidOptions {
  type?: string; // 'inapp' or 'subs'
}

/**
 * Unified available purchases options with platform-specific parameters
 */
interface NitroAvailablePurchasesOptions {
  ios?: NitroAvailablePurchasesIosOptions;
  android?: NitroAvailablePurchasesAndroidOptions;
}

// Transaction finish parameters

/**
 * iOS-specific parameters for finishing a transaction
 */
interface NitroFinishTransactionIosParams {
  transactionId: string;
}

/**
 * Android-specific parameters for finishing a transaction
 */
interface NitroFinishTransactionAndroidParams {
  purchaseToken: string;
  isConsumable?: boolean;
}

/**
 * Unified finish transaction parameters with platform-specific options
 */
interface NitroFinishTransactionParams {
  ios?: NitroFinishTransactionIosParams;
  android?: NitroFinishTransactionAndroidParams;
}

// ╔══════════════════════════════════════════════════════════════════════════╗
// ║                                  TYPES                                   ║
// ╚══════════════════════════════════════════════════════════════════════════╝

/**
 * Purchase result structure for Android operations
 */
export interface NitroPurchaseResult {
  responseCode: number;
  debugMessage?: string;
  code: string;
  message: string;
  purchaseToken?: string;
}

/**
 * Purchase data structure returned from native
 */
export interface NitroPurchase {
  // Common fields
  id: string;
  productId: string;
  transactionDate: number;
  purchaseToken?: string;
  platform: string;
  
  // iOS specific fields
  quantityIOS?: number;
  originalTransactionDateIOS?: number;
  originalTransactionIdentifierIOS?: string;
  appAccountToken?: string;
  
  // Android specific fields
  purchaseTokenAndroid?: string;
  dataAndroid?: string;
  signatureAndroid?: string;
  autoRenewingAndroid?: boolean;
  purchaseStateAndroid?: number;
  isAcknowledgedAndroid?: boolean;
  packageNameAndroid?: string;
  obfuscatedAccountIdAndroid?: string;
  obfuscatedProfileIdAndroid?: string;
}

/**
 * Product data structure returned from native
 */
export interface NitroProduct {
  // Common fields
  id: string;
  title: string;
  description: string;
  type: string;
  displayName?: string;
  displayPrice?: string;
  currency?: string;
  price?: number;
  platform: string;
  
  // iOS specific fields
  isFamilyShareable?: boolean;
  jsonRepresentation?: string;
  subscriptionPeriodUnitIOS?: string;
  subscriptionPeriodNumberIOS?: number;
  introductoryPriceIOS?: string;
  introductoryPriceAsAmountIOS?: number;
  introductoryPricePaymentModeIOS?: string;
  introductoryPriceNumberOfPeriodsIOS?: number;
  introductoryPriceSubscriptionPeriodIOS?: string;
  
  // Android specific fields
  originalPrice?: string;
  originalPriceAmountMicros?: number;
  introductoryPriceValue?: number;
  introductoryPriceCycles?: number;
  introductoryPricePeriod?: string;
  subscriptionPeriod?: string;
  freeTrialPeriod?: string;
  subscriptionOfferDetailsAndroid?: string; // Android subscription offer details as JSON string
}

// ╔══════════════════════════════════════════════════════════════════════════╗
// ║                             MAIN INTERFACE                               ║
// ╚══════════════════════════════════════════════════════════════════════════╝

/**
 * Main RnIap HybridObject interface for native bridge
 */
export interface RnIap extends HybridObject<{ ios: 'swift', android: 'kotlin' }> {
  // Connection methods
  
  /**
   * Initialize connection to the store
   * @returns Promise<boolean> - true if connection successful
   */
  initConnection(): Promise<boolean>;

  /**
   * End connection to the store
   * @returns Promise<boolean> - true if disconnection successful
   */
  endConnection(): Promise<boolean>;

  // Product methods
  
  /**
   * Request products from the store
   * @param skus - Array of product SKUs to fetch
   * @param type - Type of products: 'inapp' or 'subs'
   * @returns Promise<NitroProduct[]> - Array of products from the store
   */
  requestProducts(skus: string[], type: string): Promise<NitroProduct[]>;

  // Purchase methods (unified)
  
  /**
   * Request a purchase (unified method for both platforms)
   * ⚠️ Important: This is an event-based operation, not promise-based.
   * Listen for events through purchaseUpdatedListener or purchaseErrorListener.
   * @param request - Platform-specific purchase request parameters
   * @returns Promise<void> - Always returns void, listen for events instead
   */
  requestPurchase(request: NitroPurchaseRequest): Promise<void>;

  /**
   * Get available purchases (unified method for both platforms)
   * @param options - Platform-specific options for getting available purchases
   * @returns Promise<NitroPurchase[]> - Array of available purchases
   */
  getAvailablePurchases(options?: NitroAvailablePurchasesOptions): Promise<NitroPurchase[]>;

  /**
   * Finish a transaction (unified method for both platforms)
   * @param params - Platform-specific transaction finish parameters
   * @returns Promise<NitroPurchaseResult | boolean> - Result (Android) or success flag (iOS)
   */
  finishTransaction(params: NitroFinishTransactionParams): Promise<NitroPurchaseResult | boolean>;

  // Event listener methods
  
  /**
   * Add a listener for purchase updates
   * @param listener - Function to call when a purchase is updated
   */
  addPurchaseUpdatedListener(listener: (purchase: NitroPurchase) => void): void;
  
  /**
   * Add a listener for purchase errors
   * @param listener - Function to call when a purchase error occurs
   */
  addPurchaseErrorListener(listener: (error: NitroPurchaseResult) => void): void;
  
  /**
   * Remove a purchase updated listener
   * @param listener - Function to remove from listeners
   */
  removePurchaseUpdatedListener(listener: (purchase: NitroPurchase) => void): void;
  
  /**
   * Remove a purchase error listener
   * @param listener - Function to remove from listeners
   */
  removePurchaseErrorListener(listener: (error: NitroPurchaseResult) => void): void;
  
  /**
   * Add a listener for iOS promoted product events
   * @param listener - Function to call when a promoted product is selected in the App Store
   * @platform iOS
   */
  addPromotedProductListenerIOS(listener: (product: NitroProduct) => void): void;
  
  /**
   * Remove a promoted product listener
   * @param listener - Function to remove from listeners
   * @platform iOS
   */
  removePromotedProductListenerIOS(listener: (product: NitroProduct) => void): void;
  
  /**
   * Get the storefront identifier for the user's App Store account (iOS only)
   * @returns Promise<string> - The storefront identifier (e.g., 'USA' for United States)
   * @platform iOS
   */
  getStorefrontIOS(): Promise<string>;

  /**
   * Get the original app transaction ID if the app was purchased from the App Store (iOS only)
   * @returns Promise<string | null> - The original app transaction ID or null if not purchased
   * @platform iOS
   */
  getAppTransactionIOS(): Promise<string | null>;
}
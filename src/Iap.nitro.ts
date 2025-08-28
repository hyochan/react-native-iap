import type { HybridObject } from 'react-native-nitro-modules';
import type {
  NitroProduct,
  NitroPurchase,
  NitroPurchaseError,
  NitroProductType,
} from './types/NitroTypes';
import type { AppTransactionIOS } from './types';
import type { ProductStatusIOS, OfferParams } from './types/IapIos.types';
import type {
  ProductPurchaseAndroid,
  RequestPurchaseAndroidProps,
} from './types/IapAndroid.types';

export interface Iap extends HybridObject<{ ios: 'swift'; android: 'kotlin' }> {
  // Constants
  readonly PI: number;

  // ============================================================================
  // COMMON METHODS (Both iOS and Android)
  // ============================================================================

  // Connection Management
  initConnection(): Promise<boolean>;
  endConnection(): Promise<boolean>;

  // Event Listeners
  listenToPurchaseUpdates(onUpdate: (purchase: NitroPurchase) => void): void;
  listenToPurchaseErrors(onError: (error: NitroPurchaseError) => void): void;
  removePurchaseUpdateListener(): void;
  removePurchaseErrorListener(): void;

  // Product Fetching
  getItemsByType(
    type: NitroProductType,
    skus: string[]
  ): Promise<NitroProduct[]>;

  // Purchase History and Available Items
  getAvailableItems(
    alsoPublishToEventListener: boolean,
    onlyIncludeActiveItems: boolean
  ): Promise<NitroPurchase[]>;
  getAvailableItemsByType(type: NitroProductType): Promise<NitroPurchase[]>;
  getPurchaseHistoryByType(type: NitroProductType): Promise<NitroPurchase[]>;

  // Transaction Management
  finishTransaction(transactionId: string): Promise<void>;
  clearTransaction(): Promise<void>;
  getPendingTransactions(): Promise<NitroPurchase[]>;

  // Store Management
  showManageSubscriptions(): Promise<boolean>;
  sync(): Promise<boolean>;
  disable(): boolean;

  // Receipt and Validation
  getReceiptData(): Promise<string | null>;
  isTransactionVerified(sku: string): Promise<boolean>;

  // Utility Methods
  setValueAsync(value: string): Promise<string>;
  getPlatform(): string;

  // ============================================================================
  // iOS SPECIFIC METHODS
  // ============================================================================

  // iOS Product Fetching
  getItems(skus: string[]): Promise<NitroProduct[]>;

  // iOS Purchase Method
  buyProduct(
    sku: string,
    andDangerouslyFinishTransactionAutomaticallyIOS: boolean,
    appAccountToken: string | undefined,
    quantity: number,
    withOffer: OfferParams | undefined
  ): Promise<NitroPurchase>;

  // iOS Subscription Methods
  isEligibleForIntroOffer(groupID: string): Promise<boolean>;
  subscriptionStatus(sku: string): Promise<ProductStatusIOS[] | null>;
  currentEntitlement(sku: string): Promise<ProductStatusIOS | null>;
  latestTransaction(sku: string): Promise<ProductStatusIOS | null>;

  // iOS Store UI Methods
  presentCodeRedemptionSheet(): Promise<boolean>;
  beginRefundRequest(sku: string): Promise<string | null>;

  // iOS Receipt and Validation
  getTransactionJws(sku: string): Promise<string | null>;
  getAppTransaction(): Promise<AppTransactionIOS | null>;
  validateReceiptIOS(sku: string): Promise<ProductStatusIOS>;
  getStorefront(): Promise<string>;

  // ============================================================================
  // ANDROID SPECIFIC METHODS
  // ============================================================================

  // Android Utility Methods
  getPackageName(): Promise<string>;

  // Android Purchase Method
  buyItemByType(params: RequestPurchaseAndroidProps): Promise<NitroPurchase[]>;

  // Android Transaction Methods
  consumeProduct(purchaseToken: string): Promise<ProductPurchaseAndroid>;
  acknowledgePurchase(purchaseToken: string): Promise<ProductPurchaseAndroid>;
}

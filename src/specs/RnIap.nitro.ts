import type { HybridObject } from 'react-native-nitro-modules'
import type { ProductCommon, PurchaseCommon } from '../types'

export interface RnIap
  extends HybridObject<{ ios: 'swift'; android: 'kotlin' }> {
  // Test method
  hello(name: string): string

  // Connection methods
  initConnection(): Promise<boolean>
  endConnection(): Promise<boolean>

  // Product methods
  getProducts(skus: string[]): Promise<ProductCommon[]>
  getSubscriptions(skus: string[]): Promise<ProductCommon[]>

  // Purchase methods
  buyProduct(sku: string): Promise<PurchaseCommon>
  getAvailablePurchases(): Promise<PurchaseCommon[]>
  finishTransaction(transactionId: string): Promise<void>

  // Platform
  getPlatform(): string
}

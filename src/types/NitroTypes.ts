/**
 * Simplified types for Nitro code generation
 * These types are used in Iap.nitro.ts interface definition
 */

export interface NitroProduct {
  readonly id: string;
  readonly title?: string;
  readonly description?: string;
  readonly price?: number;
  readonly currency?: string;
  readonly displayPrice?: string;
  readonly platform?: string;
}

export interface NitroPurchase {
  readonly id: string;
  readonly productId: string;
  readonly transactionId?: string;
  readonly transactionDate: number;
  readonly transactionReceipt: string;
  readonly platform?: string;
  readonly purchaseToken?: string; // Android purchase token
  readonly dataAndroid?: string; // Android purchase data
  [key: string]: any; // Allow additional properties
}

export interface NitroPurchaseError {
  readonly code: string;
  readonly message: string;
  readonly productId?: string;
}

export type NitroProductType = 'inapp' | 'subs';

import type { Product, ProductCommon, Purchase, PurchaseCommon } from './types'

/**
 * Transform ProductCommon to platform-specific Product type
 */
export const transformProduct = (
  product: ProductCommon,
  platform: string
): Product => {
  if (platform === 'ios') {
    // Add iOS-specific fields
    return {
      ...product,
      platform: 'ios',
      displayNameIOS: product.displayName || product.title,
      isFamilyShareableIOS: false,
      jsonRepresentationIOS: JSON.stringify(product),
    } as Product
  } else if (platform === 'android') {
    // Add Android-specific fields
    return {
      ...product,
      platform: 'android',
      nameAndroid: product.displayName || product.title,
    } as Product
  }

  return product as Product
}

/**
 * Transform PurchaseCommon to platform-specific Purchase type
 */
export const transformPurchase = (
  purchase: PurchaseCommon,
  platform: string
): Purchase => {
  if (platform === 'ios') {
    return {
      ...purchase,
      platform: 'ios',
    } as Purchase
  } else if (platform === 'android') {
    return {
      ...purchase,
      platform: 'android',
    } as Purchase
  }

  return purchase as Purchase
}

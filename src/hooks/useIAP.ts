// External dependencies
import { useCallback, useEffect, useState, useRef } from 'react'
import { Platform } from 'react-native'

// Internal modules
import {
  endConnection,
  initConnection,
  purchaseErrorListener,
  purchaseUpdatedListener,
  promotedProductListenerIOS,
  getAvailablePurchases,
  finishTransaction as finishTransactionInternal,
  requestPurchase as requestPurchaseInternal,
  fetchProducts,
  validateReceipt as validateReceiptInternal,
  getActiveSubscriptions,
  hasActiveSubscriptions,
} from '../'
import { syncIOS, requestPromotedProductIOS, buyPromotedProductIOS } from '../'

// Types
import type {
  Product,
  Purchase,
  PurchaseError,
  PurchaseResult,
  SubscriptionProduct,
  RequestPurchaseProps,
  RequestSubscriptionProps,
  ActiveSubscription,
} from '../types'

// Types for event subscriptions
interface EventSubscription {
  remove(): void
}

type UseIap = {
  connected: boolean
  products: Product[]
  promotedProductsIOS: Purchase[]
  promotedProductIdIOS?: string
  subscriptions: SubscriptionProduct[]
  availablePurchases: Purchase[]
  currentPurchase?: Purchase
  currentPurchaseError?: PurchaseError
  promotedProductIOS?: Product
  activeSubscriptions: ActiveSubscription[]
  clearCurrentPurchase: () => void
  clearCurrentPurchaseError: () => void
  finishTransaction: ({
    purchase,
    isConsumable,
  }: {
    purchase: Purchase
    isConsumable?: boolean
  }) => Promise<PurchaseResult | boolean>
  getAvailablePurchases: () => Promise<void>
  fetchProducts: (params: {
    skus: string[]
    type?: 'inapp' | 'subs'
  }) => Promise<void>
  /**
   * @deprecated Use fetchProducts({ skus, type: 'inapp' }) instead. This method will be removed in version 3.0.0.
   * Note: This method internally uses fetchProducts, so no deprecation warning is shown.
   */
  getProducts: (skus: string[]) => Promise<void>
  /**
   * @deprecated Use fetchProducts({ skus, type: 'subs' }) instead. This method will be removed in version 3.0.0.
   * Note: This method internally uses fetchProducts, so no deprecation warning is shown.
   */
  getSubscriptions: (skus: string[]) => Promise<void>
  requestPurchase: (params: {
    request: RequestPurchaseProps | RequestSubscriptionProps
    type?: 'inapp' | 'subs'
  }) => Promise<any>
  validateReceipt: (
    sku: string,
    androidOptions?: {
      packageName: string
      productToken: string
      accessToken: string
      isSub?: boolean
    }
  ) => Promise<any>
  restorePurchases: () => Promise<void> // 구매 복원 함수 추가
  requestPromotedProductIOS: () => Promise<any | null>
  buyPromotedProductIOS: () => Promise<void>
  getActiveSubscriptions: (
    subscriptionIds?: string[]
  ) => Promise<ActiveSubscription[]>
  hasActiveSubscriptions: (subscriptionIds?: string[]) => Promise<boolean>
}

export interface UseIapOptions {
  onPurchaseSuccess?: (purchase: Purchase) => void
  onPurchaseError?: (error: PurchaseError) => void
  onSyncError?: (error: Error) => void
  shouldAutoSyncPurchases?: boolean // New option to control auto-syncing
  onPromotedProductIOS?: (product: Product) => void
}

/**
 * React Hook for managing In-App Purchases.
 * See documentation at https://expo-iap.hyo.dev/docs/hooks/useIAP
 */
export function useIAP(options?: UseIapOptions): UseIap {
  const [connected, setConnected] = useState<boolean>(false)
  const [products, setProducts] = useState<Product[]>([])
  const [promotedProductsIOS] = useState<Purchase[]>([])
  const [subscriptions, setSubscriptions] = useState<SubscriptionProduct[]>([])
  const [availablePurchases, setAvailablePurchases] = useState<Purchase[]>([])
  const [currentPurchase, setCurrentPurchase] = useState<Purchase>()
  const [promotedProductIOS, setPromotedProductIOS] = useState<Product>()
  const [currentPurchaseError, setCurrentPurchaseError] =
    useState<PurchaseError>()
  const [promotedProductIdIOS] = useState<string>()
  const [activeSubscriptions, setActiveSubscriptions] = useState<
    ActiveSubscription[]
  >([])

  const optionsRef = useRef<UseIapOptions | undefined>(options)

  // Helper function to merge arrays with duplicate checking
  const mergeWithDuplicateCheck = useCallback(
    <T>(
      existingItems: T[],
      newItems: T[],
      getKey: (item: T) => string
    ): T[] => {
      const merged = [...existingItems]
      newItems.forEach((newItem) => {
        const isDuplicate = merged.some(
          (existingItem) => getKey(existingItem) === getKey(newItem)
        )
        if (!isDuplicate) {
          merged.push(newItem)
        }
      })
      return merged
    },
    []
  )

  useEffect(() => {
    optionsRef.current = options
  }, [options])

  const subscriptionsRef = useRef<{
    purchaseUpdate?: EventSubscription
    purchaseError?: EventSubscription
    promotedProductsIOS?: EventSubscription
    promotedProductIOS?: EventSubscription
  }>({})

  const subscriptionsRefState = useRef<SubscriptionProduct[]>([])

  useEffect(() => {
    subscriptionsRefState.current = subscriptions
  }, [subscriptions])

  const clearCurrentPurchase = useCallback(() => {
    setCurrentPurchase(undefined)
  }, [])

  const clearCurrentPurchaseError = useCallback(() => {
    setCurrentPurchaseError(undefined)
  }, [])

  const getProductsInternal = useCallback(
    async (skus: string[]): Promise<void> => {
      try {
        const result = await fetchProducts({ skus, type: 'inapp' })
        setProducts((prevProducts: Product[]) =>
          mergeWithDuplicateCheck(
            prevProducts,
            result as Product[],
            (product: Product) => product.id
          )
        )
      } catch (error) {
        console.error('Error fetching products:', error)
      }
    },
    [mergeWithDuplicateCheck]
  )

  const getSubscriptionsInternal = useCallback(
    async (skus: string[]): Promise<void> => {
      try {
        const result = await fetchProducts({ skus, type: 'subs' })
        setSubscriptions((prevSubscriptions: SubscriptionProduct[]) =>
          mergeWithDuplicateCheck(
            prevSubscriptions,
            result as SubscriptionProduct[],
            (subscription: SubscriptionProduct) => subscription.id
          )
        )
      } catch (error) {
        console.error('Error fetching subscriptions:', error)
      }
    },
    [mergeWithDuplicateCheck]
  )

  const fetchProductsInternal = useCallback(
    async (params: {
      skus: string[]
      type?: 'inapp' | 'subs'
    }): Promise<void> => {
      try {
        const result = await fetchProducts(params)
        if (params.type === 'subs') {
          setSubscriptions((prevSubscriptions: SubscriptionProduct[]) =>
            mergeWithDuplicateCheck(
              prevSubscriptions,
              result as SubscriptionProduct[],
              (subscription: SubscriptionProduct) => subscription.id
            )
          )
        } else {
          setProducts((prevProducts: Product[]) =>
            mergeWithDuplicateCheck(
              prevProducts,
              result as Product[],
              (product: Product) => product.id
            )
          )
        }
      } catch (error) {
        console.error('Error fetching products:', error)
      }
    },
    [mergeWithDuplicateCheck]
  )

  const getAvailablePurchasesInternal = useCallback(async (): Promise<void> => {
    try {
      const result = await getAvailablePurchases()
      setAvailablePurchases(result)
    } catch (error) {
      console.error('Error fetching available purchases:', error)
    }
  }, [])

  const getActiveSubscriptionsInternal = useCallback(
    async (subscriptionIds?: string[]): Promise<ActiveSubscription[]> => {
      try {
        const result = await getActiveSubscriptions(subscriptionIds)
        setActiveSubscriptions(result)
        return result
      } catch (error) {
        console.error('Error getting active subscriptions:', error)
        // Don't clear existing activeSubscriptions on error - preserve current state
        // This prevents the UI from showing empty state when there are temporary network issues
        return []
      }
    },
    []
  )

  const hasActiveSubscriptionsInternal = useCallback(
    async (subscriptionIds?: string[]): Promise<boolean> => {
      try {
        return await hasActiveSubscriptions(subscriptionIds)
      } catch (error) {
        console.error('Error checking active subscriptions:', error)
        return false
      }
    },
    []
  )

  const finishTransaction = useCallback(
    async ({
      purchase,
      isConsumable,
    }: {
      purchase: Purchase
      isConsumable?: boolean
    }): Promise<PurchaseResult | boolean> => {
      try {
        return await finishTransactionInternal({
          purchase,
          isConsumable,
        })
      } catch (err) {
        throw err
      } finally {
        if (purchase.id === currentPurchase?.id) {
          clearCurrentPurchase()
        }
        if (purchase.id === currentPurchaseError?.productId) {
          clearCurrentPurchaseError()
        }
      }
    },
    [
      currentPurchase?.id,
      currentPurchaseError?.productId,
      clearCurrentPurchase,
      clearCurrentPurchaseError,
    ]
  )

  const requestPurchaseWithReset = useCallback(
    async (requestObj: { request: any; type?: 'inapp' | 'subs' }) => {
      clearCurrentPurchase()
      clearCurrentPurchaseError()

      try {
        return await requestPurchaseInternal(requestObj)
      } catch (error) {
        throw error
      }
    },
    [clearCurrentPurchase, clearCurrentPurchaseError]
  )

  const refreshSubscriptionStatus = useCallback(
    async (productId: string) => {
      try {
        if (
          subscriptionsRefState.current.some(
            (sub: SubscriptionProduct) => sub.id === productId
          )
        ) {
          await getSubscriptionsInternal([productId])
          await getAvailablePurchasesInternal()
        }
      } catch (error) {
        console.warn('Failed to refresh subscription status:', error)
      }
    },
    [getAvailablePurchasesInternal, getSubscriptionsInternal]
  )

  const restorePurchases = useCallback(async (): Promise<void> => {
    try {
      if (Platform.OS === 'ios') {
        await syncIOS().catch((error) => {
          if (optionsRef.current?.onSyncError) {
            optionsRef.current.onSyncError(error)
          } else {
            console.warn('Error restoring purchases:', error)
          }
        })
      }
      await getAvailablePurchasesInternal()
    } catch (error) {
      console.warn('Failed to restore purchases:', error)
    }
  }, [getAvailablePurchasesInternal])

  const validateReceipt = useCallback(
    async (
      sku: string,
      androidOptions?: {
        packageName: string
        productToken: string
        accessToken: string
        isSub?: boolean
      }
    ) => {
      return validateReceiptInternal(sku, androidOptions)
    },
    []
  )

  const initIapWithSubscriptions = useCallback(async (): Promise<void> => {
    const result = await initConnection()
    setConnected(result)

    if (result) {
      subscriptionsRef.current.purchaseUpdate = purchaseUpdatedListener(
        async (purchase: Purchase) => {
          setCurrentPurchaseError(undefined)
          setCurrentPurchase(purchase)

          if ('expirationDateIOS' in purchase) {
            await refreshSubscriptionStatus(purchase.id)
          }

          if (optionsRef.current?.onPurchaseSuccess) {
            optionsRef.current.onPurchaseSuccess(purchase)
          }
        }
      )

      subscriptionsRef.current.purchaseError = purchaseErrorListener(
        (error: PurchaseError) => {
          setCurrentPurchase(undefined)
          setCurrentPurchaseError(error)

          if (optionsRef.current?.onPurchaseError) {
            optionsRef.current.onPurchaseError(error)
          }
        }
      )

      if (Platform.OS === 'ios') {
        // iOS promoted products listener
        subscriptionsRef.current.promotedProductsIOS =
          promotedProductListenerIOS((product: Product) => {
            setPromotedProductIOS(product)

            if (optionsRef.current?.onPromotedProductIOS) {
              optionsRef.current.onPromotedProductIOS(product)
            }
          })
      }
    }
  }, [refreshSubscriptionStatus])

  useEffect(() => {
    initIapWithSubscriptions()
    const currentSubscriptions = subscriptionsRef.current

    return () => {
      currentSubscriptions.purchaseUpdate?.remove()
      currentSubscriptions.purchaseError?.remove()
      currentSubscriptions.promotedProductsIOS?.remove()
      currentSubscriptions.promotedProductIOS?.remove()
      endConnection()
      setConnected(false)
    }
  }, [initIapWithSubscriptions])

  return {
    connected,
    products,
    promotedProductsIOS,
    promotedProductIdIOS,
    subscriptions,
    finishTransaction,
    availablePurchases,
    currentPurchase,
    currentPurchaseError,
    promotedProductIOS,
    activeSubscriptions,
    clearCurrentPurchase,
    clearCurrentPurchaseError,
    getAvailablePurchases: getAvailablePurchasesInternal,
    fetchProducts: fetchProductsInternal,
    requestPurchase: requestPurchaseWithReset,
    validateReceipt,
    restorePurchases,
    getProducts: getProductsInternal,
    getSubscriptions: getSubscriptionsInternal,
    requestPromotedProductIOS,
    buyPromotedProductIOS,
    getActiveSubscriptions: getActiveSubscriptionsInternal,
    hasActiveSubscriptions: hasActiveSubscriptionsInternal,
  }
}

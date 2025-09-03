import Foundation
import NitroModules
import StoreKit
#if os(iOS) || os(tvOS)
import UIKit
#endif

@available(iOS 15.0, *)
class HybridRnIap: HybridRnIapSpec {
    // MARK: - Properties
    
    private var updateListenerTask: Task<Void, Never>?
    private var isInitialized: Bool = false
    private var productStore: ProductStore?
    private var transactions: [String: Transaction] = [:]
    private var paymentObserver: PaymentObserver?
    
    // Promoted products
    private var promotedProduct: Product?
    private var promotedPayment: SKPayment?
    private var promotedSKProduct: SKProduct?
    
    // Event listeners
    private var purchaseUpdatedListeners: [(NitroPurchase) -> Void] = []
    private var purchaseErrorListeners: [(NitroPurchaseResult) -> Void] = []
    private var promotedProductListeners: [(NitroProduct) -> Void] = []
    
    // MARK: - Initialization
    
    override init() {
        super.init()
    }
    
    deinit {
        updateListenerTask?.cancel()
    }
    
    // MARK: - Public Methods (Cross-platform)
    
    func initConnection() throws -> Promise<Bool> {
        return Promise.async {
            // Clean up any existing state first (important for hot reload)
            self.cleanupExistingState()
            
            // StoreKit 2 doesn't require explicit connection initialization
            // Just verify that the store is available
            let canMakePayments = SKPaymentQueue.canMakePayments()
            if canMakePayments {
                self.isInitialized = true
                self.productStore = ProductStore()
                
                // Set up PaymentObserver for promoted products
                if self.paymentObserver == nil {
                    self.paymentObserver = PaymentObserver(iapModule: self)
                    SKPaymentQueue.default().add(self.paymentObserver!)
                }
            } else {
                let errorJson = ErrorUtils.createErrorJson(
                    code: IapErrorCode.iapNotAvailable,
                    message: "In-app purchases are not available on this device"
                )
                throw NSError(domain: "RnIap", code: -1, userInfo: [NSLocalizedDescriptionKey: errorJson])
            }
            return canMakePayments
        }
    }
    
    func endConnection() throws -> Promise<Bool> {
        return Promise.async {
            self.cleanupExistingState()
            return true
        }
    }
    
    func fetchProducts(skus: [String], type: String) throws -> Promise<[NitroProduct]> {
        return Promise.async {
            do {
                try self.ensureConnection()
                print("[RnIap] fetchProducts called with skus: \(skus), type: \(type)")
                
                // Fetch products from StoreKit 2
                let storeProducts = try await StoreKit.Product.products(for: Set(skus))
                print("[RnIap] StoreKit returned \(storeProducts.count) products")
                
                // Store products in ProductStore
                if let productStore = self.productStore {
                    await productStore.addProducts(storeProducts)
                }
                
                // Convert StoreKit products to NitroProduct
                let nitroProducts = storeProducts.map { storeProduct in
                    print("[RnIap] Converting product: \(storeProduct.id)")
                    return self.convertToNitroProduct(storeProduct, type: type)
                }
                
                print("[RnIap] Returning \(nitroProducts.count) NitroProducts")
                return nitroProducts
            } catch {
                print("[RnIap] Error fetching products: \(error)")
                let errorJson = ErrorUtils.createErrorJson(from: error)
                throw NSError(domain: "RnIap", code: -1, userInfo: [NSLocalizedDescriptionKey: errorJson])
            }
        }
    }
    
    func requestPurchase(request: NitroPurchaseRequest) throws -> Promise<Void> {
        return Promise.async {
            // iOS implementation
            guard let iosRequest = request.ios else {
                // No iOS request, send error event
                let error = self.createPurchaseErrorResult(
                    code: IapErrorCode.userError,
                    message: "No iOS request provided"
                )
                self.sendPurchaseError(error)
                return
            }
            
            do {
                try self.ensureConnection()
                guard let productStore = self.productStore else {
                    let error = self.createPurchaseErrorResult(
                        code: IapErrorCode.notPrepared,
                        message: "Product store not initialized",
                        productId: iosRequest.sku
                    )
                    self.sendPurchaseError(error)
                    return
                }
                
                // Get product from store or fetch if not cached
                var product: Product? = await productStore.getProduct(productID: iosRequest.sku)
                
                if product == nil {
                    // Try fetching from StoreKit if not in cache
                    let products = try await Product.products(for: [iosRequest.sku])
                    guard let fetchedProduct = products.first else {
                        let error = self.createPurchaseErrorResult(
                            code: IapErrorCode.itemUnavailable,
                            message: "Invalid product ID: \(iosRequest.sku)",
                            productId: iosRequest.sku
                        )
                        self.sendPurchaseError(error)
                        return
                    }
                    // Store for future use
                    await productStore.addProduct(fetchedProduct)
                    product = fetchedProduct
                }
                
                // Purchase the product - this will send events internally
                try await self.purchaseProductWithEvents(
                    product!,
                    sku: iosRequest.sku,
                    andDangerouslyFinishTransactionAutomatically: iosRequest.andDangerouslyFinishTransactionAutomatically ?? false,
                    appAccountToken: iosRequest.appAccountToken,
                    quantity: iosRequest.quantity,
                    withOffer: iosRequest.withOffer
                )
            } catch {
                // Map StoreKit errors to proper error codes
                if let nsError = error as NSError? {
                    var errorCode = IapErrorCode.purchaseError
                    var errorMessage = error.localizedDescription
                    
                    switch nsError.domain {
                    case "SKErrorDomain":
                        switch nsError.code {
                        case 0: // SKError.unknown
                            errorCode = IapErrorCode.unknown
                        case 1: // SKError.clientInvalid
                            errorCode = IapErrorCode.serviceError
                        case 2: // SKError.paymentCancelled
                            errorCode = IapErrorCode.userCancelled
                            errorMessage = "User cancelled the purchase"
                        case 3: // SKError.paymentInvalid
                            errorCode = IapErrorCode.userError
                        case 4: // SKError.paymentNotAllowed
                            errorCode = IapErrorCode.userError
                            errorMessage = "Payment not allowed"
                        case 5: // SKError.storeProductNotAvailable
                            errorCode = IapErrorCode.itemUnavailable
                        case 6: // SKError.cloudServicePermissionDenied
                            errorCode = IapErrorCode.serviceError
                        case 7: // SKError.cloudServiceNetworkConnectionFailed
                            errorCode = IapErrorCode.networkError
                        case 8: // SKError.cloudServiceRevoked
                            errorCode = IapErrorCode.serviceError
                        default:
                            errorCode = IapErrorCode.purchaseError
                        }
                    case "NSURLErrorDomain":
                        errorCode = IapErrorCode.networkError
                        errorMessage = "Network error: \(error.localizedDescription)"
                    default:
                        if error.localizedDescription.lowercased().contains("network") {
                            errorCode = IapErrorCode.networkError
                        } else if error.localizedDescription.lowercased().contains("cancelled") {
                            errorCode = IapErrorCode.userCancelled
                        }
                    }
                    
                    let error = self.createPurchaseErrorResult(
                        code: errorCode,
                        message: errorMessage,
                        productId: iosRequest.sku
                    )
                    self.sendPurchaseError(error)
                } else {
                    let error = self.createPurchaseErrorResult(
                        code: IapErrorCode.purchaseError,
                        message: error.localizedDescription,
                        productId: iosRequest.sku
                    )
                    self.sendPurchaseError(error)
                }
            }
        }
    }
    
    func getAvailablePurchases(options: NitroAvailablePurchasesOptions?) throws -> Promise<[NitroPurchase]> {
        return Promise.async {
            try self.ensureConnection()
            
            // Support both new IOS suffixed and deprecated parameters
            let _ = options?.ios?.alsoPublishToEventListenerIOS ?? options?.ios?.alsoPublishToEventListener ?? false
            let onlyIncludeActiveItems = options?.ios?.onlyIncludeActiveItemsIOS ?? options?.ios?.onlyIncludeActiveItems ?? false
            
            var purchases: [NitroPurchase] = []
            
            // Get all transactions
            for await verification in Transaction.currentEntitlements {
                switch verification {
                case .verified(let transaction):
                    // Get JWS representation from verification result
                    let jwsRepresentation = verification.jwsRepresentation
                    
                    if onlyIncludeActiveItems {
                        // Only include active subscriptions and non-consumables
                        if transaction.productType == .nonConsumable || 
                           (transaction.productType == .autoRenewable && transaction.revocationDate == nil) {
                            if let products = try? await StoreKit.Product.products(for: [transaction.productID]),
                               let product = products.first {
                                purchases.append(self.convertToNitroPurchase(transaction, product: product, jwsRepresentation: jwsRepresentation))
                            }
                        }
                    } else {
                        // Include all transactions
                        if let products = try? await StoreKit.Product.products(for: [transaction.productID]),
                           let product = products.first {
                            purchases.append(self.convertToNitroPurchase(transaction, product: product, jwsRepresentation: jwsRepresentation))
                        }
                    }
                case .unverified:
                    continue
                }
            }
            
            return purchases
        }
    }
    
    func finishTransaction(params: NitroFinishTransactionParams) throws -> Promise<Variant_Bool_NitroPurchaseResult> {
        return Promise.async {
            // iOS implementation
            guard let iosParams = params.ios else {
                // No iOS params, return success
                return .first(true)
            }
            
            try self.ensureConnection()
            
            // Find the transaction
            for await verification in Transaction.all {
                switch verification {
                case .verified(let transaction):
                    if String(transaction.id) == iosParams.transactionId {
                        await transaction.finish()
                        return .first(true)
                    }
                case .unverified:
                    continue
                }
            }
            
            let errorJson = ErrorUtils.createErrorJson(
                code: IapErrorCode.itemUnavailable,
                message: "Transaction not found: \(iosParams.transactionId)"
            )
            throw NSError(domain: "RnIap", code: 0, userInfo: [NSLocalizedDescriptionKey: errorJson])
        }
    }
    
    func validateReceipt(params: NitroReceiptValidationParams) throws -> Promise<Variant_NitroReceiptValidationResultIOS_NitroReceiptValidationResultAndroid> {
        return Promise.async {
            do {
                // Get the app receipt data
                guard let receiptURL = Bundle.main.appStoreReceiptURL,
                      let receiptData = try? Data(contentsOf: receiptURL) else {
                    let errorJson = ErrorUtils.createErrorJson(
                        code: IapErrorCode.receiptFailed,
                        message: "App receipt not found or could not be read"
                    )
                    throw NSError(domain: "RnIap", code: -1, userInfo: [NSLocalizedDescriptionKey: errorJson])
                }
                
                let receiptDataBase64 = receiptData.base64EncodedString()
                
                // For StoreKit 2, we can use Transaction.currentEntitlements or Transaction.all
                // to get the latest transaction for the specified SKU
                var latestTransaction: NitroPurchase? = nil
                
                // Find the latest transaction for the specified SKU
                for await verificationResult in Transaction.currentEntitlements {
                        switch verificationResult {
                        case .verified(let transaction):
                            if transaction.productID == params.sku {
                                // Fetch the product details for this transaction
                                if let products = try? await StoreKit.Product.products(for: [transaction.productID]),
                                   let product = products.first {
                                    latestTransaction = self.convertToNitroPurchase(transaction, product: product, jwsRepresentation: nil)
                                }
                                break
                            }
                        case .unverified(_, let verificationError):
                            // Handle unverified transactions if needed
                            print("Unverified transaction for SKU \(params.sku): \(verificationError)")
                        }
                    }
                
                // For StoreKit 2, the receipt is always considered valid if we can read it
                // and the transaction verification passed
                let isValid = latestTransaction != nil
                
                // Generate JWS representation (simplified for now)
                let jwsRepresentation = receiptDataBase64 // In a real implementation, this would be the actual JWS
                
                let result = NitroReceiptValidationResultIOS(
                    isValid: isValid,
                    receiptData: receiptDataBase64,
                    jwsRepresentation: jwsRepresentation,
                    latestTransaction: latestTransaction
                )
                return Variant_NitroReceiptValidationResultIOS_NitroReceiptValidationResultAndroid.first(result)
                
            } catch {
                let errorJson = ErrorUtils.createErrorJson(
                    code: IapErrorCode.receiptFailed,
                    message: "Receipt validation failed: \(error.localizedDescription)"
                )
                throw NSError(domain: "RnIap", code: -1, userInfo: [NSLocalizedDescriptionKey: errorJson])
            }
        }
    }
    
    // MARK: - iOS-specific Public Methods
    
    func getStorefrontIOS() throws -> Promise<String> {
        return Promise.async {
            // Get the current storefront from StoreKit 2
            if let storefront = await Storefront.current {
                // Return the country code (e.g., "USA", "GBR", "KOR")
                return storefront.countryCode
            } else {
                // If no storefront is available, throw an error
                let errorJson = ErrorUtils.createErrorJson(
                    code: IapErrorCode.unknown,
                    message: "Unable to retrieve storefront information"
                )
                throw NSError(domain: "RnIap", code: -1, userInfo: [NSLocalizedDescriptionKey: errorJson])
            }
        }
    }
    
    func getAppTransactionIOS() throws -> Promise<String?> {
        return Promise.async {
            if #available(iOS 16.0, *) {
                #if compiler(>=5.7)
                let verificationResult = try await AppTransaction.shared
                
                let appTransaction: AppTransaction
                switch verificationResult {
                case .verified(let verified):
                    appTransaction = verified
                case .unverified(_, _):
                    return nil
                }
                
                var result: [String: Any?] = [
                    "bundleId": appTransaction.bundleID,
                    "appVersion": appTransaction.appVersion,
                    "originalAppVersion": appTransaction.originalAppVersion,
                    "originalPurchaseDate": appTransaction.originalPurchaseDate.timeIntervalSince1970 * 1000,
                    "deviceVerification": appTransaction.deviceVerification.base64EncodedString(),
                    "deviceVerificationNonce": appTransaction.deviceVerificationNonce.uuidString,
                    "environment": appTransaction.environment.rawValue,
                    "signedDate": appTransaction.signedDate.timeIntervalSince1970 * 1000,
                    "appId": appTransaction.appID,
                    "appVersionId": appTransaction.appVersionID,
                    "preorderDate": appTransaction.preorderDate.map { $0.timeIntervalSince1970 * 1000 }
                ]
                
                // iOS 18.4+ properties - only compile with Xcode 16.4+ (Swift 6.1+)
                // This prevents build failures on Xcode 16.3 and below
                #if swift(>=6.1)
                if #available(iOS 18.4, *) {
                    result["appTransactionId"] = appTransaction.appTransactionID
                    result["originalPlatform"] = appTransaction.originalPlatform.rawValue
                }
                #endif
                
                // Convert dictionary to JSON string
                let jsonData = try JSONSerialization.data(withJSONObject: result, options: [])
                return String(data: jsonData, encoding: .utf8)
                #else
                let errorJson = ErrorUtils.createErrorJson(
                    code: IapErrorCode.unknown,
                    message: "getAppTransaction requires Xcode 15.0+ with iOS 16.0 SDK for compilation"
                )
                throw NSError(domain: "RnIap", code: -1, userInfo: [NSLocalizedDescriptionKey: errorJson])
                #endif
            } else {
                let errorJson = ErrorUtils.createErrorJson(
                    code: IapErrorCode.unknown,
                    message: "getAppTransaction requires iOS 16.0 or later"
                )
                throw NSError(domain: "RnIap", code: -1, userInfo: [NSLocalizedDescriptionKey: errorJson])
            }
        }
    }
    
    func requestPromotedProductIOS() throws -> Promise<NitroProduct?> {
        return Promise.async {
            // Return the stored promoted product if available
            if let product = self.promotedProduct {
                // Convert Product to NitroProduct
                return self.convertProductToNitroProduct(product, type: "inapp")
            } else if let skProduct = self.promotedSKProduct {
                // Convert SKProduct to NitroProduct (backward compatibility)
                // First get the StoreKit 2 Product
                if let products = try? await StoreKit.Product.products(for: [skProduct.productIdentifier]),
                   let product = products.first {
                    return self.convertProductToNitroProduct(product, type: "inapp")
                }
            }
            return nil
        }
    }
    
    func buyPromotedProductIOS() throws -> Promise<Void> {
        return Promise.async {
            // Check if we have a promoted payment to process
            guard let payment = self.promotedPayment else {
                let errorJson = ErrorUtils.createErrorJson(
                    code: IapErrorCode.itemUnavailable,
                    message: "No promoted product available"
                )
                throw NSError(domain: "RnIap", code: -1, userInfo: [NSLocalizedDescriptionKey: errorJson])
            }
            
            // Add the deferred payment to the queue
            SKPaymentQueue.default().add(payment)
            
            // Clear the promoted product data
            self.promotedPayment = nil
            self.promotedProduct = nil
        }
    }
    
    func presentCodeRedemptionSheetIOS() throws -> Promise<Bool> {
        return Promise.async {
            // Present the App Store's code redemption sheet
            #if !targetEnvironment(simulator)
            await MainActor.run {
                SKPaymentQueue.default().presentCodeRedemptionSheet()
            }
            return true
            #else
            // Not available on simulator
            let errorJson = ErrorUtils.createErrorJson(
                code: IapErrorCode.itemUnavailable,
                message: "Code redemption sheet is not available on simulator"
            )
            throw NSError(domain: "RnIap", code: -1, userInfo: [NSLocalizedDescriptionKey: errorJson])
            #endif
        }
    }
    
    func clearTransactionIOS() throws -> Promise<Void> {
        return Promise.async {
            // Clear all unfinished transactions
            for await result in Transaction.unfinished {
                do {
                    let transaction = try self.checkVerified(result)
                    await transaction.finish()
                    self.transactions.removeValue(forKey: String(transaction.id))
                } catch {
                    print("Failed to finish transaction: \(error.localizedDescription)")
                }
            }
        }
    }
    
    // Additional iOS-only functions for feature parity with expo-iap
    
    func subscriptionStatusIOS(sku: String) throws -> Promise<[NitroSubscriptionStatus]?> {
        return Promise.async {
            try self.ensureConnection()
            
            // Get the product from the store
            guard let products = try? await StoreKit.Product.products(for: [sku]),
                  let product = products.first,
                  let subscription = product.subscription else {
                return []
            }
            
            // Get subscription status
            let statuses = try await subscription.status
            
            return statuses.map { status in
                // Get renewal info if available
                var renewalInfo: NitroSubscriptionRenewalInfo? = nil
                switch status.renewalInfo {
                case .verified(let info):
                    renewalInfo = NitroSubscriptionRenewalInfo(
                        autoRenewStatus: info.willAutoRenew,
                        autoRenewPreference: info.autoRenewPreference,
                        expirationReason: info.expirationReason.map { Double($0.rawValue) },
                        gracePeriodExpirationDate: info.gracePeriodExpirationDate?.timeIntervalSince1970,
                        currentProductID: info.currentProductID,
                        platform: "ios"
                    )
                case .unverified:
                    renewalInfo = nil
                }
                
                return NitroSubscriptionStatus(
                    state: Double(status.state.rawValue),
                    platform: "ios",
                    renewalInfo: renewalInfo
                )
            }
        }
    }
    
    func currentEntitlementIOS(sku: String) throws -> Promise<NitroPurchase?> {
        return Promise.async {
            try self.ensureConnection()
            
            // Get the product from the store
            guard let products = try? await StoreKit.Product.products(for: [sku]),
                  let product = products.first else {
                let errorJson = ErrorUtils.createErrorJson(
                    code: IapErrorCode.itemUnavailable,
                    message: "Can't find product for sku \(sku)"
                )
                throw NSError(domain: "RnIap", code: -1, userInfo: [NSLocalizedDescriptionKey: errorJson])
            }
            
            // Get current entitlement
            guard let entitlement = await product.currentEntitlement else {
                let errorJson = ErrorUtils.createErrorJson(
                    code: IapErrorCode.itemUnavailable,
                    message: "Can't find entitlement for sku \(sku)"
                )
                throw NSError(domain: "RnIap", code: -1, userInfo: [NSLocalizedDescriptionKey: errorJson])
            }
            
            switch entitlement {
            case .verified(let transaction):
                return self.convertToNitroPurchase(transaction, product: product, jwsRepresentation: entitlement.jwsRepresentation)
            case .unverified:
                let errorJson = ErrorUtils.createErrorJson(
                    code: IapErrorCode.transactionValidationFailed,
                    message: "Failed to verify transaction for sku \(sku)"
                )
                throw NSError(domain: "RnIap", code: -1, userInfo: [NSLocalizedDescriptionKey: errorJson])
            }
        }
    }
    
    func latestTransactionIOS(sku: String) throws -> Promise<NitroPurchase?> {
        return Promise.async {
            try self.ensureConnection()
            
            // Get the product from the store
            guard let products = try? await StoreKit.Product.products(for: [sku]),
                  let product = products.first else {
                let errorJson = ErrorUtils.createErrorJson(
                    code: IapErrorCode.itemUnavailable,
                    message: "Can't find product for sku \(sku)"
                )
                throw NSError(domain: "RnIap", code: -1, userInfo: [NSLocalizedDescriptionKey: errorJson])
            }
            
            // Get latest transaction
            guard let latestTransaction = await product.latestTransaction else {
                let errorJson = ErrorUtils.createErrorJson(
                    code: IapErrorCode.itemUnavailable,
                    message: "Can't find latest transaction for sku \(sku)"
                )
                throw NSError(domain: "RnIap", code: -1, userInfo: [NSLocalizedDescriptionKey: errorJson])
            }
            
            switch latestTransaction {
            case .verified(let transaction):
                return self.convertToNitroPurchase(transaction, product: product, jwsRepresentation: latestTransaction.jwsRepresentation)
            case .unverified:
                let errorJson = ErrorUtils.createErrorJson(
                    code: IapErrorCode.transactionValidationFailed,
                    message: "Failed to verify transaction for sku \(sku)"
                )
                throw NSError(domain: "RnIap", code: -1, userInfo: [NSLocalizedDescriptionKey: errorJson])
            }
        }
    }
    
    func getPendingTransactionsIOS() throws -> Promise<[NitroPurchase]> {
        return Promise.async {
            // Return the transactions we're currently tracking
            var pendingPurchases: [NitroPurchase] = []
            
            for (_, transaction) in self.transactions {
                // Get product info for each transaction
                if let products = try? await StoreKit.Product.products(for: [transaction.productID]),
                   let product = products.first {
                    pendingPurchases.append(self.convertToNitroPurchase(transaction, product: product))
                }
            }
            
            return pendingPurchases
        }
    }
    
    func syncIOS() throws -> Promise<Bool> {
        return Promise.async {
            do {
                // Sync with the App Store
                try await AppStore.sync()
                return true
            } catch {
                let errorJson = ErrorUtils.createErrorJson(
                    code: IapErrorCode.syncError,
                    message: "Error synchronizing with the AppStore: \(error.localizedDescription)"
                )
                throw NSError(domain: "RnIap", code: -1, userInfo: [NSLocalizedDescriptionKey: errorJson])
            }
        }
    }
    
    func showManageSubscriptionsIOS() throws -> Promise<Bool> {
        return Promise.async {
            #if !os(tvOS)
            // Get the active window scene
            guard let windowScene = await MainActor.run(body: { 
                UIApplication.shared.connectedScenes
                    .compactMap({ $0 as? UIWindowScene })
                    .first(where: { $0.activationState == .foregroundActive })
            }) else {
                let errorJson = ErrorUtils.createErrorJson(
                    code: IapErrorCode.serviceError,
                    message: "Cannot find active window scene"
                )
                throw NSError(domain: "RnIap", code: -1, userInfo: [NSLocalizedDescriptionKey: errorJson])
            }
            
            // Show the subscription management UI
            try await AppStore.showManageSubscriptions(in: windowScene)
            return true
            #else
            let errorJson = ErrorUtils.createErrorJson(
                code: IapErrorCode.itemUnavailable,
                message: "This method is not available on tvOS"
            )
            throw NSError(domain: "RnIap", code: -1, userInfo: [NSLocalizedDescriptionKey: errorJson])
            #endif
        }
    }
    
    func isEligibleForIntroOfferIOS(groupID: String) throws -> Promise<Bool> {
        return Promise.async {
            return await Product.SubscriptionInfo.isEligibleForIntroOffer(for: groupID)
        }
    }
    
    func getReceiptDataIOS() throws -> Promise<String> {
        return Promise.async {
            if let appStoreReceiptURL = Bundle.main.appStoreReceiptURL,
               FileManager.default.fileExists(atPath: appStoreReceiptURL.path) {
                do {
                    let receiptData = try Data(contentsOf: appStoreReceiptURL, options: .alwaysMapped)
                    return receiptData.base64EncodedString(options: [])
                } catch {
                    let errorJson = ErrorUtils.createErrorJson(
                        code: IapErrorCode.receiptFailed,
                        message: "Error reading receipt data: \(error.localizedDescription)"
                    )
                    throw NSError(domain: "RnIap", code: -1, userInfo: [NSLocalizedDescriptionKey: errorJson])
                }
            } else {
                let errorJson = ErrorUtils.createErrorJson(
                    code: IapErrorCode.receiptFailed,
                    message: "App Store receipt not found"
                )
                throw NSError(domain: "RnIap", code: -1, userInfo: [NSLocalizedDescriptionKey: errorJson])
            }
        }
    }
    
    func isTransactionVerifiedIOS(sku: String) throws -> Promise<Bool> {
        return Promise.async {
            try self.ensureConnection()
            
            // Get the product from the store
            guard let products = try? await StoreKit.Product.products(for: [sku]),
                  let product = products.first,
                  let result = await product.latestTransaction else {
                return false
            }
            
            // Check if transaction is verified
            switch result {
            case .verified:
                return true
            case .unverified:
                return false
            }
        }
    }
    
    func getTransactionJwsIOS(sku: String) throws -> Promise<String?> {
        return Promise.async {
            try self.ensureConnection()
            
            // Get the product from the store
            guard let products = try? await StoreKit.Product.products(for: [sku]),
                  let product = products.first,
                  let result = await product.latestTransaction else {
                let errorJson = ErrorUtils.createErrorJson(
                    code: IapErrorCode.itemUnavailable,
                    message: "Can't find transaction for sku \(sku)"
                )
                throw NSError(domain: "RnIap", code: -1, userInfo: [NSLocalizedDescriptionKey: errorJson])
            }
            
            return result.jwsRepresentation
        }
    }
    
    func beginRefundRequestIOS(sku: String) throws -> Promise<String?> {
        return Promise.async {
            #if !os(tvOS)
            if #available(macOS 12.0, *) {
                // Find the latest transaction for the SKU
                var latestTransaction: Transaction? = nil
                
                for await result in Transaction.currentEntitlements {
                    switch result {
                    case .verified(let transaction):
                        if transaction.productID == sku {
                            latestTransaction = transaction
                            break
                        }
                    case .unverified(_, _):
                        continue
                    }
                }
                
                guard let transaction = latestTransaction else {
                    let errorJson = ErrorUtils.createErrorJson(
                        code: IapErrorCode.itemUnavailable,
                        message: "Can't find transaction for SKU \(sku)"
                    )
                    throw NSError(domain: "RnIap", code: -1, userInfo: [NSLocalizedDescriptionKey: errorJson])
                }
                
                // Begin refund request
                do {
                    // Get the active window scene
                    guard let windowScene = await MainActor.run(body: {
                        UIApplication.shared.connectedScenes
                            .compactMap({ $0 as? UIWindowScene })
                            .first(where: { $0.activationState == .foregroundActive })
                    }) else {
                        let errorJson = ErrorUtils.createErrorJson(
                            code: IapErrorCode.serviceError,
                            message: "Cannot find active window scene"
                        )
                        throw NSError(domain: "RnIap", code: -1, userInfo: [NSLocalizedDescriptionKey: errorJson])
                    }
                    
                    let refundStatus = try await transaction.beginRefundRequest(in: windowScene)
                    
                    // Convert refund status to string
                    switch refundStatus {
                    case .success:
                        return "success"
                    case .userCancelled:
                        return "userCancelled"
                    @unknown default:
                        return "unknown"
                    }
                } catch {
                    let errorJson = ErrorUtils.createErrorJson(
                        code: IapErrorCode.serviceError,
                        message: "Failed to begin refund request: \(error.localizedDescription)"
                    )
                    throw NSError(domain: "RnIap", code: -1, userInfo: [NSLocalizedDescriptionKey: errorJson])
                }
            } else {
                // Refund request is only available on iOS 15+
                let errorJson = ErrorUtils.createErrorJson(
                    code: IapErrorCode.itemUnavailable,
                    message: "Refund request requires iOS 15.0 or later"
                )
                throw NSError(domain: "RnIap", code: -1, userInfo: [NSLocalizedDescriptionKey: errorJson])
            }
            #else
            // Not available on tvOS
            let errorJson = ErrorUtils.createErrorJson(
                code: IapErrorCode.itemUnavailable,
                message: "Refund request is not available on tvOS"
            )
            throw NSError(domain: "RnIap", code: -1, userInfo: [NSLocalizedDescriptionKey: errorJson])
            #endif
        }
    }
    
    func addPromotedProductListenerIOS(listener: @escaping (NitroProduct) -> Void) throws {
        promotedProductListeners.append(listener)
        
        // If we already have a promoted product, notify the new listener immediately
        if let product = promotedProduct {
            let nitroProduct = convertProductToNitroProduct(product, type: "inapp")
            listener(nitroProduct)
        }
    }
    
    func removePromotedProductListenerIOS(listener: @escaping (NitroProduct) -> Void) throws {
        // Note: In Swift, comparing closures is not straightforward, so we'll clear all listeners
        // In a real implementation, you might want to use a unique identifier for each listener
        promotedProductListeners.removeAll()
    }
    
    // MARK: - Event Listener Methods
    
    func addPurchaseUpdatedListener(listener: @escaping (NitroPurchase) -> Void) throws {
        purchaseUpdatedListeners.append(listener)
    }
    
    func addPurchaseErrorListener(listener: @escaping (NitroPurchaseResult) -> Void) throws {
        purchaseErrorListeners.append(listener)
    }
    
    func removePurchaseUpdatedListener(listener: @escaping (NitroPurchase) -> Void) throws {
        // Note: This is a limitation of Swift closures - we can't easily remove by reference
        // For now, we'll just clear all listeners when requested
        purchaseUpdatedListeners.removeAll()
    }
    
    func removePurchaseErrorListener(listener: @escaping (NitroPurchaseResult) -> Void) throws {
        // Note: This is a limitation of Swift closures - we can't easily remove by reference
        // For now, we'll just clear all listeners when requested
        purchaseErrorListeners.removeAll()
    }
    
    // MARK: - Private Helper Methods
    
    private func purchaseProduct(
        _ product: Product,
        sku: String,
        andDangerouslyFinishTransactionAutomatically: Bool,
        appAccountToken: String?,
        quantity: Double?,
        withOffer: [String: String]?
    ) async throws -> NitroPurchase {
        // Prepare purchase options
        var options: Set<Product.PurchaseOption> = []
        
        // Add quantity if specified
        if let quantity = quantity, quantity > 0 {
            options.insert(.quantity(Int(quantity)))
        }
        
        // Add promotional offer if provided
        if let offerID = withOffer?["identifier"],
           let keyID = withOffer?["keyIdentifier"],
           let nonce = withOffer?["nonce"],
           let signature = withOffer?["signature"],
           let timestamp = withOffer?["timestamp"],
           let uuidNonce = UUID(uuidString: nonce),
           let signatureData = Data(base64Encoded: signature),
           let timestampInt = Int(timestamp) {
            options.insert(
                .promotionalOffer(
                    offerID: offerID,
                    keyID: keyID,
                    nonce: uuidNonce,
                    signature: signatureData,
                    timestamp: timestampInt
                )
            )
        }
        
        // Add app account token if provided
        if let appAccountToken = appAccountToken,
           let appAccountUUID = UUID(uuidString: appAccountToken) {
            options.insert(.appAccountToken(appAccountUUID))
        }
        
        // Get window scene for iOS 17+ purchase confirmation
        let windowScene = await currentWindowScene()
        
        // Perform the purchase
        let result: Product.PurchaseResult
        #if swift(>=5.9)
            if #available(iOS 17.0, tvOS 17.0, *) {
                if let windowScene = windowScene {
                    result = try await product.purchase(confirmIn: windowScene, options: options)
                } else {
                    result = try await product.purchase(options: options)
                }
            } else {
                #if !os(visionOS)
                    result = try await product.purchase(options: options)
                #endif
            }
        #elseif !os(visionOS)
            result = try await product.purchase(options: options)
        #endif
        
        switch result {
        case .success(let verification):
            let transaction = try checkVerified(verification)
            
            // Store transaction if not auto-finishing
            if !andDangerouslyFinishTransactionAutomatically {
                self.transactions[String(transaction.id)] = transaction
            }
            
            // Get JWS representation
            let jwsRepresentation = verification.jwsRepresentation
            
            // Create purchase object
            let purchase = self.convertToNitroPurchase(
                transaction,
                product: product,
                jwsRepresentation: jwsRepresentation
            )
            
            // Finish transaction if requested
            if andDangerouslyFinishTransactionAutomatically {
                await transaction.finish()
            }
            
            return purchase
            
        case .userCancelled:
            let errorJson = ErrorUtils.createErrorJson(
                code: IapErrorCode.userCancelled,
                message: "User cancelled the purchase",
                productId: sku
            )
            throw NSError(domain: "RnIap", code: 1, userInfo: [NSLocalizedDescriptionKey: errorJson])
            
        case .pending:
            let errorJson = ErrorUtils.createErrorJson(
                code: IapErrorCode.deferredPayment,
                message: "The payment was deferred",
                productId: sku
            )
            throw NSError(domain: "RnIap", code: 2, userInfo: [NSLocalizedDescriptionKey: errorJson])
            
        @unknown default:
            let errorJson = ErrorUtils.createErrorJson(
                code: IapErrorCode.unknown,
                message: "Unknown purchase result",
                productId: sku
            )
            throw NSError(domain: "RnIap", code: 0, userInfo: [NSLocalizedDescriptionKey: errorJson])
        }
    }
    
    private func purchaseProductWithEvents(
        _ product: Product,
        sku: String,
        andDangerouslyFinishTransactionAutomatically: Bool,
        appAccountToken: String?,
        quantity: Double?,
        withOffer: [String: String]?
    ) async throws {
        // Prepare purchase options
        var options: Set<Product.PurchaseOption> = []
        
        // Add quantity if specified
        if let quantity = quantity, quantity > 0 {
            options.insert(.quantity(Int(quantity)))
        }
        
        // Add promotional offer if provided
        if let offerID = withOffer?["identifier"],
           let keyID = withOffer?["keyIdentifier"],
           let nonce = withOffer?["nonce"],
           let signature = withOffer?["signature"],
           let timestamp = withOffer?["timestamp"],
           let uuidNonce = UUID(uuidString: nonce),
           let signatureData = Data(base64Encoded: signature),
           let timestampInt = Int(timestamp) {
            options.insert(
                .promotionalOffer(
                    offerID: offerID,
                    keyID: keyID,
                    nonce: uuidNonce,
                    signature: signatureData,
                    timestamp: timestampInt
                )
            )
        }
        
        // Add app account token if provided
        if let appAccountToken = appAccountToken,
           let appAccountUUID = UUID(uuidString: appAccountToken) {
            options.insert(.appAccountToken(appAccountUUID))
        }
        
        // Get window scene for iOS 17+ purchase confirmation
        let windowScene = await currentWindowScene()
        
        // Perform the purchase
        let result: Product.PurchaseResult
        #if swift(>=5.9)
            if #available(iOS 17.0, tvOS 17.0, *) {
                if let windowScene = windowScene {
                    result = try await product.purchase(confirmIn: windowScene, options: options)
                } else {
                    result = try await product.purchase(options: options)
                }
            } else {
                #if !os(visionOS)
                    result = try await product.purchase(options: options)
                #endif
            }
        #elseif !os(visionOS)
            result = try await product.purchase(options: options)
        #endif
        
        switch result {
        case .success(let verification):
            let transaction = try checkVerified(verification)
            
            // Store transaction if not auto-finishing
            if !andDangerouslyFinishTransactionAutomatically {
                self.transactions[String(transaction.id)] = transaction
            }
            
            // Get JWS representation
            let jwsRepresentation = verification.jwsRepresentation
            
            // Create purchase object
            let purchase = self.convertToNitroPurchase(
                transaction,
                product: product,
                jwsRepresentation: jwsRepresentation
            )
            
            // Finish transaction if requested
            if andDangerouslyFinishTransactionAutomatically {
                await transaction.finish()
            }
            
            // Send purchase update event
            self.sendPurchaseUpdate(purchase)
            
        case .userCancelled:
            let error = self.createPurchaseErrorResult(
                code: IapErrorCode.userCancelled,
                message: "User cancelled the purchase",
                productId: sku
            )
            self.sendPurchaseError(error)
            
        case .pending:
            let error = self.createPurchaseErrorResult(
                code: IapErrorCode.deferredPayment,
                message: "The payment was deferred",
                productId: sku
            )
            self.sendPurchaseError(error)
            
        @unknown default:
            let error = self.createPurchaseErrorResult(
                code: IapErrorCode.unknown,
                message: "Unknown purchase result",
                productId: sku
            )
            self.sendPurchaseError(error)
        }
    }
    
    private func checkVerified<T>(_ result: VerificationResult<T>) throws -> T {
        switch result {
        case .verified(let safe):
            return safe
        case .unverified(_, let error):
            let errorJson = ErrorUtils.createErrorJson(
                code: IapErrorCode.transactionValidationFailed,
                message: "Transaction verification failed: \(error)",
                underlyingError: error
            )
            throw NSError(domain: "RnIap", code: -1, userInfo: [NSLocalizedDescriptionKey: errorJson])
        }
    }
    
    private func ensureConnection() throws {
        guard isInitialized else {
            let errorJson = ErrorUtils.createErrorJson(
                code: IapErrorCode.notPrepared,
                message: "Connection not initialized. Call initConnection() first."
            )
            throw NSError(domain: "RnIap", code: -1, userInfo: [NSLocalizedDescriptionKey: errorJson])
        }
        
        guard SKPaymentQueue.canMakePayments() else {
            let errorJson = ErrorUtils.createErrorJson(
                code: IapErrorCode.iapNotAvailable,
                message: "In-app purchases are not available on this device"
            )
            throw NSError(domain: "RnIap", code: -1, userInfo: [NSLocalizedDescriptionKey: errorJson])
        }
    }
    
    @MainActor
    private func currentWindowScene() async -> UIWindowScene? {
        #if os(iOS) || os(tvOS)
            // Find the active window scene
            for scene in UIApplication.shared.connectedScenes {
                if let windowScene = scene as? UIWindowScene,
                   windowScene.activationState == .foregroundActive {
                    return windowScene
                }
            }
            
            // Fallback to first window scene if no active one found
            for scene in UIApplication.shared.connectedScenes {
                if let windowScene = scene as? UIWindowScene {
                    return windowScene
                }
            }
        #endif
        return nil
    }
    
    private func convertToNitroProduct(_ storeProduct: StoreKit.Product, type: String) -> NitroProduct {
        var product = NitroProduct()
        
        // Basic fields
        product.id = storeProduct.id
        product.title = storeProduct.displayName
        product.description = storeProduct.description
        product.type = type
        product.displayName = storeProduct.displayName
        product.displayPrice = storeProduct.displayPrice
        product.platform = "ios"
        
        // Price and currency - priceFormatStyle.currencyCode is not optional
        product.currency = storeProduct.priceFormatStyle.currencyCode
        
        // Convert Decimal price to Double - price is not optional
        product.price = NSDecimalNumber(decimal: storeProduct.price).doubleValue
        
        // iOS specific fields
        product.isFamilyShareable = storeProduct.isFamilyShareable
        product.jsonRepresentation = storeProduct.jsonRepresentation.base64EncodedString()
        
        // Subscription information
        if let subscription = storeProduct.subscription {
            // Subscription period - value is Int, need to convert to Double
            product.subscriptionPeriodUnitIOS = getPeriodString(subscription.subscriptionPeriod.unit)
            product.subscriptionPeriodNumberIOS = Double(subscription.subscriptionPeriod.value)
            
            // Introductory offer
            if let introOffer = subscription.introductoryOffer {
                product.introductoryPriceIOS = introOffer.displayPrice
                product.introductoryPriceAsAmountIOS = NSDecimalNumber(decimal: introOffer.price).doubleValue
                product.introductoryPricePaymentModeIOS = String(introOffer.paymentMode.rawValue)
                product.introductoryPriceNumberOfPeriodsIOS = Double(introOffer.periodCount)
                product.introductoryPriceSubscriptionPeriodIOS = getPeriodString(introOffer.period.unit)
            }
        }
        
        return product
    }
    
    private func convertProductToNitroProduct(_ product: Product, type: String) -> NitroProduct {
        return convertToNitroProduct(product, type: type)
    }
    
    private func getPeriodString(_ unit: StoreKit.Product.SubscriptionPeriod.Unit) -> String {
        switch unit {
        case .day: return "DAY"
        case .week: return "WEEK"
        case .month: return "MONTH"
        case .year: return "YEAR"
        @unknown default: return ""
        }
    }
    
    private func convertToNitroPurchase(_ transaction: Transaction, product: StoreKit.Product, jwsRepresentation: String? = nil) -> NitroPurchase {
        var purchase = NitroPurchase()
        
        // Basic fields
        purchase.id = String(transaction.id)
        purchase.productId = transaction.productID
        purchase.transactionDate = transaction.purchaseDate.timeIntervalSince1970 * 1000 // Convert to milliseconds
        purchase.platform = "ios"
        
        // iOS specific fields
        purchase.quantityIOS = Double(transaction.purchasedQuantity)
        
        // originalID is not optional in StoreKit 2
        purchase.originalTransactionIdentifierIOS = String(transaction.originalID)
        
        // originalPurchaseDate is not optional
        purchase.originalTransactionDateIOS = transaction.originalPurchaseDate.timeIntervalSince1970 * 1000
        
        if let appAccountToken = transaction.appAccountToken {
            purchase.appAccountToken = appAccountToken.uuidString
        }
        
        // Store the JWS representation as purchaseToken for verification
        // JWS is passed from VerificationResult
        if let jws = jwsRepresentation {
            purchase.purchaseToken = jws
        }
        
        return purchase
    }
    
    private func sendPurchaseUpdate(_ purchase: NitroPurchase) {
        for listener in purchaseUpdatedListeners {
            listener(purchase)
        }
    }
    
    private func sendPurchaseError(_ error: NitroPurchaseResult) {
        for listener in purchaseErrorListeners {
            listener(error)
        }
    }
    
    private func createPurchaseErrorResult(code: String, message: String, productId: String? = nil) -> NitroPurchaseResult {
        var result = NitroPurchaseResult()
        result.responseCode = 0
        result.code = code
        result.message = message
        result.purchaseToken = productId
        return result
    }
    
    private func cleanupExistingState() {
        // Cancel transaction listener if any
        updateListenerTask?.cancel()
        updateListenerTask = nil
        isInitialized = false
        productStore = nil
        transactions.removeAll()
        
        // Remove payment observer if exists
        if let observer = paymentObserver {
            SKPaymentQueue.default().remove(observer)
            paymentObserver = nil
        }
        
        // Clear promoted products
        promotedProduct = nil
        promotedPayment = nil
        promotedSKProduct = nil
        
        // Clear event listeners
        purchaseUpdatedListeners.removeAll()
        purchaseErrorListeners.removeAll()
        promotedProductListeners.removeAll()
    }
    
    // Method called by PaymentObserver when a promoted product is received
    func handlePromotedProduct(payment: SKPayment, product: SKProduct) {
        self.promotedPayment = payment
        self.promotedSKProduct = product
        
        // Convert SKProduct to StoreKit 2 Product and then to NitroProduct
        Task {
            if let products = try? await StoreKit.Product.products(for: [product.productIdentifier]),
               let storeKit2Product = products.first {
                self.promotedProduct = storeKit2Product
                
                // Notify all promoted product listeners
                let nitroProduct = self.convertProductToNitroProduct(storeKit2Product, type: "inapp")
                for listener in self.promotedProductListeners {
                    listener(nitroProduct)
                }
            }
        }
    }
}

// PaymentObserver for handling promoted products
@available(iOS 15.0, *)
class PaymentObserver: NSObject, SKPaymentTransactionObserver {
    weak var iapModule: HybridRnIap?
    
    init(iapModule: HybridRnIap) {
        self.iapModule = iapModule
    }
    
    // Required by SKPaymentTransactionObserver protocol but not used
    func paymentQueue(_ queue: SKPaymentQueue, updatedTransactions transactions: [SKPaymentTransaction]) {
        // We don't handle transactions here as StoreKit 2 handles them in HybridRnIap
    }
    
    // Handle promoted products from App Store
    func paymentQueue(_ queue: SKPaymentQueue, shouldAddStorePayment payment: SKPayment, for product: SKProduct) -> Bool {
        iapModule?.handlePromotedProduct(payment: payment, product: product)
        // Return false to defer the payment
        return false
    }
}
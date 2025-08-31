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
    
    // Event listeners
    private var purchaseUpdatedListeners: [(NitroPurchase) -> Void] = []
    private var purchaseErrorListeners: [(NitroPurchaseResult) -> Void] = []
    
    // MARK: - Initialization
    
    override init() {
        super.init()
    }
    
    deinit {
        updateListenerTask?.cancel()
    }
    
    // MARK: - Connection methods
    
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
    
    // MARK: - Product methods
    
    func requestProducts(skus: [String], type: String) throws -> Promise<[NitroProduct]> {
        return Promise.async {
            do {
                try self.ensureConnection()
                print("[RnIap] requestProducts called with skus: \(skus), type: \(type)")
                
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
    
    // MARK: - Purchase methods (Unified)
    
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
    
    
    // MARK: - Available purchases methods (Unified)
    
    func getAvailablePurchases(options: NitroAvailablePurchasesOptions?) throws -> Promise<[NitroPurchase]> {
        return Promise.async {
            try self.ensureConnection()
            
            let alsoPublishToEventListener = options?.ios?.alsoPublishToEventListener ?? false
            let onlyIncludeActiveItems = options?.ios?.onlyIncludeActiveItems ?? false
            
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
    
    
    // MARK: - Transaction management methods (Unified)
    
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
        product.currency = storeProduct.priceFormatStyle.currencyCode ?? ""
        
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
    
    // MARK: - Promoted Product Listener Methods (iOS only)
    
    func addPromotedProductListenerIOS(listener: @escaping (NitroProduct) -> Void) throws {
        // iOS-specific promoted product listening implementation
        // For now, we'll store the listener but promoted products are handled through StoreKit's delegate methods
        print("[RnIap] Promoted product listener added for iOS")
    }
    
    func removePromotedProductListenerIOS(listener: @escaping (NitroProduct) -> Void) throws {
        // iOS-specific promoted product listener removal
        print("[RnIap] Promoted product listener removed for iOS")
    }
    
    // MARK: - Private Helper Methods for Events
    
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
    
    private func cleanupExistingState() {
        // Cancel transaction listener if any
        updateListenerTask?.cancel()
        updateListenerTask = nil
        isInitialized = false
        productStore = nil
        transactions.removeAll()
        
        // Clear event listeners
        purchaseUpdatedListeners.removeAll()
        purchaseErrorListeners.removeAll()
    }
}
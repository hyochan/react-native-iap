import Foundation
import NitroModules
import OpenIAP

@available(iOS 15.0, *)
class HybridRnIap: HybridRnIapSpec {
    // MARK: - Properties
    
    private var updateListenerTask: Task<Void, Never>?
    private var isInitialized: Bool = false
    private var isInitializing: Bool = false
    // No local StoreKit cache; rely on OpenIAP
    // OpenIAP event subscriptions
    private var purchaseUpdatedSub: Subscription?
    private var purchaseErrorSub: Subscription?
    private var promotedProductSub: Subscription?
    
    // Promoted products are handled via OpenIAP listener
    
    // Event listeners
    private var purchaseUpdatedListeners: [(NitroPurchase) -> Void] = []
    private var purchaseErrorListeners: [(NitroPurchaseResult) -> Void] = []
    private var promotedProductListeners: [(NitroProduct) -> Void] = []
    // Deduplication for purchase error events
    private var lastPurchaseErrorCode: String? = nil
    private var lastPurchaseErrorProductId: String? = nil
    private var lastPurchaseErrorTimestamp: TimeInterval = 0
    
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
            // If already initialized or initializing, ensure listeners are attached and return immediately
            if self.isInitialized || self.isInitializing {
                if self.purchaseUpdatedSub == nil {
                    self.purchaseUpdatedSub = OpenIapModule.shared.purchaseUpdatedListener { [weak self] openIapPurchase in
                        guard let self else { return }
                        Task { @MainActor in
                            let nitro = self.convertOpenIapPurchaseToNitroPurchase(openIapPurchase)
                            self.sendPurchaseUpdate(nitro)
                        }
                    }
                }
                if self.purchaseErrorSub == nil {
                    self.purchaseErrorSub = OpenIapModule.shared.purchaseErrorListener { [weak self] error in
                        guard let self else { return }
                        Task { @MainActor in
                            #if DEBUG
                            print("[HybridRnIap] purchaseError event: code=\(error.code), productId=\(error.productId ?? "-")")
                            #endif
                    let nitroError = self.createPurchaseErrorResult(
                        code: error.code,
                        message: error.message,
                        productId: error.productId
                    )
                    self.sendPurchaseError(nitroError, productId: error.productId)
                        }
                    }
                }
                if self.promotedProductSub == nil {
                    self.promotedProductSub = OpenIapModule.shared.promotedProductListenerIOS { [weak self] productId in
                        guard let self else { return }
                        Task {
                            do {
                                let req = OpenIapProductRequest(skus: [productId], type: "all")
                                let products = try await OpenIapModule.shared.fetchProducts(req)
                                if let p = products.first {
                                    let nitro = self.convertOpenIapProductToNitroProduct(p)
                                    await MainActor.run {
                                        for listener in self.promotedProductListeners { listener(nitro) }
                                    }
                                }
                            } catch {
                                let id = productId
                                await MainActor.run {
                                    var minimal = NitroProduct()
                                    minimal.id = id
                                    minimal.title = id
                                    minimal.type = "inapp"
                                    minimal.platform = "ios"
                                    for listener in self.promotedProductListeners { listener(minimal) }
                                    }
                                }
                            }
                        }
                    }
                return true
            }

            // Begin non-blocking initialization
            self.isInitializing = true
            // Pre-attach listeners so events are not missed
            if self.purchaseUpdatedSub == nil {
                self.purchaseUpdatedSub = OpenIapModule.shared.purchaseUpdatedListener { [weak self] openIapPurchase in
                    guard let self else { return }
                    Task { @MainActor in
                        let nitro = self.convertOpenIapPurchaseToNitroPurchase(openIapPurchase)
                        self.sendPurchaseUpdate(nitro)
                    }
                }
            }
            if self.purchaseErrorSub == nil {
                self.purchaseErrorSub = OpenIapModule.shared.purchaseErrorListener { [weak self] error in
                    guard let self else { return }
                    Task { @MainActor in
                        #if DEBUG
                        print("[HybridRnIap] purchaseError event: code=\(error.code), productId=\(error.productId ?? "-")")
                        #endif
                        let nitroError = self.createPurchaseErrorResult(
                            code: error.code,
                            message: error.message,
                            productId: error.productId
                        )
                        self.sendPurchaseError(nitroError, productId: error.productId)
                    }
                }
            }
            if self.promotedProductSub == nil {
                self.promotedProductSub = OpenIapModule.shared.promotedProductListenerIOS { [weak self] productId in
                    guard let self else { return }
                    Task {
                        do {
                            let req = OpenIapProductRequest(skus: [productId], type: "all")
                            let products = try await OpenIapModule.shared.fetchProducts(req)
                            if let p = products.first {
                                let nitro = self.convertOpenIapProductToNitroProduct(p)
                                await MainActor.run {
                                    for listener in self.promotedProductListeners { listener(nitro) }
                                }
                            }
                        } catch {
                            let id = productId
                            await MainActor.run {
                                var minimal = NitroProduct()
                                minimal.id = id
                                minimal.title = id
                                minimal.type = "inapp"
                                minimal.platform = "ios"
                                for listener in self.promotedProductListeners { listener(minimal) }
                            }
                        }
                    }
                }
            }

            // Perform initialization and only report success when native init succeeds
            do {
                let ok = try await OpenIapModule.shared.initConnection()
                self.isInitialized = ok
                self.isInitializing = false
                return ok
            } catch {
                // Surface as event and keep flags consistent
                let err = self.createPurchaseErrorResult(
                    code: OpenIapError.InitConnection,
                    message: error.localizedDescription,
                    productId: nil
                )
                self.sendPurchaseError(err, productId: nil)
                self.isInitialized = false
                self.isInitializing = false
                return false
            }
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
                // Prefer OpenIAP for fetching
                let req = OpenIapProductRequest(skus: skus, type: type)
                let products = try await OpenIapModule.shared.fetchProducts(req)
                return products.map { self.convertOpenIapProductToNitroProduct($0) }
            } catch {
                // Propagate OpenIAP error
                throw error
            }
        }
    }
    
    func requestPurchase(request: NitroPurchaseRequest) throws -> Promise<RequestPurchaseResult> {
        return Promise.async {
            let defaultResult = RequestPurchaseResult(purchase: nil, purchases: nil)
            guard let iosRequest = request.ios else {
                let error = self.createPurchaseErrorResult(
                    code: OpenIapError.UserError,
                    message: "No iOS request provided"
                )
                self.sendPurchaseError(error, productId: nil)
                return defaultResult
            }
            do {
                // Event-first behavior: don't reject Promise on connection issues
                guard self.isInitialized else {
                    #if DEBUG
                    print("[HybridRnIap] requestPurchase while not initialized; sending InitConnection")
                    #endif
                    let err = self.createPurchaseErrorResult(
                        code: OpenIapError.InitConnection,
                        message: "IAP store connection not initialized",
                        productId: iosRequest.sku
                    )
                    self.sendPurchaseError(err, productId: iosRequest.sku)
                    return defaultResult
                }
                // Delegate purchase to OpenIAP. It emits success/error events which we bridge above.
                let props = OpenIapRequestPurchaseProps(
                    sku: iosRequest.sku,
                    andDangerouslyFinishTransactionAutomatically: iosRequest.andDangerouslyFinishTransactionAutomatically,
                    appAccountToken: iosRequest.appAccountToken,
                    quantity: iosRequest.quantity != nil ? Int(iosRequest.quantity!) : nil,
                    withOffer: iosRequest.withOffer.flatMap { dict in
                        guard let id = dict["identifier"],
                              let key = dict["keyIdentifier"],
                              let nonce = dict["nonce"],
                              let sig = dict["signature"],
                              let ts = dict["timestamp"] else { return nil }
                        return OpenIapDiscountOffer(identifier: id, keyIdentifier: key, nonce: nonce, signature: sig, timestamp: ts)
                    }
                )
                _ = try await OpenIapModule.shared.requestPurchase(props)
                return defaultResult
            } catch {
                // Ensure an error reaches JS even if OpenIAP threw before emitting.
                // Use simple de-duplication window to avoid double-emitting.
                let err = self.createPurchaseErrorResult(
                    code: OpenIapError.ServiceError,
                    message: error.localizedDescription,
                    productId: iosRequest.sku
                )
                self.sendPurchaseErrorDedup(err, productId: iosRequest.sku)
                return defaultResult
            }
        }
    }
    
    func getAvailablePurchases(options: NitroAvailablePurchasesOptions?) throws -> Promise<[NitroPurchase]> {
        return Promise.async {
            try self.ensureConnection()
            do {
                let onlyActive = options?.ios?.onlyIncludeActiveItemsIOS ?? options?.ios?.onlyIncludeActiveItems ?? false
                let props = OpenIapPurchaseOptions(alsoPublishToEventListenerIOS: false, onlyIncludeActiveItemsIOS: onlyActive)
                let purchases = try await OpenIapModule.shared.getAvailablePurchases(props)
                return purchases.map { self.convertOpenIapPurchaseToNitroPurchase($0) }
            } catch {
                // Propagate OpenIAP error or map to network error
                throw OpenIapError.make(code: OpenIapError.NetworkError)
            }
        }
    }
    
    func finishTransaction(params: NitroFinishTransactionParams) throws -> Promise<Variant_Bool_NitroPurchaseResult> {
        return Promise.async {
            guard let iosParams = params.ios else { return .first(true) }
            try self.ensureConnection()
            do {
                let ok = try await OpenIapModule.shared.finishTransaction(transactionIdentifier: iosParams.transactionId)
                return .first(ok)
            } catch {
                let tid = iosParams.transactionId
                throw OpenIapError.make(code: OpenIapError.PurchaseError, message: "Transaction not found: \(tid)")
            }
        }
    }
    
    func validateReceipt(params: NitroReceiptValidationParams) throws -> Promise<Variant_NitroReceiptValidationResultIOS_NitroReceiptValidationResultAndroid> {
        return Promise.async {
            do {
                let result = try await OpenIapModule.shared.validateReceiptIOS(OpenIapReceiptValidationProps(sku: params.sku))
                var latest: NitroPurchase? = nil
                if let tx = result.latestTransaction {
                    latest = self.convertOpenIapPurchaseToNitroPurchase(tx)
                }
                let mapped = NitroReceiptValidationResultIOS(
                    isValid: result.isValid,
                    receiptData: result.receiptData,
                    jwsRepresentation: result.jwsRepresentation,
                    latestTransaction: latest
                )
                return .first(mapped)
            } catch {
                throw OpenIapError.make(code: OpenIapError.ReceiptFailed, message: error.localizedDescription)
            }
        }
    }
    
    // MARK: - iOS-specific Public Methods
    
    func getStorefrontIOS() throws -> Promise<String> {
        return Promise.async {
            do {
                return try await OpenIapModule.shared.getStorefrontIOS()
            } catch {
                throw OpenIapError.make(code: OpenIapError.ServiceError, message: error.localizedDescription)
            }
        }
    }
    
    func getAppTransactionIOS() throws -> Promise<String?> {
        return Promise.async {
            do {
                if #available(iOS 16.0, *) {
                    if let appTx = try await OpenIapModule.shared.getAppTransactionIOS() {
                        var result: [String: Any?] = [
                            "bundleId": appTx.bundleId,
                            "appVersion": appTx.appVersion,
                            "originalAppVersion": appTx.originalAppVersion,
                            "originalPurchaseDate": appTx.originalPurchaseDate.timeIntervalSince1970 * 1000,
                            "deviceVerification": appTx.deviceVerification,
                            "deviceVerificationNonce": appTx.deviceVerificationNonce,
                            "environment": appTx.environment,
                            "signedDate": appTx.signedDate.timeIntervalSince1970 * 1000,
                            "appId": appTx.appId,
                            "appVersionId": appTx.appVersionId,
                            "preorderDate": appTx.preorderDate != nil ? (appTx.preorderDate!.timeIntervalSince1970 * 1000) : nil
                        ]
                        result["appTransactionId"] = appTx.appTransactionId
                        result["originalPlatform"] = appTx.originalPlatform
                        let jsonData = try JSONSerialization.data(withJSONObject: result, options: [])
                        return String(data: jsonData, encoding: .utf8)
                    }
                    return nil
                } else {
                    return nil
                }
            } catch {
                return nil
            }
        }
    }
    
    func requestPromotedProductIOS() throws -> Promise<NitroProduct?> {
        return Promise.async {
            do {
                if let p = try await OpenIapModule.shared.getPromotedProductIOS() {
                    var n = NitroProduct()
                    n.id = p.productIdentifier
                    n.title = p.localizedTitle
                    n.description = p.localizedDescription
                    n.type = "inapp"
                    n.platform = "ios"
                    n.price = p.price
                    n.currency = p.priceLocale.currencyCode
                    return n
                }
                return nil
            } catch {
                return nil
            }
        }
    }
    
    func buyPromotedProductIOS() throws -> Promise<Void> {
        return Promise.async {
            do {
                try await OpenIapModule.shared.requestPurchaseOnPromotedProductIOS()
            } catch {
                // Event-only: OpenIAP will emit purchaseError for this flow. Avoid Promise rejection.
            }
        }
    }
    
    func presentCodeRedemptionSheetIOS() throws -> Promise<Bool> {
        return Promise.async {
            do {
                let ok = try await OpenIapModule.shared.presentCodeRedemptionSheetIOS()
                return ok
            } catch {
                // Fallback with explicit error for simulator or unsupported cases
                throw OpenIapError.make(code: OpenIapError.FeatureNotSupported)
            }
        }
    }
    
    func clearTransactionIOS() throws -> Promise<Void> {
        return Promise.async {
            do {
                try await OpenIapModule.shared.clearTransactionIOS()
            } catch {
                // ignore
            }
        }
    }
    
    // Additional iOS-only functions for feature parity with expo-iap
    
    func subscriptionStatusIOS(sku: String) throws -> Promise<[NitroSubscriptionStatus]?> {
        return Promise.async {
            try self.ensureConnection()
            do {
                if let statuses = try await OpenIapModule.shared.subscriptionStatusIOS(sku: sku) {
                    return statuses.map { s in
                        var renewal: NitroSubscriptionRenewalInfo? = nil
                        if let r = s.renewalInfo {
                            renewal = NitroSubscriptionRenewalInfo(
                                autoRenewStatus: r.autoRenewStatus,
                                autoRenewPreference: r.autoRenewPreference,
                                expirationReason: r.expirationReason.map { Double($0) },
                                gracePeriodExpirationDate: r.gracePeriodExpirationDate?.timeIntervalSince1970,
                                currentProductID: r.currentProductID,
                                platform: "ios"
                            )
                        }
                        let isActive: Bool
                        switch s.state {
                        case .subscribed:
                            isActive = true
                        default:
                            isActive = false
                        }
                        return NitroSubscriptionStatus(
                            state: isActive ? 1 : 0,
                            platform: "ios",
                            renewalInfo: renewal
                        )
                    }
                }
                return []
            } catch {
                return []
            }
        }
    }
    
    func currentEntitlementIOS(sku: String) throws -> Promise<NitroPurchase?> {
        return Promise.async {
            try self.ensureConnection()
            do {
                let purchase = try await OpenIapModule.shared.currentEntitlementIOS(sku: sku)
                if let purchase {
                    return self.convertOpenIapPurchaseToNitroPurchase(purchase)
                }
                return Optional<NitroPurchase>.none
            } catch {
                throw OpenIapError.make(code: OpenIapError.SkuNotFound, productId: sku)
            }
        }
    }
    
    func latestTransactionIOS(sku: String) throws -> Promise<NitroPurchase?> {
        return Promise.async {
            try self.ensureConnection()
            do {
                let purchase = try await OpenIapModule.shared.latestTransactionIOS(sku: sku)
                if let purchase {
                    return self.convertOpenIapPurchaseToNitroPurchase(purchase)
                }
                return Optional<NitroPurchase>.none
            } catch {
                throw OpenIapError.make(code: OpenIapError.SkuNotFound, productId: sku)
            }
        }
    }
    
    func getPendingTransactionsIOS() throws -> Promise<[NitroPurchase]> {
        return Promise.async {
            do {
                let pending = try await OpenIapModule.shared.getPendingTransactionsIOS()
                return pending.map { self.convertOpenIapPurchaseToNitroPurchase($0) }
            } catch {
                return []
            }
        }
    }
    
    func syncIOS() throws -> Promise<Bool> {
        return Promise.async {
            do {
                let ok = try await OpenIapModule.shared.syncIOS()
                return ok
            } catch {
                throw OpenIapError.make(code: OpenIapError.ServiceError, message: error.localizedDescription)
            }
        }
    }
    
    func showManageSubscriptionsIOS() throws -> Promise<[NitroPurchase]> {
        return Promise.async {
            do {
                // Trigger system UI
                _ = try await OpenIapModule.shared.showManageSubscriptionsIOS()
                // Return current entitlements as approximation of updates
                let purchases = try await OpenIapModule.shared.getAvailablePurchases(OpenIapPurchaseOptions(alsoPublishToEventListenerIOS: false, onlyIncludeActiveItemsIOS: true))
                return purchases.map { self.convertOpenIapPurchaseToNitroPurchase($0) }
            } catch {
                throw OpenIapError.make(code: OpenIapError.ServiceError, message: error.localizedDescription)
            }
        }
    }
    
    func isEligibleForIntroOfferIOS(groupID: String) throws -> Promise<Bool> {
        return Promise.async {
            return await OpenIapModule.shared.isEligibleForIntroOfferIOS(groupID: groupID)
        }
    }
    
    func getReceiptDataIOS() throws -> Promise<String> {
        return Promise.async {
            do {
                if let receipt = try await OpenIapModule.shared.getReceiptDataIOS() {
                    return receipt
                }
                throw OpenIapError.make(code: OpenIapError.ReceiptFailed)
            } catch {
                throw OpenIapError.make(code: OpenIapError.ReceiptFailed, message: error.localizedDescription)
            }
        }
    }
    
    func isTransactionVerifiedIOS(sku: String) throws -> Promise<Bool> {
        return Promise.async {
            try self.ensureConnection()
            return await OpenIapModule.shared.isTransactionVerifiedIOS(sku: sku)
        }
    }
    
    func getTransactionJwsIOS(sku: String) throws -> Promise<String?> {
        return Promise.async {
            try self.ensureConnection()
            do {
                let jws = try await OpenIapModule.shared.getTransactionJwsIOS(sku: sku)
                return jws
            } catch {
                throw OpenIapError.make(code: OpenIapError.TransactionValidationFailed, message: "Can't find transaction for sku \(sku)")
            }
        }
    }
    
    func beginRefundRequestIOS(sku: String) throws -> Promise<String?> {
        return Promise.async {
            do { return try await OpenIapModule.shared.beginRefundRequestIOS(sku: sku) } catch { return nil }
        }
    }
    
    func addPromotedProductListenerIOS(listener: @escaping (NitroProduct) -> Void) throws {
        promotedProductListeners.append(listener)
        
        // If a promoted product is already available from OpenIAP, notify immediately
        Task {
            if let p = try? await OpenIapModule.shared.getPromotedProductIOS() {
                let id = p.productIdentifier
                let title = p.localizedTitle
                let desc = p.localizedDescription
                let price = p.price
                let currency = p.priceLocale.currencyCode
                await MainActor.run {
                    var n = NitroProduct()
                    n.id = id
                    n.title = title
                    n.description = desc
                    n.type = "inapp"
                    n.platform = "ios"
                    n.price = price
                    n.currency = currency
                    listener(n)
                }
            }
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
    
    private func ensureConnection() throws {
        guard isInitialized else {
            throw OpenIapError.make(code: OpenIapError.InitConnection, message: "Connection not initialized. Call initConnection() first.")
        }
    }
    
    private func sendPurchaseUpdate(_ purchase: NitroPurchase) {
        for listener in purchaseUpdatedListeners {
            listener(purchase)
        }
    }
    
    private func sendPurchaseError(_ error: NitroPurchaseResult, productId: String? = nil) {
        // Update last error for deduplication using the associated product SKU (not token)
        lastPurchaseErrorCode = error.code
        lastPurchaseErrorProductId = productId
        lastPurchaseErrorTimestamp = Date().timeIntervalSince1970
        // Ensure we never leak SKU via purchaseToken
        var sanitized = error
        if let pid = productId, sanitized.purchaseToken == pid {
            sanitized.purchaseToken = nil
        }
        for listener in purchaseErrorListeners {
            listener(sanitized)
        }
    }

    private func sendPurchaseErrorDedup(_ error: NitroPurchaseResult, productId: String? = nil) {
        let now = Date().timeIntervalSince1970
        let sameCode = (error.code == lastPurchaseErrorCode)
        let sameProduct = (productId == lastPurchaseErrorProductId)
        let withinWindow = (now - lastPurchaseErrorTimestamp) < 0.3
        if sameCode && sameProduct && withinWindow {
            return
        }
        sendPurchaseError(error, productId: productId)
    }
    
    private func createPurchaseErrorResult(code: String, message: String, productId: String? = nil) -> NitroPurchaseResult {
        var result = NitroPurchaseResult()
        result.responseCode = 0
        result.code = code
        result.message = message
        // Do not overload the token field with productId
        result.purchaseToken = nil
        return result
    }
    
    private func cleanupExistingState() {
        // Cancel transaction listener if any
        updateListenerTask?.cancel()
        updateListenerTask = nil
        isInitialized = false
        
        
        // Remove OpenIAP listeners & end connection
        if let sub = purchaseUpdatedSub { OpenIapModule.shared.removeListener(sub) }
        if let sub = purchaseErrorSub { OpenIapModule.shared.removeListener(sub) }
        if let sub = promotedProductSub { OpenIapModule.shared.removeListener(sub) }
        purchaseUpdatedSub = nil
        purchaseErrorSub = nil
        promotedProductSub = nil
        Task { _ = try? await OpenIapModule.shared.endConnection() }

        // Clear event listeners
        purchaseUpdatedListeners.removeAll()
        purchaseErrorListeners.removeAll()
        promotedProductListeners.removeAll()
    }

    // MARK: - OpenIAP -> Nitro mappers
    private func convertOpenIapProductToNitroProduct(_ p: OpenIapProduct) -> NitroProduct {
        var n = NitroProduct()
        n.id = p.id
        n.title = p.title
        n.description = p.description
        n.type = p.type
        n.displayName = p.displayName ?? p.displayNameIOS
        n.displayPrice = p.displayPrice
        n.currency = p.currency
        n.price = p.price
        n.platform = p.platform
        // iOS specifics
        n.typeIOS = p.typeIOS.rawValue
        n.isFamilyShareableIOS = p.isFamilyShareableIOS
        n.jsonRepresentationIOS = p.jsonRepresentationIOS
        n.subscriptionPeriodUnitIOS = p.subscriptionPeriodUnitIOS
        if let num = p.subscriptionPeriodNumberIOS, let d = Double(num) { n.subscriptionPeriodNumberIOS = d }
        n.introductoryPriceIOS = p.introductoryPriceIOS
        if let amt = p.introductoryPriceAsAmountIOS, let d = Double(amt) { n.introductoryPriceAsAmountIOS = d }
        n.introductoryPricePaymentModeIOS = p.introductoryPricePaymentModeIOS
        if let cnt = p.introductoryPriceNumberOfPeriodsIOS, let d = Double(cnt) { n.introductoryPriceNumberOfPeriodsIOS = d }
        n.introductoryPriceSubscriptionPeriodIOS = p.introductoryPriceSubscriptionPeriodIOS
        return n
    }

    private func convertOpenIapPurchaseToNitroPurchase(_ p: OpenIapPurchase) -> NitroPurchase {
        var n = NitroPurchase()
        n.id = p.id
        n.productId = p.productId
        n.transactionDate = p.transactionDate
        n.purchaseToken = p.purchaseToken
        n.platform = p.platform
        n.quantity = Double(p.quantity)
        n.purchaseState = p.purchaseState.rawValue
        n.isAutoRenewing = p.isAutoRenewing
        // iOS specifics
        if let q = p.quantityIOS { n.quantityIOS = Double(q) }
        n.originalTransactionDateIOS = p.originalTransactionDateIOS
        n.originalTransactionIdentifierIOS = p.originalTransactionIdentifierIOS
        n.appAccountToken = p.appAccountToken
        return n
    }

    // MARK: - Android-only stubs (required for protocol conformance)
    // These APIs are Android-specific. Expose stubs on iOS to satisfy the
    // generated Swift protocol. They will never be called from JS on iOS
    // because the TS spec marks them as Android-only.
    func getStorefrontAndroid() throws -> Promise<String> {
        return Promise.async {
            throw OpenIapError.make(code: OpenIapError.FeatureNotSupported)
        }
    }

    func deepLinkToSubscriptionsAndroid(options: NitroDeepLinkOptionsAndroid) throws -> Promise<Void> {
        return Promise.async {
            throw OpenIapError.make(code: OpenIapError.FeatureNotSupported)
        }
    }
}

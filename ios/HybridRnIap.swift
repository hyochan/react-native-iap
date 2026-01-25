import Foundation
import NitroModules
import OpenIAP

@available(iOS 15.0, *)
class HybridRnIap: HybridRnIapSpec {
    // MARK: - Properties
    private var updateListenerTask: Task<Void, Never>?
    private var isInitialized: Bool = false
    private var isInitializing: Bool = false
    private var productTypeBySku: [String: String] = [:]
    // OpenIAP event subscriptions
    private var purchaseUpdatedSub: Subscription?
    private var purchaseErrorSub: Subscription?
    private var promotedProductSub: Subscription?
    // Event listeners
    private var purchaseUpdatedListeners: [(NitroPurchase) -> Void] = []
    private var purchaseErrorListeners: [(NitroPurchaseResult) -> Void] = []
    private var promotedProductListeners: [(NitroProduct) -> Void] = []
    private var lastPurchaseErrorKey: String? = nil
    private var lastPurchaseErrorTimestamp: TimeInterval = 0
    private var deliveredPurchaseEventKeys: Set<String> = []
    private var deliveredPurchaseEventOrder: [String] = []
    private let purchaseEventDedupLimit = 128
    private var purchasePayloadById: [String: [String: Any]] = [:]
    
    // MARK: - Initialization
    
    override init() {
        super.init()
    }
    
    deinit {
        updateListenerTask?.cancel()
    }
    
    // MARK: - Public Methods (Cross-platform)

    
    
    func initConnection(config: InitConnectionConfig?) throws -> Promise<Bool> {
        return Promise.async {
            RnIapLog.payload("initConnection", config?.alternativeBillingModeAndroid)
            self.attachListenersIfNeeded()

            if self.isInitialized || self.isInitializing {
                RnIapLog.result("initConnection", true)
                return true
            }

            self.isInitializing = true

            do {
                // Note: iOS doesn't support alternative billing config parameter
                // Config is ignored on iOS platform
                let ok = try await OpenIapModule.shared.initConnection()
                RnIapLog.result("initConnection", ok)
                self.isInitialized = ok
                self.isInitializing = false
                return ok
            } catch {
                RnIapLog.failure("initConnection", error: error)
                let err = RnIapHelper.makePurchaseErrorResult(
                    code: .initConnection,
                    message: error.localizedDescription
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
            try self.ensureConnection()
            RnIapLog.payload("fetchProducts", [
                "skus": skus,
                "type": type
            ])

            if skus.isEmpty {
                throw OpenIapException.make(code: .emptySkuList)
            }

            var productsById: [String: NitroProduct] = [:]
            let normalizedType = type.lowercased()
            let queryTypes: [ProductQueryType]
            if normalizedType == "all" {
                queryTypes = [.inApp, .subs]
            } else {
                if normalizedType == "inapp" {
                    RnIapLog.warn("fetchProducts received legacy type 'inapp'; forwarding as 'in-app'")
                }
                queryTypes = [RnIapHelper.parseProductQueryType(type)]
            }

            for queryType in queryTypes {
                let request = try OpenIapSerialization.productRequest(skus: skus, type: queryType)
                RnIapLog.payload(
                    "fetchProducts.native", [
                        "skus": skus,
                        "type": queryType.rawValue
                    ]
                )
                let result = try await OpenIapModule.shared.fetchProducts(request)
                let payloads = RnIapHelper.sanitizeArray(OpenIapSerialization.products(result))
                RnIapLog.result("fetchProducts.native", payloads)
                for payload in payloads {
                    let nitroProduct = RnIapHelper.convertProductDictionary(payload)
                    productsById[nitroProduct.id] = nitroProduct
                }
            }

            var products: [NitroProduct] = []
            var seenIds = Set<String>()
            for sku in skus {
                if let product = productsById[sku], !seenIds.contains(product.id) {
                    products.append(product)
                    seenIds.insert(product.id)
                }
            }
            for product in productsById.values where !seenIds.contains(product.id) {
                products.append(product)
                seenIds.insert(product.id)
            }
            await MainActor.run {
                products.forEach { self.productTypeBySku[$0.id] = $0.type.lowercased() }
            }
            RnIapLog.result(
                "fetchProducts", products.map { ["id": $0.id, "type": $0.type] }
            )
            return products
        }
    }
    
    func requestPurchase(request: NitroPurchaseRequest) throws -> Promise<RequestPurchaseResult?> {
        return Promise.async {
            let defaultResult: RequestPurchaseResult? = .third([])
            RnIapLog.payload(
                "requestPurchase", [
                    "hasIOS": request.ios != nil,
                    "hasAndroid": request.android != nil
                ]
            )

            guard let iosRequest = request.ios else {
                let error = RnIapHelper.makePurchaseErrorResult(
                    code: .developerError,
                    message: "No iOS request provided"
                )
                self.sendPurchaseError(error, productId: nil)
                return defaultResult
            }

            guard self.isInitialized else {
                let err = RnIapHelper.makePurchaseErrorResult(
                    code: .initConnection,
                    message: "IAP store connection not initialized",
                    iosRequest.sku
                )
                self.sendPurchaseError(err, productId: iosRequest.sku)
                return defaultResult
            }

            do {
                var iosPayload: [String: Any] = ["sku": iosRequest.sku]
                if let quantity = iosRequest.quantity { iosPayload["quantity"] = Int(quantity) }
                if let finishAutomatically = iosRequest.andDangerouslyFinishTransactionAutomatically {
                    iosPayload["andDangerouslyFinishTransactionAutomatically"] = finishAutomatically
                }
                if let appAccountToken = iosRequest.appAccountToken {
                    iosPayload["appAccountToken"] = appAccountToken
                }
                if let withOffer = iosRequest.withOffer {
                    iosPayload["withOffer"] = withOffer
                }
                if let advancedCommerceData = iosRequest.advancedCommerceData {
                    iosPayload["advancedCommerceData"] = advancedCommerceData
                }
                // WWDC 2025 / iOS 18+ subscription offer fields
                if let introductoryOfferEligibility = iosRequest.introductoryOfferEligibility {
                    iosPayload["introductoryOfferEligibility"] = introductoryOfferEligibility
                }
                if let promotionalOfferJWS = iosRequest.promotionalOfferJWS {
                    iosPayload["promotionalOfferJWS"] = [
                        "jws": promotionalOfferJWS.jws,
                        "offerId": promotionalOfferJWS.offerId
                    ]
                }
                if let winBackOffer = iosRequest.winBackOffer {
                    iosPayload["winBackOffer"] = ["offerId": winBackOffer.offerId]
                }

                let cachedType = await MainActor.run { self.productTypeBySku[iosRequest.sku] }
                let resolvedType = RnIapHelper.parseProductQueryType(cachedType)
                let purchaseType: ProductQueryType = resolvedType == .all ? .inApp : resolvedType
                await MainActor.run {
                    self.productTypeBySku[iosRequest.sku] = purchaseType.rawValue
                }

                let props = try RnIapHelper.decodeRequestPurchaseProps(
                    iosPayload: iosPayload,
                    type: purchaseType
                )

                RnIapLog.payload(
                    "requestPurchase.native", iosPayload
                )

                let result = try await OpenIapModule.shared.requestPurchase(props)
                if result != nil {
                    RnIapLog.result("requestPurchase", "delegated to OpenIAP")
                } else {
                    RnIapLog.result("requestPurchase", nil)
                }

                return defaultResult
            } catch let purchaseError as PurchaseError {
                RnIapLog.failure("requestPurchase", error: purchaseError)
                // OpenIAP already publishes purchaseError events for PurchaseError instances.
                // Avoid emitting a duplicate event back to JS; simply return.
                return defaultResult
            } catch {
                RnIapLog.failure("requestPurchase", error: error)
                let err = RnIapHelper.makePurchaseErrorResult(
                    code: .purchaseError,
                    message: error.localizedDescription,
                    iosRequest.sku
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
                let alsoPublish = options?.ios?.alsoPublishToEventListener ?? false
                let onlyActive = options?.ios?.onlyIncludeActiveItemsIOS ?? options?.ios?.onlyIncludeActiveItems ?? false
                let optionsDictionary: [String: Any] = [
                    "alsoPublishToEventListenerIOS": alsoPublish,
                    "onlyIncludeActiveItemsIOS": onlyActive
                ]
                let purchaseOptions = try OpenIapSerialization.purchaseOptions(from: optionsDictionary)
                RnIapLog.payload("getAvailablePurchases", optionsDictionary)
                let purchases = try await OpenIapModule.shared.getAvailablePurchases(purchaseOptions)
                let payloads = RnIapHelper.sanitizeArray(OpenIapSerialization.purchases(purchases))
                RnIapLog.result("getAvailablePurchases", payloads)
                return payloads.map { RnIapHelper.convertPurchaseDictionary($0) }
            } catch let purchaseError as PurchaseError {
                RnIapLog.failure("getAvailablePurchases", error: purchaseError)
                throw OpenIapException.from(purchaseError)
            } catch {
                RnIapLog.failure("getAvailablePurchases", error: error)
                throw OpenIapException.make(code: .serviceError, message: error.localizedDescription)
            }
        }
    }

    func getActiveSubscriptions(subscriptionIds: [String]?) throws -> Promise<[NitroActiveSubscription]> {
        return Promise.async {
            try self.ensureConnection()
            do {
                RnIapLog.payload("getActiveSubscriptions", subscriptionIds ?? [])
                // Call OpenIAP's native getActiveSubscriptions - includes renewalInfoIOS!
                let subscriptions = try await OpenIapModule.shared.getActiveSubscriptions(subscriptionIds)
                let payloads = RnIapHelper.sanitizeArray(subscriptions.map { OpenIapSerialization.encode($0) })
                RnIapLog.result("getActiveSubscriptions", payloads)
                return payloads.map { RnIapHelper.convertActiveSubscriptionDictionary($0) }
            } catch let purchaseError as PurchaseError {
                RnIapLog.failure("getActiveSubscriptions", error: purchaseError)
                throw OpenIapException.from(purchaseError)
            } catch {
                RnIapLog.failure("getActiveSubscriptions", error: error)
                throw OpenIapException.make(code: .serviceError, message: error.localizedDescription)
            }
        }
    }

    func hasActiveSubscriptions(subscriptionIds: [String]?) throws -> Promise<Bool> {
        return Promise.async {
            try self.ensureConnection()
            do {
                RnIapLog.payload("hasActiveSubscriptions", subscriptionIds ?? [])
                let hasActive = try await OpenIapModule.shared.hasActiveSubscriptions(subscriptionIds)
                RnIapLog.result("hasActiveSubscriptions", hasActive)
                return hasActive
            } catch let purchaseError as PurchaseError {
                RnIapLog.failure("hasActiveSubscriptions", error: purchaseError)
                throw OpenIapException.from(purchaseError)
            } catch {
                RnIapLog.failure("hasActiveSubscriptions", error: error)
                throw OpenIapException.make(code: .serviceError, message: error.localizedDescription)
            }
        }
    }

    func finishTransaction(params: NitroFinishTransactionParams) throws -> Promise<Variant_Bool_NitroPurchaseResult> {
        return Promise.async {
            guard let iosParams = params.ios else { return .first(true) }
            try self.ensureConnection()
            do {
                RnIapLog.payload(
                    "finishTransaction", ["transactionId": iosParams.transactionId]
                )
                var purchasePayload = await MainActor.run { () -> [String: Any]? in
                    self.purchasePayloadById[iosParams.transactionId]
                }
                if purchasePayload == nil {
                    RnIapLog.warn("Missing cached purchase payload for \(iosParams.transactionId); falling back to identifier-only finish")
                    purchasePayload = ["transactionIdentifier": iosParams.transactionId]
                }
                guard let purchasePayload else {
                    throw OpenIapException.make(code: .purchaseError, message: "Missing purchase context for \(iosParams.transactionId)")
                }
                let sanitizedPayload = RnIapHelper.sanitizeDictionary(purchasePayload)
                RnIapLog.payload("finishTransaction.nativePayload", sanitizedPayload)
                let purchaseInput = try OpenIapSerialization.purchaseInput(from: purchasePayload)
                try await OpenIapModule.shared.finishTransaction(purchase: purchaseInput, isConsumable: nil)
                RnIapLog.result("finishTransaction", true)
                await MainActor.run {
                    self.purchasePayloadById.removeValue(forKey: iosParams.transactionId)
                }
                return .first(true)
            } catch {
                RnIapLog.failure("finishTransaction", error: error)
                let tid = iosParams.transactionId
                throw OpenIapException.make(code: .purchaseError, message: "Transaction not found: \(tid)")
            }
        }
    }
    
    func validateReceipt(params: NitroReceiptValidationParams) throws -> Promise<Variant_NitroReceiptValidationResultIOS_NitroReceiptValidationResultAndroid> {
        return Promise.async {
            do {
                // Extract SKU from apple options (new platform-specific structure)
                guard let appleOptions = params.apple, !appleOptions.sku.isEmpty else {
                    throw OpenIapException.make(code: .developerError, message: "Missing required parameter: apple.sku")
                }
                let sku = appleOptions.sku

                RnIapLog.payload("validateReceiptIOS", ["sku": sku])
                let props = try OpenIapSerialization.verifyPurchaseProps(from: ["apple": ["sku": sku]])
                let result = try await OpenIapModule.shared.validateReceiptIOS(props)
                var encoded = RnIapHelper.sanitizeDictionary(OpenIapSerialization.encode(result))
                if encoded["receiptData"] != nil {
                    encoded["receiptData"] = "<receipt>"
                }
                if encoded["jwsRepresentation"] != nil {
                    encoded["jwsRepresentation"] = "<jws>"
                }
                RnIapLog.result("validateReceiptIOS", encoded)
                var latest: NitroPurchase? = nil
                if let transaction = result.latestTransaction {
                    let payload = RnIapHelper.sanitizeDictionary(OpenIapSerialization.purchase(transaction))
                    latest = RnIapHelper.convertPurchaseDictionary(payload)
                }
                let mapped = NitroReceiptValidationResultIOS(
                    isValid: result.isValid,
                    receiptData: result.receiptData,
                    jwsRepresentation: result.jwsRepresentation,
                    latestTransaction: latest
                )
                return .first(mapped)
            } catch let purchaseError as PurchaseError {
                RnIapLog.failure("validateReceiptIOS", error: purchaseError)
                throw OpenIapException.from(purchaseError)
            } catch {
                RnIapLog.failure("validateReceiptIOS", error: error)
                throw OpenIapException.make(code: .purchaseVerificationFailed, message: error.localizedDescription)
            }
        }
    }

    func verifyPurchaseWithProvider(params: NitroVerifyPurchaseWithProviderProps) throws -> Promise<NitroVerifyPurchaseWithProviderResult> {
        return Promise.async {
            do {
                RnIapLog.payload("verifyPurchaseWithProvider", ["provider": params.provider.stringValue])
                // Convert Nitro params to OpenIAP props using JSONSerialization (same as expo-iap)
                // Use stringValue for enum to get proper string representation ("iapkit" instead of numeric rawValue)
                var propsDict: [String: Any] = ["provider": params.provider.stringValue]
                if let iapkit = params.iapkit {
                    var iapkitDict: [String: Any] = [:]
                    // Use provided apiKey, or fallback to Info.plist IAPKitAPIKey (set by config plugin)
                    if let apiKey = iapkit.apiKey {
                        iapkitDict["apiKey"] = apiKey
                    } else if let plistApiKey = Bundle.main.object(forInfoDictionaryKey: "IAPKitAPIKey") as? String {
                        iapkitDict["apiKey"] = plistApiKey
                    }
                    if let apple = iapkit.apple {
                        iapkitDict["apple"] = ["jws": apple.jws]
                    }
                    if let google = iapkit.google {
                        iapkitDict["google"] = ["purchaseToken": google.purchaseToken]
                    }
                    propsDict["iapkit"] = iapkitDict
                }
                // Use JSONSerialization + JSONDecoder like expo-iap does
                let jsonData = try JSONSerialization.data(withJSONObject: propsDict)
                let props = try JSONDecoder().decode(VerifyPurchaseWithProviderProps.self, from: jsonData)
                let result = try await OpenIapModule.shared.verifyPurchaseWithProvider(props)
                RnIapLog.result("verifyPurchaseWithProvider", ["provider": result.provider, "hasIapkit": result.iapkit != nil])
                // Convert result to Nitro types
                var nitroIapkitResult: NitroVerifyPurchaseWithIapkitResult? = nil
                if let item = result.iapkit {
                    nitroIapkitResult = NitroVerifyPurchaseWithIapkitResult(
                        isValid: item.isValid,
                        state: IapkitPurchaseState(fromString: item.state.rawValue) ?? .unknown,
                        store: IapStore(fromString: item.store.rawValue) ?? .unknown
                    )
                }
                // Convert errors if present
                var nitroErrors: [NitroVerifyPurchaseWithProviderError]? = nil
                if let errors = result.errors {
                    nitroErrors = errors.map { error in
                        NitroVerifyPurchaseWithProviderError(
                            code: error.code,
                            message: error.message
                        )
                    }
                }
                return NitroVerifyPurchaseWithProviderResult(
                    iapkit: nitroIapkitResult,
                    errors: nitroErrors,
                    provider: PurchaseVerificationProvider(fromString: result.provider.rawValue) ?? .iapkit
                )
            } catch let purchaseError as PurchaseError {
                // Convert PurchaseError to OpenIapException to preserve message through Nitro bridge
                RnIapLog.failure("verifyPurchaseWithProvider", error: purchaseError)
                throw OpenIapException.from(purchaseError)
            } catch {
                RnIapLog.failure("verifyPurchaseWithProvider", error: error)
                throw OpenIapException.make(code: .purchaseVerificationFailed, message: error.localizedDescription)
            }
        }
    }

    func getStorefront() throws -> Promise<String> {
        return Promise.async {
            do {
                RnIapLog.payload("getStorefront", nil)
                let storefront = try await OpenIapModule.shared.getStorefrontIOS()
                RnIapLog.result("getStorefront", storefront)
                return storefront
            } catch let purchaseError as PurchaseError {
                RnIapLog.failure("getStorefront", error: purchaseError)
                throw OpenIapException.from(purchaseError)
            } catch {
                RnIapLog.failure("getStorefront", error: error)
                throw OpenIapException.make(code: .serviceError, message: error.localizedDescription)
            }
        }
    }

    // MARK: - iOS-specific Public Methods
    func getStorefrontIOS() throws -> Promise<String> {
        return try getStorefront()
    }
    
    func getAppTransactionIOS() throws -> Promise<String?> {
        return Promise.async {
            do {
                RnIapLog.payload("getAppTransactionIOS", nil)
                if #available(iOS 16.0, *) {
                    if let appTx = try await OpenIapModule.shared.getAppTransactionIOS() {
                        var result: [String: Any?] = [
                            "bundleId": appTx.bundleId,
                            "appVersion": appTx.appVersion,
                            "originalAppVersion": appTx.originalAppVersion,
                            "originalPurchaseDate": appTx.originalPurchaseDate,
                            "deviceVerification": appTx.deviceVerification,
                            "deviceVerificationNonce": appTx.deviceVerificationNonce,
                            "environment": appTx.environment,
                            "signedDate": appTx.signedDate,
                            "appId": appTx.appId,
                            "appVersionId": appTx.appVersionId,
                            "preorderDate": appTx.preorderDate
                        ]
                        result["appTransactionId"] = appTx.appTransactionId
                        result["originalPlatform"] = appTx.originalPlatform
                        let jsonData = try JSONSerialization.data(withJSONObject: result, options: [])
                        let string = String(data: jsonData, encoding: .utf8)
                        RnIapLog.result("getAppTransactionIOS", "<appTransaction>")
                        return string
                    }
                    RnIapLog.result("getAppTransactionIOS", nil)
                    return nil
                } else {
                    RnIapLog.result("getAppTransactionIOS", nil)
                    return nil
                }
            } catch {
                RnIapLog.failure("getAppTransactionIOS", error: error)
                return nil
            }
        }
    }
    
    func getPromotedProductIOS() throws -> Promise<NitroProduct?> {
        return Promise.async {
            try self.ensureConnection()
            do {
                RnIapLog.payload("getPromotedProductIOS", nil)
                guard let product = try await OpenIapModule.shared.getPromotedProductIOS() else {
                    RnIapLog.result("getPromotedProductIOS", nil)
                    return nil
                }
                let payload = RnIapHelper.sanitizeDictionary(OpenIapSerialization.encode(product))
                RnIapLog.result("getPromotedProductIOS", payload)
                return RnIapHelper.convertProductDictionary(payload)
            } catch let purchaseError as PurchaseError {
                RnIapLog.failure("getPromotedProductIOS", error: purchaseError)
                throw OpenIapException.from(purchaseError)
            } catch {
                RnIapLog.failure("getPromotedProductIOS", error: error)
                throw OpenIapException.make(code: .serviceError, message: error.localizedDescription)
            }
        }
    }

    func requestPromotedProductIOS() throws -> Promise<NitroProduct?> {
        return try getPromotedProductIOS()
    }
    
    func buyPromotedProductIOS() throws -> Promise<Void> {
        return Promise.async {
            do {
                RnIapLog.payload("buyPromotedProductIOS", nil)
                let ok = try await OpenIapModule.shared.requestPurchaseOnPromotedProductIOS()
                RnIapLog.result("buyPromotedProductIOS", ok)
            } catch {
                // Event-only: OpenIAP will emit purchaseError for this flow. Avoid Promise rejection.
                RnIapLog.failure("buyPromotedProductIOS", error: error)
            }
        }
    }
    
    func presentCodeRedemptionSheetIOS() throws -> Promise<Bool> {
        return Promise.async {
            do {
                RnIapLog.payload("presentCodeRedemptionSheetIOS", nil)
                let ok = try await OpenIapModule.shared.presentCodeRedemptionSheetIOS()
                RnIapLog.result("presentCodeRedemptionSheetIOS", ok)
                return ok
            } catch {
                // Fallback with explicit error for simulator or unsupported cases
                RnIapLog.failure("presentCodeRedemptionSheetIOS", error: error)
                throw OpenIapException.make(code: .featureNotSupported)
            }
        }
    }

    func clearTransactionIOS() throws -> Promise<Void> {
        return Promise.async {
            do {
                RnIapLog.payload("clearTransactionIOS", nil)
                let ok = try await OpenIapModule.shared.clearTransactionIOS()
                RnIapLog.result("clearTransactionIOS", ok)
            } catch {
                // ignore
                RnIapLog.failure("clearTransactionIOS", error: error)
            }
        }
    }
    
    // Additional iOS-only functions for feature parity with expo-iap
    
    func subscriptionStatusIOS(sku: String) throws -> Promise<[NitroSubscriptionStatus]?> {
        return Promise.async {
            try self.ensureConnection()
            do {
                RnIapLog.payload("subscriptionStatusIOS", ["sku": sku])
                let statuses = try await OpenIapModule.shared.subscriptionStatusIOS(sku: sku)
                let payloads = statuses.map { RnIapHelper.sanitizeDictionary(OpenIapSerialization.encode($0)) }
                RnIapLog.result("subscriptionStatusIOS", payloads)
                return payloads.map { payload in
                    let stateValue: Double
                    if let numeric = RnIapHelper.doubleValue(payload["state"]) {
                        stateValue = numeric
                    } else if let stateString = payload["state"] as? String {
                        stateValue = stateString.lowercased() == "subscribed" ? 1 : 0
                    } else {
                        stateValue = 0
                    }
                    let platform = payload["platform"] as? String ?? "ios"
                    var renewalInfo: NitroSubscriptionRenewalInfo? = nil
                    if let renewalPayload = payload["renewalInfo"] as? [String: Any?] {
                        renewalInfo = RnIapHelper.convertRenewalInfo(RnIapHelper.sanitizeDictionary(renewalPayload))
                    }
                    return NitroSubscriptionStatus(state: stateValue, platform: platform, renewalInfo: renewalInfo)
                }
            } catch {
                RnIapLog.failure("subscriptionStatusIOS", error: error)
                return []
            }
        }
    }
    
    func currentEntitlementIOS(sku: String) throws -> Promise<NitroPurchase?> {
        return Promise.async {
            try self.ensureConnection()
            do {
                RnIapLog.payload("currentEntitlementIOS", ["sku": sku])
                let purchase = try await OpenIapModule.shared.currentEntitlementIOS(sku: sku)
                if let purchase {
                    let raw = OpenIapSerialization.encode(purchase)
                    let payload = RnIapHelper.sanitizeDictionary(raw)
                    RnIapLog.result("currentEntitlementIOS", payload)
                    if let identifier = raw["id"] as? String {
                        await MainActor.run {
                            self.purchasePayloadById[identifier] = raw
                        }
                    }
                    return RnIapHelper.convertPurchaseDictionary(payload)
                }
                RnIapLog.result("currentEntitlementIOS", nil)
                return Optional<NitroPurchase>.none
            } catch {
                RnIapLog.failure("currentEntitlementIOS", error: error)
                throw OpenIapException.make(code: .skuNotFound, productId: sku)
            }
        }
    }

    func latestTransactionIOS(sku: String) throws -> Promise<NitroPurchase?> {
        return Promise.async {
            try self.ensureConnection()
            do {
                RnIapLog.payload("latestTransactionIOS", ["sku": sku])
                let purchase = try await OpenIapModule.shared.latestTransactionIOS(sku: sku)
                if let purchase {
                    let raw = OpenIapSerialization.encode(purchase)
                    let payload = RnIapHelper.sanitizeDictionary(raw)
                    RnIapLog.result("latestTransactionIOS", payload)
                    if let identifier = raw["id"] as? String {
                        await MainActor.run {
                            self.purchasePayloadById[identifier] = raw
                        }
                    }
                    return RnIapHelper.convertPurchaseDictionary(payload)
                }
                RnIapLog.result("latestTransactionIOS", nil)
                return Optional<NitroPurchase>.none
            } catch {
                RnIapLog.failure("latestTransactionIOS", error: error)
                throw OpenIapException.make(code: .skuNotFound, productId: sku)
            }
        }
    }

    func getPendingTransactionsIOS() throws -> Promise<[NitroPurchase]> {
        return Promise.async {
            do {
                RnIapLog.payload("getPendingTransactionsIOS", nil)
                let pending = try await OpenIapModule.shared.getPendingTransactionsIOS()
                var unionPurchases: [OpenIAP.Purchase] = []
                for purchase in pending {
                    let union = OpenIAP.Purchase.purchaseIos(purchase)
                    unionPurchases.append(union)
                    let raw = OpenIapSerialization.purchase(union)
                    if let identifier = raw["id"] as? String {
                        await MainActor.run {
                            self.purchasePayloadById[identifier] = raw
                        }
                    }
                }
                let payloads = RnIapHelper.sanitizeArray(OpenIapSerialization.purchases(unionPurchases))
                RnIapLog.result("getPendingTransactionsIOS", payloads)
                return payloads.map { RnIapHelper.convertPurchaseDictionary($0) }
            } catch {
                RnIapLog.failure("getPendingTransactionsIOS", error: error)
                return []
            }
        }
    }
    
    func syncIOS() throws -> Promise<Bool> {
        return Promise.async {
            do {
                RnIapLog.payload("syncIOS", nil)
                let ok = try await OpenIapModule.shared.syncIOS()
                RnIapLog.result("syncIOS", ok)
                return ok
            } catch let purchaseError as PurchaseError {
                RnIapLog.failure("syncIOS", error: purchaseError)
                throw OpenIapException.from(purchaseError)
            } catch {
                RnIapLog.failure("syncIOS", error: error)
                throw OpenIapException.make(code: .serviceError, message: error.localizedDescription)
            }
        }
    }

    func showManageSubscriptionsIOS() throws -> Promise<[NitroPurchase]> {
        return Promise.async {
            try self.ensureConnection()
            do {
                // Trigger system UI
                RnIapLog.payload("showManageSubscriptionsIOS", nil)
                _ = try await OpenIapModule.shared.showManageSubscriptionsIOS()
                // Return current entitlements as approximation of updates
                let optionsDictionary: [String: Any] = [
                    "alsoPublishToEventListenerIOS": false,
                    "onlyIncludeActiveItemsIOS": true
                ]
                let iosOptions = try OpenIapSerialization.purchaseOptions(from: optionsDictionary)
                let purchases = try await OpenIapModule.shared.getAvailablePurchases(iosOptions)
                let payloads = RnIapHelper.sanitizeArray(OpenIapSerialization.purchases(purchases))
                RnIapLog.result("showManageSubscriptionsIOS", payloads)
                return payloads.map { RnIapHelper.convertPurchaseDictionary($0) }
            } catch let purchaseError as PurchaseError {
                RnIapLog.failure("showManageSubscriptionsIOS", error: purchaseError)
                throw OpenIapException.from(purchaseError)
            } catch {
                RnIapLog.failure("showManageSubscriptionsIOS", error: error)
                throw OpenIapException.make(code: .serviceError, message: error.localizedDescription)
            }
        }
    }

    func deepLinkToSubscriptionsIOS() throws -> Promise<Bool> {
        return Promise.async {
            try self.ensureConnection()
            do {
                RnIapLog.payload("deepLinkToSubscriptionsIOS", nil)
                try await OpenIapModule.shared.deepLinkToSubscriptions(nil)
                RnIapLog.result("deepLinkToSubscriptionsIOS", true)
                return true
            } catch let purchaseError as PurchaseError {
                RnIapLog.failure("deepLinkToSubscriptionsIOS", error: purchaseError)
                throw OpenIapException.from(purchaseError)
            } catch {
                RnIapLog.failure("deepLinkToSubscriptionsIOS", error: error)
                throw OpenIapException.make(code: .serviceError, message: error.localizedDescription)
            }
        }
    }

    func isEligibleForIntroOfferIOS(groupID: String) throws -> Promise<Bool> {
        return Promise.async {
            RnIapLog.payload("isEligibleForIntroOfferIOS", ["groupID": groupID])
            let value = try await OpenIapModule.shared.isEligibleForIntroOfferIOS(groupID: groupID)
            RnIapLog.result("isEligibleForIntroOfferIOS", value)
            return value
        }
    }
    
    func getReceiptDataIOS() throws -> Promise<String> {
        return Promise.async {
            try self.ensureConnection()
            do {
                RnIapLog.payload("getReceiptDataIOS", nil)
                let receipt = try await RnIapHelper.loadReceiptData(refresh: false)
                RnIapLog.result("getReceiptDataIOS", "<receipt>")
                return receipt
            } catch let purchaseError as PurchaseError {
                RnIapLog.failure("getReceiptDataIOS", error: purchaseError)
                throw OpenIapException.from(purchaseError)
            } catch {
                RnIapLog.failure("getReceiptDataIOS", error: error)
                throw OpenIapException.make(code: .receiptFailed, message: error.localizedDescription)
            }
        }
    }

    func getReceiptIOS() throws -> Promise<String> {
        return Promise.async {
            try self.ensureConnection()
            do {
                RnIapLog.payload("getReceiptIOS", nil)
                let receipt = try await RnIapHelper.loadReceiptData(refresh: true)
                RnIapLog.result("getReceiptIOS", "<receipt>")
                return receipt
            } catch let purchaseError as PurchaseError {
                RnIapLog.failure("getReceiptIOS", error: purchaseError)
                throw OpenIapException.from(purchaseError)
            } catch {
                RnIapLog.failure("getReceiptIOS", error: error)
                throw OpenIapException.make(code: .receiptFailed, message: error.localizedDescription)
            }
        }
    }

    func requestReceiptRefreshIOS() throws -> Promise<String> {
        return Promise.async {
            try self.ensureConnection()
            do {
                RnIapLog.payload("requestReceiptRefreshIOS", nil)
                let receipt = try await RnIapHelper.loadReceiptData(refresh: true)
                RnIapLog.result("requestReceiptRefreshIOS", "<receipt>")
                return receipt
            } catch let purchaseError as PurchaseError {
                RnIapLog.failure("requestReceiptRefreshIOS", error: purchaseError)
                throw OpenIapException.from(purchaseError)
            } catch {
                RnIapLog.failure("requestReceiptRefreshIOS", error: error)
                throw OpenIapException.make(code: .receiptFailed, message: error.localizedDescription)
            }
        }
    }

    func isTransactionVerifiedIOS(sku: String) throws -> Promise<Bool> {
        return Promise.async {
            try self.ensureConnection()
            RnIapLog.payload("isTransactionVerifiedIOS", ["sku": sku])
            let value = try await OpenIapModule.shared.isTransactionVerifiedIOS(sku: sku)
            RnIapLog.result("isTransactionVerifiedIOS", value)
            return value
        }
    }
    
    func getTransactionJwsIOS(sku: String) throws -> Promise<String?> {
        return Promise.async {
            try self.ensureConnection()
            do {
                RnIapLog.payload("getTransactionJwsIOS", ["sku": sku])
                let jws = try await OpenIapModule.shared.getTransactionJwsIOS(sku: sku)
                let maskedJws: Any? = (jws == nil) ? nil : "<jws>"
                RnIapLog.result("getTransactionJwsIOS", maskedJws)
                return jws
            } catch {
                RnIapLog.failure("getTransactionJwsIOS", error: error)
                throw OpenIapException.make(code: .transactionValidationFailed, message: "Can't find transaction for sku \(sku)")
            }
        }
    }

    func beginRefundRequestIOS(sku: String) throws -> Promise<String?> {
        return Promise.async {
            do {
                RnIapLog.payload("beginRefundRequestIOS", ["sku": sku])
                let result = try await OpenIapModule.shared.beginRefundRequestIOS(sku: sku)
                RnIapLog.result("beginRefundRequestIOS", result)
                return result
            } catch {
                RnIapLog.failure("beginRefundRequestIOS", error: error)
                return nil
            }
        }
    }
    
    func addPromotedProductListenerIOS(listener: @escaping (NitroProduct) -> Void) throws {
        promotedProductListeners.append(listener)
        
        // If a promoted product is already available from OpenIAP, notify immediately
        Task {
            RnIapLog.payload("promotedProductListenerIOS.fetch", nil)
            if let product = try? await OpenIapModule.shared.getPromotedProductIOS() {
                let payload = RnIapHelper.sanitizeDictionary(OpenIapSerialization.encode(product))
                RnIapLog.result("promotedProductListenerIOS.fetch", payload)
                let nitro = RnIapHelper.convertProductDictionary(payload)
                await MainActor.run { listener(nitro) }
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

    private func attachListenersIfNeeded() {
        if purchaseUpdatedSub == nil {
            RnIapLog.payload("purchaseUpdatedListener.register", nil)
            purchaseUpdatedSub = OpenIapModule.shared.purchaseUpdatedListener { [weak self] openIapPurchase in
                guard let self else { return }
                Task { @MainActor in
                    let rawPayload = OpenIapSerialization.purchase(openIapPurchase)
                    let payload = RnIapHelper.sanitizeDictionary(rawPayload)
                    RnIapLog.result("purchaseUpdatedListener", payload)
                    if let identifier = rawPayload["id"] as? String {
                        self.purchasePayloadById[identifier] = rawPayload
                    }
                    let nitro = RnIapHelper.convertPurchaseDictionary(payload)
                    self.sendPurchaseUpdate(nitro)
                }
            }
            RnIapLog.result("purchaseUpdatedListener.register", "attached")
        }

        if purchaseErrorSub == nil {
            RnIapLog.payload("purchaseErrorListener.register", nil)
            purchaseErrorSub = OpenIapModule.shared.purchaseErrorListener { [weak self] error in
                guard let self else { return }
                Task { @MainActor in
                    let payload = RnIapHelper.sanitizeDictionary(OpenIapSerialization.encode(error))
                    RnIapLog.result("purchaseErrorListener", payload)
                    let nitroError = RnIapHelper.makePurchaseErrorResult(
                        code: error.code,
                        message: error.message,
                        error.productId
                    )
                    self.sendPurchaseError(nitroError, productId: error.productId)
                }
            }
            RnIapLog.result("purchaseErrorListener.register", "attached")
        }

        if promotedProductSub == nil {
            RnIapLog.payload("promotedProductListenerIOS.register", nil)
            promotedProductSub = OpenIapModule.shared.promotedProductListenerIOS { [weak self] productId in
                guard let self else { return }
                Task {
                    RnIapLog.payload("promotedProductListenerIOS", ["productId": productId])
                    do {
                        let request = try OpenIapSerialization.productRequest(skus: [productId], type: .all)
                        let result = try await OpenIapModule.shared.fetchProducts(request)
                        let payloads = RnIapHelper.sanitizeArray(OpenIapSerialization.products(result))
                        RnIapLog.result("fetchProducts", payloads)
                        if let payload = payloads.first {
                            let nitro = RnIapHelper.convertProductDictionary(payload)
                            await MainActor.run {
                                for listener in self.promotedProductListeners { listener(nitro) }
                            }
                        }
                    } catch {
                        RnIapLog.failure("promotedProductListenerIOS", error: error)
                        let id = productId
                        await MainActor.run {
                            var minimal = NitroProduct()
                            minimal.id = id
                            minimal.title = id
                            minimal.type = "inapp"
                            minimal.platform = .ios
                            for listener in self.promotedProductListeners { listener(minimal) }
                        }
                    }
                }
            }
            RnIapLog.result("promotedProductListenerIOS.register", "attached")
        }
    }

    private func ensureConnection() throws {
        guard isInitialized else {
            throw OpenIapException.make(code: .initConnection, message: "Connection not initialized. Call initConnection() first.")
        }
    }
    
    private func sendPurchaseUpdate(_ purchase: NitroPurchase) {
        let keyComponents = [
            purchase.id,
            purchase.productId,
            String(purchase.transactionDate),
            purchase.originalTransactionIdentifierIOS ?? "",
            purchase.purchaseToken ?? ""
        ]
        let eventKey = keyComponents.joined(separator: "#")

        if deliveredPurchaseEventKeys.contains(eventKey) {
            RnIapLog.warn("Duplicate purchase update skipped for \(purchase.productId)")
            return
        }

        deliveredPurchaseEventKeys.insert(eventKey)
        deliveredPurchaseEventOrder.append(eventKey)
        if deliveredPurchaseEventOrder.count > purchaseEventDedupLimit, let removed = deliveredPurchaseEventOrder.first {
            deliveredPurchaseEventOrder.removeFirst()
            deliveredPurchaseEventKeys.remove(removed)
        }

        for listener in purchaseUpdatedListeners {
            listener(purchase)
        }
    }
    
    private func sendPurchaseError(_ error: NitroPurchaseResult, productId: String? = nil) {
        let now = Date().timeIntervalSince1970
        let dedupIdentifier = productId
            ?? (error.purchaseToken?.isEmpty == false ? error.purchaseToken : nil)
            ?? (error.message.isEmpty ? nil : error.message)
        let currentKey = RnIapHelper.makeErrorDedupKey(code: error.code, productId: dedupIdentifier)
        // Dedup only when the exact same error is emitted almost simultaneously.
        let withinWindow = (now - lastPurchaseErrorTimestamp) < 0.15
        if currentKey == lastPurchaseErrorKey && withinWindow {
            return
        }

        lastPurchaseErrorKey = currentKey
        lastPurchaseErrorTimestamp = now

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
        sendPurchaseError(error, productId: productId)
    }
    
    private func cleanupExistingState() {
        // Cancel transaction listener if any
        updateListenerTask?.cancel()
        updateListenerTask = nil
        isInitialized = false
        
        
        // Remove OpenIAP listeners & end connection
        if let sub = purchaseUpdatedSub {
            RnIapLog.payload("removeListener", "purchaseUpdated")
            OpenIapModule.shared.removeListener(sub)
        }
        if let sub = purchaseErrorSub {
            RnIapLog.payload("removeListener", "purchaseError")
            OpenIapModule.shared.removeListener(sub)
        }
        if let sub = promotedProductSub {
            RnIapLog.payload("removeListener", "promotedProduct")
            OpenIapModule.shared.removeListener(sub)
        }
        purchaseUpdatedSub = nil
        purchaseErrorSub = nil
        promotedProductSub = nil
        Task {
            RnIapLog.payload("endConnection", nil)
            let result = try? await OpenIapModule.shared.endConnection()
            RnIapLog.result("endConnection", result as Any)
        }

        // Clear event listeners
        purchaseUpdatedListeners.removeAll()
        purchaseErrorListeners.removeAll()
        promotedProductListeners.removeAll()
        deliveredPurchaseEventKeys.removeAll()
        deliveredPurchaseEventOrder.removeAll()
        purchasePayloadById.removeAll()
        lastPurchaseErrorKey = nil
        lastPurchaseErrorTimestamp = 0
    }

    func deepLinkToSubscriptionsAndroid(options: NitroDeepLinkOptionsAndroid) throws -> Promise<Void> {
        return Promise.async {
            throw OpenIapException.make(code: .featureNotSupported)
        }
    }

    // MARK: - Alternative Billing (Android) - Not supported on iOS

    func checkAlternativeBillingAvailabilityAndroid() throws -> Promise<Bool> {
        return Promise.async {
            throw OpenIapException.make(code: .featureNotSupported)
        }
    }

    func showAlternativeBillingDialogAndroid() throws -> Promise<Bool> {
        return Promise.async {
            throw OpenIapException.make(code: .featureNotSupported)
        }
    }

    func createAlternativeBillingTokenAndroid(sku: String?) throws -> Promise<String?> {
        return Promise.async {
            throw OpenIapException.make(code: .featureNotSupported)
        }
    }

    func addUserChoiceBillingListenerAndroid(listener: @escaping (UserChoiceBillingDetails) -> Void) throws {
        RnIapLog.warn("addUserChoiceBillingListenerAndroid is Android-only and has no effect on iOS")
    }

    func removeUserChoiceBillingListenerAndroid(listener: @escaping (UserChoiceBillingDetails) -> Void) throws {
        RnIapLog.warn("removeUserChoiceBillingListenerAndroid is Android-only and has no effect on iOS")
    }

    func addDeveloperProvidedBillingListenerAndroid(listener: @escaping (DeveloperProvidedBillingDetailsAndroid) -> Void) throws {
        RnIapLog.warn("addDeveloperProvidedBillingListenerAndroid is Android-only and has no effect on iOS")
    }

    func removeDeveloperProvidedBillingListenerAndroid(listener: @escaping (DeveloperProvidedBillingDetailsAndroid) -> Void) throws {
        RnIapLog.warn("removeDeveloperProvidedBillingListenerAndroid is Android-only and has no effect on iOS")
    }

    // MARK: - Billing Programs API (Android 8.2.0+) - Not supported on iOS

    func enableBillingProgramAndroid(program: BillingProgramAndroid) throws {
        RnIapLog.warn("enableBillingProgramAndroid is Android-only and has no effect on iOS")
    }

    func isBillingProgramAvailableAndroid(program: BillingProgramAndroid) throws -> Promise<NitroBillingProgramAvailabilityResultAndroid> {
        return Promise.async {
            throw OpenIapException.make(code: .featureNotSupported, message: "Billing Programs API is Android-only")
        }
    }

    func createBillingProgramReportingDetailsAndroid(program: BillingProgramAndroid) throws -> Promise<NitroBillingProgramReportingDetailsAndroid> {
        return Promise.async {
            throw OpenIapException.make(code: .featureNotSupported, message: "Billing Programs API is Android-only")
        }
    }

    func launchExternalLinkAndroid(params: NitroLaunchExternalLinkParamsAndroid) throws -> Promise<Bool> {
        return Promise.async {
            throw OpenIapException.make(code: .featureNotSupported, message: "Billing Programs API is Android-only")
        }
    }

    // MARK: - External Purchase (iOS 16.0+)

    func canPresentExternalPurchaseNoticeIOS() throws -> Promise<Bool> {
        return Promise.async {
            RnIapLog.payload("canPresentExternalPurchaseNoticeIOS", nil)

            if #available(iOS 16.0, *) {
                try self.ensureConnection()
                do {
                    let canPresent = try await OpenIapModule.shared.canPresentExternalPurchaseNoticeIOS()
                    RnIapLog.result("canPresentExternalPurchaseNoticeIOS", canPresent)
                    return canPresent
                } catch let purchaseError as PurchaseError {
                    RnIapLog.failure("canPresentExternalPurchaseNoticeIOS", error: purchaseError)
                    throw OpenIapException.from(purchaseError)
                } catch {
                    RnIapLog.failure("canPresentExternalPurchaseNoticeIOS", error: error)
                    throw OpenIapException.make(code: .serviceError, message: error.localizedDescription)
                }
            } else {
                let err = OpenIapException.make(code: .featureNotSupported, message: "External purchase notice requires iOS 16.0 or later")
                RnIapLog.failure("canPresentExternalPurchaseNoticeIOS", error: err)
                throw err
            }
        }
    }

    func presentExternalPurchaseNoticeSheetIOS() throws -> Promise<ExternalPurchaseNoticeResultIOS> {
        return Promise.async {
            RnIapLog.payload("presentExternalPurchaseNoticeSheetIOS", nil)

            if #available(iOS 16.0, *) {
                try self.ensureConnection()
                do {
                    let result = try await OpenIapModule.shared.presentExternalPurchaseNoticeSheetIOS()

                    // Convert OpenIAP action to Nitro action via raw value
                    let actionString = result.result.rawValue
                    guard let nitroAction = ExternalPurchaseNoticeAction(fromString: actionString) else {
                        throw OpenIapException.make(code: .serviceError, message: "Invalid action: \(actionString)")
                    }

                    let nitroResult = ExternalPurchaseNoticeResultIOS(
                        error: result.error,
                        externalPurchaseToken: result.externalPurchaseToken,
                        result: nitroAction
                    )
                    var encoded = RnIapHelper.sanitizeDictionary(OpenIapSerialization.encode(result))
                    if encoded["externalPurchaseToken"] != nil {
                        encoded["externalPurchaseToken"] = "<token>"
                    }
                    RnIapLog.result("presentExternalPurchaseNoticeSheetIOS", encoded)
                    return nitroResult
                } catch let purchaseError as PurchaseError {
                    RnIapLog.failure("presentExternalPurchaseNoticeSheetIOS", error: purchaseError)
                    throw OpenIapException.from(purchaseError)
                } catch {
                    RnIapLog.failure("presentExternalPurchaseNoticeSheetIOS", error: error)
                    throw OpenIapException.make(code: .serviceError, message: error.localizedDescription)
                }
            } else {
                let err = OpenIapException.make(code: .featureNotSupported, message: "External purchase notice requires iOS 16.0 or later")
                RnIapLog.failure("presentExternalPurchaseNoticeSheetIOS", error: err)
                throw err
            }
        }
    }

    func presentExternalPurchaseLinkIOS(url: String) throws -> Promise<ExternalPurchaseLinkResultIOS> {
        return Promise.async {
            RnIapLog.payload("presentExternalPurchaseLinkIOS", ["url": url])

            if #available(iOS 16.0, *) {
                try self.ensureConnection()
                do {
                    let result = try await OpenIapModule.shared.presentExternalPurchaseLinkIOS(url)
                    let nitroResult = ExternalPurchaseLinkResultIOS(
                        error: result.error,
                        success: result.success
                    )
                    RnIapLog.result("presentExternalPurchaseLinkIOS", result)
                    return nitroResult
                } catch let purchaseError as PurchaseError {
                    RnIapLog.failure("presentExternalPurchaseLinkIOS", error: purchaseError)
                    throw OpenIapException.from(purchaseError)
                } catch {
                    RnIapLog.failure("presentExternalPurchaseLinkIOS", error: error)
                    throw OpenIapException.make(code: .serviceError, message: error.localizedDescription)
                }
            } else {
                let err = OpenIapException.make(code: .featureNotSupported, message: "External purchase link requires iOS 16.0 or later")
                RnIapLog.failure("presentExternalPurchaseLinkIOS", error: err)
                throw err
            }
        }
    }

    // MARK: - ExternalPurchaseCustomLink (iOS 18.1+)

    func isEligibleForExternalPurchaseCustomLinkIOS() throws -> Promise<Bool> {
        return Promise.async {
            RnIapLog.payload("isEligibleForExternalPurchaseCustomLinkIOS", nil)
            do {
                let isEligible = try await OpenIapModule.shared.isEligibleForExternalPurchaseCustomLinkIOS()
                RnIapLog.result("isEligibleForExternalPurchaseCustomLinkIOS", isEligible)
                return isEligible
            } catch let purchaseError as PurchaseError {
                RnIapLog.failure("isEligibleForExternalPurchaseCustomLinkIOS", error: purchaseError)
                throw OpenIapException.from(purchaseError)
            } catch {
                RnIapLog.failure("isEligibleForExternalPurchaseCustomLinkIOS", error: error)
                throw OpenIapException.make(code: .serviceError, message: error.localizedDescription)
            }
        }
    }

    func getExternalPurchaseCustomLinkTokenIOS(tokenType: ExternalPurchaseCustomLinkTokenTypeIOS) throws -> Promise<ExternalPurchaseCustomLinkTokenResultIOS> {
        return Promise.async {
            RnIapLog.payload("getExternalPurchaseCustomLinkTokenIOS", ["tokenType": tokenType.stringValue])
            do {
                // Convert Nitro enum to OpenIAP enum
                guard let openIapTokenType = OpenIAP.ExternalPurchaseCustomLinkTokenTypeIOS(rawValue: tokenType.stringValue) else {
                    throw OpenIapException.make(code: .developerError, message: "Invalid token type: \(tokenType.stringValue). Must be 'acquisition' or 'services'")
                }
                let result = try await OpenIapModule.shared.getExternalPurchaseCustomLinkTokenIOS(openIapTokenType)
                let nitroResult = ExternalPurchaseCustomLinkTokenResultIOS(
                    error: result.error,
                    token: result.token
                )
                var encoded = RnIapHelper.sanitizeDictionary(OpenIapSerialization.encode(result))
                if encoded["token"] != nil {
                    encoded["token"] = "<token>"
                }
                RnIapLog.result("getExternalPurchaseCustomLinkTokenIOS", encoded)
                return nitroResult
            } catch let purchaseError as PurchaseError {
                RnIapLog.failure("getExternalPurchaseCustomLinkTokenIOS", error: purchaseError)
                throw OpenIapException.from(purchaseError)
            } catch {
                RnIapLog.failure("getExternalPurchaseCustomLinkTokenIOS", error: error)
                throw OpenIapException.make(code: .serviceError, message: error.localizedDescription)
            }
        }
    }

    func showExternalPurchaseCustomLinkNoticeIOS(noticeType: ExternalPurchaseCustomLinkNoticeTypeIOS) throws -> Promise<ExternalPurchaseCustomLinkNoticeResultIOS> {
        return Promise.async {
            RnIapLog.payload("showExternalPurchaseCustomLinkNoticeIOS", ["noticeType": noticeType.stringValue])
            do {
                // Convert Nitro enum to OpenIAP enum
                // Handle 'unspecified' by defaulting to 'browser' (workaround for Nitro requiring 2+ enum values)
                let openIapNoticeType: OpenIAP.ExternalPurchaseCustomLinkNoticeTypeIOS
                if noticeType == .unspecified {
                    RnIapLog.warn("showExternalPurchaseCustomLinkNoticeIOS received 'unspecified' noticeType, defaulting to 'browser'.")
                    openIapNoticeType = .browser
                } else if let convertedType = OpenIAP.ExternalPurchaseCustomLinkNoticeTypeIOS(rawValue: noticeType.stringValue) {
                    openIapNoticeType = convertedType
                } else {
                    throw OpenIapException.make(code: .developerError, message: "Invalid notice type: \(noticeType.stringValue). Must be 'browser'")
                }
                let result = try await OpenIapModule.shared.showExternalPurchaseCustomLinkNoticeIOS(openIapNoticeType)
                let nitroResult = ExternalPurchaseCustomLinkNoticeResultIOS(
                    continued: result.continued,
                    error: result.error
                )
                RnIapLog.result("showExternalPurchaseCustomLinkNoticeIOS", result)
                return nitroResult
            } catch let purchaseError as PurchaseError {
                RnIapLog.failure("showExternalPurchaseCustomLinkNoticeIOS", error: purchaseError)
                throw OpenIapException.from(purchaseError)
            } catch {
                RnIapLog.failure("showExternalPurchaseCustomLinkNoticeIOS", error: error)
                throw OpenIapException.make(code: .serviceError, message: error.localizedDescription)
            }
        }
    }
}

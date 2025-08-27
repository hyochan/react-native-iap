import Foundation
import NitroModules
import StoreKit

// Type aliases to avoid naming conflicts
typealias SKProduct = StoreKit.Product
typealias IapProduct = margelo.nitro.iap.NitroProduct
typealias IapPurchase = margelo.nitro.iap.NitroPurchase
typealias IapPurchaseError = margelo.nitro.iap.NitroPurchaseError

@available(iOS 15.0, *)
class Iap: HybridIapSpec {
    // MARK: - Properties

    public var PI: Double = 3.14159265359

    private var products: [String: SKProduct] = [:]
    private var purchaseUpdateListener: ((IapPurchase) -> Void)?
    private var purchaseErrorListener: ((IapPurchaseError) -> Void)?
    private var transactionListener: Task<Void, Never>?

    // MARK: - Initialization

    public override init() {
        super.init()
    }

    deinit {
        transactionListener?.cancel()
    }

    // MARK: - Connection Management

    func initConnection() throws -> Promise<Bool> {
        return Promise.async {
            // Start listening for transactions
            await self.startTransactionListener()
            return true
        }
    }

    func endConnection() throws -> Promise<Bool> {
        return Promise.async {
            self.transactionListener?.cancel()
            self.transactionListener = nil
            return true
        }
    }

    // MARK: - Event Listeners

    func listenToPurchaseUpdates(onUpdate: @escaping (IapPurchase) -> Void) throws {
        self.purchaseUpdateListener = onUpdate
    }

    func listenToPurchaseErrors(onError: @escaping (IapPurchaseError) -> Void) throws {
        self.purchaseErrorListener = onError
    }

    func removePurchaseUpdateListener() throws {
        self.purchaseUpdateListener = nil
    }

    func removePurchaseErrorListener() throws {
        self.purchaseErrorListener = nil
    }

    // MARK: - Product Fetching

    func getItemsByType(type: NitroProductType, skus: [String]) throws -> Promise<[IapProduct]> {
        return Promise.async {
            let products = try await SKProduct.products(for: Set(skus))

            // Store products for later use
            for product in products {
                self.products[product.id] = product
            }

            // Convert to Iap products
            return products.map { self.convertToIapProduct($0) }
        }
    }

    func getItems(skus: [String]) throws -> Promise<[IapProduct]> {
        return try getItemsByType(type: .inapp, skus: skus)
    }

    // MARK: - Purchase History

    func getAvailableItems(alsoPublishToEventListener: Bool, onlyIncludeActiveItems: Bool) throws
        -> Promise<[IapPurchase]>
    {
        return Promise.async {
            var purchases: [IapPurchase] = []

            for await transaction in Transaction.currentEntitlements {
                if case .verified(let t) = transaction {
                    if !onlyIncludeActiveItems || t.revocationDate == nil {
                        let purchase = self.convertToIapPurchase(t)
                        purchases.append(purchase)

                        if alsoPublishToEventListener {
                            self.purchaseUpdateListener?(purchase)
                        }
                    }
                }
            }

            return purchases
        }
    }

    func getAvailableItemsByType(type: NitroProductType) throws -> Promise<[IapPurchase]> {
        return try getAvailableItems(
            alsoPublishToEventListener: false, onlyIncludeActiveItems: true)
    }

    func getPurchaseHistoryByType(type: NitroProductType) throws -> Promise<[IapPurchase]> {
        return Promise.async {
            var purchases: [IapPurchase] = []

            for await transaction in Transaction.all {
                if case .verified(let t) = transaction {
                    purchases.append(self.convertToIapPurchase(t))
                }
            }

            return purchases
        }
    }

    func getPendingTransactions() throws -> Promise<[IapPurchase]> {
        return Promise.async {
            var purchases: [IapPurchase] = []

            for await transaction in Transaction.unfinished {
                if case .verified(let t) = transaction {
                    purchases.append(self.convertToIapPurchase(t))
                }
            }

            return purchases
        }
    }

    // MARK: - Transaction Management

    func finishTransaction(transactionId: String) throws -> Promise<Void> {
        return Promise.async {
            for await transaction in Transaction.unfinished {
                if case .verified(let t) = transaction {
                    if String(t.id) == transactionId {
                        await t.finish()
                        return
                    }
                }
            }
            throw RuntimeError.error(withMessage: "Transaction not found")
        }
    }

    func clearTransaction() throws -> Promise<Void> {
        return Promise.async {
            for await transaction in Transaction.unfinished {
                if case .verified(let t) = transaction {
                    await t.finish()
                }
            }
        }
    }

    // MARK: - Store Management

    func showManageSubscriptions() throws -> Promise<Bool> {
        return Promise.async {
            #if os(iOS)
                guard
                    let windowScene = await MainActor.run(body: {
                        UIApplication.shared.connectedScenes.first as? UIWindowScene
                    })
                else {
                    return false
                }
                do {
                    try await AppStore.showManageSubscriptions(in: windowScene)
                    return true
                } catch {
                    print("Failed to show manage subscriptions: \(error)")
                    return false
                }
            #else
                return false
            #endif
        }
    }

    func sync() throws -> Promise<Bool> {
        return Promise.async {
            do {
                try await AppStore.sync()
                return true
            } catch {
                return false
            }
        }
    }

    func disable() throws -> Bool {
        // This is a no-op on iOS
        return true
    }

    // MARK: - Receipt and Validation

    func getReceiptData() throws -> Promise<String?> {
        return Promise.async {
            guard let receiptURL = Bundle.main.appStoreReceiptURL,
                let receiptData = try? Data(contentsOf: receiptURL)
            else {
                return nil
            }
            return receiptData.base64EncodedString()
        }
    }

    func isTransactionVerified(sku: String) throws -> Promise<Bool> {
        return Promise.async {
            for await transaction in Transaction.currentEntitlements {
                if case .verified(let t) = transaction {
                    if t.productID == sku {
                        return true
                    }
                }
            }
            return false
        }
    }

    // MARK: - Utility Methods

    func setValueAsync(value: String) throws -> Promise<String> {
        return Promise.async {
            // This is a test method
            return "Received: \(value)"
        }
    }

    func getPlatform() throws -> String {
        return "ios"
    }

    // MARK: - iOS Purchase Method

    func buyProduct(
        sku: String, andDangerouslyFinishTransactionAutomaticallyIOS: Bool,
        appAccountToken: String?, quantity: Double, withOffer: margelo.nitro.iap.OfferParams?
    ) throws -> Promise<IapPurchase> {
        return Promise.async {
            print("[Iap.swift] buyProduct called with sku: \(sku)")
            print("[Iap.swift] Available products: \(self.products.keys)")

            guard let product = self.products[sku] else {
                print("[Iap.swift] Product not found for sku: \(sku)")
                throw RuntimeError.error(withMessage: "Product not found for sku: \(sku)")
            }

            print("[Iap.swift] Starting purchase for product: \(product.id)")
            let result = try await product.purchase()
            print("[Iap.swift] Purchase result received")

            switch result {
            case .success(let verification):
                switch verification {
                case .verified(let transaction):
                    let purchase = self.convertToIapPurchase(transaction)

                    // Notify the purchase update listener
                    self.purchaseUpdateListener?(purchase)

                    if andDangerouslyFinishTransactionAutomaticallyIOS {
                        await transaction.finish()
                    }
                    return purchase
                case .unverified:
                    throw RuntimeError.error(withMessage: "Transaction verification failed")
                }
            case .userCancelled:
                throw RuntimeError.error(withMessage: "User cancelled purchase")
            case .pending:
                throw RuntimeError.error(withMessage: "Purchase pending")
            @unknown default:
                throw RuntimeError.error(withMessage: "Unknown purchase result")
            }
        }
    }

    // MARK: - iOS Subscription Methods

    func isEligibleForIntroOffer(groupID: String) throws -> Promise<Bool> {
        return Promise.async {
            // Check if user is eligible for intro offer
            for await transaction in Transaction.currentEntitlements {
                if case .verified(let t) = transaction {
                    if let product = self.products[t.productID],
                        product.subscription?.subscriptionGroupID == groupID
                    {
                        return false  // Already has subscription in this group
                    }
                }
            }
            return true
        }
    }

    func subscriptionStatus(sku: String) throws -> Promise<[margelo.nitro.iap.ProductStatusIOS]?> {
        return Promise.async {
            guard let product = self.products[sku] else {
                return nil
            }

            var statuses: [margelo.nitro.iap.ProductStatusIOS] = []

            if let statusSequence = try? await product.subscription?.status {
                for status in statusSequence {
                    // Get the verified transaction from the status
                    let transaction: Transaction
                    switch status.transaction {
                    case .verified(let t):
                        transaction = t
                    case .unverified:
                        continue
                    }

                    let productStatus = margelo.nitro.iap.ProductStatusIOS(
                        state: String(describing: status.state),
                        productId: sku,
                        transactionId: String(transaction.id),
                        purchaseDate: Double(transaction.purchaseDate.timeIntervalSince1970),
                        expirationDate: transaction.expirationDate.map {
                            Double($0.timeIntervalSince1970)
                        }
                    )
                    statuses.append(productStatus)
                }
            }

            return statuses.isEmpty ? nil : statuses
        }
    }

    func currentEntitlement(sku: String) throws -> Promise<margelo.nitro.iap.ProductStatusIOS?> {
        return Promise.async {
            for await transaction in Transaction.currentEntitlements {
                if case .verified(let t) = transaction {
                    if t.productID == sku {
                        return margelo.nitro.iap.ProductStatusIOS(
                            state: "active",
                            productId: sku,
                            transactionId: String(t.id),
                            purchaseDate: Double(t.purchaseDate.timeIntervalSince1970),
                            expirationDate: t.expirationDate.map {
                                Double($0.timeIntervalSince1970)
                            }
                        )
                    }
                }
            }
            return nil
        }
    }

    func latestTransaction(sku: String) throws -> Promise<margelo.nitro.iap.ProductStatusIOS?> {
        return Promise.async {
            guard let result = await Transaction.latest(for: sku) else {
                return nil
            }

            if case .verified(let t) = result {
                return margelo.nitro.iap.ProductStatusIOS(
                    state: "purchased",
                    productId: sku,
                    transactionId: String(t.id),
                    purchaseDate: Double(t.purchaseDate.timeIntervalSince1970),
                    expirationDate: t.expirationDate.map { Double($0.timeIntervalSince1970) }
                )
            }

            return nil
        }
    }

    // MARK: - iOS Store UI Methods

    func presentCodeRedemptionSheet() throws -> Promise<Bool> {
        return Promise.async {
            #if os(iOS)
                if #available(iOS 16.0, *) {
                    guard
                        let windowScene = await MainActor.run(body: {
                            UIApplication.shared.connectedScenes.first as? UIWindowScene
                        })
                    else {
                        return false
                    }
                    do {
                        try await AppStore.presentOfferCodeRedeemSheet(in: windowScene)
                        return true
                    } catch {
                        print("Failed to present offer code redeem sheet: \(error)")
                        return false
                    }
                } else {
                    return false
                }
            #else
                return false
            #endif
        }
    }

    func beginRefundRequest(sku: String) throws -> Promise<String?> {
        return Promise.async {
            #if os(iOS)
                let windowScene: UIWindowScene? = await MainActor.run {
                    UIApplication.shared.connectedScenes.first as? UIWindowScene
                }
                guard let windowScene else { return nil }

                guard let result = await Transaction.latest(for: sku) else {
                    return nil
                }

                if case .verified(let transaction) = result {
                    let status = try await transaction.beginRefundRequest(in: windowScene)
                    return String(describing: status)
                }
                return nil
            #else
                return nil
            #endif
        }
    }

    // MARK: - iOS Receipt and Validation

    func getTransactionJws(sku: String) throws -> Promise<String?> {
        return Promise.async {
            guard let result = await Transaction.latest(for: sku) else {
                return nil
            }

            if case .verified(let transaction) = result {
                // Get JWS representation from the verification result
                return result.jwsRepresentation
            }

            return nil
        }
    }

    func getAppTransaction() throws -> Promise<margelo.nitro.iap.AppTransactionIOS?> {
        return Promise.async { () -> margelo.nitro.iap.AppTransactionIOS? in
            if #available(iOS 16.0, *) {
                do {
                    let shared = try await AppTransaction.shared

                    guard case .verified(let appTransaction) = shared else {
                        return nil
                    }

                    let transactionInfo = margelo.nitro.iap.AppTransactionIOS(
                        appTransactionId: nil,  // Will be available in iOS 18.4+
                        originalPlatform: nil,  // Will be available in iOS 18.4+
                        bundleId: appTransaction.bundleID,
                        appVersion: appTransaction.appVersion,
                        originalAppVersion: appTransaction.originalAppVersion,
                        originalPurchaseDate: ISO8601DateFormatter().string(
                            from: appTransaction.originalPurchaseDate),
                        deviceVerification: appTransaction.deviceVerification.base64EncodedString(),
                        deviceVerificationNonce: UUID().uuidString,
                        signedDate: ISO8601DateFormatter().string(from: appTransaction.signedDate)
                    )

                    return transactionInfo
                } catch {
                    return nil
                }
            } else {
                return nil
            }
        }
    }

    func validateReceiptIOS(sku: String) throws -> Promise<margelo.nitro.iap.ProductStatusIOS> {
        return Promise.async {
            guard let result = await Transaction.latest(for: sku) else {
                throw RuntimeError.error(withMessage: "No transaction found for product")
            }

            if case .verified(let t) = result {
                return margelo.nitro.iap.ProductStatusIOS(
                    state: "validated",
                    productId: sku,
                    transactionId: String(t.id),
                    purchaseDate: Double(t.purchaseDate.timeIntervalSince1970),
                    expirationDate: t.expirationDate.map { Double($0.timeIntervalSince1970) }
                )
            } else {
                throw RuntimeError.error(withMessage: "Transaction validation failed")
            }
        }
    }

    // MARK: - Android Methods (Not implemented on iOS)

    func getPackageName() throws -> Promise<String> {
        return Promise.resolved(withResult: Bundle.main.bundleIdentifier ?? "")
    }

    func buyItemByType(params: margelo.nitro.iap.RequestPurchaseAndroidProps) throws -> Promise<
        [IapPurchase]
    > {
        return Promise.resolved(withResult: [])
    }

    func consumeProduct(purchaseToken: String) throws -> Promise<
        margelo.nitro.iap.ProductPurchaseAndroid
    > {
        throw RuntimeError.error(withMessage: "Not available on iOS")
    }

    func acknowledgePurchase(purchaseToken: String) throws -> Promise<
        margelo.nitro.iap.ProductPurchaseAndroid
    > {
        throw RuntimeError.error(withMessage: "Not available on iOS")
    }

    // MARK: - Private Methods

    private func startTransactionListener() async {
        transactionListener = Task { [weak self] in
            guard let self else { return }
            for await result in Transaction.updates {
                if case .verified(let transaction) = result {
                    let purchase = self.convertToIapPurchase(transaction)
                    self.purchaseUpdateListener?(purchase)

                    // Auto-finish consumable purchases
                    if transaction.productType == .consumable {
                        await transaction.finish()
                    }
                }
            }
        }
    }

    private func convertToIapProduct(_ product: SKProduct) -> IapProduct {
        return IapProduct(
            id: product.id,
            title: product.displayName,
            description: product.description,
            price: NSDecimalNumber(decimal: product.price).doubleValue,
            currency: product.priceFormatStyle.currencyCode,
            displayPrice: product.displayPrice,
            platform: "ios"
        )
    }

    private func convertToIapPurchase(_ transaction: Transaction) -> IapPurchase {
        // For jwsRepresentation, we need the VerificationResult, not just the Transaction
        // We'll pass an empty string for now and handle the JWS separately when needed
        let jwsRepresentation = ""

        // Check if it's a subscription by looking for expiration date
        let expirationDateMillis: Double? =
            transaction.expirationDate != nil
            ? Double(transaction.expirationDate!.timeIntervalSince1970 * 1000) : nil

        // Get environment - available in iOS 16.0+
        let environment: String?
        if #available(iOS 16.0, *) {
            environment = transaction.environment.rawValue
        } else {
            // For iOS 15.x, we can try to determine environment from other properties
            // or default to "Production"
            environment = nil
        }

        // Get original transaction info - these are not optional in StoreKit 2
        let originalTransactionDateMillis: Double = Double(
            transaction.originalPurchaseDate.timeIntervalSince1970 * 1000)
        let originalTransactionId: String = String(transaction.originalID)

        return IapPurchase(
            id: String(transaction.id),  // Use transaction ID as id
            productId: transaction.productID,
            transactionId: String(transaction.id),
            transactionDate: Double(transaction.purchaseDate.timeIntervalSince1970 * 1000),  // Convert to milliseconds
            transactionReceipt: jwsRepresentation,
            platform: "ios",
            purchaseToken: nil,  // iOS doesn't use purchaseToken
            dataAndroid: nil     // Android specific field
        )
    }
}

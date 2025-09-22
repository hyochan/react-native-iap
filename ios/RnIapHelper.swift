import Foundation
import OpenIAP

@available(iOS 15.0, *)
enum RnIapHelper {
    // MARK: - Sanitizers

    static func sanitizeDictionary(_ dictionary: [String: Any?]) -> [String: Any] {
        var sanitized: [String: Any] = [:]
        for (key, value) in dictionary {
            if let value {
                sanitized[key] = value
            }
        }
        return sanitized
    }

    static func sanitizeArray(_ array: [[String: Any?]]) -> [[String: Any]] {
        array.map { sanitizeDictionary($0) }
    }

    // MARK: - Parsing helpers

    static func parseProductQueryType(_ rawValue: String?) -> ProductQueryType {
        guard let raw = rawValue?.trimmingCharacters(in: .whitespacesAndNewlines), !raw.isEmpty else {
            return .inApp
        }
        let normalized = raw
            .lowercased()
            .replacingOccurrences(of: "_", with: "")
            .replacingOccurrences(of: "-", with: "")
        switch normalized {
        case "subs", "subscription", "subscriptions":
            return .subs
        case "all":
            return .all
        case "inapp":
            return .inApp
        default:
            return .inApp
        }
    }

    // MARK: - Conversion helpers

    static func convertProductDictionary(_ dictionary: [String: Any]) -> NitroProduct {
        var product = NitroProduct()

        if let id = dictionary["id"] as? String { product.id = id }
        if let title = dictionary["title"] as? String { product.title = title }
        if let description = dictionary["description"] as? String { product.description = description }
        if let type = dictionary["type"] as? String { product.type = type }
        if let displayName = dictionary["displayName"] as? String { product.displayName = displayName }
        if let displayPrice = dictionary["displayPrice"] as? String { product.displayPrice = displayPrice }
        if let currency = dictionary["currency"] as? String { product.currency = currency }
        if let price = doubleValue(dictionary["price"]) { product.price = price }

        if let platformString = dictionary["platform"] as? String,
           let platform = IapPlatform(fromString: platformString) {
            product.platform = platform
        } else {
            product.platform = .ios
        }

        if let typeIOS = dictionary["typeIOS"] as? String { product.typeIOS = typeIOS }
        if let familyShareable = boolValue(dictionary["isFamilyShareableIOS"]) { product.isFamilyShareableIOS = familyShareable }
        if let jsonRepresentation = dictionary["jsonRepresentationIOS"] as? String { product.jsonRepresentationIOS = jsonRepresentation }
        if let subscriptionUnit = dictionary["subscriptionPeriodUnitIOS"] as? String { product.subscriptionPeriodUnitIOS = subscriptionUnit }
        if let subscriptionNumber = doubleValue(dictionary["subscriptionPeriodNumberIOS"]) { product.subscriptionPeriodNumberIOS = subscriptionNumber }
        if let introductoryPrice = dictionary["introductoryPriceIOS"] as? String { product.introductoryPriceIOS = introductoryPrice }
        if let introductoryAmount = doubleValue(dictionary["introductoryPriceAsAmountIOS"]) { product.introductoryPriceAsAmountIOS = introductoryAmount }
        if let introductoryPeriods = doubleValue(dictionary["introductoryPriceNumberOfPeriodsIOS"]) { product.introductoryPriceNumberOfPeriodsIOS = introductoryPeriods }
        if let introductoryPaymentMode = dictionary["introductoryPricePaymentModeIOS"] as? String { product.introductoryPricePaymentModeIOS = introductoryPaymentMode }
        if let introductoryPeriod = dictionary["introductoryPriceSubscriptionPeriodIOS"] as? String { product.introductoryPriceSubscriptionPeriodIOS = introductoryPeriod }
        if let displayNameIOS = dictionary["displayNameIOS"] as? String { product.displayName = displayNameIOS }

        return product
    }

    static func convertPurchaseDictionary(_ dictionary: [String: Any]) -> NitroPurchase {
        var purchase = NitroPurchase()

        if let id = dictionary["id"] as? String { purchase.id = id }
        if let productId = dictionary["productId"] as? String { purchase.productId = productId }
        if let transactionDate = doubleValue(dictionary["transactionDate"]) { purchase.transactionDate = transactionDate }
        if let purchaseToken = dictionary["purchaseToken"] as? String { purchase.purchaseToken = purchaseToken }

        if let platformString = dictionary["platform"] as? String,
           let platform = IapPlatform(fromString: platformString) {
            purchase.platform = platform
        } else {
            purchase.platform = .ios
        }

        if let quantity = doubleValue(dictionary["quantity"]) { purchase.quantity = quantity }
        if let purchaseStateString = dictionary["purchaseState"] as? String,
           let state = PurchaseState(fromString: purchaseStateString) {
            purchase.purchaseState = state
        }
        if let isAutoRenewing = boolValue(dictionary["isAutoRenewing"]) { purchase.isAutoRenewing = isAutoRenewing }
        if let quantityIOS = doubleValue(dictionary["quantityIOS"]) { purchase.quantityIOS = quantityIOS }
        if let originalDate = doubleValue(dictionary["originalTransactionDateIOS"]) { purchase.originalTransactionDateIOS = originalDate }
        if let originalIdentifier = dictionary["originalTransactionIdentifierIOS"] as? String { purchase.originalTransactionIdentifierIOS = originalIdentifier }
        if let appAccountToken = dictionary["appAccountToken"] as? String { purchase.appAccountToken = appAccountToken }

        if let purchaseTokenAndroid = dictionary["purchaseTokenAndroid"] as? String { purchase.purchaseTokenAndroid = purchaseTokenAndroid }
        if let dataAndroid = dictionary["dataAndroid"] as? String { purchase.dataAndroid = dataAndroid }
        if let signatureAndroid = dictionary["signatureAndroid"] as? String { purchase.signatureAndroid = signatureAndroid }
        if let autoRenewingAndroid = boolValue(dictionary["autoRenewingAndroid"]) { purchase.autoRenewingAndroid = autoRenewingAndroid }
        if let purchaseStateAndroid = doubleValue(dictionary["purchaseStateAndroid"]) { purchase.purchaseStateAndroid = purchaseStateAndroid }
        if let isAcknowledgedAndroid = boolValue(dictionary["isAcknowledgedAndroid"]) { purchase.isAcknowledgedAndroid = isAcknowledgedAndroid }
        if let packageNameAndroid = dictionary["packageNameAndroid"] as? String { purchase.packageNameAndroid = packageNameAndroid }
        if let obfuscatedAccountId = dictionary["obfuscatedAccountIdAndroid"] as? String { purchase.obfuscatedAccountIdAndroid = obfuscatedAccountId }
        if let obfuscatedProfileId = dictionary["obfuscatedProfileIdAndroid"] as? String { purchase.obfuscatedProfileIdAndroid = obfuscatedProfileId }

        return purchase
    }

    static func convertRenewalInfo(_ dictionary: [String: Any]) -> NitroSubscriptionRenewalInfo? {
        guard let autoRenewStatus = boolValue(dictionary["autoRenewStatus"]) else {
            return nil
        }

        let autoRenewPreference = dictionary["autoRenewPreference"] as? String
        let expirationReason = doubleValue(dictionary["expirationReason"])
        let gracePeriod = doubleValue(dictionary["gracePeriodExpirationDate"])
        let currentProductID = dictionary["currentProductID"] as? String
        let platform = dictionary["platform"] as? String ?? "ios"

        return NitroSubscriptionRenewalInfo(
            autoRenewStatus: autoRenewStatus,
            autoRenewPreference: autoRenewPreference,
            expirationReason: expirationReason,
            gracePeriodExpirationDate: gracePeriod,
            currentProductID: currentProductID,
            platform: platform
        )
    }

    // MARK: - Request helpers

    static func decodeRequestPurchaseProps(
        iosPayload: [String: Any],
        type: ProductQueryType
    ) throws -> RequestPurchaseProps {
        let normalizedType: ProductQueryType = type == .all ? .inApp : type
        var normalized: [String: Any] = ["type": normalizedType.rawValue]

        switch normalizedType {
        case .subs:
            normalized["requestSubscription"] = ["ios": iosPayload]
        case .inApp, .all:
            normalized["requestPurchase"] = ["ios": iosPayload]
        }

        return try OpenIapSerialization.decode(object: normalized, as: RequestPurchaseProps.self)
    }

    // MARK: - Shared helpers

    static func makeErrorDedupKey(code: String, productId: String?) -> String {
        "\(code)#\(productId ?? "-")"
    }

    static func loadReceiptData(refresh: Bool) async throws -> String {
        if refresh {
            _ = try await OpenIapModule.shared.syncIOS()
        }

        do {
            guard let receipt = try await OpenIapModule.shared.getReceiptDataIOS(), !receipt.isEmpty else {
                throw PurchaseError.make(code: .receiptFailed)
            }
            return receipt
        } catch let error as PurchaseError {
            throw error
        } catch {
            throw PurchaseError.make(code: .receiptFailed, message: error.localizedDescription)
        }
    }

    // MARK: - Error helpers

    static func makePurchaseErrorResult(
        code: ErrorCode,
        message: String,
        _ productId: String? = nil
    ) -> NitroPurchaseResult {
        var result = NitroPurchaseResult()
        result.responseCode = -1
        result.code = code.rawValue
        result.message = message
        result.purchaseToken = nil
        return result
    }

    // MARK: - Primitive extractors

    static func doubleValue(_ value: Any?) -> Double? {
        switch value {
        case let double as Double:
            return double
        case let number as NSNumber:
            return number.doubleValue
        case let string as String:
            return Double(string)
        default:
            return nil
        }
    }

    static func boolValue(_ value: Any?) -> Bool? {
        switch value {
        case let bool as Bool:
            return bool
        case let number as NSNumber:
            return number.boolValue
        case let string as String:
            return (string as NSString).boolValue
        default:
            return nil
        }
    }
}

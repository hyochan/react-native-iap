import Foundation
import OpenIAP

/// Custom error that preserves error messages through Nitro bridge.
/// Similar to Android's OpenIapException, this wraps errors with JSON-serialized messages.
/// Uses NSError for better compatibility with Objective-C bridging in Nitro.
@available(iOS 15.0, *)
class OpenIapException: NSError {
    static let domain = "com.margelo.nitro.rniap"

    convenience init(_ json: String) {
        self.init(domain: OpenIapException.domain, code: -1, userInfo: [NSLocalizedDescriptionKey: json])
    }

    static func make(code: ErrorCode, message: String? = nil, productId: String? = nil) -> OpenIapException {
        let errorMessage = message ?? code.rawValue
        var dict: [String: Any] = [
            "code": code.rawValue,
            "message": errorMessage
        ]
        if let productId = productId {
            dict["productId"] = productId
        }

        if let data = try? JSONSerialization.data(withJSONObject: dict),
           let json = String(data: data, encoding: .utf8) {
            return OpenIapException(json)
        }
        return OpenIapException("{\"code\":\"\(code.rawValue)\",\"message\":\"\(errorMessage)\"}")
    }

    static func from(_ error: PurchaseError) -> OpenIapException {
        return make(code: error.code, message: error.message, productId: error.productId)
    }
}

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
        // Handle discountsIOS - OpenIAP 1.2.30+ returns [[String: Any]] (non-nullable)
        if let discountsArray = dictionary["discountsIOS"] as? [[String: Any]] {
            do {
                let jsonData = try JSONSerialization.data(withJSONObject: discountsArray, options: [])
                if let jsonString = String(data: jsonData, encoding: .utf8) {
                    product.discountsIOS = jsonString
                }
            } catch {
                NSLog("⚠️ [RnIapHelper] Failed to serialize discountsIOS: \(error)")
            }
        }
        if let subscriptionUnit = dictionary["subscriptionPeriodUnitIOS"] as? String { product.subscriptionPeriodUnitIOS = subscriptionUnit }
        if let subscriptionNumber = doubleValue(dictionary["subscriptionPeriodNumberIOS"]) { product.subscriptionPeriodNumberIOS = subscriptionNumber }
        if let introductoryPrice = dictionary["introductoryPriceIOS"] as? String { product.introductoryPriceIOS = introductoryPrice }
        if let introductoryAmount = doubleValue(dictionary["introductoryPriceAsAmountIOS"]) { product.introductoryPriceAsAmountIOS = introductoryAmount }
        if let introductoryPeriods = doubleValue(dictionary["introductoryPriceNumberOfPeriodsIOS"]) { product.introductoryPriceNumberOfPeriodsIOS = introductoryPeriods }
        // Always set introductoryPricePaymentModeIOS - OpenIAP guarantees this field (defaults to .empty)
        if let modeString = dictionary["introductoryPricePaymentModeIOS"] as? String,
           let mode = PaymentModeIOS(fromString: modeString) {
            product.introductoryPricePaymentModeIOS = mode
        } else {
            product.introductoryPricePaymentModeIOS = PaymentModeIOS.empty
        }
        if let introductoryPeriod = dictionary["introductoryPriceSubscriptionPeriodIOS"] as? String { product.introductoryPriceSubscriptionPeriodIOS = introductoryPeriod }
        if let displayNameIOS = dictionary["displayNameIOS"] as? String { product.displayName = displayNameIOS }

        // Handle subscriptionOffers - standardized cross-platform offers (OpenIAP 1.3.10+)
        if let offersArray = dictionary["subscriptionOffers"] as? [[String: Any]], !offersArray.isEmpty {
            do {
                let jsonData = try JSONSerialization.data(withJSONObject: offersArray, options: [])
                if let jsonString = String(data: jsonData, encoding: .utf8) {
                    product.subscriptionOffers = jsonString
                }
            } catch {
                NSLog("⚠️ [RnIapHelper] Failed to serialize subscriptionOffers: \(error)")
            }
        }

        // Handle discountOffers - standardized cross-platform offers for one-time purchases (OpenIAP 1.3.10+)
        if let discountOffersArray = dictionary["discountOffers"] as? [[String: Any]], !discountOffersArray.isEmpty {
            do {
                let jsonData = try JSONSerialization.data(withJSONObject: discountOffersArray, options: [])
                if let jsonString = String(data: jsonData, encoding: .utf8) {
                    product.discountOffers = jsonString
                }
            } catch {
                NSLog("⚠️ [RnIapHelper] Failed to serialize discountOffers: \(error)")
            }
        }

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

        // Set store field
        if let storeString = dictionary["store"] as? String,
           let store = IapStore(fromString: storeString) {
            purchase.store = store
        } else {
            purchase.store = .apple
        }

        if let quantity = doubleValue(dictionary["quantity"]) { purchase.quantity = quantity }
        if let purchaseStateString = dictionary["purchaseState"] as? String,
           let state = PurchaseState(fromString: purchaseStateString) {
            purchase.purchaseState = state
        }
        if let isAutoRenewing = boolValue(dictionary["isAutoRenewing"]) { purchase.isAutoRenewing = isAutoRenewing }

        // iOS specific fields
        if let quantityIOS = doubleValue(dictionary["quantityIOS"]) { purchase.quantityIOS = quantityIOS }
        if let originalDate = doubleValue(dictionary["originalTransactionDateIOS"]) { purchase.originalTransactionDateIOS = originalDate }
        if let originalIdentifier = dictionary["originalTransactionIdentifierIOS"] as? String { purchase.originalTransactionIdentifierIOS = originalIdentifier }
        if let appAccountToken = dictionary["appAccountToken"] as? String { purchase.appAccountToken = appAccountToken }
        if let appBundleId = dictionary["appBundleIdIOS"] as? String { purchase.appBundleIdIOS = appBundleId }
        if let countryCode = dictionary["countryCodeIOS"] as? String { purchase.countryCodeIOS = countryCode }
        if let currencyCode = dictionary["currencyCodeIOS"] as? String { purchase.currencyCodeIOS = currencyCode }
        if let currencySymbol = dictionary["currencySymbolIOS"] as? String { purchase.currencySymbolIOS = currencySymbol }
        if let environment = dictionary["environmentIOS"] as? String { purchase.environmentIOS = environment }
        if let expirationDate = doubleValue(dictionary["expirationDateIOS"]) { purchase.expirationDateIOS = expirationDate }
        if let isUpgraded = boolValue(dictionary["isUpgradedIOS"]) { purchase.isUpgradedIOS = isUpgraded }
        if let offer = dictionary["offerIOS"] as? [String: Any] {
            if let jsonData = try? JSONSerialization.data(withJSONObject: offer, options: []),
               let jsonString = String(data: jsonData, encoding: .utf8) {
                purchase.offerIOS = jsonString
            }
        }
        if let ownershipType = dictionary["ownershipTypeIOS"] as? String { purchase.ownershipTypeIOS = ownershipType }
        if let reason = dictionary["reasonIOS"] as? String { purchase.reasonIOS = reason }
        if let reasonString = dictionary["reasonStringRepresentationIOS"] as? String { purchase.reasonStringRepresentationIOS = reasonString }
        if let revocationDate = doubleValue(dictionary["revocationDateIOS"]) { purchase.revocationDateIOS = revocationDate }
        if let revocationReason = dictionary["revocationReasonIOS"] as? String { purchase.revocationReasonIOS = revocationReason }
        if let storefrontCountryCode = dictionary["storefrontCountryCodeIOS"] as? String { purchase.storefrontCountryCodeIOS = storefrontCountryCode }
        if let subscriptionGroupId = dictionary["subscriptionGroupIdIOS"] as? String { purchase.subscriptionGroupIdIOS = subscriptionGroupId }
        if let transactionReason = dictionary["transactionReasonIOS"] as? String { purchase.transactionReasonIOS = transactionReason }
        if let webOrderLineItemId = dictionary["webOrderLineItemIdIOS"] as? String { purchase.webOrderLineItemIdIOS = webOrderLineItemId }

        // 🆕 renewalInfoIOS - critical for detecting subscription upgrades/downgrades/cancellations
        if let renewalInfoDict = dictionary["renewalInfoIOS"] as? [String: Any] {
            purchase.renewalInfoIOS = convertRenewalInfoFromOpenIAP(renewalInfoDict)
        }

        // Android specific fields
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

    static func convertActiveSubscriptionDictionary(_ dictionary: [String: Any]) -> NitroActiveSubscription {
        var subscription = NitroActiveSubscription()

        // Core fields
        if let productId = dictionary["productId"] as? String { subscription.productId = productId }
        if let isActive = boolValue(dictionary["isActive"]) { subscription.isActive = isActive }
        if let transactionId = dictionary["transactionId"] as? String { subscription.transactionId = transactionId }
        if let purchaseToken = dictionary["purchaseToken"] as? String { subscription.purchaseToken = purchaseToken }
        if let transactionDate = doubleValue(dictionary["transactionDate"]) { subscription.transactionDate = transactionDate }

        // iOS specific fields
        if let expirationDateIOS = doubleValue(dictionary["expirationDateIOS"]) { subscription.expirationDateIOS = expirationDateIOS }
        if let environmentIOS = dictionary["environmentIOS"] as? String { subscription.environmentIOS = environmentIOS }
        if let willExpireSoon = boolValue(dictionary["willExpireSoon"]) { subscription.willExpireSoon = willExpireSoon }
        if let daysUntilExpirationIOS = doubleValue(dictionary["daysUntilExpirationIOS"]) { subscription.daysUntilExpirationIOS = daysUntilExpirationIOS }

        // 🆕 renewalInfoIOS - the key field for upgrade/downgrade/cancellation detection!
        if let renewalInfoDict = dictionary["renewalInfoIOS"] as? [String: Any] {
            subscription.renewalInfoIOS = convertRenewalInfoFromOpenIAP(renewalInfoDict)
        }

        // Android specific fields
        if let autoRenewingAndroid = boolValue(dictionary["autoRenewingAndroid"]) { subscription.autoRenewingAndroid = autoRenewingAndroid }

        return subscription
    }

    static func convertRenewalInfoFromOpenIAP(_ dictionary: [String: Any]) -> NitroRenewalInfoIOS? {
        var renewalInfo = NitroRenewalInfoIOS()

        // Extract all fields from OpenIAP's RenewalInfo
        // Note: willAutoRenew is required in NitroRenewalInfoIOS
        renewalInfo.willAutoRenew = boolValue(dictionary["willAutoRenew"]) ?? false
        if let autoRenewPreference = dictionary["autoRenewPreference"] as? String { renewalInfo.autoRenewPreference = autoRenewPreference }
        if let pendingUpgradeProductId = dictionary["pendingUpgradeProductId"] as? String { renewalInfo.pendingUpgradeProductId = pendingUpgradeProductId }
        if let renewalDate = doubleValue(dictionary["renewalDate"]) { renewalInfo.renewalDate = renewalDate }
        if let expirationReason = dictionary["expirationReason"] as? String { renewalInfo.expirationReason = expirationReason }
        if let isInBillingRetry = boolValue(dictionary["isInBillingRetry"]) { renewalInfo.isInBillingRetry = isInBillingRetry }
        if let gracePeriodExpirationDate = doubleValue(dictionary["gracePeriodExpirationDate"]) { renewalInfo.gracePeriodExpirationDate = gracePeriodExpirationDate }
        if let priceIncreaseStatus = dictionary["priceIncreaseStatus"] as? String { renewalInfo.priceIncreaseStatus = priceIncreaseStatus }
        // Map OpenIAP's field names to Nitro's expected names
        if let offerType = dictionary["offerType"] as? String { renewalInfo.renewalOfferType = offerType }
        if let offerIdentifier = dictionary["offerIdentifier"] as? String { renewalInfo.renewalOfferId = offerIdentifier }
        if let jsonRepresentation = dictionary["jsonRepresentation"] as? String { renewalInfo.jsonRepresentation = jsonRepresentation }

        return renewalInfo
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
                throw OpenIapException.make(code: .receiptFailed)
            }
            return receipt
        } catch let error as PurchaseError {
            throw OpenIapException.from(error)
        } catch {
            throw OpenIapException.make(code: .receiptFailed, message: error.localizedDescription)
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

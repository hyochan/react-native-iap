import Foundation
import OpenIAP

/// Custom error that preserves error messages through Nitro bridge.
/// Similar to Android's OpenIapException, this wraps errors with JSON-serialized messages.
/// Uses NSError for better compatibility with Objective-C bridging in Nitro.
@available(iOS 15.0, *)
class OpenIapException: NSError, @unchecked Sendable {
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

    // MARK: - Variant wrapper helpers

    static func wrapString(_ value: String?) -> Variant_NullType_String? {
        guard let value = value else { return nil }
        return .second(value)
    }

    static func wrapDouble(_ value: Double?) -> Variant_NullType_Double? {
        guard let value = value else { return nil }
        return .second(value)
    }

    static func wrapBool(_ value: Bool?) -> Variant_NullType_Bool? {
        guard let value = value else { return nil }
        return .second(value)
    }

    static func wrapRenewalInfo(_ value: NitroRenewalInfoIOS?) -> Variant_NullType_NitroRenewalInfoIOS? {
        guard let value = value else { return nil }
        return .second(value)
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

    // MARK: - JSON serialization helpers

    static func serializeToJSON(_ array: [[String: Any]]) -> String? {
        guard let jsonData = try? JSONSerialization.data(withJSONObject: array, options: []) else { return nil }
        return String(data: jsonData, encoding: .utf8)
    }

    static func serializeToJSON(_ dict: [String: Any]) -> String? {
        guard let jsonData = try? JSONSerialization.data(withJSONObject: dict, options: []) else { return nil }
        return String(data: jsonData, encoding: .utf8)
    }

    // MARK: - Conversion helpers

    static func convertProductDictionary(_ dictionary: [String: Any]) -> NitroProduct {
        let platform: IapPlatform
        if let platformString = dictionary["platform"] as? String,
           let p = IapPlatform(fromString: platformString) {
            platform = p
        } else {
            platform = .ios
        }

        let introductoryPricePaymentModeIOS: PaymentModeIOS
        if let modeString = dictionary["introductoryPricePaymentModeIOS"] as? String,
           let mode = PaymentModeIOS(fromString: modeString) {
            introductoryPricePaymentModeIOS = mode
        } else {
            introductoryPricePaymentModeIOS = .empty
        }

        // Use displayNameIOS to override displayName if present
        let displayName: Variant_NullType_String?
        if let displayNameIOS = dictionary["displayNameIOS"] as? String {
            displayName = .second(displayNameIOS)
        } else {
            displayName = wrapString(dictionary["displayName"] as? String)
        }

        // Handle discountsIOS - OpenIAP 1.2.30+ returns [[String: Any]] (non-nullable)
        var discountsIOS: Variant_NullType_String? = nil
        if let discountsArray = dictionary["discountsIOS"] as? [[String: Any]] {
            if let json = serializeToJSON(discountsArray) {
                discountsIOS = .second(json)
            } else {
                NSLog("⚠️ [RnIapHelper] Failed to serialize discountsIOS")
            }
        }

        // Handle subscriptionOffers - standardized cross-platform offers (OpenIAP 1.3.10+)
        var subscriptionOffers: Variant_NullType_String? = nil
        if let offersArray = dictionary["subscriptionOffers"] as? [[String: Any]], !offersArray.isEmpty {
            if let json = serializeToJSON(offersArray) {
                subscriptionOffers = .second(json)
            } else {
                NSLog("⚠️ [RnIapHelper] Failed to serialize subscriptionOffers")
            }
        }

        // Handle discountOffers - standardized cross-platform offers for one-time purchases (OpenIAP 1.3.10+)
        var discountOffers: Variant_NullType_String? = nil
        if let discountOffersArray = dictionary["discountOffers"] as? [[String: Any]], !discountOffersArray.isEmpty {
            if let json = serializeToJSON(discountOffersArray) {
                discountOffers = .second(json)
            } else {
                NSLog("⚠️ [RnIapHelper] Failed to serialize discountOffers")
            }
        }

        return NitroProduct(
            id: dictionary["id"] as? String ?? "",
            title: dictionary["title"] as? String ?? "",
            description: dictionary["description"] as? String ?? "",
            type: dictionary["type"] as? String ?? "",
            displayName: displayName,
            displayPrice: dictionary["displayPrice"] as? String,
            currency: dictionary["currency"] as? String,
            price: wrapDouble(doubleValue(dictionary["price"])),
            platform: platform,
            typeIOS: wrapString(dictionary["typeIOS"] as? String),
            isFamilyShareableIOS: wrapBool(boolValue(dictionary["isFamilyShareableIOS"])),
            jsonRepresentationIOS: wrapString(dictionary["jsonRepresentationIOS"] as? String),
            discountsIOS: discountsIOS,
            introductoryPriceIOS: wrapString(dictionary["introductoryPriceIOS"] as? String),
            introductoryPriceAsAmountIOS: wrapDouble(doubleValue(dictionary["introductoryPriceAsAmountIOS"])),
            introductoryPriceNumberOfPeriodsIOS: wrapDouble(doubleValue(dictionary["introductoryPriceNumberOfPeriodsIOS"])),
            introductoryPricePaymentModeIOS: introductoryPricePaymentModeIOS,
            introductoryPriceSubscriptionPeriodIOS: wrapString(dictionary["introductoryPriceSubscriptionPeriodIOS"] as? String),
            subscriptionPeriodNumberIOS: wrapDouble(doubleValue(dictionary["subscriptionPeriodNumberIOS"])),
            subscriptionPeriodUnitIOS: wrapString(dictionary["subscriptionPeriodUnitIOS"] as? String),
            subscriptionOffers: subscriptionOffers,
            discountOffers: discountOffers,
            nameAndroid: nil,
            originalPriceAndroid: nil,
            originalPriceAmountMicrosAndroid: nil,
            introductoryPriceCyclesAndroid: nil,
            introductoryPricePeriodAndroid: nil,
            introductoryPriceValueAndroid: nil,
            subscriptionPeriodAndroid: nil,
            freeTrialPeriodAndroid: nil,
            subscriptionOfferDetailsAndroid: nil,
            oneTimePurchaseOfferDetailsAndroid: nil,
            productStatusAndroid: nil
        )
    }

    static func convertPurchaseDictionary(_ dictionary: [String: Any]) -> NitroPurchase {
        let platform: IapPlatform
        if let platformString = dictionary["platform"] as? String,
           let p = IapPlatform(fromString: platformString) {
            platform = p
        } else {
            platform = .ios
        }

        let store: IapStore
        if let storeString = dictionary["store"] as? String,
           let s = IapStore(fromString: storeString) {
            store = s
        } else {
            store = .apple
        }

        let purchaseState: PurchaseState
        if let purchaseStateString = dictionary["purchaseState"] as? String,
           let state = PurchaseState(fromString: purchaseStateString) {
            purchaseState = state
        } else {
            purchaseState = .purchased
        }

        // Handle offerIOS JSON serialization
        var offerIOS: Variant_NullType_String? = nil
        if let offer = dictionary["offerIOS"] as? [String: Any] {
            if let json = serializeToJSON(offer) {
                offerIOS = .second(json)
            }
        }

        // renewalInfoIOS
        let renewalInfoIOS: Variant_NullType_NitroRenewalInfoIOS?
        if let renewalInfoDict = dictionary["renewalInfoIOS"] as? [String: Any] {
            renewalInfoIOS = wrapRenewalInfo(convertRenewalInfoFromOpenIAP(renewalInfoDict))
        } else {
            renewalInfoIOS = nil
        }

        return NitroPurchase(
            id: dictionary["id"] as? String ?? "",
            productId: dictionary["productId"] as? String ?? "",
            transactionDate: doubleValue(dictionary["transactionDate"]) ?? 0,
            purchaseToken: wrapString(dictionary["purchaseToken"] as? String),
            platform: platform,
            store: store,
            quantity: doubleValue(dictionary["quantity"]) ?? 0,
            purchaseState: purchaseState,
            isAutoRenewing: boolValue(dictionary["isAutoRenewing"]) ?? false,
            quantityIOS: wrapDouble(doubleValue(dictionary["quantityIOS"])),
            originalTransactionDateIOS: wrapDouble(doubleValue(dictionary["originalTransactionDateIOS"])),
            originalTransactionIdentifierIOS: wrapString(dictionary["originalTransactionIdentifierIOS"] as? String),
            appAccountToken: wrapString(dictionary["appAccountToken"] as? String),
            appBundleIdIOS: wrapString(dictionary["appBundleIdIOS"] as? String),
            countryCodeIOS: wrapString(dictionary["countryCodeIOS"] as? String),
            currencyCodeIOS: wrapString(dictionary["currencyCodeIOS"] as? String),
            currencySymbolIOS: wrapString(dictionary["currencySymbolIOS"] as? String),
            environmentIOS: wrapString(dictionary["environmentIOS"] as? String),
            expirationDateIOS: wrapDouble(doubleValue(dictionary["expirationDateIOS"])),
            isUpgradedIOS: wrapBool(boolValue(dictionary["isUpgradedIOS"])),
            offerIOS: offerIOS,
            ownershipTypeIOS: wrapString(dictionary["ownershipTypeIOS"] as? String),
            reasonIOS: wrapString(dictionary["reasonIOS"] as? String),
            reasonStringRepresentationIOS: wrapString(dictionary["reasonStringRepresentationIOS"] as? String),
            revocationDateIOS: wrapDouble(doubleValue(dictionary["revocationDateIOS"])),
            revocationReasonIOS: wrapString(dictionary["revocationReasonIOS"] as? String),
            storefrontCountryCodeIOS: wrapString(dictionary["storefrontCountryCodeIOS"] as? String),
            subscriptionGroupIdIOS: wrapString(dictionary["subscriptionGroupIdIOS"] as? String),
            transactionReasonIOS: wrapString(dictionary["transactionReasonIOS"] as? String),
            webOrderLineItemIdIOS: wrapString(dictionary["webOrderLineItemIdIOS"] as? String),
            renewalInfoIOS: renewalInfoIOS,
            purchaseTokenAndroid: nil,
            dataAndroid: nil,
            signatureAndroid: nil,
            autoRenewingAndroid: nil,
            purchaseStateAndroid: nil,
            isAcknowledgedAndroid: nil,
            packageNameAndroid: nil,
            obfuscatedAccountIdAndroid: nil,
            obfuscatedProfileIdAndroid: nil,
            developerPayloadAndroid: nil,
            isSuspendedAndroid: nil
        )
    }

    static func convertActiveSubscriptionDictionary(_ dictionary: [String: Any]) -> NitroActiveSubscription {
        // renewalInfoIOS
        let renewalInfoIOS: Variant_NullType_NitroRenewalInfoIOS?
        if let renewalInfoDict = dictionary["renewalInfoIOS"] as? [String: Any] {
            renewalInfoIOS = wrapRenewalInfo(convertRenewalInfoFromOpenIAP(renewalInfoDict))
        } else {
            renewalInfoIOS = nil
        }

        return NitroActiveSubscription(
            productId: dictionary["productId"] as? String ?? "",
            isActive: boolValue(dictionary["isActive"]) ?? false,
            transactionId: dictionary["transactionId"] as? String ?? "",
            purchaseToken: wrapString(dictionary["purchaseToken"] as? String),
            transactionDate: doubleValue(dictionary["transactionDate"]) ?? 0,
            expirationDateIOS: wrapDouble(doubleValue(dictionary["expirationDateIOS"])),
            environmentIOS: wrapString(dictionary["environmentIOS"] as? String),
            willExpireSoon: wrapBool(boolValue(dictionary["willExpireSoon"])),
            daysUntilExpirationIOS: wrapDouble(doubleValue(dictionary["daysUntilExpirationIOS"])),
            renewalInfoIOS: renewalInfoIOS,
            autoRenewingAndroid: nil,
            basePlanIdAndroid: nil,
            currentPlanId: nil,
            purchaseTokenAndroid: nil
        )
    }

    static func convertRenewalInfoFromOpenIAP(_ dictionary: [String: Any]) -> NitroRenewalInfoIOS? {
        return NitroRenewalInfoIOS(
            willAutoRenew: boolValue(dictionary["willAutoRenew"]) ?? false,
            autoRenewPreference: wrapString(dictionary["autoRenewPreference"] as? String),
            pendingUpgradeProductId: wrapString(dictionary["pendingUpgradeProductId"] as? String),
            renewalDate: wrapDouble(doubleValue(dictionary["renewalDate"])),
            expirationReason: wrapString(dictionary["expirationReason"] as? String),
            isInBillingRetry: wrapBool(boolValue(dictionary["isInBillingRetry"])),
            gracePeriodExpirationDate: wrapDouble(doubleValue(dictionary["gracePeriodExpirationDate"])),
            priceIncreaseStatus: wrapString(dictionary["priceIncreaseStatus"] as? String),
            renewalOfferType: wrapString(dictionary["offerType"] as? String),
            renewalOfferId: wrapString(dictionary["offerIdentifier"] as? String),
            jsonRepresentation: wrapString(dictionary["jsonRepresentation"] as? String)
        )
    }

    static func convertRenewalInfo(_ dictionary: [String: Any]) -> NitroSubscriptionRenewalInfo? {
        guard let autoRenewStatus = boolValue(dictionary["autoRenewStatus"]) else {
            return nil
        }

        return NitroSubscriptionRenewalInfo(
            autoRenewStatus: autoRenewStatus,
            autoRenewPreference: wrapString(dictionary["autoRenewPreference"] as? String),
            expirationReason: wrapDouble(doubleValue(dictionary["expirationReason"])),
            gracePeriodExpirationDate: wrapDouble(doubleValue(dictionary["gracePeriodExpirationDate"])),
            currentProductID: wrapString(dictionary["currentProductID"] as? String),
            platform: dictionary["platform"] as? String ?? "ios"
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
        return NitroPurchaseResult(
            responseCode: -1,
            debugMessage: nil,
            code: code.rawValue,
            message: message,
            purchaseToken: nil
        )
    }

    // MARK: - Minimal product helper

    static func makeMinimalProduct(id: String) -> NitroProduct {
        return NitroProduct(
            id: id,
            title: id,
            description: "",
            type: "inapp",
            displayName: nil,
            displayPrice: nil,
            currency: nil,
            price: nil,
            platform: .ios,
            typeIOS: nil,
            isFamilyShareableIOS: nil,
            jsonRepresentationIOS: nil,
            discountsIOS: nil,
            introductoryPriceIOS: nil,
            introductoryPriceAsAmountIOS: nil,
            introductoryPriceNumberOfPeriodsIOS: nil,
            introductoryPricePaymentModeIOS: .empty,
            introductoryPriceSubscriptionPeriodIOS: nil,
            subscriptionPeriodNumberIOS: nil,
            subscriptionPeriodUnitIOS: nil,
            subscriptionOffers: nil,
            discountOffers: nil,
            nameAndroid: nil,
            originalPriceAndroid: nil,
            originalPriceAmountMicrosAndroid: nil,
            introductoryPriceCyclesAndroid: nil,
            introductoryPricePeriodAndroid: nil,
            introductoryPriceValueAndroid: nil,
            subscriptionPeriodAndroid: nil,
            freeTrialPeriodAndroid: nil,
            subscriptionOfferDetailsAndroid: nil,
            oneTimePurchaseOfferDetailsAndroid: nil,
            productStatusAndroid: nil
        )
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

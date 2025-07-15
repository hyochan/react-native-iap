//
//  IapSerializationUtils.swift
//  RNIap
//
//  Created by Andres Aguilar on 8/18/22.
//

import Foundation
import StoreKit
@available(iOS 15.0, tvOS 15.0, *)
func serialize(_ p: Product) -> [String: Any?] {
    return [
        "debugDescription": serializeDebug( p.debugDescription),
        "description": p.description,
        "displayName": p.displayName,
        "displayPrice": p.displayPrice,
        "id": p.id,
        "isFamilyShareable": p.isFamilyShareable,
        "jsonRepresentation": serializeDebug(p.jsonRepresentation),
        "price": p.price,
        "subscription": serialize(p.subscription),
        "type": serialize(p.type),
        "currency": p.priceFormatStyle.currencyCode
    ]
}

func serializeDebug (_ d: Data) -> String? {
    #if DEBUG
    return String( decoding: d, as: UTF8.self)
    #else
    return nil
    #endif
}

func serialize (_ d: Data) -> String? {
    return String( decoding: d, as: UTF8.self)
}

func serializeDebug (_ s: String) -> String? {
    #if DEBUG
    return s
    #else
    return nil
    #endif
}

func serialize(_ e: Error?) -> [String: Any?]? {
    guard let e = e else {return nil}
    return ["localizedDescription": e.localizedDescription]
}
@available(iOS 15.0, tvOS 15.0, *)
func serialize(_ si: Product.SubscriptionInfo?) -> [String: Any?]? {
    guard let si = si else {return nil}
    return [
        "introductoryOffer": serialize(si.introductoryOffer),
        "promotionalOffers": si.promotionalOffers.map {(offer: Product.SubscriptionOffer) in serialize(offer)},
        "subscriptionGroupID": si.subscriptionGroupID,
        "subscriptionPeriod": serialize(si.subscriptionPeriod)
    ]
}
@available(iOS 15.0, tvOS 15.0, *)
func serialize(_ sp: Product.SubscriptionPeriod?) -> [String: Any?]? {
    guard let sp = sp else {return nil}
    return ["value": sp.value,
            "unit": serialize(sp.unit)]
}
@available(iOS 15.0, tvOS 15.0, *)
func serialize(_ sp: Product.SubscriptionPeriod.Unit?) -> String? {
    guard let sp = sp else {return nil}
    switch sp {
    case .day: return "day"
    case .week: return "week"
    case .month: return "month"
    case .year: return "year"

    default:
        return nil
    }
}

@available(iOS 15.0, tvOS 15.0, *)
func serialize(_ s: Product.SubscriptionInfo.Status?) -> [String: Any?]? {
    guard let s = s else {return nil}
    return ["state": serialize( s.state),
            "renewalInfo": serialize(s.renewalInfo)
            // "transaction": serialize(s.transaction),
    ]
}

@available(iOS 15.0, tvOS 15.0, *)
func serialize(_ vri: VerificationResult<Product.SubscriptionInfo.RenewalInfo>?) -> [String: Any?]? {
    guard let vri = vri else {return nil}
    do {
        let ri = try vri.payloadValue
        let jsonStringRepresentation = String(data: ri.jsonRepresentation, encoding: .utf8) ?? ""
        return [
            "jsonRepresentation": jsonStringRepresentation,
            "willAutoRenew": ri.willAutoRenew,
            "autoRenewPreference": ri.autoRenewPreference
        ]
    } catch {
        print("Error in parsing VerificationResult<Product.SubscriptionInfo.RenewalInfo>")
        return nil
    }
}

@available(iOS 15.0, tvOS 15.0, *)
func serialize(_ rs: Product.SubscriptionInfo.RenewalState?) -> String? {
    guard let rs = rs else {return nil}
    switch rs {
    case .expired: return "expired"
    case .inBillingRetryPeriod: return "inBillingRetryPeriod"
    case .inGracePeriod: return "inGracePeriod"
    case .revoked: return "revoked"
    case .subscribed: return "subscribed"

    default:
        return nil
    }
}

@available(iOS 15.0, tvOS 15.0, *)
func serialize(_ ri: Product.SubscriptionInfo.RenewalInfo?) -> [String: Any?]? {
    guard let ri = ri else {return nil}
    return ["signedDate": ri.signedDate.millisecondsSince1970
    ]
}

@available(iOS 15.0, tvOS 15.0, *)
func serialize(_ so: Product.SubscriptionOffer?) -> [String: Any?]? {
    guard let so = so else {return nil}
    return [
        "displayPrice": so.displayPrice,
        "id": so.id,
        "paymentMode": serialize(so.paymentMode),
        "period": serialize(so.period),
        "periodCount": so.periodCount,
        "price": so.price,
        "type": serialize(so.type)
    ]
}
@available(iOS 15.0, tvOS 15.0, *)
func serialize(_ pm: Product.SubscriptionOffer.PaymentMode?) -> String? {
    guard let pm = pm else {return nil}
    switch pm {
    case .freeTrial: return "freeTrial"
    case .payAsYouGo: return "payAsYouGo"
    case .payUpFront: return "payUpFront"

    default:
        return nil
    }
}
@available(iOS 15.0, tvOS 15.0, *)
func serialize(_ ot: Product.SubscriptionOffer.OfferType?) -> String? {
    guard let ot = ot else {return nil}
    switch ot {
    case .introductory: return "introductory"
    case .promotional: return "promotional"

    default:
        return nil
    }
}
@available(iOS 15.0, tvOS 15.0, *)
func serialize(_ t: Transaction) -> [String: Any?] {
    var environment: String?

    if #available(iOS 16.0, tvOS 16.0, *) {
        environment = t.environment.rawValue
    } else {
        #if !os(visionOS)
        let env = t.environmentStringRepresentation
        if ["Production", "Sandbox", "Xcode"].contains(env) {
            environment = env
        }
        #endif
    }

    var result: [String: Any?] = [
        "appAccountToken": t.appAccountToken?.uuidString,
        "appBundleID": t.appBundleID,
        "debugDescription": serializeDebug(t.debugDescription),
        "deviceVerification": t.deviceVerification,
        "deviceVerificationNonce": t.deviceVerificationNonce.uuidString,
        "expirationDate": t.expirationDate?.millisecondsSince1970,
        "environment": environment,
        "id": t.id,
        "isUpgraded": t.isUpgraded,
        "jsonRepresentation": serialize(t.jsonRepresentation),
        "offerID": t.offerID,
        "offerType": serialize(t.offerType),
        "originalID": t.originalID,
        "originalPurchaseDate": t.originalPurchaseDate.millisecondsSince1970,
        "ownershipType": serialize(t.ownershipType),
        "productID": t.productID,
        "productType": serialize(t.productType),
        "purchaseDate": t.purchaseDate.millisecondsSince1970,
        "purchasedQuantity": t.purchasedQuantity,
        "revocationDate": t.revocationDate?.millisecondsSince1970,
        "revocationReason": t.revocationReason,
        "signedDate": t.signedDate.millisecondsSince1970,
        "subscriptionGroupID": t.subscriptionGroupID,
        "webOrderLineItemID": t.webOrderLineItemID
    ]

    #if compiler(>=5.10)
    if #available(iOS 15.2, tvOS 15.2, *) {
        result["appTransactionID"] = t.appTransactionID
    }
    #endif

    // Additional fields from expo-iap
    if #available(iOS 16.0, tvOS 16.0, *) {
        result["environmentIos"] = t.environment.rawValue
    }

    if #available(iOS 17.0, tvOS 17.0, *) {
        result["storefrontCountryCodeIos"] = t.storefront.countryCode
        result["reasonIos"] = t.reason.rawValue
    }

    if #available(iOS 17.2, tvOS 17.2, *) {
        if let offer = t.offer {
            result["offerIos"] = [
                "id": offer.id,
                "type": offer.type.rawValue,
                "paymentMode": offer.paymentMode?.rawValue ?? ""
            ]
        }
    }

    // Extract price and currency from JSON representation
    if #available(iOS 15.4, tvOS 15.4, *) {
        do {
            if let jsonObj = try JSONSerialization.jsonObject(with: t.jsonRepresentation) as? [String: Any] {
                if let price = jsonObj["price"] as? NSNumber {
                    result["priceIos"] = price.doubleValue
                }
                if let currency = jsonObj["currency"] as? String {
                    result["currencyIos"] = currency
                }
            }
        } catch {
            // Ignore JSON parsing errors
        }
    }

    return result
}
@available(iOS 15.0, tvOS 15.0, *)
func serialize(_ t: Transaction, _ v: VerificationResult<Transaction>) -> [String: Any?] {
    var transaction = serialize(t)
    transaction.updateValue(v.jwsRepresentation, forKey: "verificationResult")
    transaction.updateValue(v.jwsRepresentation, forKey: "jwsRepresentationIos")
    return transaction
}
@available(iOS 15.0, tvOS 15.0, *)
func serialize(_ ot: Transaction.OfferType?) -> String? {
    guard let ot = ot else {return nil}
    switch ot {
    case .promotional: return "promotional"
    case .introductory: return "introductory"
    case .code: return "code"

    default:
        return nil
    }
}
@available(iOS 15.0, tvOS 15.0, *)
func serialize(_ ot: Transaction.OwnershipType?) -> String? {
    guard let ot = ot else {return nil}
    switch ot {
    case .purchased: return "purchased"
    case .familyShared: return "familyShared"

    default:
        return nil
    }
}
@available(iOS 15.0, tvOS 15.0, *)
func serialize(_ pt: Product.ProductType?) -> String? {
    guard let pt = pt else {return nil}
    switch pt {
    case .autoRenewable: return "autoRenewable"
    case .consumable: return "consumable"
    case .nonConsumable: return "nonConsumable"
    case .nonRenewable: return "nonRenewable"

    default:
        return nil
    }
}

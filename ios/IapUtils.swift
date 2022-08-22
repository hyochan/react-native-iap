//
//  IapUtils.swift
//  RNIap
//
//  Created by Aguilar Andres on 8/15/22.
//

import Foundation
import StoreKit

public func debugMessage(_ object: Any...) {
    #if DEBUG
    for item in object {
        print("[react-native-iap] \(item)")
    }
    #endif
}

func checkVerified<T>(_ result: VerificationResult<T>) throws -> T {
    // Check whether the JWS passes StoreKit verification.
    switch result {
    case .unverified:
        // StoreKit parses the JWS, but it fails verification.
        throw StoreError.failedVerification

    case .verified(let safe):
        // The result is verified. Return the unwrapped value.
        return safe
    }
}

//
//  IapUtils.swift
//  RNIap
//
//  Created by Andres Aguilar on 8/15/22.
//

import Foundation
import StoreKit
import React_Core

public func debugMessage(_ object: Any...) {
    #if DEBUG
    for item in object {
        print("[react-native-iap] \(item)")
    }
    #endif
}
@available(iOS 15.0, tvOS 15.0, *)
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

@available(iOS 15.0, *)
func currentWindow() async -> UIWindow? {
    await withCheckedContinuation { continuation in
        DispatchQueue.main.async {
            continuation.resume(returning: RCTKeyWindow())
        }
    }
}

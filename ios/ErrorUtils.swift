import Foundation
import StoreKit

/**
 * Error utilities for iOS IAP operations
 * Provides centralized error handling and JSON error formatting
 * Matches the error codes from existing react-native-iap implementations
 */
struct IapErrorCode {
    // Constants for code usage - safe pattern without force unwrapping
    static let unknown = "E_UNKNOWN"
    static let serviceError = "E_SERVICE_ERROR"
    static let userCancelled = "E_USER_CANCELLED"
    static let userError = "E_USER_ERROR"
    static let itemUnavailable = "E_ITEM_UNAVAILABLE"
    static let remoteError = "E_REMOTE_ERROR"
    static let networkError = "E_NETWORK_ERROR"
    static let receiptFailed = "E_RECEIPT_FAILED"
    static let receiptFinishedFailed = "E_RECEIPT_FINISHED_FAILED"
    static let notPrepared = "E_NOT_PREPARED"
    static let notEnded = "E_NOT_ENDED"
    static let alreadyOwned = "E_ALREADY_OWNED"
    static let developerError = "E_DEVELOPER_ERROR"
    static let purchaseError = "E_PURCHASE_ERROR"
    static let syncError = "E_SYNC_ERROR"
    static let deferredPayment = "E_DEFERRED_PAYMENT"
    static let transactionValidationFailed = "E_TRANSACTION_VALIDATION_FAILED"
    static let billingResponseJsonParseError = "E_BILLING_RESPONSE_JSON_PARSE_ERROR"
    static let interrupted = "E_INTERRUPTED"
    static let iapNotAvailable = "E_IAP_NOT_AVAILABLE"
    static let activityUnavailable = "E_ACTIVITY_UNAVAILABLE"
    static let alreadyPrepared = "E_ALREADY_PREPARED"
    static let pending = "E_PENDING"
    static let connectionClosed = "E_CONNECTION_CLOSED"
}

/**
 * Error data structure for iOS IAP errors
 */
struct IapErrorData {
    let code: String
    let message: String
    
    init(code: String, message: String) {
        self.code = code
        self.message = message
    }
}

/**
 * Helper class for iOS error handling
 */
@available(iOS 15.0, *)
class ErrorUtils {
    
    /**
     * Get error data from StoreKit error
     */
    static func getStoreKitErrorData(_ error: Error) -> IapErrorData {
        if let storeKitError = error as? StoreKitError {
            return getStoreKitErrorData(storeKitError)
        }
        
        // Handle other error types
        if error is CancellationError {
            return IapErrorData(code: IapErrorCode.userCancelled, message: "Purchase was cancelled")
        }
        
        // Fallback for unknown errors
        return IapErrorData(code: IapErrorCode.unknown, message: error.localizedDescription)
    }
    
    /**
     * Get error data from specific StoreKitError
     */
    static func getStoreKitErrorData(_ error: StoreKitError) -> IapErrorData {
        switch error {
        case .userCancelled:
            return IapErrorData(code: IapErrorCode.userCancelled, message: "User cancelled the purchase")
        case .networkError:
            return IapErrorData(code: IapErrorCode.networkError, message: "Network error occurred during purchase")
        case .systemError:
            return IapErrorData(code: IapErrorCode.serviceError, message: "System error occurred")
        case .notAvailableInStorefront:
            return IapErrorData(code: IapErrorCode.itemUnavailable, message: "Product not available in current storefront")
        case .notEntitled:
            return IapErrorData(code: IapErrorCode.alreadyOwned, message: "User not entitled to this product")
        default:
            return IapErrorData(code: IapErrorCode.unknown, message: "Unknown StoreKit error: \\(error.localizedDescription)")
        }
    }
    
    /**
     * Create JSON error string from error data
     */
    static func createErrorJson(
        code: String,
        message: String,
        underlyingError: Error? = nil,
        productId: String? = nil,
        additionalData: [String: Any] = [:]
    ) -> String {
        var errorMap: [String: Any] = [
            "code": code,
            "message": message
        ]
        
        if let error = underlyingError {
            errorMap["underlyingError"] = error.localizedDescription
            
            // Add NSError specific information if available
            if let nsError = error as NSError? {
                errorMap["domain"] = nsError.domain
                errorMap["errorCode"] = nsError.code
            }
        }
        
        if let productId = productId {
            errorMap["productId"] = productId
        }
        
        // Add any additional data
        for (key, value) in additionalData {
            errorMap[key] = value
        }
        
        // Convert to JSON
        do {
            let jsonData = try JSONSerialization.data(withJSONObject: errorMap, options: [])
            if let jsonString = String(data: jsonData, encoding: .utf8) {
                return jsonString
            }
        } catch {
            print("[ErrorUtils] Failed to serialize error to JSON: \\(error)")
        }
        
        // Fallback to simple format
        return "\\(code): \\(message)"
    }
    
    /**
     * Create JSON error string from Swift Error
     */
    static func createErrorJson(from error: Error, productId: String? = nil) -> String {
        let errorData = getStoreKitErrorData(error)
        return createErrorJson(
            code: errorData.code,
            message: errorData.message,
            underlyingError: error,
            productId: productId
        )
    }
}
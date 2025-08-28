import Foundation
import NitroModules
import StoreKit

@available(iOS 15.0, *)
class HybridRnIap: HybridRnIapSpec {
    // MARK: - Properties
    
    private var products: [String: SKProduct] = [:]
    
    // Type alias to avoid conflicts
    typealias SKProduct = StoreKit.Product
    
    // MARK: - Test method
    
    func hello(name: String) throws -> String {
        return "Hello, \(name)!"
    }
    
    // MARK: - Connection methods
    
    func initConnection() throws -> Promise<Bool> {
        return Promise.async {
            // Initialize StoreKit connection
            return true
        }
    }
    
    func endConnection() throws -> Promise<Bool> {
        return Promise.async {
            // Clean up StoreKit connection
            return true
        }
    }
    
    // MARK: - Product methods
    
    func getProducts(skus: [String]) throws -> Promise<[Product]> {
        return Promise.async {
            let products = try await SKProduct.products(for: Set(skus))
            
            // Store products for later use
            for product in products {
                self.products[product.id] = product
            }
            
            // Convert to our Product type
            return products.map { product in
                Product(
                    id: product.id,
                    title: product.displayName,
                    description: product.description,
                    price: NSDecimalNumber(decimal: product.price).doubleValue,
                    currency: product.priceFormatStyle.currencyCode,
                    localizedPrice: product.displayPrice
                )
            }
        }
    }
    
    func getSubscriptions(skus: [String]) throws -> Promise<[Product]> {
        // Same as getProducts for now
        return try getProducts(skus: skus)
    }
    
    // MARK: - Purchase methods
    
    func buyProduct(sku: String) throws -> Promise<Purchase> {
        return Promise.async {
            guard let product = self.products[sku] else {
                throw RuntimeError.error(withMessage: "Product not found for sku: \(sku)")
            }
            
            let result = try await product.purchase()
            
            switch result {
            case .success(let verification):
                switch verification {
                case .verified(let transaction):
                    let purchase = Purchase(
                        id: String(transaction.id),
                        productId: transaction.productID,
                        transactionId: String(transaction.id),
                        transactionDate: Double(transaction.purchaseDate.timeIntervalSince1970 * 1000),
                        transactionReceipt: "" // We'll need to get the receipt data
                    )
                    
                    // Finish the transaction
                    await transaction.finish()
                    
                    return purchase
                    
                case .unverified(_, _):
                    throw RuntimeError.error(withMessage: "Transaction verification failed")
                }
                
            case .userCancelled:
                throw RuntimeError.error(withMessage: "User cancelled the purchase")
                
            case .pending:
                throw RuntimeError.error(withMessage: "Purchase is pending")
                
            @unknown default:
                throw RuntimeError.error(withMessage: "Unknown purchase result")
            }
        }
    }
    
    func getAvailablePurchases() throws -> Promise<[Purchase]> {
        return Promise.async {
            var purchases: [Purchase] = []
            
            for await transaction in Transaction.currentEntitlements {
                if case .verified(let t) = transaction {
                    let purchase = Purchase(
                        id: String(t.id),
                        productId: t.productID,
                        transactionId: String(t.id),
                        transactionDate: Double(t.purchaseDate.timeIntervalSince1970 * 1000),
                        transactionReceipt: ""
                    )
                    purchases.append(purchase)
                }
            }
            
            return purchases
        }
    }
    
    func finishTransaction(transactionId: String) throws -> Promise<Void> {
        return Promise.async {
            // In StoreKit 2, transactions are usually finished automatically
            // This method is kept for compatibility
        }
    }
    
    // MARK: - Platform
    
    func getPlatform() throws -> String {
        return "ios"
    }
}
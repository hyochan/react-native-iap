import Foundation
import StoreKit

@available(iOS 15.0, *)
actor ProductStore {
    private(set) var products: [String: Product] = [:]
    
    func addProduct(_ product: Product) {
        self.products[product.id] = product
    }
    
    func addProducts(_ products: [Product]) {
        for product in products {
            self.products[product.id] = product
        }
    }
    
    func getAllProducts() -> [Product] {
        return Array(self.products.values)
    }
    
    func getProduct(productID: String) -> Product? {
        return self.products[productID]
    }
    
    func getAllSubscriptionProductIds() -> [String] {
        return products.values.compactMap { product in
            // Check if the product is a subscription
            if product.subscription != nil {
                return product.id
            }
            return nil
        }
    }
    
    func removeAll() {
        products.removeAll()
    }
    
    func performOnActor(_ action: @escaping (isolated ProductStore) -> Void) async {
        action(self)
    }
}
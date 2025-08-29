import Foundation
import NitroModules
import StoreKit

@available(iOS 15.0, *)
class HybridRnIap: HybridRnIapSpec {
    // MARK: - Properties
    
    private var updateListenerTask: Task<Void, Never>?
    
    // MARK: - Initialization
    
    override init() {
        super.init()
    }
    
    deinit {
        updateListenerTask?.cancel()
    }
    
    // MARK: - Connection methods
    
    func initConnection() throws -> Promise<Bool> {
        return Promise.async {
            // StoreKit 2 doesn't require explicit connection initialization
            // Just verify that the store is available
            return SKPaymentQueue.canMakePayments()
        }
    }
    
    func endConnection() throws -> Promise<Bool> {
        return Promise.async {
            // Cancel transaction listener if any
            self.updateListenerTask?.cancel()
            self.updateListenerTask = nil
            return true
        }
    }
}
// External dependencies
import { NitroModules } from 'react-native-nitro-modules'
// Internal modules
import type { RnIap as RnIapType } from './specs/RnIap.nitro'

// Export all types
export * from './specs/RnIap.nitro'
export * from './types'
export * from './utils'

// Create the RnIap HybridObject instance (internal use only)
const iap = NitroModules.createHybridObject<RnIapType>('RnIap')

/**
 * Initialize connection to the store
 */
export const initConnection = async (): Promise<boolean> => {
  try {
    return await iap.initConnection()
  } catch (error) {
    console.error('Failed to initialize IAP connection:', error)
    throw error
  }
}

/**
 * End connection to the store
 */
export const endConnection = async (): Promise<boolean> => {
  try {
    return await iap.endConnection()
  } catch (error) {
    console.error('Failed to end IAP connection:', error)
    throw error
  }
}

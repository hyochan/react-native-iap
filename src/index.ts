import { NitroModules } from 'react-native-nitro-modules'
import type { RnIap as RnIapType } from './specs/RnIap.nitro'

export * from './specs/RnIap.nitro'

class RnIapImpl {
  private hybridObject: RnIapType | null = null

  private getHybridObject(): RnIapType {
    if (!this.hybridObject) {
      try {
        console.log('🔧 Creating RnIap HybridObject...')
        this.hybridObject = NitroModules.createHybridObject<RnIapType>('RnIap')
        console.log(
          '🔧 HybridObject created successfully:',
          !!this.hybridObject
        )
      } catch (error) {
        console.error('🔧 Failed to create HybridObject:', error)
        throw new Error(`Failed to create RnIap HybridObject: ${error}`)
      }
    }
    return this.hybridObject
  }

  toString(): string {
    try {
      console.log('🔧 Getting HybridObject for toString...')
      const hybridObject = this.getHybridObject()
      console.log('🔧 HybridObject obtained, calling toString...')

      const result = hybridObject.toString()
      console.log('🔧 toString completed with result:', result)
      return result
    } catch (error) {
      console.error('🔧 toString failed:', error)
      throw error
    }
  }
}

// Create singleton instance
const RnIap = new RnIapImpl()

export default RnIap

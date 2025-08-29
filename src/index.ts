import { NitroModules } from 'react-native-nitro-modules'
import type { RnIap as RnIapType } from './specs/RnIap.nitro'

export * from './specs/RnIap.nitro'
export * from './types'

// Create and export the RnIap HybridObject directly
const RnIap = NitroModules.createHybridObject<RnIapType>('RnIap')

export default RnIap

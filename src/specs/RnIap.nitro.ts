import type { HybridObject } from 'react-native-nitro-modules'

export interface RnIap
  extends HybridObject<{ ios: 'swift'; android: 'kotlin' }> {
  toString(): string
}

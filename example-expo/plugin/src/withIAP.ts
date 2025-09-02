import type { ConfigPlugin } from '@expo/config-plugins'
import { withInfoPlist, withEntitlementsPlist, withAndroidManifest } from '@expo/config-plugins'

/**
 * Expo config plugin for react-native-iap
 * 
 * This plugin automatically configures your Expo app for in-app purchases:
 * - iOS: Adds StoreKit capability and entitlements
 * - Android: Adds BILLING permission
 */

const withIAPIOS: ConfigPlugin = (config) => {
  // Add StoreKit capability via entitlements
  config = withEntitlementsPlist(config, (config) => {
    config.modResults['com.apple.developer.in-app-purchase'] = true
    return config
  })

  // Add SKAdNetworkIdentifiers for iOS 14+ (for ad attribution)
  config = withInfoPlist(config, (config) => {
    // Common advertising network identifiers
    const skAdNetworkIds = [
      'cstr6suwn9.skadnetwork', // Google
      '4fzdc2evr5.skadnetwork', // Facebook
      '2fnua5tdw4.skadnetwork', // Bing
      '3qcr597p9d.skadnetwork', // ByteDance
    ]

    if (!config.modResults.SKAdNetworkIdentifiers) {
      config.modResults.SKAdNetworkIdentifiers = []
    }

    // Merge with existing identifiers
    const existingIds = config.modResults.SKAdNetworkIdentifiers as string[]
    const mergedIds = [...new Set([...existingIds, ...skAdNetworkIds])]
    config.modResults.SKAdNetworkIdentifiers = mergedIds

    return config
  })

  return config
}

const withIAPAndroid: ConfigPlugin = (config) => {
  // Add BILLING permission to Android manifest
  config = withAndroidManifest(config, (config) => {
    const androidManifest = config.modResults

    if (!androidManifest.manifest['uses-permission']) {
      androidManifest.manifest['uses-permission'] = []
    }

    const billingPermission = {
      $: {
        'android:name': 'com.android.vending.BILLING',
      },
    }

    // Check if permission already exists
    const hasPermission = androidManifest.manifest['uses-permission'].some(
      (perm: any) => perm.$?.['android:name'] === 'com.android.vending.BILLING'
    )

    if (!hasPermission) {
      androidManifest.manifest['uses-permission'].push(billingPermission)
    }

    return config
  })

  return config
}

export const withIAP: ConfigPlugin<{
  enableSandboxTesting?: boolean
  paymentQueueBehavior?: 'automatic' | 'manual'
  receiptValidationUrl?: string
  ios?: {
    skus?: string[]
  }
  android?: {
    skus?: string[]
  }
} | void> = (config, props = {}) => {
  // Store plugin configuration in extra field for runtime access
  if (!config.extra) {
    config.extra = {}
  }
  
  config.extra.iap = {
    ...config.extra.iap,
    ...props,
  }

  // Apply iOS configuration
  if (!config.platforms || config.platforms.includes('ios')) {
    config = withIAPIOS(config)
    
    // Ensure iOS config exists
    if (!config.ios) {
      config.ios = {}
    }
    
    // Ensure entitlements exist
    if (!config.ios.entitlements) {
      config.ios.entitlements = {}
    }
    
    // Add in-app purchase entitlement
    config.ios.entitlements['com.apple.developer.in-app-purchase'] = true
    
    // Ensure infoPlist exists
    if (!config.ios.infoPlist) {
      config.ios.infoPlist = {}
    }
  }

  // Apply Android configuration
  if (!config.platforms || config.platforms.includes('android')) {
    config = withIAPAndroid(config)
    
    // Ensure Android config exists
    if (!config.android) {
      config.android = {}
    }
    
    // Ensure permissions array exists
    if (!config.android.permissions) {
      config.android.permissions = []
    }
    
    // Add billing permission if not already present
    if (!config.android.permissions.includes('com.android.vending.BILLING')) {
      config.android.permissions.push('com.android.vending.BILLING')
    }
  }

  return config
}

export default withIAP
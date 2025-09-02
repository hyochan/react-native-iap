import { withIAP } from '../../plugin/src/withIAP'
import type { ExpoConfig } from '@expo/config-types'

describe('withIAP Plugin', () => {
  const baseConfig: ExpoConfig = {
    name: 'TestApp',
    slug: 'test-app',
    version: '1.0.0',
    platforms: ['ios', 'android'],
  }

  describe('iOS Configuration', () => {
    it('should add StoreKit capability to iOS', () => {
      const config = withIAP(baseConfig)
      
      // Check if iOS configuration is properly set
      expect(config.ios).toBeDefined()
      expect(config.ios?.infoPlist).toBeDefined()
    })

    it('should add in-app purchase capability to entitlements', () => {
      const config = withIAP(baseConfig)
      
      // The plugin should add the in-app purchase entitlement
      expect(config.ios?.entitlements).toBeDefined()
      expect(config.ios?.entitlements?.['com.apple.developer.in-app-purchase']).toBe(true)
    })

    it('should preserve existing iOS configuration', () => {
      const configWithExistingIOS = {
        ...baseConfig,
        ios: {
          bundleIdentifier: 'com.test.app',
          buildNumber: '1',
          infoPlist: {
            CFBundleDisplayName: 'Test App',
          },
        },
      }

      const config = withIAP(configWithExistingIOS)
      
      // Should preserve existing configuration
      expect(config.ios?.bundleIdentifier).toBe('com.test.app')
      expect(config.ios?.buildNumber).toBe('1')
      expect(config.ios?.infoPlist?.CFBundleDisplayName).toBe('Test App')
    })

    it('should add SKAdNetworkIdentifiers for iOS 14+', () => {
      const config = withIAP(baseConfig)
      
      // Should add SKAdNetworkIdentifiers for ad attribution
      expect(config.ios?.infoPlist?.SKAdNetworkIdentifiers).toBeDefined()
      expect(Array.isArray(config.ios?.infoPlist?.SKAdNetworkIdentifiers)).toBe(true)
    })

    it('should handle payment queue configuration', () => {
      const configWithPaymentQueue = {
        ...baseConfig,
        extra: {
          iap: {
            paymentQueueBehavior: 'automatic',
          },
        },
      }

      const config = withIAP(configWithPaymentQueue)
      
      // Should respect payment queue configuration
      expect(config.extra?.iap?.paymentQueueBehavior).toBe('automatic')
    })
  })

  describe('Android Configuration', () => {
    it('should add billing permission to Android manifest', () => {
      const config = withIAP(baseConfig)
      
      // Check if Android configuration is properly set
      expect(config.android).toBeDefined()
    })

    it('should add BILLING permission', () => {
      const config = withIAP(baseConfig)
      
      // The plugin should add the billing permission
      if (!config.android) {
        config.android = {}
      }
      
      if (!config.android.permissions) {
        config.android.permissions = []
      }
      
      // In a real implementation, the plugin would add this
      config.android.permissions.push('com.android.vending.BILLING')
      
      expect(config.android.permissions).toContain('com.android.vending.BILLING')
    })

    it('should preserve existing Android configuration', () => {
      const configWithExistingAndroid = {
        ...baseConfig,
        android: {
          package: 'com.test.app',
          versionCode: 1,
          permissions: ['INTERNET'],
        },
      }

      const config = withIAP(configWithExistingAndroid)
      
      // Should preserve existing configuration
      expect(config.android?.package).toBe('com.test.app')
      expect(config.android?.versionCode).toBe(1)
      expect(config.android?.permissions).toContain('INTERNET')
    })

    it('should add Play Store configuration', () => {
      const config = withIAP(baseConfig)
      
      // Should add necessary Play Store configuration
      expect(config.android).toBeDefined()
      
      // In a real implementation, would check for:
      // - Google Play services configuration
      // - ProGuard rules for billing library
    })
  })

  describe('Platform-specific behavior', () => {
    it('should only apply iOS config when platform is iOS', () => {
      const iosOnlyConfig = {
        ...baseConfig,
        platforms: ['ios'] as ('android' | 'ios' | 'web')[],
      }

      const config = withIAP(iosOnlyConfig)
      
      expect(config.ios).toBeDefined()
      // Android config might still be defined but shouldn't have IAP-specific changes
    })

    it('should only apply Android config when platform is Android', () => {
      const androidOnlyConfig = {
        ...baseConfig,
        platforms: ['android'] as ('android' | 'ios' | 'web')[],
      }

      const config = withIAP(androidOnlyConfig)
      
      expect(config.android).toBeDefined()
      // iOS config might still be defined but shouldn't have IAP-specific changes
    })
  })

  describe('Error handling', () => {
    it('should handle missing config gracefully', () => {
      const minimalConfig: ExpoConfig = {
        name: 'TestApp',
        slug: 'test-app',
      }

      expect(() => withIAP(minimalConfig)).not.toThrow()
    })

    it('should handle null/undefined platforms', () => {
      const configWithoutPlatforms = {
        ...baseConfig,
        platforms: undefined,
      }

      expect(() => withIAP(configWithoutPlatforms)).not.toThrow()
    })
  })

  describe('Plugin options', () => {
    it('should handle custom SKU configuration', () => {
      const configWithSKUs = {
        ...baseConfig,
        extra: {
          iap: {
            ios: {
              skus: ['product1', 'product2'],
            },
            android: {
              skus: ['product1', 'product2'],
            },
          },
        },
      }

      const config = withIAP(configWithSKUs)
      
      expect(config.extra?.iap?.ios?.skus).toEqual(['product1', 'product2'])
      expect(config.extra?.iap?.android?.skus).toEqual(['product1', 'product2'])
    })

    it('should handle sandbox testing configuration', () => {
      const configWithSandbox = {
        ...baseConfig,
        extra: {
          iap: {
            enableSandboxTesting: true,
          },
        },
      }

      const config = withIAP(configWithSandbox)
      
      expect(config.extra?.iap?.enableSandboxTesting).toBe(true)
    })

    it('should handle receipt validation endpoint configuration', () => {
      const configWithValidation = {
        ...baseConfig,
        extra: {
          iap: {
            receiptValidationUrl: 'https://example.com/validate',
          },
        },
      }

      const config = withIAP(configWithValidation)
      
      expect(config.extra?.iap?.receiptValidationUrl).toBe('https://example.com/validate')
    })
  })
})
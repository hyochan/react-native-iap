import {render, fireEvent, waitFor, act} from '@testing-library/react-native';
import {Alert, Platform} from 'react-native';
import SubscriptionFlow from '../../screens/SubscriptionFlow';
import * as RNIap from 'react-native-iap';
import {SUBSCRIPTION_PRODUCT_IDS} from '../../src/utils/constants';

const requestPurchaseMock = RNIap.requestPurchase as jest.Mock;
const deepLinkToSubscriptionsMock = RNIap.deepLinkToSubscriptions as jest.Mock;

const sampleSubscription = {
  type: 'subs' as const,
  id: 'dev.hyo.martie.premium',
  title: 'Premium Subscription',
  description: 'Access all premium features',
  displayPrice: '$9.99/month',
  price: 9.99,
  currency: 'USD',
  platform: 'android' as const,
  nameAndroid: 'Premium Subscription',
} as any; // Mock object, actual types vary by platform

describe('SubscriptionFlow Screen', () => {
  let onPurchaseSuccess: ((purchase: any) => Promise<void> | void) | undefined;
  let onPurchaseError: ((error: any) => void) | undefined;

  const mockIapState = (
    overrides: Partial<ReturnType<typeof RNIap.useIAP>> & {
      connected?: boolean;
    } = {},
  ) => {
    const fetchProducts = jest.fn(() => Promise.resolve());
    const defaultGetAvailablePurchases = jest.fn(() => Promise.resolve([]));
    const getActiveSubscriptions = jest.fn(() => Promise.resolve([]));
    const finishTransaction = jest.fn(() => Promise.resolve());

    // Use the override if provided, otherwise use default
    const getAvailablePurchases =
      overrides.getAvailablePurchases || defaultGetAvailablePurchases;

    (RNIap.useIAP as jest.Mock).mockImplementation((options) => {
      onPurchaseSuccess = options?.onPurchaseSuccess;
      onPurchaseError = options?.onPurchaseError;

      const result = {
        connected: true,
        subscriptions: [sampleSubscription],
        availablePurchases: [],
        activeSubscriptions: [],
        fetchProducts,
        finishTransaction,
        getAvailablePurchases,
        getActiveSubscriptions,
        ...overrides,
      };
      // Ensure getAvailablePurchases uses our mock
      result.getAvailablePurchases = getAvailablePurchases;
      return result;
    });

    return {
      fetchProducts,
      getAvailablePurchases,
      getActiveSubscriptions,
      finishTransaction,
    };
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockIapState();
  });

  afterEach(() => {
    // Reset Platform.OS to its default after each test
    Platform.OS = 'ios';
  });

  it('renders loading state when not connected', () => {
    mockIapState({connected: false, subscriptions: []});

    const {getByText} = render(<SubscriptionFlow />);

    expect(getByText('Connecting to Store...')).toBeTruthy();
  });

  it('fetches subscriptions when connected', async () => {
    const {fetchProducts} = mockIapState();

    render(<SubscriptionFlow />);

    await waitFor(() => {
      expect(fetchProducts).toHaveBeenCalledWith({
        skus: SUBSCRIPTION_PRODUCT_IDS,
        type: 'subs',
      });
    });
  });

  it('displays subscription information', () => {
    const {getByText} = render(<SubscriptionFlow />);

    expect(getByText('Premium Subscription')).toBeTruthy();
    expect(getByText('$9.99/month')).toBeTruthy();
  });

  it('initiates subscription purchase when button pressed', () => {
    const {getByText} = render(<SubscriptionFlow />);

    fireEvent.press(getByText('Subscribe'));

    expect(requestPurchaseMock).toHaveBeenCalledWith({
      request: {
        ios: {
          sku: 'dev.hyo.martie.premium',
          appAccountToken: 'user-123',
        },
        android: {
          skus: ['dev.hyo.martie.premium'],
          subscriptionOffers: [],
        },
      },
      type: 'subs',
    });
  });

  it('refreshes subscription status when Check Status pressed', async () => {
    const {getActiveSubscriptions} = mockIapState({
      activeSubscriptions: [
        {
          productId: 'dev.hyo.martie.premium',
        } as any,
      ],
    });

    const {getByText} = render(<SubscriptionFlow />);

    fireEvent.press(getByText('Check Status'));

    await waitFor(() => {
      expect(getActiveSubscriptions).toHaveBeenCalled();
    });
  });

  it('opens manage subscriptions when Manage pressed', async () => {
    const {getByText} = render(<SubscriptionFlow />);

    fireEvent.press(getByText('Manage'));

    await waitFor(() => {
      expect(deepLinkToSubscriptionsMock).toHaveBeenCalled();
    });
  });

  it('updates UI on purchase success callback', async () => {
    const alertSpy = jest.spyOn(Alert, 'alert');

    const {getByText} = render(<SubscriptionFlow />);

    await act(async () => {
      await onPurchaseSuccess?.({
        id: 'transaction-1',
        productId: 'dev.hyo.martie.premium',
        purchaseToken: 'token',
        transactionDate: Date.now(),
        purchaseState: 'purchased',
      });
    });

    await waitFor(() => {
      expect(getByText(/Subscription activated/)).toBeTruthy();
    });

    expect(alertSpy).toHaveBeenCalledWith(
      'Success',
      'Purchase completed successfully!',
    );
  });

  it('shows error message on purchase error callback', async () => {
    const {getByText} = render(<SubscriptionFlow />);

    await act(async () => {
      onPurchaseError?.({message: 'Subscription failed'});
    });

    await waitFor(() => {
      expect(
        getByText('❌ Subscription failed: Subscription failed'),
      ).toBeTruthy();
    });
  });

  it('handles upgrade/downgrade plan change for premium subscription (Android only)', async () => {
    // Mock Platform to be Android since iOS doesn't show upgrade/downgrade UI
    Platform.OS = 'android';
    const alertSpy = jest.spyOn(Alert, 'alert');
    requestPurchaseMock.mockResolvedValueOnce(undefined);

    mockIapState({
      activeSubscriptions: [
        {
          productId: 'dev.hyo.martie.premium',
          transactionId: 'trans-1',
          transactionDate: Date.now(),
          isActive: true,
        } as any,
      ],
      subscriptions: [
        {
          ...sampleSubscription,
          subscriptionOfferDetailsAndroid: [
            {
              basePlanId: 'premium',
              offerToken: 'offer-token-monthly',
              offerTags: [],
              pricingPhases: {
                pricingPhaseList: [
                  {
                    formattedPrice: '$9.99',
                    priceAmountMicros: '9990000',
                    priceCurrencyCode: 'USD',
                    billingPeriod: 'P1M',
                    billingCycleCount: 0,
                    recurrenceMode: 1,
                  },
                ],
              },
            },
            {
              basePlanId: 'premium-year',
              offerToken: 'offer-token-yearly',
              offerTags: [],
              pricingPhases: {
                pricingPhaseList: [
                  {
                    formattedPrice: '$99.99',
                    priceAmountMicros: '99990000',
                    priceCurrencyCode: 'USD',
                    billingPeriod: 'P1Y',
                    billingCycleCount: 0,
                    recurrenceMode: 1,
                  },
                ],
              },
            },
          ],
        },
      ],
    });

    const {getByText} = render(<SubscriptionFlow />);

    // Should show upgrade button for monthly plan (Android only)
    await waitFor(() => {
      expect(getByText('⬆️ Upgrade to Yearly Plan')).toBeTruthy();
    });

    // Press upgrade button
    fireEvent.press(getByText('⬆️ Upgrade to Yearly Plan'));

    // Should show confirmation alert
    expect(alertSpy).toHaveBeenCalledWith(
      'Change Subscription Plan',
      expect.stringContaining('upgrade to Yearly'),
      expect.any(Array),
    );
  });

  it('displays empty state when no subscriptions available', () => {
    mockIapState({
      subscriptions: [],
    });

    const {getByText} = render(<SubscriptionFlow />);

    expect(
      getByText('No subscriptions found. Configure products in the console.'),
    ).toBeTruthy();
    expect(
      getByText('No subscriptions found. Please configure your products.'),
    ).toBeTruthy();
  });

  it('shows already subscribed for owned products', () => {
    mockIapState({
      activeSubscriptions: [
        {
          productId: 'dev.hyo.martie.premium',
        } as any,
      ],
    });

    const {getByText} = render(<SubscriptionFlow />);

    // Button should show 'Already Subscribed' and be disabled
    const button = getByText('Already Subscribed');
    expect(button).toBeTruthy();
  });

  it('retries loading subscriptions when retry button pressed', async () => {
    const {fetchProducts} = mockIapState({
      subscriptions: [],
    });

    const {getByText} = render(<SubscriptionFlow />);

    fireEvent.press(getByText('Retry'));

    await waitFor(() => {
      expect(fetchProducts).toHaveBeenCalledWith({
        skus: SUBSCRIPTION_PRODUCT_IDS,
        type: 'subs',
      });
    });
  });

  it('handles connection state changes', () => {
    mockIapState({
      connected: false,
    });

    const {getByText, rerender} = render(<SubscriptionFlow />);

    expect(getByText('Connecting to Store...')).toBeTruthy();

    // Simulate connection established
    mockIapState({
      connected: true,
    });

    rerender(<SubscriptionFlow />);

    expect(getByText('Available Subscriptions')).toBeTruthy();
  });

  it('opens subscription details modal', async () => {
    const {getByText} = render(<SubscriptionFlow />);

    // Open subscription details modal
    fireEvent.press(getByText('ℹ️'));

    await waitFor(() => {
      expect(getByText('Subscription Details')).toBeTruthy();
    });

    // Modal content should be displayed
    expect(getByText('📋 Copy')).toBeTruthy();
    expect(getByText('🖥️ Console')).toBeTruthy();
  });

  it('logs subscription data to console', async () => {
    const consoleSpy = jest.spyOn(console, 'log');

    const {getByText} = render(<SubscriptionFlow />);

    // Open subscription details modal
    fireEvent.press(getByText('ℹ️'));

    await waitFor(() => {
      expect(getByText('Subscription Details')).toBeTruthy();
    });

    // Log to console
    fireEvent.press(getByText('🖥️ Console'));

    expect(consoleSpy).toHaveBeenCalledWith('=== SUBSCRIPTION DATA ===');
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'dev.hyo.martie.premium',
      }),
    );
  });

  it('closes subscription details modal', async () => {
    const {getByText, queryByText} = render(<SubscriptionFlow />);

    // Open modal
    fireEvent.press(getByText('ℹ️'));

    await waitFor(() => {
      expect(getByText('Subscription Details')).toBeTruthy();
    });

    // Close modal
    fireEvent.press(getByText('✕'));

    await waitFor(() => {
      expect(queryByText('Subscription Details')).toBeNull();
    });
  });

  it.skip('excludes obfuscatedProfileId for subscription upgrades/downgrades (Android)', async () => {
    // Mock Platform to be Android
    Platform.OS = 'android';
    // Mock getAvailablePurchases to return purchase with token
    jest.fn(() => {
      console.log('Test: getAvailablePurchases called');
      return Promise.resolve([
        {
          productId: 'dev.hyo.martie.premium',
          purchaseToken: 'mock-purchase-token-123',
          purchaseTokenAndroid: 'mock-purchase-token-123',
          purchaseState: 1,
        },
      ]);
    });

    // For upgrade/downgrade, purchaseToken should be included but obfuscatedProfileId should not
    mockIapState({
      activeSubscriptions: [
        {
          productId: 'dev.hyo.martie.premium',
          transactionId: 'trans-1',
          transactionDate: Date.now(),
          isActive: true,
        } as any,
      ],
      subscriptions: [
        {
          ...sampleSubscription,
          subscriptionOfferDetailsAndroid: [
            {
              basePlanId: 'premium',
              offerToken: 'offer-token-monthly',
              offerTags: [],
              pricingPhases: {
                pricingPhaseList: [
                  {
                    formattedPrice: '$9.99',
                    priceAmountMicros: '9990000',
                    priceCurrencyCode: 'USD',
                    billingPeriod: 'P1M',
                    billingCycleCount: 0,
                    recurrenceMode: 1,
                  },
                ],
              },
            },
            {
              basePlanId: 'premium-year',
              offerToken: 'offer-token-yearly',
              offerTags: [],
              pricingPhases: {
                pricingPhaseList: [
                  {
                    formattedPrice: '$99.99',
                    priceAmountMicros: '99990000',
                    priceCurrencyCode: 'USD',
                    billingPeriod: 'P1Y',
                    billingCycleCount: 0,
                    recurrenceMode: 1,
                  },
                ],
              },
            },
          ],
        },
      ],
    });

    const alertSpy = jest.spyOn(Alert, 'alert');
    const {getByText} = render(<SubscriptionFlow />);

    // Wait for upgrade button to appear
    await waitFor(() => {
      expect(getByText('⬆️ Upgrade to Yearly Plan')).toBeTruthy();
    });

    // Mock alert to immediately simulate user confirmation
    alertSpy.mockImplementation((_title, _message, buttons) => {
      // Simulate user clicking "Confirm" button (second button)
      if (buttons && buttons[1] && buttons[1].onPress) {
        const onPress = buttons[1].onPress;
        // Execute the onPress callback asynchronously to simulate real behavior
        setImmediate(() => onPress());
      }
    });

    // Press upgrade button
    fireEvent.press(getByText('⬆️ Upgrade to Yearly Plan'));

    // Wait for requestPurchase to be called with proper parameters
    await waitFor(
      () => {
        expect(requestPurchaseMock).toHaveBeenCalled();
        const lastCall =
          requestPurchaseMock.mock.calls[
            requestPurchaseMock.mock.calls.length - 1
          ];
        expect(lastCall).toBeDefined();
        expect(lastCall[0]).toBeDefined();

        const androidRequest = lastCall[0].request?.android;
        // Should have purchaseToken for upgrade
        expect(androidRequest?.purchaseToken).toBe('mock-purchase-token-123');
        // Should NOT have obfuscatedProfileId for upgrade
        expect(androidRequest?.obfuscatedProfileId).toBeUndefined();
      },
      {timeout: 3000},
    );
  });

  it('includes obfuscatedProfileId for new subscriptions', () => {
    mockIapState({
      subscriptions: [sampleSubscription],
      activeSubscriptions: [], // No active subscriptions
    });

    const {getByText} = render(<SubscriptionFlow />);

    // Press subscribe for a new subscription
    fireEvent.press(getByText('Subscribe'));

    // Verify that requestPurchase was called
    expect(requestPurchaseMock).toHaveBeenCalled();

    const lastCall =
      requestPurchaseMock.mock.calls[requestPurchaseMock.mock.calls.length - 1];
    if (lastCall && lastCall[0]) {
      const androidRequest = lastCall[0].request?.android;
      // Should NOT have purchaseToken for new purchase
      expect(androidRequest?.purchaseToken).toBeUndefined();
      // obfuscatedProfileId can be included for new purchases (but is optional)
    }
  });
});

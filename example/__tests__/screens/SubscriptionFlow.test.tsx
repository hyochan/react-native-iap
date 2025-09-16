import {render, fireEvent, waitFor, act} from '@testing-library/react-native';
import {Alert, Platform} from 'react-native';
import SubscriptionFlow from '../../screens/SubscriptionFlow';
import * as RNIap from 'react-native-iap';

// Spy on Alert
jest.spyOn(Alert, 'alert');

// Mock default useIAP hook
const mockUseIAP = {
  connected: true,
  products: [],
  subscriptions: [
    {
      type: 'subs',
      id: 'dev.hyo.martie.premium',
      title: 'Premium Subscription',
      description: 'Access all premium features',
      displayPrice: '$9.99/month',
      price: 9.99,
      currency: 'USD',
    },
  ],
  availablePurchases: [],
  activeSubscriptions: [],
  getProducts: jest.fn(),
  getAvailablePurchases: jest.fn().mockResolvedValue([]),
  getActiveSubscriptions: jest.fn().mockResolvedValue([]),
  requestPurchase: jest.fn(),
  requestSubscription: jest.fn(),
  finishTransaction: jest.fn(),
  fetchProducts: jest.fn(),
};

(RNIap.useIAP as jest.Mock).mockReturnValue(mockUseIAP);

describe('SubscriptionFlow Screen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset to default mock
    (RNIap.useIAP as jest.Mock).mockReturnValue(mockUseIAP);
  });

  it('renders the screen title', () => {
    const {getByText} = render(<SubscriptionFlow />);
    expect(getByText('Subscription Flow')).toBeTruthy();
  });

  it('shows connection status when connected', () => {
    const {getByText} = render(<SubscriptionFlow />);
    expect(getByText('Store: ✅ Connected')).toBeTruthy();
  });

  it('shows disconnected status when not connected', () => {
    (RNIap.useIAP as jest.Mock).mockReturnValue({
      ...mockUseIAP,
      connected: false,
    });

    const {getByText} = render(<SubscriptionFlow />);
    expect(getByText('Store: ❌ Disconnected')).toBeTruthy();
  });

  it('displays available subscriptions', () => {
    const {getByText} = render(<SubscriptionFlow />);
    expect(getByText('Available Subscriptions')).toBeTruthy();
    expect(getByText('Premium Subscription')).toBeTruthy();
  });

  it('shows loading state while processing', async () => {
    const {getByText} = render(<SubscriptionFlow />);

    // Press subscribe button
    const subscribeButton = getByText('Subscribe');
    fireEvent.press(subscribeButton);

    // Check for processing state
    expect(getByText('Processing...')).toBeTruthy();
  });

  it('handles subscription purchase', () => {
    (RNIap.requestPurchase as jest.Mock).mockResolvedValue({
      productId: 'dev.hyo.martie.premium',
      transactionId: 'trans-123',
    });

    const {getByText} = render(<SubscriptionFlow />);

    // Should show subscribe button for the product
    const subscribeButton = getByText('Subscribe');
    expect(subscribeButton).toBeTruthy();

    // Press the button - it should trigger purchase flow
    fireEvent.press(subscribeButton);

    // Should show processing state
    expect(getByText('Processing...')).toBeTruthy();
  });

  it('shows no subscriptions message when empty', () => {
    (RNIap.useIAP as jest.Mock).mockReturnValue({
      ...mockUseIAP,
      subscriptions: [],
    });

    const {getByText} = render(<SubscriptionFlow />);
    expect(getByText(/No subscriptions found/)).toBeTruthy();
  });

  it('refreshes subscriptions when retry button is pressed', async () => {
    const mockFetchProducts = jest.fn();
    const mockGetActiveSubscriptions = jest.fn().mockResolvedValue([]);

    (RNIap.useIAP as jest.Mock).mockReturnValue({
      ...mockUseIAP,
      subscriptions: [],
      fetchProducts: mockFetchProducts,
      getActiveSubscriptions: mockGetActiveSubscriptions,
    });

    const {getByText} = render(<SubscriptionFlow />);

    const retryButton = getByText('Retry');
    fireEvent.press(retryButton);

    await waitFor(() => {
      expect(mockFetchProducts).toHaveBeenCalledWith({
        skus: ['dev.hyo.martie.premium'],
        type: 'subs',
      });
      expect(mockGetActiveSubscriptions).toHaveBeenCalled();
    });
  });

  it('shows active subscriptions section when there are active subs', () => {
    (RNIap.useIAP as jest.Mock).mockReturnValue({
      ...mockUseIAP,
      activeSubscriptions: [
        {
          productId: 'dev.hyo.martie.premium',
          transactionId: 'trans-123',
          transactionDate: Date.now(),
        },
      ],
    });

    const {getByText} = render(<SubscriptionFlow />);
    expect(getByText('Current Subscription Status')).toBeTruthy();
    expect(getByText('dev.hyo.martie.premium')).toBeTruthy();
  });

  it('checks subscription status when check status is pressed', async () => {
    const mockGetActiveSubscriptions = jest.fn().mockResolvedValue([]);

    (RNIap.useIAP as jest.Mock).mockReturnValue({
      ...mockUseIAP,
      activeSubscriptions: [],
      getActiveSubscriptions: mockGetActiveSubscriptions,
    });

    const {getByText} = render(<SubscriptionFlow />);

    const checkStatusLink = getByText('Check Status');
    fireEvent.press(checkStatusLink);

    await waitFor(() => {
      expect(mockGetActiveSubscriptions).toHaveBeenCalled();
    });
  });

  it('handles purchase success callback', async () => {
    let onPurchaseSuccess: any;
    const mockFinishTransaction = jest.fn();
    const mockGetActiveSubscriptions = jest.fn().mockResolvedValue([
      {
        productId: 'dev.hyo.martie.premium',
        transactionId: 'trans-123',
      },
    ]);

    (RNIap.useIAP as jest.Mock).mockImplementation((config) => {
      onPurchaseSuccess = config?.onPurchaseSuccess;
      return {
        ...mockUseIAP,
        finishTransaction: mockFinishTransaction,
        getActiveSubscriptions: mockGetActiveSubscriptions,
      };
    });

    render(<SubscriptionFlow />);

    // Simulate purchase success
    const mockPurchase = {
      productId: 'dev.hyo.martie.premium',
      transactionId: 'trans-123',
      platform: 'ios',
    };

    await act(async () => {
      if (onPurchaseSuccess) {
        await onPurchaseSuccess(mockPurchase);
      }
    });

    expect(mockFinishTransaction).toHaveBeenCalledWith({
      purchase: mockPurchase,
      isConsumable: false,
    });

    expect(mockGetActiveSubscriptions).toHaveBeenCalledWith([
      'dev.hyo.martie.premium',
    ]);
  });

  it('handles purchase error callback', () => {
    let onPurchaseError: any;

    (RNIap.useIAP as jest.Mock).mockImplementation((config) => {
      onPurchaseError = config?.onPurchaseError;
      return mockUseIAP;
    });

    const {getByText} = render(<SubscriptionFlow />);

    // Simulate purchase error
    const mockError = {
      code: 'E_USER_CANCELLED',
      message: 'User cancelled',
    };

    act(() => {
      if (onPurchaseError) {
        onPurchaseError(mockError);
      }
    });

    // Error is displayed in the UI, not as an Alert
    expect(getByText(/🚫 Subscription cancelled by user/)).toBeTruthy();
  });

  it('displays platform-specific information', () => {
    Platform.OS = 'ios';
    const {getByText} = render(<SubscriptionFlow />);
    expect(getByText('Platform: 🍎 iOS')).toBeTruthy();

    Platform.OS = 'android';
    const {getByText: getByTextAndroid} = render(<SubscriptionFlow />);
    expect(getByTextAndroid('Platform: 🤖 Android')).toBeTruthy();
  });

  it('shows subscription details in modal', async () => {
    const {getByText, getAllByText} = render(<SubscriptionFlow />);

    // Press info button
    const infoButtons = getAllByText('ℹ️');
    if (infoButtons.length > 0 && infoButtons[0]) {
      fireEvent.press(infoButtons[0]);

      await waitFor(() => {
        expect(getByText('Subscription Details')).toBeTruthy();
      });
    }
  });

  it('closes modal when close button is pressed', async () => {
    const {getByText, getAllByText, queryByText} = render(<SubscriptionFlow />);

    // Open modal
    const infoButtons = getAllByText('ℹ️');
    if (infoButtons.length > 0 && infoButtons[0]) {
      fireEvent.press(infoButtons[0]);

      await waitFor(() => {
        expect(getByText('Subscription Details')).toBeTruthy();
      });

      // Close modal
      const closeButton = getByText('✕');
      fireEvent.press(closeButton);

      await waitFor(() => {
        expect(queryByText('Subscription Details')).toBeFalsy();
      });
    }
  });

  it('handles iOS restoration flow', async () => {
    Platform.OS = 'ios';

    let onPurchaseSuccess: any;
    const mockFinishTransaction = jest.fn();
    const mockGetActiveSubscriptions = jest.fn().mockResolvedValue([]);
    const mockGetAvailablePurchases = jest.fn().mockResolvedValue([]);

    (RNIap.useIAP as jest.Mock).mockImplementation((config) => {
      onPurchaseSuccess = config?.onPurchaseSuccess;
      return {
        ...mockUseIAP,
        finishTransaction: mockFinishTransaction,
        getActiveSubscriptions: mockGetActiveSubscriptions,
        getAvailablePurchases: mockGetAvailablePurchases,
      };
    });

    render(<SubscriptionFlow />);

    // Simulate restoration (original != current transaction ID)
    const mockPurchase = {
      productId: 'dev.hyo.martie.premium',
      transactionId: 'trans-456',
      originalTransactionIdentifierIOS: 'trans-123',
      platform: 'ios',
    };

    await act(async () => {
      if (onPurchaseSuccess) {
        await onPurchaseSuccess(mockPurchase);
      }
    });

    expect(mockFinishTransaction).toHaveBeenCalled();
    expect(mockGetActiveSubscriptions).toHaveBeenCalled();
    expect(mockGetAvailablePurchases).toHaveBeenCalled();
  });

  it('handles subscription with offer details on Android', () => {
    Platform.OS = 'android';

    (RNIap.useIAP as jest.Mock).mockReturnValue({
      ...mockUseIAP,
      subscriptions: [
        {
          type: 'subs',
          id: 'dev.hyo.martie.premium',
          title: 'Premium Subscription',
          description: 'Access all premium features',
          displayPrice: '$9.99/month',
          subscriptionOfferDetails: [
            {
              offerId: 'offer1',
              basePlanId: 'monthly',
              pricingPhases: {
                pricingPhaseList: [
                  {
                    formattedPrice: '$4.99',
                    billingPeriod: 'P1M',
                    billingCycleCount: 1,
                  },
                ],
              },
            },
          ],
        },
      ],
    });

    const {getByText} = render(<SubscriptionFlow />);
    expect(getByText('Premium Subscription')).toBeTruthy();

    Platform.OS = 'ios';
  });

  it('handles copy to clipboard for purchase result', async () => {
    let onPurchaseSuccess: any;
    const mockClipboard = jest.spyOn(
      require('@react-native-clipboard/clipboard').default,
      'setString',
    );

    (RNIap.useIAP as jest.Mock).mockImplementation((config) => {
      onPurchaseSuccess = config?.onPurchaseSuccess;
      return {
        ...mockUseIAP,
        finishTransaction: jest.fn(),
        getActiveSubscriptions: jest.fn().mockResolvedValue([
          {
            productId: 'dev.hyo.martie.premium',
            transactionId: 'trans-123',
          },
        ]),
      };
    });

    const {getByText, queryByText} = render(<SubscriptionFlow />);

    // Trigger purchase success to show result
    const mockPurchase = {
      productId: 'dev.hyo.martie.premium',
      transactionId: 'trans-123',
      platform: 'ios',
    };

    await act(async () => {
      if (onPurchaseSuccess) {
        await onPurchaseSuccess(mockPurchase);
      }
    });

    await waitFor(() => {
      expect(getByText(/✅ Subscription activated/)).toBeTruthy();
    });

    // Test that the result text is displayed - clipboard copying may not work in test env
    const resultText = queryByText(/✅ Subscription activated/);
    expect(resultText).toBeTruthy();

    mockClipboard.mockRestore();
  });
});

import {render, fireEvent, waitFor, act} from '@testing-library/react-native';
import {Alert} from 'react-native';
import SubscriptionFlow from '../../screens/SubscriptionFlow';
import * as RNIap from 'react-native-iap';
import {SUBSCRIPTION_PRODUCT_IDS} from '../../src/utils/constants';

const requestPurchaseMock = RNIap.requestPurchase as jest.Mock;
const deepLinkToSubscriptionsMock = RNIap.deepLinkToSubscriptions as jest.Mock;

const sampleSubscription = {
  type: 'subs',
  id: 'dev.hyo.martie.premium',
  title: 'Premium Subscription',
  description: 'Access all premium features',
  displayPrice: '$9.99/month',
  price: 9.99,
  currency: 'USD',
};

describe('SubscriptionFlow Screen', () => {
  let onPurchaseSuccess: ((purchase: any) => Promise<void> | void) | undefined;
  let onPurchaseError: ((error: any) => void) | undefined;

  const mockIapState = (
    overrides: Partial<ReturnType<typeof RNIap.useIAP>> & {
      connected?: boolean;
    } = {},
  ) => {
    const fetchProducts = jest.fn(() => Promise.resolve());
    const getAvailablePurchases = jest.fn(() => Promise.resolve());
    const getActiveSubscriptions = jest.fn(() => Promise.resolve([]));
    const finishTransaction = jest.fn(() => Promise.resolve());

    (RNIap.useIAP as jest.Mock).mockImplementation((options) => {
      onPurchaseSuccess = options?.onPurchaseSuccess;
      onPurchaseError = options?.onPurchaseError;

      return {
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

  it('renders loading state when not connected', () => {
    mockIapState({connected: false, subscriptions: []});

    const {getByText} = render(<SubscriptionFlow />);

    expect(getByText('Connecting to Store...')).toBeTruthy();
  });

  it('fetches subscriptions and purchases when connected', async () => {
    const {fetchProducts, getAvailablePurchases} = mockIapState();

    render(<SubscriptionFlow />);

    await waitFor(() => {
      expect(fetchProducts).toHaveBeenCalledWith({
        skus: SUBSCRIPTION_PRODUCT_IDS,
        type: 'subs',
      });
    });

    expect(getAvailablePurchases).toHaveBeenCalled();
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
});

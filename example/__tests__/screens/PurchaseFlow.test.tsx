import {render, fireEvent, waitFor, act} from '@testing-library/react-native';
import {Alert} from 'react-native';
import PurchaseFlow from '../../screens/PurchaseFlow';
import * as RNIap from 'react-native-iap';
import {PRODUCT_IDS} from '../../src/utils/constants';

describe('PurchaseFlow Screen', () => {
  const requestPurchaseMock = RNIap.requestPurchase as jest.Mock;
  const alertSpy = jest.spyOn(Alert, 'alert');

  const sampleProducts = [
    {
      id: 'dev.hyo.martie.10bulbs',
      title: '10 Bulbs',
      description: 'Get 10 bulbs for your garden',
      displayPrice: '$0.99',
      price: 0.99,
      currency: 'USD',
      type: 'in-app',
    },
    {
      id: 'dev.hyo.martie.30bulbs',
      title: '30 Bulbs',
      description: 'Get 30 bulbs for your garden',
      displayPrice: '$2.99',
      price: 2.99,
      currency: 'USD',
      type: 'in-app',
    },
  ];

  let onPurchaseSuccess: ((purchase: any) => Promise<void> | void) | undefined;
  let onPurchaseError: ((error: any) => void) | undefined;

  const mockIapState = (
    overrides: Partial<ReturnType<typeof RNIap.useIAP>> & {
      connected?: boolean;
    } = {},
  ) => {
    const fetchProducts = jest.fn(() => Promise.resolve());
    const getAvailablePurchases = jest.fn(() => Promise.resolve());
    const finishTransaction = jest.fn(() => Promise.resolve());

    (RNIap.useIAP as jest.Mock).mockImplementation((options) => {
      onPurchaseSuccess = options?.onPurchaseSuccess;
      onPurchaseError = options?.onPurchaseError;

      return {
        connected: true,
        products: sampleProducts,
        availablePurchases: [],
        activeSubscriptions: [],
        fetchProducts,
        finishTransaction,
        getAvailablePurchases,
        ...overrides,
      };
    });

    return {fetchProducts, getAvailablePurchases, finishTransaction};
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockIapState();
  });

  it('renders loading state when not connected', () => {
    mockIapState({connected: false, products: []});

    const {getByText} = render(<PurchaseFlow />);

    expect(getByText('Connecting to Store...')).toBeTruthy();
  });

  it('fetches products and available purchases when connected', async () => {
    const {fetchProducts, getAvailablePurchases} = mockIapState();

    render(<PurchaseFlow />);

    await waitFor(() => {
      expect(fetchProducts).toHaveBeenCalledWith({
        skus: PRODUCT_IDS,
        type: 'in-app',
      });
    });

    expect(getAvailablePurchases).toHaveBeenCalled();
  });

  it('displays fetched products', () => {
    const {getByText} = render(<PurchaseFlow />);

    expect(getByText('10 Bulbs')).toBeTruthy();
    expect(getByText('30 Bulbs')).toBeTruthy();
  });

  it('initiates purchase when purchase button pressed', () => {
    const {getAllByText} = render(<PurchaseFlow />);

    const purchaseButtons = getAllByText('Purchase');
    fireEvent.press(purchaseButtons[0]);

    expect(requestPurchaseMock).toHaveBeenCalledWith({
      request: {
        ios: {
          sku: 'dev.hyo.martie.10bulbs',
          quantity: 1,
        },
        android: {
          skus: ['dev.hyo.martie.10bulbs'],
        },
      },
      type: 'in-app',
    });
  });

  it('handles refresh available purchases', async () => {
    const {getAvailablePurchases} = mockIapState({
      availablePurchases: [],
    });

    const {getByText} = render(<PurchaseFlow />);

    const refreshButton = getByText('Refresh available purchases');
    fireEvent.press(refreshButton);

    await waitFor(() => {
      expect(getAvailablePurchases).toHaveBeenCalledTimes(2);
    });
  });

  it('updates state on purchase success callback', async () => {
    mockIapState();

    const {getByText, queryByText} = render(<PurchaseFlow />);

    expect(queryByText(/Purchase completed successfully/)).toBeNull();

    await act(async () => {
      await onPurchaseSuccess?.({
        productId: 'dev.hyo.martie.10bulbs',
        purchaseToken: 'token-123',
        purchaseState: 'purchased',
        transactionDate: Date.now(),
      });
    });

    await waitFor(() => {
      expect(getByText(/Purchase completed successfully/)).toBeTruthy();
    });

    expect(alertSpy).toHaveBeenCalledWith(
      'Success',
      'Purchase completed successfully!',
    );
  });

  it('updates message on purchase error callback', async () => {
    mockIapState();

    const {getByText} = render(<PurchaseFlow />);

    await act(async () => {
      onPurchaseError?.({message: 'Something went wrong'});
    });

    await waitFor(() => {
      expect(getByText('Purchase failed: Something went wrong')).toBeTruthy();
    });
  });
});

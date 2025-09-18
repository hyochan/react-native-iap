import {render, fireEvent, waitFor, act} from '@testing-library/react-native';
import {Alert, Platform} from 'react-native';
import PurchaseFlow from '../../screens/PurchaseFlow';
import * as RNIap from 'react-native-iap';

// react-native-iap is already mocked in jest.setup.js

jest.mock('@react-native-clipboard/clipboard', () => ({
  setString: jest.fn(),
}));

// Spy on Alert
jest.spyOn(Alert, 'alert');

describe('PurchaseFlow Screen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useRealTimers(); // Use real timers for async tests

    // Setup default mock implementations
    (RNIap.initConnection as jest.Mock).mockResolvedValue(true);
    (RNIap.endConnection as jest.Mock).mockImplementation(() => {});
    (RNIap.fetchProducts as jest.Mock).mockResolvedValue([
      {
        id: 'dev.hyo.martie.10bulbs',
        title: '10 Bulbs',
        description: 'Get 10 bulbs for your garden',
        displayPrice: '$0.99',
        price: 0.99,
        currency: 'USD',
        type: 'in-app',
        platform: 'ios',
      },
      {
        id: 'dev.hyo.martie.30bulbs',
        title: '30 Bulbs',
        description: 'Get 30 bulbs for your garden',
        displayPrice: '$2.99',
        price: 2.99,
        currency: 'USD',
        type: 'in-app',
        platform: 'ios',
      },
    ]);
    (RNIap.purchaseUpdatedListener as jest.Mock).mockReturnValue({
      remove: jest.fn(),
    });
    (RNIap.purchaseErrorListener as jest.Mock).mockReturnValue({
      remove: jest.fn(),
    });
    (RNIap.requestPurchase as jest.Mock).mockResolvedValue({
      id: 'trans-123',
      productId: 'dev.hyo.martie.10bulbs',
      purchaseToken: 'token-123',
      transactionDate: Date.now(),
      platform: 'ios',
    });
    (RNIap.finishTransaction as jest.Mock).mockResolvedValue(undefined);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders the screen title and subtitle', () => {
    const {getByText} = render(<PurchaseFlow />);

    expect(getByText('In-App Purchase Flow')).toBeTruthy();
    expect(getByText('Testing with react-native-iap')).toBeTruthy();
  });

  it('initializes IAP connection on mount', async () => {
    render(<PurchaseFlow />);

    await waitFor(() => {
      expect(RNIap.initConnection).toHaveBeenCalled();
    });
  });

  it('sets up purchase listeners on mount', () => {
    render(<PurchaseFlow />);

    expect(RNIap.purchaseUpdatedListener).toHaveBeenCalled();
    expect(RNIap.purchaseErrorListener).toHaveBeenCalled();
  });

  it('shows connection status after successful connection', async () => {
    const {getByText} = render(<PurchaseFlow />);

    await waitFor(() => {
      expect(getByText('Store: ✅ Connected')).toBeTruthy();
    });
  });

  it('shows disconnected status when connection fails', async () => {
    (RNIap.initConnection as jest.Mock).mockRejectedValue(
      new Error('Connection failed'),
    );

    const {getByText} = render(<PurchaseFlow />);

    await waitFor(() => {
      expect(getByText('Store: ❌ Disconnected')).toBeTruthy();
    });
  });

  it.skip('loads products when Load Products button is pressed', async () => {
    const {getByText} = render(<PurchaseFlow />);

    await waitFor(() => {
      expect(getByText('Store: ✅ Connected')).toBeTruthy();
    });

    const loadButton = getByText('Load Products');
    fireEvent.press(loadButton);

    await waitFor(() => {
      expect(RNIap.fetchProducts).toHaveBeenCalledWith({
        skus: ['dev.hyo.martie.10bulbs', 'dev.hyo.martie.30bulbs'],
        type: 'in-app',
      });
    });
  });

  it.skip('displays products after loading', async () => {
    const {getByText} = render(<PurchaseFlow />);

    await waitFor(() => {
      expect(getByText('Store: ✅ Connected')).toBeTruthy();
    });

    const loadButton = getByText('Load Products');
    fireEvent.press(loadButton);

    await waitFor(() => {
      expect(getByText('10 Bulbs')).toBeTruthy();
      expect(getByText('30 Bulbs')).toBeTruthy();
      expect(getByText('$0.99')).toBeTruthy();
      expect(getByText('$2.99')).toBeTruthy();
    });
  });

  it.skip('shows loading indicator while loading products', async () => {
    const {getByText} = render(<PurchaseFlow />);

    await waitFor(() => {
      expect(getByText('Store: ✅ Connected')).toBeTruthy();
    });

    // Make the request take time
    (RNIap.fetchProducts as jest.Mock).mockImplementation(
      () => new Promise((resolve) => setTimeout(() => resolve([]), 100)),
    );

    const loadButton = getByText('Load Products');
    fireEvent.press(loadButton);

    expect(getByText('Loading products...')).toBeTruthy();
  });

  it.skip('opens product modal when product is pressed', async () => {
    const {getByText} = render(<PurchaseFlow />);

    await waitFor(() => {
      expect(getByText('Store: ✅ Connected')).toBeTruthy();
    });

    const loadButton = getByText('Load Products');
    fireEvent.press(loadButton);

    await waitFor(() => {
      expect(getByText('10 Bulbs')).toBeTruthy();
    });

    // Press on product
    const productCard = getByText('10 Bulbs').parent?.parent;
    if (productCard) {
      fireEvent.press(productCard);
    }

    // Check modal content
    await waitFor(() => {
      expect(getByText('Product Details')).toBeTruthy();
      expect(getByText('Get 10 bulbs for your garden')).toBeTruthy();
      expect(getByText('Purchase')).toBeTruthy();
      expect(getByText('Cancel')).toBeTruthy();
    });
  });

  it.skip('handles purchase when Purchase button is pressed', async () => {
    const {getByText} = render(<PurchaseFlow />);

    await waitFor(() => {
      expect(getByText('Store: ✅ Connected')).toBeTruthy();
    });

    const loadButton = getByText('Load Products');
    fireEvent.press(loadButton);

    await waitFor(() => {
      expect(getByText('10 Bulbs')).toBeTruthy();
    });

    // Open product modal
    const productCard = getByText('10 Bulbs').parent?.parent;
    if (productCard) {
      fireEvent.press(productCard);
    }

    await waitFor(() => {
      expect(getByText('Product Details')).toBeTruthy();
    });

    // Press purchase button
    const purchaseButton = getByText('Purchase');
    fireEvent.press(purchaseButton);

    await waitFor(() => {
      expect(RNIap.requestPurchase).toHaveBeenCalledWith({
        request: expect.objectContaining({
          ios: expect.objectContaining({
            sku: 'dev.hyo.martie.10bulbs',
          }),
          android: expect.objectContaining({
            skus: ['dev.hyo.martie.10bulbs'],
          }),
        }),
        type: 'in-app',
      });
    });
  });

  it('handles purchase success and calls finishTransaction', async () => {
    let purchaseUpdateCallback: any;
    (RNIap.purchaseUpdatedListener as jest.Mock).mockImplementation(
      (callback) => {
        purchaseUpdateCallback = callback;
        return {remove: jest.fn()};
      },
    );

    const {getByText} = render(<PurchaseFlow />);

    await waitFor(() => {
      expect(getByText('Store: ✅ Connected')).toBeTruthy();
    });

    // Simulate purchase success
    const mockPurchase = {
      id: 'trans-123',
      productId: 'dev.hyo.martie.10bulbs',
      purchaseToken: 'token-123',
      transactionDate: Date.now(),
      platform: 'ios',
    };

    act(() => {
      purchaseUpdateCallback(mockPurchase);
    });

    await waitFor(() => {
      expect(RNIap.finishTransaction).toHaveBeenCalledWith({
        purchase: mockPurchase,
        isConsumable: true,
      });
    });
  });

  it.skip('handles purchase error and shows alert', async () => {
    let purchaseErrorCallback: any;
    (RNIap.purchaseErrorListener as jest.Mock).mockImplementation(
      (callback) => {
        purchaseErrorCallback = callback;
        return {remove: jest.fn()};
      },
    );

    render(<PurchaseFlow />);

    // Simulate purchase error
    const mockError = {
      code: 'E_USER_CANCELLED',
      message: 'User cancelled the purchase',
    };

    act(() => {
      purchaseErrorCallback(mockError);
    });

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith(
        'Purchase Error',
        expect.stringContaining('User cancelled'),
      );
    });
  });

  it.skip('closes modal when Cancel button is pressed', async () => {
    const {getByText, queryByText} = render(<PurchaseFlow />);

    await waitFor(() => {
      expect(getByText('Store: ✅ Connected')).toBeTruthy();
    });

    const loadButton = getByText('Load Products');
    fireEvent.press(loadButton);

    await waitFor(() => {
      expect(getByText('10 Bulbs')).toBeTruthy();
    });

    // Open modal
    const productCard = getByText('10 Bulbs').parent?.parent;
    if (productCard) {
      fireEvent.press(productCard);
    }

    await waitFor(() => {
      expect(getByText('Product Details')).toBeTruthy();
    });

    // Press cancel
    const cancelButton = getByText('Cancel');
    fireEvent.press(cancelButton);

    await waitFor(() => {
      expect(queryByText('Product Details')).toBeFalsy();
    });
  });

  it.skip('shows error alert when loading products fails', async () => {
    (RNIap.fetchProducts as jest.Mock).mockRejectedValue(
      new Error('Network error'),
    );

    const {getByText} = render(<PurchaseFlow />);

    await waitFor(() => {
      expect(getByText('Store: ✅ Connected')).toBeTruthy();
    });

    const loadButton = getByText('Load Products');
    fireEvent.press(loadButton);

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith(
        'Error',
        expect.stringContaining('Failed to load products'),
      );
    });
  });

  it('shows platform-specific information', () => {
    Platform.OS = 'ios';
    const {getByText} = render(<PurchaseFlow />);

    expect(getByText('Platform: 🍎 iOS')).toBeTruthy();

    Platform.OS = 'android';
    const {getByText: getByTextAndroid} = render(<PurchaseFlow />);

    expect(getByTextAndroid('Platform: 🤖 Android')).toBeTruthy();
  });

  it('cleans up listeners on unmount', () => {
    const removeSpy = jest.fn();
    (RNIap.purchaseUpdatedListener as jest.Mock).mockReturnValue({
      remove: removeSpy,
    });
    (RNIap.purchaseErrorListener as jest.Mock).mockReturnValue({
      remove: removeSpy,
    });

    const {unmount} = render(<PurchaseFlow />);

    unmount();

    expect(removeSpy).toHaveBeenCalled();
    expect(RNIap.endConnection).toHaveBeenCalled();
  });

  it.skip('displays purchase result in UI after successful purchase', async () => {
    let purchaseUpdateCallback: any;
    (RNIap.purchaseUpdatedListener as jest.Mock).mockImplementation(
      (callback) => {
        purchaseUpdateCallback = callback;
        return {remove: jest.fn()};
      },
    );

    const {getByText} = render(<PurchaseFlow />);

    await waitFor(() => {
      expect(getByText('Store: ✅ Connected')).toBeTruthy();
    });

    // Simulate purchase success
    const mockPurchase = {
      id: 'trans-123',
      productId: 'dev.hyo.martie.10bulbs',
      purchaseToken: 'token-123',
      transactionDate: Date.now(),
      platform: 'ios',
    };

    act(() => {
      purchaseUpdateCallback(mockPurchase);
    });

    await waitFor(() => {
      expect(getByText(/Purchase successful/)).toBeTruthy();
      expect(getByText(/dev.hyo.martie.10bulbs/)).toBeTruthy();
    });
  });

  it('handles Android-specific purchase data', async () => {
    Platform.OS = 'android';

    let purchaseUpdateCallback: any;
    (RNIap.purchaseUpdatedListener as jest.Mock).mockImplementation(
      (callback) => {
        purchaseUpdateCallback = callback;
        return {remove: jest.fn()};
      },
    );

    render(<PurchaseFlow />);

    const mockAndroidPurchase = {
      id: 'trans-123',
      productId: 'dev.hyo.martie.10bulbs',
      purchaseToken: 'token-123',
      dataAndroid: 'android-data',
      purchaseStateAndroid: 1,
      purchaseState: 'purchased',
      isAcknowledgedAndroid: false,
      packageNameAndroid: 'dev.hyo.martie',
      transactionDate: Date.now(),
      platform: 'android',
    };

    act(() => {
      purchaseUpdateCallback(mockAndroidPurchase);
    });

    await waitFor(() => {
      expect(RNIap.finishTransaction).toHaveBeenCalledWith({
        purchase: mockAndroidPurchase,
        isConsumable: true,
      });
    });
  });

  it('handles non-cancelled purchase errors', async () => {
    let purchaseErrorCallback: any;
    (RNIap.purchaseErrorListener as jest.Mock).mockImplementation(
      (callback) => {
        purchaseErrorCallback = callback;
        return {remove: jest.fn()};
      },
    );

    render(<PurchaseFlow />);

    // Simulate non-cancelled error
    const mockError = {
      code: 'E_NETWORK_ERROR',
      message: 'Network connection failed',
    };

    act(() => {
      purchaseErrorCallback(mockError);
    });

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith(
        'Purchase Failed',
        'Network connection failed',
      );
    });
  });

  it('handles retry button when no products found', async () => {
    // First return empty, then return products on retry
    (RNIap.fetchProducts as jest.Mock)
      .mockResolvedValueOnce([])
      .mockResolvedValue([
        {
          id: 'dev.hyo.martie.10bulbs',
          title: '10 Bulbs',
          description: 'Get 10 bulbs for your garden',
          displayPrice: '$0.99',
          price: 0.99,
          currency: 'USD',
          type: 'in-app',
          platform: 'ios',
        },
      ]);

    const {getByText} = render(<PurchaseFlow />);

    await waitFor(() => {
      expect(getByText('Store: ✅ Connected')).toBeTruthy();
    });

    await waitFor(() => {
      expect(getByText(/No products found/)).toBeTruthy();
    });

    const retryButton = getByText('Retry');
    fireEvent.press(retryButton);

    await waitFor(() => {
      expect(getByText('10 Bulbs')).toBeTruthy();
    });
  });

  it('handles product with Android offer price', async () => {
    Platform.OS = 'android';

    (RNIap.fetchProducts as jest.Mock).mockResolvedValue([
      {
        id: 'dev.hyo.martie.10bulbs',
        title: '10 Bulbs',
        description: 'Get 10 bulbs for your garden',
        displayPrice: '$0.99',
        oneTimePurchaseOfferFormattedPrice: '$0.89',
        price: 0.99,
        currency: 'USD',
        type: 'in-app',
        platform: 'android',
      },
    ]);

    const {getByText} = render(<PurchaseFlow />);

    await waitFor(() => {
      // Should show Android offer price instead of display price
      expect(getByText('$0.89')).toBeTruthy();
    });

    Platform.OS = 'ios';
  });

  it('handles console log button in product modal', async () => {
    const {getByText, getAllByText} = render(<PurchaseFlow />);

    await waitFor(() => {
      expect(getByText('Store: ✅ Connected')).toBeTruthy();
    });

    await waitFor(() => {
      expect(getByText('10 Bulbs')).toBeTruthy();
    });

    // Open modal
    const infoButtons = getAllByText('ℹ️');
    if (infoButtons[0]) {
      fireEvent.press(infoButtons[0]);
    }

    await waitFor(() => {
      expect(getByText('Product Details')).toBeTruthy();
    });

    // Press console log button
    const consoleButton = getByText('🖥️ Console Log');
    fireEvent.press(consoleButton);

    // Since we removed console.log, just check Alert is called
    expect(Alert.alert).toHaveBeenCalledWith(
      'Console',
      'Product data logged to console',
    );
  });

  it('handles long press to copy purchase result', async () => {
    let purchaseUpdateCallback: any;
    (RNIap.purchaseUpdatedListener as jest.Mock).mockImplementation(
      (callback) => {
        purchaseUpdateCallback = callback;
        return {remove: jest.fn()};
      },
    );

    const {getByText} = render(<PurchaseFlow />);

    await waitFor(() => {
      expect(getByText('Store: ✅ Connected')).toBeTruthy();
    });

    // Simulate purchase to show result
    const mockPurchase = {
      id: 'trans-123',
      productId: 'dev.hyo.martie.10bulbs',
      purchaseToken: 'receipt-123',
      transactionDate: Date.now(),
      platform: 'ios',
      purchaseState: 'purchased',
    };

    act(() => {
      purchaseUpdateCallback(mockPurchase);
    });

    await waitFor(() => {
      expect(getByText(/✅ Purchase successful/)).toBeTruthy();
    });

    // Find and long press the result text
    const resultText = getByText(/✅ Purchase successful/);
    if (resultText.parent) {
      fireEvent(resultText.parent, 'onLongPress');
    }

    expect(Alert.alert).toHaveBeenCalledWith(
      'Copied',
      'Purchase result copied to clipboard',
    );
  });
});

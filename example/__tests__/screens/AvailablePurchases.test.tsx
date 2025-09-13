import {render, fireEvent, waitFor} from '@testing-library/react-native';
import {Alert} from 'react-native';
import AvailablePurchases from '../../screens/AvailablePurchases';
import * as RNIap from 'react-native-iap';

// Mock functions for testing
const mockGetAvailablePurchases = jest.fn();
const mockGetActiveSubscriptions = jest.fn();
const mockRequestProducts = jest.fn();
const mockFinishTransaction = jest.fn();

// Override the useIAP hook for this test file
(RNIap.useIAP as jest.Mock).mockReturnValue({
  connected: true,
  subscriptions: [
    {
      type: 'subs',
      id: 'dev.hyo.martie.premium',
      title: 'Premium Subscription',
      description: 'Premium features',
      price: 9.99,
      displayPrice: '$9.99',
      currency: 'USD',
    },
  ],
  availablePurchases: [
    {
      productId: 'dev.hyo.martie.premium',
      transactionDate: Date.now(),
      purchaseToken: 'mock-receipt',
      id: 'trans-123',
      platform: 'ios',
    },
  ],
  activeSubscriptions: ['dev.hyo.martie.premium'],
  getAvailablePurchases: mockGetAvailablePurchases,
  getActiveSubscriptions: mockGetActiveSubscriptions,
  fetchProducts: mockRequestProducts,
  finishTransaction: mockFinishTransaction,
});

jest.spyOn(Alert, 'alert');

describe('AvailablePurchases Screen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetAvailablePurchases.mockResolvedValue([
      {
        productId: 'dev.hyo.martie.premium',
        transactionDate: Date.now(),
      },
    ]);
    mockGetActiveSubscriptions.mockResolvedValue(['dev.hyo.martie.premium']);
    mockRequestProducts.mockResolvedValue([]);
  });

  it.skip('renders the screen title', async () => {
    const {getByText} = render(<AvailablePurchases />);
    await waitFor(() => {
      expect(getByText(/Available Purchases/)).toBeTruthy();
    });
  });

  it('shows connection status when connected', async () => {
    const {getByText} = render(<AvailablePurchases />);
    await waitFor(() => {
      expect(getByText('Store Connection: ✅ Connected')).toBeTruthy();
    });
  });

  it('loads subscription products on mount', async () => {
    render(<AvailablePurchases />);

    await waitFor(() => {
      expect(mockRequestProducts).toHaveBeenCalled();
    });
  });

  it('refreshes purchases when refresh button is pressed', async () => {
    const {getByText} = render(<AvailablePurchases />);

    const refreshButton = getByText('🔄 Refresh Purchases');
    fireEvent.press(refreshButton);

    await waitFor(() => {
      expect(mockGetAvailablePurchases).toHaveBeenCalled();
      expect(mockGetActiveSubscriptions).toHaveBeenCalled();
    });
  });

  it('displays purchase history section', () => {
    const {getByText} = render(<AvailablePurchases />);

    expect(getByText('📋 Purchase History')).toBeTruthy();
    expect(getByText('dev.hyo.martie.premium')).toBeTruthy();
  });

  it('displays active subscriptions section', () => {
    const {getByText} = render(<AvailablePurchases />);

    expect(getByText('🔄 Active Subscriptions')).toBeTruthy();
  });

  it.skip('handles error when fetching purchases fails', async () => {
    mockGetAvailablePurchases.mockRejectedValueOnce(
      new Error('Failed to fetch purchases'),
    );

    const {getByText} = render(<AvailablePurchases />);

    const refreshButton = getByText('🔄 Refresh Purchases');
    fireEvent.press(refreshButton);

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith(
        'Error',
        'Failed to get available purchases',
      );
    });
  });

  it('displays empty state when no purchases available', async () => {
    // Override mock to return empty purchases
    (RNIap.useIAP as jest.Mock).mockReturnValueOnce({
      connected: true,
      subscriptions: [],
      availablePurchases: [],
      activeSubscriptions: [],
      getAvailablePurchases: mockGetAvailablePurchases,
      getActiveSubscriptions: mockGetActiveSubscriptions,
      fetchProducts: mockRequestProducts,
      finishTransaction: mockFinishTransaction,
    });

    const {getByText} = render(<AvailablePurchases />);
    await waitFor(() => {
      expect(getByText('No purchase history found')).toBeTruthy();
    });
  });

  it('shows transaction details for purchases', async () => {
    const {getByText} = render(<AvailablePurchases />);

    // Check if transaction ID is displayed
    await waitFor(() => {
      expect(getByText('trans-123')).toBeTruthy();
    });
  });
});

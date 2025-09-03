import {render, fireEvent, waitFor} from '@testing-library/react-native';
import {Alert} from 'react-native';
import AvailablePurchases from '../../screens/AvailablePurchases';

const mockGetAvailablePurchases = jest.fn();
const mockGetActiveSubscriptions = jest.fn();
const mockRequestProducts = jest.fn();
const mockFinishTransaction = jest.fn();

jest.mock('react-native-iap', () => ({
  useIAP: () => ({
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
        transactionReceipt: 'mock-receipt',
        transactionId: 'trans-123',
        platform: 'ios',
      },
    ],
    activeSubscriptions: ['dev.hyo.martie.premium'],
    getAvailablePurchases: mockGetAvailablePurchases,
    getActiveSubscriptions: mockGetActiveSubscriptions,
    fetchProducts: mockRequestProducts,
    finishTransaction: mockFinishTransaction,
  }),
}));

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

  it('renders the screen title', () => {
    const {getByText} = render(<AvailablePurchases />);
    expect(getByText('Available Purchases')).toBeTruthy();
  });

  it('shows connection status when connected', () => {
    const {getByText} = render(<AvailablePurchases />);
    expect(getByText('✅ Connected')).toBeTruthy();
  });

  it('loads subscription products on mount', async () => {
    render(<AvailablePurchases />);

    await waitFor(() => {
      expect(mockRequestProducts).toHaveBeenCalledWith({
        subscriptions: ['dev.hyo.martie.premium'],
      });
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

  it('handles error when fetching purchases fails', async () => {
    mockGetAvailablePurchases.mockRejectedValueOnce(
      new Error('Failed to fetch purchases'),
    );

    const {getByText} = render(<AvailablePurchases />);

    const refreshButton = getByText('🔄 Refresh Purchases');
    fireEvent.press(refreshButton);

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith(
        'Error',
        expect.stringContaining('Failed to load purchases'),
      );
    });
  });

  it('displays empty state when no purchases available', () => {
    jest.unmock('react-native-iap');
    jest.mock('react-native-iap', () => ({
      useIAP: () => ({
        connected: true,
        subscriptions: [],
        availablePurchases: [],
        activeSubscriptions: [],
        getAvailablePurchases: jest.fn().mockResolvedValue([]),
        getActiveSubscriptions: jest.fn().mockResolvedValue([]),
        fetchProducts: jest.fn(),
        finishTransaction: jest.fn(),
      }),
    }));

    const {getByText} = render(<AvailablePurchases />);
    expect(getByText('No purchase history found')).toBeTruthy();
  });

  it('shows transaction details for purchases', () => {
    const {getByText} = render(<AvailablePurchases />);

    // Check if transaction ID is displayed
    expect(getByText('trans-123')).toBeTruthy();
  });
});

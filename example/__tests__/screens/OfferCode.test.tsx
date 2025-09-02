import {render, fireEvent, waitFor} from '@testing-library/react-native';
import {Alert, Platform} from 'react-native';
import OfferCode from '../../screens/OfferCode';

const mockPresentCodeRedemptionSheetIOS = jest.fn();
const mockGetActiveSubscriptions = jest.fn();
const mockGetAvailablePurchases = jest.fn();

jest.mock('react-native-iap', () => ({
  useIAP: () => ({
    connected: true,
    activeSubscriptions: [],
    availablePurchases: [],
    getActiveSubscriptions: mockGetActiveSubscriptions,
    getAvailablePurchases: mockGetAvailablePurchases,
  }),
  presentCodeRedemptionSheetIOS: mockPresentCodeRedemptionSheetIOS,
}));

jest.spyOn(Alert, 'alert');

describe('OfferCode Screen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetActiveSubscriptions.mockResolvedValue([]);
    mockGetAvailablePurchases.mockResolvedValue([]);
  });

  it('renders the screen title and description', () => {
    const {getByText} = render(<OfferCode />);

    expect(getByText('Offer Code Redemption')).toBeTruthy();
    expect(getByText('How it works:')).toBeTruthy();
  });

  it('shows connection status when connected', () => {
    const {getByText} = render(<OfferCode />);

    expect(getByText('Connected to Store')).toBeTruthy();
  });

  it('displays iOS-specific redemption button on iOS', () => {
    Platform.OS = 'ios';
    const {getByText} = render(<OfferCode />);

    const redeemButton = getByText('🎁 Redeem Offer Code');
    expect(redeemButton).toBeTruthy();
  });

  it('handles iOS offer code redemption button press', async () => {
    Platform.OS = 'ios';
    mockPresentCodeRedemptionSheetIOS.mockResolvedValue(undefined);

    const {getByText} = render(<OfferCode />);

    const redeemButton = getByText('🎁 Redeem Offer Code');
    fireEvent.press(redeemButton);

    await waitFor(() => {
      expect(mockPresentCodeRedemptionSheetIOS).toHaveBeenCalled();
    });
  });

  it('shows error when iOS redemption fails', async () => {
    Platform.OS = 'ios';
    mockPresentCodeRedemptionSheetIOS.mockRejectedValue(
      new Error('Redemption failed'),
    );

    const {getByText} = render(<OfferCode />);

    const redeemButton = getByText('🎁 Redeem Offer Code');
    fireEvent.press(redeemButton);

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith(
        'Error',
        expect.stringContaining('Failed to redeem code'),
      );
    });
  });

  it('displays Android-specific message on Android', () => {
    Platform.OS = 'android';
    const {getByText} = render(<OfferCode />);

    expect(
      getByText('🎁 Open Play Store'),
    ).toBeTruthy();
  });

  it('shows testing offer codes section', () => {
    const {getByText} = render(<OfferCode />);

    expect(getByText('Testing Offer Codes')).toBeTruthy();
  });

});
import {render, fireEvent} from '@testing-library/react-native';
import Home from '../../screens/Home';

const mockNavigate = jest.fn();

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    navigate: mockNavigate,
  }),
}));

describe('Home Screen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders header with correct title and subtitle', () => {
    const {getByText} = render(
      <Home navigation={{navigate: mockNavigate} as any} />,
    );

    expect(getByText('React Native IAP')).toBeTruthy();
    expect(getByText('Powered by Nitro Modules ⚡️')).toBeTruthy();
  });

  it('renders all menu items', () => {
    const {getByText} = render(
      <Home navigation={{navigate: mockNavigate} as any} />,
    );

    expect(getByText('Purchase Flow')).toBeTruthy();
    expect(getByText('Test in-app purchases')).toBeTruthy();

    expect(getByText('Subscription Flow')).toBeTruthy();
    expect(
      getByText('Test subscription purchases with useIAP hook'),
    ).toBeTruthy();

    expect(getByText('Available Purchases')).toBeTruthy();
    expect(getByText('View and manage your purchases')).toBeTruthy();

    expect(getByText('Offer Code')).toBeTruthy();
    expect(getByText('Redeem promotional offers')).toBeTruthy();
  });

  it('navigates to PurchaseFlow when Purchase Flow menu item is pressed', () => {
    const {getByText} = render(
      <Home navigation={{navigate: mockNavigate} as any} />,
    );

    const purchaseFlowButton = getByText('Purchase Flow').parent?.parent;
    if (purchaseFlowButton) {
      fireEvent.press(purchaseFlowButton);
    }

    expect(mockNavigate).toHaveBeenCalledWith('PurchaseFlow');
  });

  it('navigates to SubscriptionFlow when Subscription Flow menu item is pressed', () => {
    const {getByText} = render(
      <Home navigation={{navigate: mockNavigate} as any} />,
    );

    const subscriptionFlowButton =
      getByText('Subscription Flow').parent?.parent;
    if (subscriptionFlowButton) {
      fireEvent.press(subscriptionFlowButton);
    }

    expect(mockNavigate).toHaveBeenCalledWith('SubscriptionFlow');
  });

  it('navigates to AvailablePurchases when Available Purchases menu item is pressed', () => {
    const {getByText} = render(
      <Home navigation={{navigate: mockNavigate} as any} />,
    );

    const availablePurchasesButton = getByText('Available Purchases').parent
      ?.parent;
    if (availablePurchasesButton) {
      fireEvent.press(availablePurchasesButton);
    }

    expect(mockNavigate).toHaveBeenCalledWith('AvailablePurchases');
  });

  it('navigates to OfferCode when Offer Code menu item is pressed', () => {
    const {getByText} = render(
      <Home navigation={{navigate: mockNavigate} as any} />,
    );

    const offerCodeButton = getByText('Offer Code').parent?.parent;
    if (offerCodeButton) {
      fireEvent.press(offerCodeButton);
    }

    expect(mockNavigate).toHaveBeenCalledWith('OfferCode');
  });

  it('renders footer text', () => {
    const {getByText} = render(
      <Home navigation={{navigate: mockNavigate} as any} />,
    );

    expect(
      getByText('Example app for react-native-iap with Nitro Modules'),
    ).toBeTruthy();
  });
});

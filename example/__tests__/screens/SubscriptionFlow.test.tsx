import {render} from '@testing-library/react-native';
import SubscriptionFlow from '../../screens/SubscriptionFlow';

// Mock useIAP hook
jest.mock('react-native-iap', () => ({
  useIAP: () => ({
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
    getAvailablePurchases: jest.fn(),
    getActiveSubscriptions: jest.fn(),
    requestPurchase: jest.fn(),
    requestSubscription: jest.fn(),
    finishTransaction: jest.fn(),
  }),
}));

describe('SubscriptionFlow Screen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the screen title', () => {
    const {getByText} = render(<SubscriptionFlow />);
    expect(getByText('Subscription Management')).toBeTruthy();
  });

  it('shows connection status when connected', () => {
    const {getByText} = render(<SubscriptionFlow />);
    expect(getByText('✅ Connected to Store')).toBeTruthy();
  });

  it('displays available subscriptions', () => {
    const {getByText} = render(<SubscriptionFlow />);
    expect(getByText('Available Subscriptions')).toBeTruthy();
    expect(getByText('Premium Subscription')).toBeTruthy();
  });
});
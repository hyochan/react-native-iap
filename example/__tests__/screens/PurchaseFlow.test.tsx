import {render, fireEvent, waitFor, act} from '@testing-library/react-native';
import {Alert} from 'react-native';
import PurchaseFlow from '../../screens/PurchaseFlow';
import * as RNIap from 'react-native-iap';
import {PRODUCT_IDS} from '../../src/utils/constants';
import {ErrorCode} from 'react-native-iap';

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

  // Android product with one-time purchase offers (discount support)
  const androidProductWithOffers = {
    id: 'dev.hyo.martie.10bulbs',
    title: '10 Bulbs',
    description: 'Get 10 bulbs for your garden',
    displayPrice: '$0.99',
    price: 0.99,
    currency: 'USD',
    type: 'in-app' as const,
    platform: 'android' as const,
    nameAndroid: '10 Bulbs',
    oneTimePurchaseOfferDetailsAndroid: [
      {
        formattedPrice: '$0.99',
        priceAmountMicros: '990000',
        priceCurrencyCode: 'USD',
        offerId: 'base-offer',
        offerToken: 'token-base-123',
        offerTags: ['bestseller'],
        fullPriceMicros: null,
        discountDisplayInfo: null,
        limitedQuantityInfo: null,
        validTimeWindow: null,
        preorderDetailsAndroid: null,
        rentalDetailsAndroid: null,
      },
      {
        formattedPrice: '$0.79',
        priceAmountMicros: '790000',
        priceCurrencyCode: 'USD',
        offerId: 'discount-offer',
        offerToken: 'token-discount-456',
        offerTags: ['sale', 'limited'],
        fullPriceMicros: '990000',
        discountDisplayInfo: {
          percentageDiscount: 20,
          discountAmount: {
            discountAmountMicros: '200000',
            formattedDiscountAmount: '$0.20',
          },
        },
        limitedQuantityInfo: {
          maximumQuantity: 100,
          remainingQuantity: 45,
        },
        validTimeWindow: {
          startTimeMillis: '1702300800000',
          endTimeMillis: '1702905600000',
        },
        preorderDetailsAndroid: null,
        rentalDetailsAndroid: null,
      },
    ],
  };

  // Android product with preorder details
  const androidProductWithPreorder = {
    id: 'dev.hyo.martie.preorder',
    title: 'Preorder Item',
    description: 'A preorder product',
    displayPrice: '$9.99',
    price: 9.99,
    currency: 'USD',
    type: 'in-app' as const,
    platform: 'android' as const,
    nameAndroid: 'Preorder Item',
    oneTimePurchaseOfferDetailsAndroid: [
      {
        formattedPrice: '$9.99',
        priceAmountMicros: '9990000',
        priceCurrencyCode: 'USD',
        offerId: null,
        offerToken: 'token-preorder-789',
        offerTags: [],
        fullPriceMicros: null,
        discountDisplayInfo: null,
        limitedQuantityInfo: null,
        validTimeWindow: null,
        preorderDetailsAndroid: {
          preorderReleaseTimeMillis: '1704067200000',
          preorderPresaleEndTimeMillis: '1703980800000',
        },
        rentalDetailsAndroid: null,
      },
    ],
  };

  // Android product with rental details
  const androidProductWithRental = {
    id: 'dev.hyo.martie.rental',
    title: 'Rental Item',
    description: 'A rental product',
    displayPrice: '$4.99',
    price: 4.99,
    currency: 'USD',
    type: 'in-app' as const,
    platform: 'android' as const,
    nameAndroid: 'Rental Item',
    oneTimePurchaseOfferDetailsAndroid: [
      {
        formattedPrice: '$4.99',
        priceAmountMicros: '4990000',
        priceCurrencyCode: 'USD',
        offerId: null,
        offerToken: 'token-rental-abc',
        offerTags: [],
        fullPriceMicros: null,
        discountDisplayInfo: null,
        limitedQuantityInfo: null,
        validTimeWindow: null,
        preorderDetailsAndroid: null,
        rentalDetailsAndroid: {
          rentalPeriod: 'P7D',
          rentalExpirationPeriod: 'P30D',
        },
      },
    ],
  };

  // Android product with absolute discount (no percentage)
  const androidProductWithAbsoluteDiscount = {
    id: 'dev.hyo.martie.absolute',
    title: 'Absolute Discount Item',
    description: 'A product with absolute discount',
    displayPrice: '$1.99',
    price: 1.99,
    currency: 'USD',
    type: 'in-app' as const,
    platform: 'android' as const,
    nameAndroid: 'Absolute Discount Item',
    oneTimePurchaseOfferDetailsAndroid: [
      {
        formattedPrice: '$1.99',
        priceAmountMicros: '1990000',
        priceCurrencyCode: 'USD',
        offerId: 'abs-discount',
        offerToken: 'token-abs-xyz',
        offerTags: [],
        fullPriceMicros: '2990000',
        discountDisplayInfo: {
          percentageDiscount: null,
          discountAmount: {
            discountAmountMicros: '1000000',
            formattedDiscountAmount: '$1.00',
          },
        },
        limitedQuantityInfo: null,
        validTimeWindow: null,
        preorderDetailsAndroid: null,
        rentalDetailsAndroid: null,
      },
    ],
  };

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

  it('fetches products when connected', async () => {
    const {fetchProducts} = mockIapState();

    render(<PurchaseFlow />);

    await waitFor(() => {
      expect(fetchProducts).toHaveBeenCalledWith({
        skus: PRODUCT_IDS,
        type: 'in-app',
      });
    });
  });

  it('displays fetched products', () => {
    const {getByText} = render(<PurchaseFlow />);

    expect(getByText('10 Bulbs')).toBeTruthy();
    expect(getByText('30 Bulbs')).toBeTruthy();
  });

  it('initiates purchase when purchase button pressed', () => {
    const {getAllByText} = render(<PurchaseFlow />);

    const purchaseButtons = getAllByText('Purchase');
    fireEvent.press(purchaseButtons[0]!);

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
      onPurchaseError?.({
        code: ErrorCode.NetworkError,
        message: 'Something went wrong',
      });
    });

    await waitFor(() => {
      expect(
        getByText(
          `Purchase failed: Something went wrong (code: ${ErrorCode.NetworkError})`,
        ),
      ).toBeTruthy();
    });
  });

  it('handles user cancelled error correctly', async () => {
    mockIapState();

    const {getByText} = render(<PurchaseFlow />);

    await act(async () => {
      onPurchaseError?.({
        code: ErrorCode.UserCancelled,
        message: 'User cancelled the purchase',
      });
    });

    await waitFor(() => {
      expect(getByText('Purchase cancelled by user')).toBeTruthy();
    });
  });

  // Android one-time purchase offers tests
  describe('Android One-Time Purchase Offers', () => {
    it('displays product details modal with Android offers', async () => {
      mockIapState({products: [androidProductWithOffers]});

      const {getByText, getAllByText} = render(<PurchaseFlow />);

      // Open modal
      const detailsButton = getAllByText('Details')[0];
      fireEvent.press(detailsButton!);

      await waitFor(() => {
        expect(getByText('Product Details')).toBeTruthy();
        expect(getByText('One-Time Purchase Offers (2)')).toBeTruthy();
      });
    });

    it('displays offer with percentage discount', async () => {
      mockIapState({products: [androidProductWithOffers]});

      const {getByText, getAllByText} = render(<PurchaseFlow />);

      // Open modal
      const detailsButton = getAllByText('Details')[0];
      fireEvent.press(detailsButton!);

      await waitFor(() => {
        expect(getByText('20% off')).toBeTruthy();
      });
    });

    it('displays offer with full price when discounted', async () => {
      mockIapState({products: [androidProductWithOffers]});

      const {getByText, getAllByText} = render(<PurchaseFlow />);

      // Open modal
      const detailsButton = getAllByText('Details')[0];
      fireEvent.press(detailsButton!);

      await waitFor(() => {
        expect(getByText('Full Price:')).toBeTruthy();
        expect(getByText('990000 micros')).toBeTruthy();
      });
    });

    it('displays limited quantity info', async () => {
      mockIapState({products: [androidProductWithOffers]});

      const {getByText, getAllByText} = render(<PurchaseFlow />);

      // Open modal
      const detailsButton = getAllByText('Details')[0];
      fireEvent.press(detailsButton!);

      await waitFor(() => {
        expect(getByText('Limited Quantity:')).toBeTruthy();
        expect(getByText('45 / 100 remaining')).toBeTruthy();
      });
    });

    it('displays valid time window', async () => {
      mockIapState({products: [androidProductWithOffers]});

      const {getByText, getAllByText} = render(<PurchaseFlow />);

      // Open modal
      const detailsButton = getAllByText('Details')[0];
      fireEvent.press(detailsButton!);

      await waitFor(() => {
        expect(getByText('Valid Window:')).toBeTruthy();
      });
    });

    it('displays offer tags', async () => {
      mockIapState({products: [androidProductWithOffers]});

      const {getByText, getAllByText} = render(<PurchaseFlow />);

      // Open modal
      const detailsButton = getAllByText('Details')[0];
      fireEvent.press(detailsButton!);

      await waitFor(() => {
        expect(getAllByText('Tags:').length).toBeGreaterThanOrEqual(1);
        expect(getByText('sale, limited')).toBeTruthy();
      });
    });

    it('displays preorder details', async () => {
      mockIapState({products: [androidProductWithPreorder]});

      const {getByText, getAllByText} = render(<PurchaseFlow />);

      // Open modal
      const detailsButton = getAllByText('Details')[0];
      fireEvent.press(detailsButton!);

      await waitFor(() => {
        expect(getByText('Pre-order Release:')).toBeTruthy();
      });
    });

    it('displays rental details', async () => {
      mockIapState({products: [androidProductWithRental]});

      const {getByText, getAllByText} = render(<PurchaseFlow />);

      // Open modal
      const detailsButton = getAllByText('Details')[0];
      fireEvent.press(detailsButton!);

      await waitFor(() => {
        expect(getByText('Rental:')).toBeTruthy();
        expect(getByText('Period: P7D')).toBeTruthy();
      });
    });

    it('displays absolute discount amount when no percentage', async () => {
      mockIapState({products: [androidProductWithAbsoluteDiscount]});

      const {getByText, getAllByText} = render(<PurchaseFlow />);

      // Open modal
      const detailsButton = getAllByText('Details')[0];
      fireEvent.press(detailsButton!);

      await waitFor(() => {
        expect(getByText('$1.00 off')).toBeTruthy();
      });
    });

    it('closes modal when close button pressed', async () => {
      mockIapState({products: [androidProductWithOffers]});

      const {getByText, getAllByText, queryByText} = render(<PurchaseFlow />);

      // Open modal
      const detailsButton = getAllByText('Details')[0];
      fireEvent.press(detailsButton!);

      await waitFor(() => {
        expect(getByText('Product Details')).toBeTruthy();
      });

      // Close modal
      fireEvent.press(getByText('Close'));

      await waitFor(() => {
        expect(queryByText('One-Time Purchase Offers (2)')).toBeNull();
      });
    });

    it('displays offer ID when present', async () => {
      mockIapState({products: [androidProductWithOffers]});

      const {getByText, getAllByText} = render(<PurchaseFlow />);

      // Open modal
      const detailsButton = getAllByText('Details')[0];
      fireEvent.press(detailsButton!);

      await waitFor(() => {
        expect(getByText('Offer 1 (base-offer)')).toBeTruthy();
        expect(getByText('Offer 2 (discount-offer)')).toBeTruthy();
      });
    });

    it('displays offer token', async () => {
      mockIapState({products: [androidProductWithOffers]});

      const {getByText, getAllByText} = render(<PurchaseFlow />);

      // Open modal
      const detailsButton = getAllByText('Details')[0];
      fireEvent.press(detailsButton!);

      await waitFor(() => {
        expect(getAllByText('Offer Token:').length).toBeGreaterThanOrEqual(1);
        expect(getByText('token-base-123')).toBeTruthy();
      });
    });

    it('displays price with micros', async () => {
      mockIapState({products: [androidProductWithOffers]});

      const {getByText, getAllByText} = render(<PurchaseFlow />);

      // Open modal
      const detailsButton = getAllByText('Details')[0];
      fireEvent.press(detailsButton!);

      await waitFor(() => {
        expect(getByText('$0.99 (990000 micros)')).toBeTruthy();
      });
    });
  });
});

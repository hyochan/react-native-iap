import {View, Text, StyleSheet} from 'react-native';
import type {ProductAndroidOneTimePurchaseOfferDetail} from 'react-native-iap';

type AndroidOneTimeOfferDetailsProps = {
  offers: ProductAndroidOneTimePurchaseOfferDetail[];
};

/**
 * Shared component for displaying Android one-time purchase offer details.
 * Used in PurchaseFlow, AllProducts, and SubscriptionFlow screens.
 */
export default function AndroidOneTimeOfferDetails({
  offers,
}: AndroidOneTimeOfferDetailsProps) {
  if (!offers || offers.length === 0) {
    return null;
  }

  return (
    <View style={styles.offersSection}>
      <Text style={styles.offersSectionTitle}>
        One-Time Purchase Offers ({offers.length})
      </Text>
      {offers.map(
        (offer: ProductAndroidOneTimePurchaseOfferDetail, index: number) => (
          <View key={offer.offerToken} style={styles.offerCard}>
            <Text style={styles.offerTitle}>
              Offer {index + 1}
              {offer.offerId ? ` (${offer.offerId})` : ''}
            </Text>

            <Text style={styles.offerLabel}>Price:</Text>
            <Text style={styles.offerValue}>
              {offer.formattedPrice} ({offer.priceAmountMicros} micros)
            </Text>

            {offer.fullPriceMicros && (
              <>
                <Text style={styles.offerLabel}>Full Price:</Text>
                <Text style={styles.offerValue}>
                  {offer.fullPriceMicros} micros
                </Text>
              </>
            )}

            {offer.discountDisplayInfo && (
              <>
                <Text style={styles.offerLabel}>Discount:</Text>
                <Text style={styles.offerValueDiscount}>
                  {offer.discountDisplayInfo.percentageDiscount
                    ? `${offer.discountDisplayInfo.percentageDiscount}% off`
                    : offer.discountDisplayInfo.discountAmount
                      ? `${offer.discountDisplayInfo.discountAmount.formattedDiscountAmount} off`
                      : 'N/A'}
                </Text>
              </>
            )}

            {offer.limitedQuantityInfo && (
              <>
                <Text style={styles.offerLabel}>Limited Quantity:</Text>
                <Text style={styles.offerValue}>
                  {offer.limitedQuantityInfo.remainingQuantity} /{' '}
                  {offer.limitedQuantityInfo.maximumQuantity} remaining
                </Text>
              </>
            )}

            {offer.validTimeWindow && (
              <>
                <Text style={styles.offerLabel}>Valid Window:</Text>
                <Text style={styles.offerValue}>
                  {new Date(
                    Number(offer.validTimeWindow.startTimeMillis),
                  ).toLocaleDateString()}{' '}
                  -{' '}
                  {new Date(
                    Number(offer.validTimeWindow.endTimeMillis),
                  ).toLocaleDateString()}
                </Text>
              </>
            )}

            {offer.preorderDetailsAndroid && (
              <>
                <Text style={styles.offerLabel}>Pre-order Release:</Text>
                <Text style={styles.offerValue}>
                  {new Date(
                    Number(
                      offer.preorderDetailsAndroid.preorderReleaseTimeMillis,
                    ),
                  ).toLocaleDateString()}
                </Text>
              </>
            )}

            {offer.rentalDetailsAndroid && (
              <>
                <Text style={styles.offerLabel}>Rental:</Text>
                <Text style={styles.offerValue}>
                  Period: {offer.rentalDetailsAndroid.rentalPeriod}
                </Text>
              </>
            )}

            {offer.offerTags.length > 0 && (
              <>
                <Text style={styles.offerLabel}>Tags:</Text>
                <Text style={styles.offerValue}>
                  {offer.offerTags.join(', ')}
                </Text>
              </>
            )}

            <Text style={styles.offerLabel}>Offer Token:</Text>
            <Text
              style={[styles.offerValue, styles.offerToken]}
              numberOfLines={2}
            >
              {offer.offerToken}
            </Text>
          </View>
        ),
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  offersSection: {
    marginTop: 20,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  offersSectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
    marginBottom: 12,
  },
  offerCard: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
    borderLeftWidth: 3,
    borderLeftColor: '#007AFF',
  },
  offerTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#007AFF',
    marginBottom: 8,
  },
  offerLabel: {
    fontSize: 11,
    color: '#666',
    marginTop: 6,
    fontWeight: '600',
  },
  offerValue: {
    fontSize: 13,
    color: '#333',
    marginTop: 2,
  },
  offerValueDiscount: {
    fontSize: 13,
    color: '#E53935',
    marginTop: 2,
    fontWeight: '600',
  },
  offerToken: {
    fontSize: 10,
    color: '#999',
    fontFamily: 'monospace',
  },
});

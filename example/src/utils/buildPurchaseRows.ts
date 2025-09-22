import type {Purchase, PurchaseIOS, PurchaseAndroid} from 'react-native-iap';

type PurchaseWithMaybeTransactionId = Purchase & {
  transactionId?: string | null;
};

export type PurchaseDetailRow = {
  label: string;
  value: string;
};

const formatBoolean = (value?: boolean | null): string | undefined => {
  if (value === undefined || value === null) {
    return undefined;
  }
  return value ? 'Yes' : 'No';
};

const formatDate = (timestamp?: number | null): string | undefined => {
  if (typeof timestamp !== 'number' || !Number.isFinite(timestamp)) {
    return undefined;
  }
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) {
    return undefined;
  }
  return date.toISOString();
};

const formatList = (
  value?: (string | number | null)[] | null,
): string | undefined => {
  if (!value || value.length === 0) {
    return undefined;
  }
  return value
    .filter(
      (item) => item !== null && item !== undefined && `${item}`.length > 0,
    )
    .map((item) => `${item}`)
    .join(', ');
};

const pushRow = (
  rows: PurchaseDetailRow[],
  label: string,
  value?: string | number | null,
) => {
  if (value === undefined || value === null) {
    return;
  }
  const stringValue = `${value}`;
  if (stringValue.length === 0) {
    return;
  }

  rows.push({label, value: stringValue});
};

export const buildPurchaseRows = (purchase: Purchase): PurchaseDetailRow[] => {
  const rows: PurchaseDetailRow[] = [];

  const purchaseWithTransaction = purchase as PurchaseWithMaybeTransactionId;
  const transactionId =
    typeof purchaseWithTransaction.transactionId === 'string' &&
    purchaseWithTransaction.transactionId.length > 0
      ? purchaseWithTransaction.transactionId
      : purchase.id;

  const normalizedState = purchase.purchaseState
    ? `${purchase.purchaseState
        .charAt(0)
        .toUpperCase()}${purchase.purchaseState.slice(1)}`
    : undefined;

  // Common fields
  pushRow(rows, 'id', purchase.id);
  pushRow(rows, 'transactionId', transactionId);
  pushRow(rows, 'productId', purchase.productId);
  pushRow(rows, 'platform', purchase.platform ?? 'unknown');
  pushRow(rows, 'ids', formatList(purchase.ids ?? undefined));
  pushRow(rows, 'transactionDate', formatDate(purchase.transactionDate));
  pushRow(rows, 'purchaseState', normalizedState);
  pushRow(rows, 'quantity', purchase.quantity);
  pushRow(rows, 'isAutoRenewing', formatBoolean(purchase.isAutoRenewing));

  const platform = (purchase.platform ?? '').toString().toLowerCase();

  if (platform === 'ios') {
    const iosPurchase = purchase as PurchaseIOS;
    pushRow(rows, 'quantityIOS', iosPurchase.quantityIOS);
    pushRow(rows, 'appAccountToken', iosPurchase.appAccountToken);
    pushRow(rows, 'appBundleIdIOS', iosPurchase.appBundleIdIOS);
    pushRow(rows, 'countryCodeIOS', iosPurchase.countryCodeIOS);
    pushRow(rows, 'currencyCodeIOS', iosPurchase.currencyCodeIOS);
    pushRow(rows, 'currencySymbolIOS', iosPurchase.currencySymbolIOS);
    pushRow(rows, 'environmentIOS', iosPurchase.environmentIOS);
    pushRow(rows, 'subscriptionGroupIdIOS', iosPurchase.subscriptionGroupIdIOS);
    pushRow(
      rows,
      'originalTransactionIdentifierIOS',
      iosPurchase.originalTransactionIdentifierIOS,
    );
    pushRow(
      rows,
      'originalTransactionDateIOS',
      formatDate(iosPurchase.originalTransactionDateIOS),
    );
    pushRow(
      rows,
      'expirationDateIOS',
      formatDate(iosPurchase.expirationDateIOS),
    );
    pushRow(rows, 'isUpgradedIOS', formatBoolean(iosPurchase.isUpgradedIOS));
    pushRow(rows, 'ownershipTypeIOS', iosPurchase.ownershipTypeIOS);
    pushRow(rows, 'reasonIOS', iosPurchase.reasonIOS);
    pushRow(
      rows,
      'reasonStringRepresentationIOS',
      iosPurchase.reasonStringRepresentationIOS,
    );
    pushRow(rows, 'transactionReasonIOS', iosPurchase.transactionReasonIOS);
    pushRow(
      rows,
      'revocationDateIOS',
      formatDate(iosPurchase.revocationDateIOS),
    );
    pushRow(rows, 'revocationReasonIOS', iosPurchase.revocationReasonIOS);
    pushRow(rows, 'webOrderLineItemIdIOS', iosPurchase.webOrderLineItemIdIOS);
    if (iosPurchase.offerIOS) {
      pushRow(rows, 'offerIOS.id', iosPurchase.offerIOS.id);
      pushRow(rows, 'offerIOS.type', iosPurchase.offerIOS.type);
      pushRow(rows, 'offerIOS.paymentMode', iosPurchase.offerIOS.paymentMode);
    }
  } else if (platform === 'android') {
    const androidPurchase = purchase as PurchaseAndroid;
    pushRow(rows, 'signatureAndroid', androidPurchase.signatureAndroid);
    pushRow(rows, 'packageNameAndroid', androidPurchase.packageNameAndroid);
    pushRow(
      rows,
      'developerPayloadAndroid',
      androidPurchase.developerPayloadAndroid,
    );
    pushRow(
      rows,
      'obfuscatedAccountIdAndroid',
      androidPurchase.obfuscatedAccountIdAndroid,
    );
    pushRow(
      rows,
      'obfuscatedProfileIdAndroid',
      androidPurchase.obfuscatedProfileIdAndroid,
    );
    pushRow(
      rows,
      'isAcknowledgedAndroid',
      formatBoolean(androidPurchase.isAcknowledgedAndroid),
    );
    pushRow(
      rows,
      'autoRenewingAndroid',
      formatBoolean(androidPurchase.autoRenewingAndroid),
    );
    pushRow(rows, 'dataAndroid', androidPurchase.dataAndroid);
  }

  pushRow(rows, 'purchaseToken', purchase.purchaseToken);

  return rows;
};

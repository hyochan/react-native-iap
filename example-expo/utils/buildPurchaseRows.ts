import type {Purchase} from 'react-native-iap';

export type PurchaseDetailRow = {
  label: string;
  value: string;
};

const formatDate = (timestamp?: number | null): string | undefined => {
  if (typeof timestamp !== 'number' || !Number.isFinite(timestamp)) {
    return undefined;
  }
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) {
    return undefined;
  }
  return date.toLocaleDateString();
};

const pushRow = (
  rows: PurchaseDetailRow[],
  label: string,
  value?: string | number | null,
) => {
  if (value === undefined || value === null || `${value}`.trim() === '') {
    return;
  }
  rows.push({label, value: `${value}`});
};

export const buildPurchaseRows = (purchase: Purchase): PurchaseDetailRow[] => {
  const rows: PurchaseDetailRow[] = [];

  // Essential purchase information
  pushRow(rows, 'Product ID', purchase.productId);
  pushRow(rows, 'Transaction ID', purchase.id);
  pushRow(rows, 'Platform', purchase.platform || 'Unknown');
  pushRow(rows, 'Purchase Date', formatDate(purchase.transactionDate));
  pushRow(rows, 'Quantity', purchase.quantity);

  if (purchase.purchaseState) {
    const state =
      purchase.purchaseState.charAt(0).toUpperCase() +
      purchase.purchaseState.slice(1).toLowerCase();
    pushRow(rows, 'Status', state);
  }

  // Platform-specific key information
  const platform = (purchase.platform || '').toString().toLowerCase();

  if (platform === 'ios') {
    const iosPurchase = purchase as any;
    pushRow(rows, 'App Account Token', iosPurchase.appAccountToken);
    pushRow(rows, 'Expiration Date', formatDate(iosPurchase.expirationDateIOS));
    pushRow(rows, 'Auto Renewing', purchase.isAutoRenewing ? 'Yes' : 'No');
  } else if (platform === 'android') {
    pushRow(rows, 'Auto Renewing', purchase.isAutoRenewing ? 'Yes' : 'No');
  }

  return rows;
};

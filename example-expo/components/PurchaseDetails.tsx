import {useMemo} from 'react';
import {StyleSheet, Text, View} from 'react-native';
import type {StyleProp, TextStyle, ViewStyle} from 'react-native';
import type {Purchase} from 'react-native-iap';
import {buildPurchaseRows} from '../utils/buildPurchaseRows';

type PurchaseDetailsProps = {
  purchase: Purchase;
  containerStyle?: StyleProp<ViewStyle>;
  rowStyle?: StyleProp<ViewStyle>;
  labelStyle?: StyleProp<TextStyle>;
  valueStyle?: StyleProp<TextStyle>;
};

function PurchaseDetails({
  purchase,
  containerStyle,
  rowStyle,
  labelStyle,
  valueStyle,
}: PurchaseDetailsProps) {
  const rows = useMemo(() => buildPurchaseRows(purchase), [purchase]);

  if (rows.length === 0) {
    return null;
  }

  return (
    <View style={[styles.container, containerStyle]}>
      {rows.map((row) => (
        <View key={`${row.label}-${row.value}`} style={[styles.row, rowStyle]}>
          <Text style={[styles.label, labelStyle]}>{row.label}</Text>
          <Text style={[styles.value, valueStyle]}>{row.value}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 8,
  },
  row: {
    flexDirection: 'column',
    gap: 4,
    paddingVertical: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e1e7ef',
  },
  label: {
    fontSize: 12,
    color: '#5f6470',
    fontWeight: '600',
  },
  value: {
    fontSize: 14,
    color: '#1a1f36',
  },
});

export default PurchaseDetails;

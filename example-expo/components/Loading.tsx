import {
  View,
  ActivityIndicator,
  Text,
  StyleSheet,
  Platform,
} from 'react-native';

type LoadingProps = {
  message?: string;
};

export default function Loading({
  message = 'Connecting to Store...',
}: LoadingProps) {
  return (
    <View style={styles.container}>
      <ActivityIndicator
        size={Platform.OS === 'ios' ? 'large' : 48}
        color="#007AFF"
      />
      <Text style={styles.message}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  message: {
    marginTop: 12,
    fontSize: 14,
    color: '#666',
  },
});

import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { useIAP } from '../../../src';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  error: {
    color: 'red',
  },
});

export default function DebugScreen() {
  console.log('DebugScreen: About to call useIAP...');

  // Hooks must be called at the top level, not conditionally
  const hookResult = useIAP();

  console.log('DebugScreen: useIAP called successfully');
  console.log('DebugScreen: hookResult type:', typeof hookResult);
  console.log(
    'DebugScreen: hookResult keys:',
    hookResult ? Object.keys(hookResult) : 'null',
  );

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Debug Screen</Text>

      <View>
        <Text>Hook Result Type: {typeof hookResult}</Text>
        <Text>Connected: {hookResult?.connected ? 'Yes' : 'No'}</Text>
        <Text>Available Methods:</Text>
        {hookResult &&
          Object.keys(hookResult).map(key => (
            <Text key={key}>
              {' '}
              - {key}: {typeof (hookResult as any)[key]}
            </Text>
          ))}
      </View>
    </ScrollView>
  );
}

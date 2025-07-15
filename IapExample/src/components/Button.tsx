import React from 'react';
import {Button as RNButton, StyleSheet, View} from 'react-native';

import {borderRadius, colors} from '../utils';

interface ButtonProps {
  title: string;
  disabled?: boolean;
  onPress(): void;
}

export const Button = ({title, onPress, disabled = false}: ButtonProps) => (
  <View style={[styles.button, disabled && styles.disabledButton]}>
    <RNButton title={title} onPress={onPress} disabled={disabled} />
  </View>
);

const styles = StyleSheet.create({
  button: {
    backgroundColor: colors.gray100,
    borderRadius: borderRadius - 2,
  },
  disabledButton: {
    backgroundColor: colors.gray300,
    opacity: 0.5,
  },
});

import {useState, useCallback, useRef, useEffect} from 'react';
import {Platform, ActionSheetIOS, Alert} from 'react-native';

export type VerificationMethod = 'ignore' | 'local' | 'iapkit';

interface UseVerificationMethodReturn {
  verificationMethod: VerificationMethod;
  verificationMethodRef: React.MutableRefObject<VerificationMethod>;
  setVerificationMethod: React.Dispatch<
    React.SetStateAction<VerificationMethod>
  >;
  showVerificationMethodSelector: () => void;
  getVerificationMethodLabel: () => string;
}

/**
 * Hook to manage verification method selection with platform-specific UI
 */
export function useVerificationMethod(
  initialMethod: VerificationMethod = 'ignore',
): UseVerificationMethodReturn {
  const [verificationMethod, setVerificationMethod] =
    useState<VerificationMethod>(initialMethod);
  const verificationMethodRef = useRef<VerificationMethod>(verificationMethod);

  // Keep ref in sync with state
  useEffect(() => {
    verificationMethodRef.current = verificationMethod;
  }, [verificationMethod]);

  const getVerificationMethodLabel = useCallback((): string => {
    switch (verificationMethod) {
      case 'ignore':
        return 'None';
      case 'local':
        return 'Local';
      case 'iapkit':
        return 'IAPKit';
      default:
        return 'Unknown';
    }
  }, [verificationMethod]);

  const showVerificationMethodSelector = useCallback(() => {
    const options = [
      'None (Skip)',
      'Local (Device)',
      'IAPKit (Server)',
      'Cancel',
    ];
    const cancelButtonIndex = 3;

    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options,
          cancelButtonIndex,
          title: 'Select Verification Method',
          message: 'Choose how to verify purchases after completion',
        },
        (buttonIndex) => {
          if (buttonIndex === 0) {
            setVerificationMethod('ignore');
          } else if (buttonIndex === 1) {
            setVerificationMethod('local');
          } else if (buttonIndex === 2) {
            setVerificationMethod('iapkit');
          }
        },
      );
    } else {
      // For Android, use simple Alert with buttons
      Alert.alert(
        'Select Verification Method',
        'Choose how to verify purchases after completion',
        [
          {text: 'None (Skip)', onPress: () => setVerificationMethod('ignore')},
          {
            text: 'Local (Device)',
            onPress: () => setVerificationMethod('local'),
          },
          {
            text: 'IAPKit (Server)',
            onPress: () => setVerificationMethod('iapkit'),
          },
          {text: 'Cancel', style: 'cancel'},
        ],
      );
    }
  }, []);

  return {
    verificationMethod,
    verificationMethodRef,
    setVerificationMethod,
    showVerificationMethodSelector,
    getVerificationMethodLabel,
  };
}

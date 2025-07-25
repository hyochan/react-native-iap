import {EmitterSubscription, NativeEventEmitter} from 'react-native';

import {TransactionEvent, transactionSk2ToPurchaseMap} from './types/appleSk2';
import {isIosStorekit2} from './iap';
import {
  getAndroidModule,
  getIosModule,
  getNativeModule,
  isAndroid,
  isIos,
} from './internal';
import type {PurchaseError} from './purchaseError';
import type {Purchase} from './types';

/**
 * Add IAP purchase event
 * Register a callback that gets called when the store has any updates to purchases that have not yet been finished, consumed or acknowledged. Returns a React Native `EmitterSubscription` on which you can call `.remove()` to stop receiving updates. Register you listener as soon as possible and react to updates at all times.

## Signature

```ts
purchaseUpdatedListener((purchase: Purchase) => {});
```

## Usage

```tsx
import React, {useEffect} from 'react';
import {View} from 'react-native';
import {purchaseUpdatedListener} from 'react-native-iap';

const App = () => {
  useEffect(() => {
    const subscription = purchaseUpdatedListener((purchase: Purchase) => {
      console.log(purchase);
    });

    return () => {
      subscription.remove();
    };
  }, []);

  return <View />;
};
```
 */
export const purchaseUpdatedListener = (
  listener: (event: Purchase) => void,
  errorCallback?: (error: unknown) => void,
) => {
  const eventEmitter = new NativeEventEmitter(getNativeModule());
  const proxyListener = isIosStorekit2()
    ? (event: Purchase) => {
        listener(transactionSk2ToPurchaseMap(event as any));
      }
    : listener;
  const emitterSubscription = eventEmitter.addListener(
    'purchase-updated',
    proxyListener,
  );

  if (isAndroid) {
    getAndroidModule().startListening().catch((error: unknown) => {
      if (errorCallback) {
        errorCallback(error);
      } else {
        throw error;
      }
    });
  }

  return emitterSubscription;
};

export const userChoiceBillingUpdateListenerAndroid = (
  listener: (event: Purchase) => void,
) => {
  const eventEmitter = new NativeEventEmitter(getNativeModule());
  const proxyListener = isIosStorekit2()
    ? (event: Purchase) => {
        listener(transactionSk2ToPurchaseMap(event as any));
      }
    : listener;
  const emitterUserChoiceBilling = eventEmitter.addListener(
    'user-alternative-billing',
    proxyListener,
  );

  if (isAndroid) {
    getAndroidModule().startListening();
  }

  return emitterUserChoiceBilling;
};

/**
 * Add IAP purchase error event
 * Register a callback that gets called when there has been an error with a purchase. Returns a React Native `EmitterSubscription` on which you can call `.remove()` to stop receiving updates.

## Signature

```ts
purchaseErrorListener((error: PurchaseError) => {});
```

## Usage

```tsx
import React, {useEffect} from 'react';
import {View} from 'react-native';
import {purchaseErrorListener} from 'react-native-iap';

const App = () => {
  useEffect(() => {
    const subscription = purchaseErrorListener((error: PurchaseError) => {
      console.log(error);
    });

    return () => {
      subscription.remove();
    };
  }, []);

  return <View />;
};
```

 */
export const purchaseErrorListener = (
  listener: (error: PurchaseError) => void,
): EmitterSubscription => {
  const eventEmitter = new NativeEventEmitter(getNativeModule());
  return eventEmitter.addListener('purchase-error', listener);
};

/**
 * Add IAP promoted subscription event
 * Add IAP promoted subscription event.

## Signature

```ts
promotedProductListener((productId?: string) => {});
```

## Usage

```tsx
import React, {useEffect} from 'react';
import {View} from 'react-native';
import {promotedProductListener} from 'react-native-iap';

const App = () => {
  useEffect(() => {
    const subscription = promotedProductListener((productId) => {
      console.log(productId);
    });

    return () => {
      subscription.remove();
    };
  }, []);

  return <View />;
};
```

 *
 * @platform iOS
 */
export const promotedProductListener = (listener: () => void) => {
  if (isIos && !isIosStorekit2()) {
    const eventEmitter = new NativeEventEmitter(getIosModule());
    return eventEmitter.addListener('iap-promoted-product', listener);
  }

  return null;
};

/**
 * Updated transactions for iOS Sk2
 * Register a callback that gets called when the store has any updates to transactions related to purchases that have not yet been finished, consumed or acknowledged. 
 * Returns a React Native `EmitterSubscription` on which you can call `.remove()` to stop receiving updates. Register you listener as soon as possible and react to updates at all times.

**Warning**
This is only available for iOS 15 and higher and Storekit 2 is activated

## Signature

```ts
purchaseUpdatedListener((transactionOrError: TransactionOrError) => {});
```

## Usage

```tsx
import React, {useEffect} from 'react';
import {View} from 'react-native';
import {purchaseUpdatedListener} from 'react-native-iap';

const App = () => {
  useEffect(() => {
    const subscription = purchaseUpdatedListener((transactionOrError: TransactionOrError) => {
      if(transactionOrError.transaction){
        console.log("There's an update to a transaction", transactionOrError.transaction);
      }else{
        console.log("There's been an error with a received transaction")
      }
    });

    return () => {
      subscription.remove();
    };
  }, []);

  return <View />;
};
```
 *
 * @platform iOS (Sk2)
 */
export const transactionListener = (
  listener: (event: TransactionEvent) => void,
) => {
  if (isIos && isIosStorekit2()) {
    const eventEmitter = new NativeEventEmitter(getIosModule());
    return eventEmitter.addListener('iap-transaction-updated', listener);
  }

  return null;
};

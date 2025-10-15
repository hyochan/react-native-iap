# PR: Implement getActiveSubscriptions and hasActiveSubscriptions

## Summary

Implement `getActiveSubscriptions` and `hasActiveSubscriptions` methods across all platforms (iOS, Android, TypeScript) following the Flutter implementation pattern and leveraging OpenIAP's native methods.

## Changes

### TypeScript (`src/index.ts`)

- **`getActiveSubscriptions`**:
  - **Unified implementation**: Calls native `IAP.instance.getActiveSubscriptions()` on both iOS and Android
  - iOS: Returns subscriptions with `renewalInfoIOS` for subscription lifecycle management
  - Android: Uses OpenIAP's native method with proper Android-specific fields (`basePlanIdAndroid`, `currentPlanId`, etc.)
  - Returns `ActiveSubscription[]` with platform-specific fields properly mapped

- **`hasActiveSubscriptions`**:
  - Calls `getActiveSubscriptions()` and checks if result is not empty
  - Returns `false` on error (graceful degradation for better UX)

### iOS (`ios/HybridRnIap.swift:252-267`)

- Uses OpenIAP's native `getActiveSubscriptions()`
- Returns subscriptions with `renewalInfoIOS` for upgrade/downgrade detection

### Android (`android/src/main/java/com/margelo/nitro/iap/HybridRnIap.kt:442-495`)

- Implements `getActiveSubscriptions()` using OpenIAP's native method
- Directly calls `openIap.getActiveSubscriptions()` instead of manual filtering
- Maps OpenIAP's `ActiveSubscription` to `NitroActiveSubscription`
- Properly populates `basePlanIdAndroid` and `currentPlanId` fields

## Benefits

1. ✅ **Unified cross-platform implementation** - Both iOS and Android use native `getActiveSubscriptions()` method
2. ✅ **Consistent with Flutter implementation** - Follows the same pattern as the Flutter package
3. ✅ **Uses OpenIAP's validated code** - Leverages battle-tested subscription logic from OpenIAP libraries
4. ✅ **Simpler maintenance** - No manual filtering or complex TypeScript logic
5. ✅ **Better performance** - Direct native calls instead of filtering all purchases
6. ✅ **Better field coverage** - All platform-specific fields properly populated (iOS: `renewalInfoIOS`, Android: `basePlanIdAndroid`, `currentPlanId`)
7. ✅ **iOS renewalInfoIOS support** - Critical for detecting subscription upgrades, downgrades, and cancellations

## Technical Details

### Platform-specific behavior

**iOS**:

- Uses StoreKit 2's native subscription management
- Includes `renewalInfoIOS` with renewal status, pending upgrades/downgrades

**Android**:

- Uses Google Play Billing Library via OpenIAP
- Filters purchases by `PurchaseState.Purchased`
- No `renewalInfoIOS` field (Android-only fields used instead)

### Error Handling

- iOS: Throws error if not initialized
- Android: Returns `ServiceUnavailable` error on failure
- `hasActiveSubscriptions`: Returns `false` on error (graceful degradation)

## Testing

Recommend testing:

- [ ] iOS: Verify `renewalInfoIOS` is populated
- [ ] Android: Verify active subscriptions are returned
- [ ] Both: Test with/without `subscriptionIds` filter
- [ ] Both: Test `hasActiveSubscriptions` edge cases

# PR: Implement getActiveSubscriptions and hasActiveSubscriptions

## Summary

Implement `getActiveSubscriptions` and `hasActiveSubscriptions` methods across all platforms (iOS, Android, TypeScript) following the Flutter implementation pattern and leveraging OpenIAP's native methods.

## Changes

### TypeScript (`src/index.ts`)

- **`getActiveSubscriptions`**:
  - iOS: Calls native `getActiveSubscriptions()` with `renewalInfoIOS` included
  - Android: Falls back to `getAvailablePurchases()` and filters for active subscriptions
  - Returns `ActiveSubscription[]` with platform-specific fields

- **`hasActiveSubscriptions`**:
  - Calls `getActiveSubscriptions()` and checks if result is not empty
  - Returns `false` on error (better UX)

### iOS (`ios/HybridRnIap.swift:252-267`)

- Uses OpenIAP's native `getActiveSubscriptions()`
- Returns subscriptions with `renewalInfoIOS` for upgrade/downgrade detection

### Android (`android/src/main/java/com/margelo/nitro/iap/HybridRnIap.kt:442-495`)

- Implements `getActiveSubscriptions()` using OpenIAP's native method
- Directly calls `openIap.getActiveSubscriptions()` instead of manual filtering
- Maps OpenIAP's `ActiveSubscription` to `NitroActiveSubscription`
- Properly populates `basePlanIdAndroid` and `currentPlanId` fields

## Benefits

1. ✅ **Consistent with Flutter implementation** - Same logic across platforms
2. ✅ **Uses OpenIAP's validated code** - Leverages battle-tested subscription logic
3. ✅ **Simpler maintenance** - No manual filtering/conversion logic
4. ✅ **Better field coverage** - Android fields now properly populated
5. ✅ **iOS renewalInfoIOS support** - Critical for subscription upgrade/downgrade detection

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

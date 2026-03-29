---
title: Powered by OpenIAP
sidebar_label: OpenIAP
---

# Powered by OpenIAP

<a href="https://openiap.dev">
  <img src="https://raw.githubusercontent.com/hyodotdev/openiap/main/logo.png" alt="OpenIAP" height="60" />
</a>

React Native IAP conforms to the **[OpenIAP specification](https://openiap.dev)** — an open, vendor-neutral interoperability standard for in-app purchases across all platforms and frameworks.

## What is OpenIAP?

OpenIAP is not just a library — it's a **shared specification layer** that ensures consistent, secure, and verifiable in-app purchase behavior everywhere. Instead of each framework reinventing its own types, error models, and verification flows, OpenIAP defines them once in a single GraphQL schema and generates type-safe bindings for every platform.

## How It Works

```
GraphQL Schema (Single Source of Truth)
        │
        ▼
   IR (Intermediate Representation)
        │
        ├── Swift bindings    → openiap-apple (StoreKit 2)
        ├── Kotlin bindings   → openiap-google (Play Billing 8.x)
        ├── Dart bindings     → flutter_inapp_purchase
        └── GDScript bindings → godot-iap
```

## What OpenIAP Provides

| Component | Description |
|-----------|-------------|
| **Shared Specification** | Common types, error codes, and purchase flows across all platforms |
| **Generated Type-Safe Bindings** | Swift, Kotlin, Dart, and GDScript from a single GraphQL schema |
| **Platform Implementations** | [openiap-apple](https://github.com/hyodotdev/openiap/tree/main/packages/apple) (StoreKit 2) and [openiap-google](https://github.com/hyodotdev/openiap/tree/main/packages/google) (Play Billing 8.x) |
| **Verification Profiles** | Standardized receipt validation and purchase verification patterns |
| **Conformance Tests** | Cross-platform test matrix ensuring behavioral consistency |

## Libraries Built on OpenIAP

| Library | Platform |
|---------|----------|
| **[react-native-iap](https://github.com/hyochan/react-native-iap)** | React Native |
| [expo-iap](https://github.com/hyochan/expo-iap) | Expo |
| [flutter_inapp_purchase](https://github.com/hyochan/flutter_inapp_purchase) | Flutter |
| [kmp-iap](https://github.com/hyochan/kmp-iap) | Kotlin Multiplatform |
| [godot-iap](https://github.com/hyochan/godot-iap) | Godot Engine |

## Learn More

- **[OpenIAP Website](https://openiap.dev)** — Full specification and documentation
- **[OpenIAP GitHub](https://github.com/hyodotdev/openiap)** — Source code and monorepo
- **[About OpenIAP](https://openiap.dev/docs/foundation/about)** — Project overview and vision
- **[Governance](https://openiap.dev/docs/foundation/governance)** — Open governance model
- **[Become a Sponsor](https://openiap.dev/docs/foundation/sponsorship)** — Support the standard

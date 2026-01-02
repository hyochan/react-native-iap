---
sidebar_position: 10
title: Using with AI Assistants
---

import IapKitBanner from "@site/src/uis/IapKitBanner";

# Using with AI Assistants

<IapKitBanner />

react-native-iap provides AI-friendly documentation for use with AI coding assistants like Cursor, GitHub Copilot, Claude, and ChatGPT.

## AI-Optimized Documentation

We provide two documentation formats optimized for AI assistants:

| Format | Description | URL |
|--------|-------------|-----|
| Quick Reference | Concise API overview (~300 lines) | [llms.txt](/llms.txt) |
| Full Reference | Complete API documentation (~1000 lines) | [llms-full.txt](/llms-full.txt) |

## Add to Cursor

[Cursor](https://cursor.sh/) allows you to add custom documentation sources:

1. Open Cursor Settings (`Cmd+,` on Mac or `Ctrl+,` on Windows/Linux)
2. Go to **Features** > **Docs**
3. Click **Add new doc**
4. Enter the URL: `https://hyochan.github.io/react-native-iap/llms.txt`
5. Give it a name like "react-native-iap"

Now when you ask Cursor about react-native-iap, it will reference the official documentation.

## Add to GitHub Copilot

For GitHub Copilot Chat in VS Code:

1. Open a new chat (`Ctrl+Shift+I` or `Cmd+Shift+I`)
2. Reference the documentation URL in your prompt:

```
@workspace Using https://hyochan.github.io/react-native-iap/llms-full.txt as reference,
help me implement in-app purchases with react-native-iap
```

## Add to Claude or ChatGPT

When using Claude or ChatGPT, you can provide the documentation URL directly in your prompt:

```
Please refer to https://hyochan.github.io/react-native-iap/llms-full.txt for the react-native-iap API documentation.

Help me implement a subscription purchase flow with react-native-iap.
```

Or paste the content of `llms.txt` or `llms-full.txt` directly into your conversation for better context.

## Direct URL Access

You can access the AI documentation directly:

- **Quick Reference**: [https://hyochan.github.io/react-native-iap/llms.txt](https://hyochan.github.io/react-native-iap/llms.txt)
- **Full Reference**: [https://hyochan.github.io/react-native-iap/llms-full.txt](https://hyochan.github.io/react-native-iap/llms-full.txt)

## What's Included

### Quick Reference (`llms.txt`)

- Installation instructions
- `useIAP` hook basic usage
- Core API signatures
- Key type definitions
- Common patterns
- Error handling basics

### Full Reference (`llms-full.txt`)

- Complete installation and configuration guide
- Full `useIAP` hook API with all options
- All direct API functions with examples
- Complete type definitions
- Full error code reference
- iOS and Android platform-specific APIs
- Alternative billing flows
- Common implementation patterns
- Troubleshooting guide

## Example Prompts

Here are some example prompts that work well with the AI documentation:

### Basic Setup

```
Using react-native-iap documentation, show me how to set up a basic store
with product fetching and purchase handling.
```

### Subscription Implementation

```
How do I implement subscription purchases with react-native-iap?
Include Android offer tokens handling.
```

### Error Handling

```
What are all the error codes in react-native-iap and how should I handle them?
```

### Platform-Specific Features

```
Show me how to use iOS-specific features like refund requests
and subscription status checking in react-native-iap.
```

### Restore Purchases

```
How do I implement a "Restore Purchases" button with react-native-iap?
```

### Alternative Billing (Android)

```
How do I implement alternative billing (User Choice Billing) on Android
with react-native-iap?
```

### Subscription Upgrade/Downgrade

```
How do I implement subscription upgrades and downgrades with react-native-iap
on both iOS and Android?
```

## Tips for Better Results

1. **Be specific**: Mention react-native-iap explicitly in your prompts
2. **Reference the docs**: Include the documentation URL for more accurate answers
3. **Provide context**: Mention your platform (iOS/Android) if relevant
4. **Ask for examples**: Request code examples for practical implementation
5. **Mention Nitro**: If encountering setup issues, mention that react-native-iap uses Nitro Modules

## Feedback

If you find issues with the AI documentation or have suggestions for improvement, please [open an issue](https://github.com/hyochan/react-native-iap/issues) on GitHub.

![image](https://user-images.githubusercontent.com/27461460/75094417-20321b00-55ce-11ea-8de7-a1df42a4b7df.png)

---

[![Version](http://img.shields.io/npm/v/react-native-iap.svg?style=flat-square)](https://npmjs.org/package/react-native-iap)
[![Next Version](https://img.shields.io/npm/v/react-native-iap/next)](https://npmjs.org/package/react-native-iap)
[![Download](http://img.shields.io/npm/dm/react-native-iap.svg?style=flat-square)](https://npmjs.org/package/react-native-iap)
[![Backers and Sponsors](https://img.shields.io/opencollective/all/react-native-iap.svg)](https://opencollective.com/react-native-iap)
[![FOSSA Status](https://app.fossa.com/api/projects/git%2Bgithub.com%2Fhyochan%2Freact-native-iap.svg?type=shield&issueType=license)](https://app.fossa.com/projects/git%2Bgithub.com%2Fhyochan%2Freact-native-iap?ref=badge_shield&issueType=license)

---

## Announcement

Announcing the Migration of react-native-iap to an Expo Module for Improved Maintenance and Compatibility in [discussion #2754](https://github.com/hyochan/react-native-iap/discussions/2754). 

The [expo-iap](https://github.com/hyochan/expo-iap) library is now ready to use, with support for StoreKit 2 and Google Play Billing.

## Documentation

Read the [documentation](https://react-native-iap.hyo.dev). See the [troubleshooting](https://react-native-iap.hyo.dev/docs/guides/troubleshooting#common-issues) for the common issues to avoid.

## Logs

- Version `12.0.0`: Implements Amazon 3.x SDK including the new DRM verification.

- Version `11.0.0`: The module migrates OS sdk to [storekit2](https://developer.apple.com/videos/play/wwdc2021/10114). [andresesfm](https://github.com/andresesfm) is working hard on this.

  ```
  yarn add react-native-iap@next
  ```

- Version `10.0.0` is a maintenance build. Many internal refactorings and clean up of the code. Special thanks to [jeremybarbet](https://github.com/jeremybarbet) for his contributions. Most notably all methods now take an object parameter instead of separate parameters. Please help us test

- Version `9.0.0` The module migrates android sdk to [play billing library v5](https://qonversion.io/blog/google-play-billing-library-5-0). Our core maintainers [andresesfm](https://github.com/andresesfm) and [jeremybarbet](https://github.com/jeremybarbet) worked hard on this.

- Version `8.0.0` has finally landed in Jan 28th. Since this is early release, please use it with caution 🚧. We recommend user to use `>=8.0.0` with react-native `>=0.65.1`. The `next` package is no longer updated until we organize the roadmap for `9.0.0`.

- Version `8.0.0` is currently in release candidate. The module is completely rewritten with `Kotlin` and `Swift` for maintenenance issue by [andresesfm](https://github.com/andresesfm) 🔆. You may install this for early preview.

- React Native IAP hook is out. You can see [medium post](https://medium.com/hyochan/announcing-react-native-iap-hooks-96c7ffd3f19a) on how to use it.

- The `react-native-iap` module hasn't been maintained well recently. We are thinking of participating again and make the module healthier. Please refer to [2021 Maintenance plan](https://github.com/hyochan/react-native-iap/issues/1241) and share with us how you or your organization is using it. Happy new year 🎉

  - The sample code is out in [crossplatformkorea/CPK/pull/12](https://github.com/crossplatformkorea/CPK/pull/12). More information in [#1241 commment](https://github.com/hyochan/react-native-iap/issues/1241#issuecomment-798540785).

## Configuration of Play Store & App Store Connect

- Please refer to this [Blog post](https://medium.com/p/121622d26b67).

## Example

Follow [this guide](./IapExample/README.md) to get the example running.

## Sponsors

### <p style="color: gold;">Gold Tier</p>

<a href="https://www.courier.com/?utm_source=react-native-iap&utm_campaign=osssponsors">
    <img width="420" alt="courier_dot_com" src="https://github.com/user-attachments/assets/319d8966-6839-498d-8ead-ce8cc72c3bca" />
</a>

## Past Sponsors

<a href="https://namiml.com"><img src="https://github.com/hyochan/react-native-iap/assets/27461460/89d71f61-bb73-400a-83bd-fe0f96eb726e" width="280"/></a>&nbsp;&nbsp;&nbsp;&nbsp;<a href="https://www.revenuecat.com"><img src="https://github.com/hyochan/react-native-iap/assets/27461460/1e387a47-afe0-4b85-ad78-1064ca6623fa" width="200"/></a>

Support this project by becoming a sponsor. Your logo will show up here with
a link to your website. [Buy me a coffee](https://www.buymeacoffee.com/hyochan) or
[Become a sponsor](https://opencollective.com/react-native-iap#sponsor).
<a href="https://opencollective.com/react-native-iap#sponsors" target="_blank"><img src="https://opencollective.com/react-native-iap/sponsors.svg?width=890" /></a>

## Need Help Implementing/Debugging/Testing your IAP project?

Please take a look at [iap.dev/consulting](https://iap.dev/consulting). At iap.dev, we offer IAP consulting services for all platforms. Please [Contact Us](https://console.iap.dev/contact-us).

Note: This service is not affiliated with [hyochan](https://github.com/hyochan). It was created by [andresesfm](https://github.com/andresesfm) who has contributed and provided support for this project

### Backers

Please be our [Backers](https://opencollective.com/react-native-iap#backer).
<a href="https://opencollective.com/react-native-iap#backers" target="_blank"><img src="https://opencollective.com/react-native-iap/backers.svg?width=890" /></a>

### Contributing

Please make sure to read the [Contributing Guide](https://github.com/hyochan/react-native-iap/blob/main/CONTRIBUTING.md) before making a pull request.
Thank you to all the people who helped to maintain and upgrade this project!

<a href="graphs/contributors"><img src="https://opencollective.com/react-native-iap/contributors.svg?width=890" /></a>

---

[![FOSSA Status](https://app.fossa.com/api/projects/git%2Bgithub.com%2Fhyochan%2Freact-native-iap.svg?type=large&issueType=license)](https://app.fossa.com/projects/git%2Bgithub.com%2Fhyochan%2Freact-native-iap?ref=badge_large&issueType=license)

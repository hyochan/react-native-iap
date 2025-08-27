import { ConfigPlugin } from 'expo/config-plugins';
type PaymentProvider = 'Amazon AppStore' | 'both' | 'Play Store';
export declare const modifyAppBuildGradle: (
  buildGradle: string,
  paymentProvider: PaymentProvider
) => string;
interface Props {
  paymentProvider?: PaymentProvider;
}
declare const _default: ConfigPlugin<Props | undefined>;
export default _default;

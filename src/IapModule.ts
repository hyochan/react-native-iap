import { NitroModules } from 'react-native-nitro-modules';
import type { Iap as IapInterface } from './Iap.nitro';

/**
 * Centralized module creation to avoid circular dependencies
 * This module is imported by both index.tsx and modules/* files
 */
export const IapModule = NitroModules.createHybridObject<IapInterface>('Iap');

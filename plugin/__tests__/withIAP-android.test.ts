import plugin from '../src/withIAP';

// Mock config-plugins with simple pass-through helpers that immediately run mods
jest.mock('expo/config-plugins', () => ({
  createRunOncePlugin: (fn: any) => fn,
  withAndroidManifest: (config: any, action: any) => {
    // Simulate expo mod by passing manifest JSON as modResults
    const original = config.modResults;
    const cfg = {...config, modResults: original.manifest ?? {}};
    const result = action(cfg);
    // Write back the mutated manifest JSON
    const updated = {...original, manifest: result.modResults};
    return {...config, modResults: updated};
  },
  withAppBuildGradle: (config: any, action: any) => {
    const original = config.modResults;
    const cfg = {...config, modResults: {contents: original.contents}};
    const result = action(cfg);
    const updated = {...original, contents: result.modResults.contents};
    return {...config, modResults: updated};
  },
  WarningAggregator: {addWarningAndroid: jest.fn()},
}));

describe('withIAP config plugin (Android)', () => {
  const originalLog = console.log;
  const originalWarn = console.warn;

  beforeEach(() => {
    jest.resetModules();
    console.log = jest.fn();
    console.warn = jest.fn();
  });

  afterEach(() => {
    console.log = originalLog;
    console.warn = originalWarn;
  });

  function makeConfig(gradle: string, manifest?: any) {
    return {
      modResults: {
        contents: gradle,
        manifest: manifest ?? {manifest: {}},
      },
    } as any;
  }

  it('adds OpenIAP dep to app build.gradle and logs once', () => {
    const initial = `android {\n}\n\ndependencies {\n}`;
    const config = makeConfig(initial, {manifest: {}});
    const result: any = plugin(config as any);
    const out = result.modResults.contents as string;
    expect(out).toContain('io.github.hyochan.openiap:openiap-google:1.1.0');
    expect((console.log as jest.Mock).mock.calls.join(' ')).toMatch(
      /Added OpenIAP \(1\.1\.0\) to build\.gradle/,
    );
  });

  it('is idempotent and respects hasLoggedPluginExecution', () => {
    const initial = `dependencies {\n    implementation "io.github.hyochan.openiap:openiap-google:1.1.0"\n}`;
    const config1 = makeConfig(initial, {manifest: {}});
    const res1: any = plugin(config1 as any);
    expect(
      res1.modResults.contents.match(
        /io\.github\.hyochan\.openiap:openiap-google/g,
      )?.length,
    ).toBe(1);

    // Run plugin again on a second config; due to hasLoggedPluginExecution, it should not log again
    const config2 = makeConfig(initial, {manifest: {}});
    const before = (console.log as jest.Mock).mock.calls.length;
    plugin(config2);
    const after = (console.log as jest.Mock).mock.calls.length;
    expect(after).toBe(before);
  });

  it('adds BILLING permission to AndroidManifest if missing', () => {
    const config = makeConfig('dependencies {\n}', {manifest: {}});
    const res: any = plugin(config as any);
    const perms = res.modResults.manifest.manifest['uses-permission'];
    expect(Array.isArray(perms)).toBe(true);
    expect(
      perms.some(
        (p: any) => p.$['android:name'] === 'com.android.vending.BILLING',
      ),
    ).toBe(true);
  });

  it('keeps existing BILLING permission intact', () => {
    const manifest = {
      manifest: {
        'uses-permission': [
          {$: {'android:name': 'com.android.vending.BILLING'}},
        ],
      },
    };
    const config = makeConfig('dependencies {\n}', manifest);
    const res: any = plugin(config as any);
    const perms = res.modResults.manifest.manifest['uses-permission'];
    expect(perms.length).toBe(1);
  });
});

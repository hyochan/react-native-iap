require "json"

package = JSON.parse(File.read(File.join(__dir__, "package.json")))
versions_path = File.join(__dir__, "openiap-versions.json")
unless File.exist?(versions_path)
  raise "NitroIap: Missing openiap-versions.json. Add the file to manage native dependency versions."
end

versions = JSON.parse(File.read(versions_path))
apple_version = versions["apple"]
unless apple_version.is_a?(String) && !apple_version.strip.empty?
  raise "NitroIap: 'apple' version missing or invalid in openiap-versions.json"
end

Pod::Spec.new do |s|
  s.name         = "NitroIap"
  s.version      = package["version"]
  s.summary      = package["description"]
  s.homepage     = package["homepage"]
  s.license      = package["license"]
  s.authors      = package["author"]

  # React Native IAP uses StoreKit 2 via OpenIAP, which requires iOS 15+.
  # Enforce this at the podspec level so projects with a lower deployment target
  # get a clear CocoaPods error instead of a vague SwiftCompile failure.
  s.platforms    = { :ios => '15.0', :visionos => 1.0 }
  s.source       = { :git => "https://github.com/hyochan/react-native-iap.git", :tag => "#{s.version}" }

  s.source_files = [
    "ios/**/*.{swift}",
    "ios/**/*.{m,mm}",
  ]

  s.exclude_files = [
    "ios/RnIap-Bridging-Header.h",
  ]

  load 'nitrogen/generated/ios/NitroIap+autolinking.rb'
  add_nitrogen_files(s)

  s.dependency 'React-Core'
  s.dependency 'React-jsi'
  s.dependency 'React-callinvoker'
  # OpenIAP Apple for StoreKit 2 integration
  # Exact version match for consistent builds
  s.dependency 'openiap', "#{apple_version}"

  install_modules_dependencies(s)
end

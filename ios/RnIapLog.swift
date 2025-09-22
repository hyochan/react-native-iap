import Foundation
#if canImport(os)
import os
#endif

enum RnIapLog {
    enum Level: String {
        case debug
        case info
        case warn
        case error
    }

    private static var isEnabled: Bool = {
        #if DEBUG
        true
        #else
        false
        #endif
    }()

    private static var customHandler: ((Level, String) -> Void)?

    static func setEnabled(_ enabled: Bool) {
        isEnabled = enabled
    }

    static func setHandler(_ handler: ((Level, String) -> Void)?) {
        customHandler = handler
    }

    static func debug(_ message: String) { log(.debug, message) }
    static func info(_ message: String) { log(.info, message) }
    static func warn(_ message: String) { log(.warn, message) }
    static func error(_ message: String) { log(.error, message) }

    static func payload(_ name: String, _ payload: Any?) {
        debug("\(name) payload: \(stringify(payload))")
    }

    static func result(_ name: String, _ value: Any?) {
        debug("\(name) result: \(stringify(value))")
    }

    static func failure(_ name: String, error err: Error) {
        Self.error("\(name) failed: \(err.localizedDescription)")
    }

    private static func log(_ level: Level, _ message: String) {
        guard isEnabled else { return }

        if let handler = customHandler {
            handler(level, message)
            return
        }

        #if canImport(os)
        let logger = Logger(subsystem: "dev.hyo.react-native-iap", category: "RnIap")
        let formatted = "[RnIap] \(message)"
        switch level {
        case .debug:
            logger.debug("\(formatted, privacy: .public)")
        case .info:
            logger.info("\(formatted, privacy: .public)")
        case .warn:
            logger.warning("\(formatted, privacy: .public)")
        case .error:
            logger.error("\(formatted, privacy: .public)")
        }
        #else
        NSLog("[RnIap][%@] %@", level.rawValue.uppercased(), message)
        #endif
    }

    private static func stringify(_ value: Any?) -> String {
        guard let sanitized = sanitize(value) else {
            return "null"
        }

        if JSONSerialization.isValidJSONObject(sanitized),
           let data = try? JSONSerialization.data(withJSONObject: sanitized, options: []) {
            return String(data: data, encoding: .utf8) ?? String(describing: sanitized)
        }

        return String(describing: sanitized)
    }

    private static func sanitize(_ value: Any?) -> Any? {
        guard let value else { return nil }

        if let dictionary = value as? [String: Any] {
            return sanitizeDictionary(dictionary)
        }

        if let optionalDictionary = value as? [String: Any?] {
            var compact: [String: Any] = [:]
            for (key, optionalValue) in optionalDictionary {
                if let optionalValue {
                    compact[key] = optionalValue
                }
            }
            return sanitizeDictionary(compact)
        }

        if let array = value as? [Any] {
            return array.compactMap { sanitize($0) }
        }

        if let optionalArray = value as? [Any?] {
            return optionalArray.compactMap { sanitize($0) }
        }

        return value
    }

    private static func sanitizeDictionary(_ dictionary: [String: Any]) -> [String: Any] {
        var sanitized: [String: Any] = [:]
        for (key, value) in dictionary {
            if key.lowercased().contains("token") {
                sanitized[key] = "hidden"
            } else if let sanitizedValue = sanitize(value) {
                sanitized[key] = sanitizedValue
            }
        }
        return sanitized
    }
}

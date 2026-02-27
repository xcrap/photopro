import Foundation
import SwiftUI
import Observation

@Observable
final class SettingsStore {
    var timeFormat: TimeFormat {
        didSet { saveToStorage() }
    }
    var eclipseYearsRange: Int {
        didSet {
            eclipseYearsRange = min(5, max(1, eclipseYearsRange))
            saveToStorage()
        }
    }

    private let storageKey = "photopro-settings"

    init() {
        // Load from storage or use defaults
        if let data = UserDefaults.standard.data(forKey: storageKey),
           let state = try? JSONDecoder().decode(StoredState.self, from: data) {
            self.timeFormat = state.timeFormat
            self.eclipseYearsRange = state.eclipseYearsRange
        } else {
            self.timeFormat = .twentyFourHour
            self.eclipseYearsRange = 2
        }
    }

    private struct StoredState: Codable {
        var timeFormat: TimeFormat
        var eclipseYearsRange: Int
    }

    private func saveToStorage() {
        let state = StoredState(timeFormat: timeFormat, eclipseYearsRange: eclipseYearsRange)
        if let data = try? JSONEncoder().encode(state) {
            UserDefaults.standard.set(data, forKey: storageKey)
        }
    }
}

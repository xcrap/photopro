import Foundation
import Observation

@MainActor
@Observable
final class SettingsStore {
    static let eclipseYearsRangeBounds = 1...5

    var timeFormat: TimeFormat {
        didSet { saveToStorage() }
    }

    /// Always within 1–5. Clamped in `setEclipseYearsRange` — assigning a property from its own
    /// `didSet` under `@Observable` re-enters the observer forever (stack overflow).
    private(set) var eclipseYearsRange: Int

    private let storageKey = "photopro-settings"

    init() {
        // Load from storage or use defaults
        if let data = UserDefaults.standard.data(forKey: storageKey),
           let state = try? JSONDecoder().decode(StoredState.self, from: data) {
            self.timeFormat = state.timeFormat
            self.eclipseYearsRange = Self.clampedYearsRange(state.eclipseYearsRange)
        } else {
            self.timeFormat = .twentyFourHour
            self.eclipseYearsRange = 2
        }
    }

    func setEclipseYearsRange(_ value: Int) {
        let clamped = Self.clampedYearsRange(value)
        guard clamped != eclipseYearsRange else { return }
        eclipseYearsRange = clamped
        saveToStorage()
    }

    private static func clampedYearsRange(_ value: Int) -> Int {
        min(eclipseYearsRangeBounds.upperBound, max(eclipseYearsRangeBounds.lowerBound, value))
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

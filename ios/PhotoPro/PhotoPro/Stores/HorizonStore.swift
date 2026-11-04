import Foundation
import Observation

/// Terrain skylines, computed once per location key (3-decimal coordinates) in a background task
/// and reused for every date and time.
@MainActor
@Observable
final class HorizonStore {
    enum State {
        case idle
        case loading
        case loaded(HorizonProfile)
        case failed
    }

    private(set) var state: State = .idle
    @ObservationIgnored private var currentKey: String?
    @ObservationIgnored private var cache: [String: HorizonProfile] = [:]
    @ObservationIgnored private var order: [String] = []
    private static let maxProfiles = 12

    /// State for a location key: a skyline computed for another location reads as loading.
    func state(for key: String) -> State {
        if case .loaded(let profile) = state,
           LocationKey.make(latitude: profile.latitude, longitude: profile.longitude) != key {
            return .loading
        }
        return state
    }

    func profile(for key: String) -> HorizonProfile? {
        if case .loaded(let profile) = state(for: key) { return profile }
        return nil
    }

    /// Load (or reuse) the skyline for a location. Call from `.task(id: key)`; a newer location
    /// supersedes this one.
    func load(latitude: Double, longitude: Double) async {
        let key = LocationKey.make(latitude: latitude, longitude: longitude)
        currentKey = key
        if let cached = cache[key] {
            state = .loaded(cached)
            return
        }

        state = .loading
        // Let a dragged pin settle before fetching terrain.
        try? await Task.sleep(for: .milliseconds(250))
        guard !Task.isCancelled, currentKey == key else { return }

        let profile = await Task.detached(priority: .userInitiated) {
            await TerrainHorizon.compute(latitude: latitude, longitude: longitude)
        }.value
        guard currentKey == key else { return }

        guard profile.hasElevationData else {
            state = .failed
            return
        }
        cache[key] = profile
        order.removeAll { $0 == key }
        order.append(key)
        while order.count > Self.maxProfiles { cache[order.removeFirst()] = nil }
        state = .loaded(profile)
    }
}

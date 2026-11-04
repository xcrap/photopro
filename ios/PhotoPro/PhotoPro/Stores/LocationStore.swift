import Foundation
import CoreLocation
import MapKit
import Observation

private let defaultLatitude = 40.7128
private let defaultLongitude = -74.006
private let defaultName = "New York, NY"

private let storageKey = "photopro-location"

@MainActor
@Observable
final class LocationStore {
    var latitude: Double = defaultLatitude
    var longitude: Double = defaultLongitude
    var name: String? = defaultName
    var gpsEnabled: Bool = true
    var gpsStatus: GpsStatus = .idle
    var savedLocations: [SavedLocation] = []

    /// IANA time zone of the current location (from the forecast); `nil` until known.
    private(set) var timeZoneIdentifier: String?

    @ObservationIgnored private let locationManager = CLLocationManager()
    @ObservationIgnored private var locationDelegate: LocationDelegate?
    @ObservationIgnored private var geocodeTask: Task<Void, Never>?

    /// The location's time zone, falling back to the device's (ALGORITHM.md → "Time Zones").
    var timeZone: TimeZone {
        timeZoneIdentifier.flatMap(TimeZone.init(identifier:)) ?? .current
    }

    /// Coordinates rounded to 3 decimals (same key as the weather cache).
    var coordinateKey: String {
        LocationKey.make(latitude: latitude, longitude: longitude)
    }

    init() {
        loadFromStorage()
        let delegate = LocationDelegate(store: self)
        locationDelegate = delegate
        locationManager.delegate = delegate
        locationManager.desiredAccuracy = kCLLocationAccuracyBest

        if gpsEnabled {
            requestLocation()
        }
    }

    // MARK: - Location Management

    /// Set the current location. A known time zone can be passed (saved locations); otherwise it is
    /// kept for the same coordinates, looked up from saved locations, or reset to the device fallback
    /// until the forecast reports one.
    func setLocation(lat: Double, lon: Double, name: String? = nil, timeZoneIdentifier: String? = nil) {
        let newKey = LocationKey.make(latitude: lat, longitude: lon)
        let coordinatesChanged = newKey != coordinateKey

        latitude = lat
        longitude = lon
        self.name = name

        if let timeZoneIdentifier {
            self.timeZoneIdentifier = timeZoneIdentifier
        } else if coordinatesChanged {
            self.timeZoneIdentifier = savedLocations.first {
                LocationKey.make(latitude: $0.latitude, longitude: $0.longitude) == newKey
            }?.timeZoneIdentifier
        }
        saveToStorage()
    }

    /// Record the time zone reported by the forecast for `latitude`/`longitude`. Ignored if that is
    /// no longer the current location. Also stored on any saved location with the same coordinates.
    func applyForecastTimeZone(_ identifier: String, latitude: Double, longitude: Double) {
        guard TimeZone(identifier: identifier) != nil else { return }
        let key = LocationKey.make(latitude: latitude, longitude: longitude)
        guard key == coordinateKey else { return }

        var changed = false
        if timeZoneIdentifier != identifier {
            timeZoneIdentifier = identifier
            changed = true
        }
        for index in savedLocations.indices
        where LocationKey.make(latitude: savedLocations[index].latitude, longitude: savedLocations[index].longitude) == key
            && savedLocations[index].timeZoneIdentifier != identifier {
            savedLocations[index].timeZoneIdentifier = identifier
            changed = true
        }
        if changed { saveToStorage() }
    }

    func setGpsEnabled(_ enabled: Bool) {
        gpsEnabled = enabled
        saveToStorage()
        if enabled {
            requestLocation()
        } else {
            geocodeTask?.cancel()
            gpsStatus = .idle
        }
    }

    func useSavedLocation(_ saved: SavedLocation) {
        setGpsEnabled(false)
        setLocation(lat: saved.latitude, lon: saved.longitude, name: saved.name, timeZoneIdentifier: saved.timeZoneIdentifier)
    }

    func resetToDefault() {
        latitude = defaultLatitude
        longitude = defaultLongitude
        name = defaultName
        timeZoneIdentifier = nil
        gpsEnabled = true
        gpsStatus = .idle
        savedLocations = []
        saveToStorage()
    }

    // MARK: - Saved Locations

    func addSavedLocation(name: String, latitude: Double, longitude: Double, timeZoneIdentifier: String? = nil) {
        let location = SavedLocation(
            id: UUID().uuidString,
            name: name,
            latitude: latitude,
            longitude: longitude,
            timeZoneIdentifier: timeZoneIdentifier
        )
        savedLocations.append(location)
        saveToStorage()
    }

    func updateSavedLocation(id: String, name: String, latitude: Double, longitude: Double) {
        if let index = savedLocations.firstIndex(where: { $0.id == id }) {
            let old = savedLocations[index]
            let sameCoordinates = LocationKey.make(latitude: old.latitude, longitude: old.longitude)
                == LocationKey.make(latitude: latitude, longitude: longitude)
            savedLocations[index] = SavedLocation(
                id: id,
                name: name,
                latitude: latitude,
                longitude: longitude,
                timeZoneIdentifier: sameCoordinates ? old.timeZoneIdentifier : nil
            )
            saveToStorage()
        }
    }

    func removeSavedLocation(id: String) {
        savedLocations.removeAll { $0.id == id }
        saveToStorage()
    }

    // MARK: - GPS

    func requestLocation() {
        guard gpsEnabled else { return }
        gpsStatus = .requesting

        switch locationManager.authorizationStatus {
        case .notDetermined:
            locationManager.requestWhenInUseAuthorization()
        case .authorizedWhenInUse, .authorizedAlways:
            locationManager.requestLocation()
        case .denied, .restricted:
            gpsStatus = .denied
        @unknown default:
            gpsStatus = .error
        }
    }

    // GPS callbacks (from `LocationDelegate`). They never touch the location while GPS is off.

    fileprivate func handleAuthorizationChange(_ status: CLAuthorizationStatus) {
        guard gpsEnabled else { return }
        switch status {
        case .authorizedWhenInUse, .authorizedAlways:
            gpsStatus = .requesting
            locationManager.requestLocation()
        case .denied, .restricted:
            gpsStatus = .denied
        default:
            break
        }
    }

    fileprivate func handleLocationUpdate(latitude lat: Double, longitude lon: Double) {
        guard gpsEnabled else { return }
        gpsStatus = .granted

        let sameKey = LocationKey.make(latitude: lat, longitude: lon) == coordinateKey
        setLocation(lat: lat, lon: lon, name: sameKey ? name : nil)

        geocodeTask?.cancel()
        geocodeTask = Task { [weak self] in
            guard let request = MKReverseGeocodingRequest(location: CLLocation(latitude: lat, longitude: lon)) else { return }
            let placeName = (try? await request.mapItems)?.first?.name
            guard let self, !Task.isCancelled, self.gpsEnabled,
                  self.coordinateKey == LocationKey.make(latitude: lat, longitude: lon),
                  let placeName else { return }
            self.name = placeName
            self.saveToStorage()
        }
    }

    fileprivate func handleLocationError() {
        guard gpsEnabled else { return }
        gpsStatus = .error
    }

    // MARK: - Persistence

    private struct StoredState: Codable {
        var latitude: Double
        var longitude: Double
        var name: String?
        var gpsEnabled: Bool
        var savedLocations: [SavedLocation]
        var timeZoneIdentifier: String?
    }

    private func saveToStorage() {
        let state = StoredState(
            latitude: latitude,
            longitude: longitude,
            name: name,
            gpsEnabled: gpsEnabled,
            savedLocations: savedLocations,
            timeZoneIdentifier: timeZoneIdentifier
        )
        if let data = try? JSONEncoder().encode(state) {
            UserDefaults.standard.set(data, forKey: storageKey)
        }
    }

    private func loadFromStorage() {
        guard let data = UserDefaults.standard.data(forKey: storageKey),
              let state = try? JSONDecoder().decode(StoredState.self, from: data) else {
            return
        }
        latitude = state.latitude
        longitude = state.longitude
        name = state.name
        gpsEnabled = state.gpsEnabled
        savedLocations = state.savedLocations
        timeZoneIdentifier = state.timeZoneIdentifier
    }
}

// MARK: - CLLocationManager Delegate

/// Core Location calls back on the thread that created the manager (main). The callbacks extract
/// Sendable values and hop to the main actor; the store decides whether to use them.
@MainActor
private final class LocationDelegate: NSObject, CLLocationManagerDelegate {
    weak var store: LocationStore?

    init(store: LocationStore) {
        self.store = store
    }

    nonisolated func locationManager(_ manager: CLLocationManager, didUpdateLocations locations: [CLLocation]) {
        guard let coordinate = locations.last?.coordinate else { return }
        let lat = coordinate.latitude
        let lon = coordinate.longitude
        Task { @MainActor [weak self] in
            self?.store?.handleLocationUpdate(latitude: lat, longitude: lon)
        }
    }

    nonisolated func locationManager(_ manager: CLLocationManager, didFailWithError error: Error) {
        Task { @MainActor [weak self] in
            self?.store?.handleLocationError()
        }
    }

    nonisolated func locationManagerDidChangeAuthorization(_ manager: CLLocationManager) {
        let status = manager.authorizationStatus
        Task { @MainActor [weak self] in
            self?.store?.handleAuthorizationChange(status)
        }
    }
}

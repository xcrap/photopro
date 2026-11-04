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

    /// IANA time zone of the current location; `nil` until known.
    private(set) var timeZoneIdentifier: String?
    /// Where `timeZoneIdentifier` came from. A zone found from the coordinates themselves (reverse
    /// geocoding, a searched place, a saved location) wins over the forecast's.
    private(set) var timeZoneSource: TimeZoneSource = .unknown

    enum TimeZoneSource: String, Codable, Sendable {
        case coordinates
        case forecast
        case unknown
    }

    @ObservationIgnored private let locationManager = CLLocationManager()
    @ObservationIgnored private var locationDelegate: LocationDelegate?
    @ObservationIgnored private var geocodeTask: Task<Void, Never>?
    /// Whether the reverse-geocoded place name should replace the current name.
    @ObservationIgnored private var nameFromGeocoding = false

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
        if timeZoneSource != .coordinates {
            scheduleReverseGeocode(resolveName: false)
        }
    }

    // MARK: - Location Management

    /// Set the current location.
    ///
    /// Time zone order (ALGORITHM.md → "Time Zones"): a zone from the coordinates themselves (passed in
    /// for searched/saved places, else reverse geocoding), then the forecast's, then the device's.
    /// Reverse geocoding runs only when the 3-decimal location key changes, never on GPS jitter.
    /// - Parameters:
    ///   - timeZoneIdentifier: a zone known for these coordinates (searched place, saved location).
    ///   - resolveName: replace `name` with the reverse-geocoded place name when it arrives.
    func setLocation(lat: Double, lon: Double, name: String? = nil, timeZoneIdentifier: String? = nil, resolveName: Bool = false) {
        let newKey = LocationKey.make(latitude: lat, longitude: lon)
        let coordinatesChanged = newKey != coordinateKey

        latitude = lat
        longitude = lon
        self.name = name

        if let timeZoneIdentifier, TimeZone(identifier: timeZoneIdentifier) != nil {
            self.timeZoneIdentifier = timeZoneIdentifier
            timeZoneSource = .coordinates
            if coordinatesChanged || resolveName {
                geocodeTask?.cancel()
                if resolveName { scheduleReverseGeocode(resolveName: true) }
            }
        } else if coordinatesChanged {
            if let saved = savedLocations.first(where: {
                LocationKey.make(latitude: $0.latitude, longitude: $0.longitude) == newKey && $0.timeZoneIdentifier != nil
            }) {
                self.timeZoneIdentifier = saved.timeZoneIdentifier
                timeZoneSource = .coordinates
                geocodeTask?.cancel()
                if resolveName { scheduleReverseGeocode(resolveName: true) }
            } else {
                self.timeZoneIdentifier = nil
                timeZoneSource = .unknown
                scheduleReverseGeocode(resolveName: resolveName)
            }
        }
        saveToStorage()
    }

    /// Reverse-geocode the current coordinates (debounced, so a dragged pin geocodes once it settles)
    /// for the time zone and, optionally, the place name.
    private func scheduleReverseGeocode(resolveName: Bool) {
        geocodeTask?.cancel()
        nameFromGeocoding = resolveName
        let lat = latitude
        let lon = longitude
        let key = coordinateKey
        geocodeTask = Task { [weak self] in
            try? await Task.sleep(for: .milliseconds(600))
            guard !Task.isCancelled,
                  let request = MKReverseGeocodingRequest(location: CLLocation(latitude: lat, longitude: lon)) else { return }
            let item = (try? await request.mapItems)?.first
            guard let self, !Task.isCancelled, self.coordinateKey == key, let item else { return }
            if let zone = item.timeZone?.identifier {
                self.applyTimeZone(zone, source: .coordinates, key: key)
            }
            // A locality reads better than a postcode or street number.
            let placeName = item.addressRepresentations?.cityWithContext
                ?? item.addressRepresentations?.cityName
                ?? item.name
            if self.nameFromGeocoding, let placeName {
                self.name = placeName
                self.saveToStorage()
            }
        }
    }

    /// Record the time zone reported by the forecast for `latitude`/`longitude`. Used only until a
    /// zone from the coordinates is known, and ignored if that is no longer the current location.
    func applyForecastTimeZone(_ identifier: String, latitude: Double, longitude: Double) {
        guard timeZoneSource != .coordinates else { return }
        applyTimeZone(identifier, source: .forecast, key: LocationKey.make(latitude: latitude, longitude: longitude))
    }

    /// Store a zone for the current location and on any saved location with the same coordinates.
    private func applyTimeZone(_ identifier: String, source: TimeZoneSource, key: String) {
        guard TimeZone(identifier: identifier) != nil, key == coordinateKey else { return }
        var changed = false
        if timeZoneIdentifier != identifier || timeZoneSource != source {
            timeZoneIdentifier = identifier
            timeZoneSource = source
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
            gpsStatus = .idle
        }
    }

    func useSavedLocation(_ saved: SavedLocation) {
        setGpsEnabled(false)
        setLocation(lat: saved.latitude, lon: saved.longitude, name: saved.name, timeZoneIdentifier: saved.timeZoneIdentifier)
    }

    /// Use a place picked from search (its MapKit time zone, if known, is authoritative).
    func useSearchedPlace(_ place: PlaceResult) {
        setGpsEnabled(false)
        setLocation(lat: place.latitude, lon: place.longitude, name: place.name, timeZoneIdentifier: place.timeZoneIdentifier)
    }

    /// Move the location to a point picked on the map; the place name comes from reverse geocoding.
    func useMapPoint(latitude: Double, longitude: Double) {
        setGpsEnabled(false)
        setLocation(lat: latitude, lon: longitude, name: "Dropped pin", resolveName: true)
    }

    /// The current time zone if it was found from the coordinates (worth saving with a place).
    var coordinateTimeZoneIdentifier: String? {
        timeZoneSource == .coordinates ? timeZoneIdentifier : nil
    }

    func resetToDefault() {
        latitude = defaultLatitude
        longitude = defaultLongitude
        name = defaultName
        timeZoneIdentifier = nil
        timeZoneSource = .unknown
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

        // Same 3-decimal key: keep the name and time zone (no reverse geocoding on jitter).
        let sameKey = LocationKey.make(latitude: lat, longitude: lon) == coordinateKey
        setLocation(lat: lat, lon: lon, name: sameKey ? name : nil, resolveName: !sameKey)
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
        var timeZoneSource: TimeZoneSource?
    }

    private func saveToStorage() {
        let state = StoredState(
            latitude: latitude,
            longitude: longitude,
            name: name,
            gpsEnabled: gpsEnabled,
            savedLocations: savedLocations,
            timeZoneIdentifier: timeZoneIdentifier,
            timeZoneSource: timeZoneSource
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
        timeZoneSource = state.timeZoneIdentifier == nil ? .unknown : (state.timeZoneSource ?? .forecast)
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

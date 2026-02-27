import Foundation
import CoreLocation
import MapKit
import Observation

private let defaultLatitude = 40.7128
private let defaultLongitude = -73.906
private let defaultName = "New York, NY"

private let storageKey = "photopro-location"

@Observable
final class LocationStore {
    var latitude: Double = defaultLatitude
    var longitude: Double = defaultLongitude
    var name: String? = defaultName
    var gpsEnabled: Bool = true
    var gpsStatus: GpsStatus = .idle
    var savedLocations: [SavedLocation] = []

    private let locationManager = CLLocationManager()
    private var locationDelegate: LocationDelegate?

    init() {
        loadFromStorage()
        locationDelegate = LocationDelegate(store: self)
        locationManager.delegate = locationDelegate
        locationManager.desiredAccuracy = kCLLocationAccuracyBest

        if gpsEnabled {
            requestLocation()
        }
    }

    // MARK: - Location Management

    func setLocation(lat: Double, lon: Double, name: String? = nil) {
        latitude = lat
        longitude = lon
        self.name = name
        saveToStorage()
    }

    func setGpsEnabled(_ enabled: Bool) {
        gpsEnabled = enabled
        saveToStorage()
        if enabled {
            requestLocation()
        }
    }

    func resetToDefault() {
        latitude = defaultLatitude
        longitude = defaultLongitude
        name = defaultName
        gpsEnabled = true
        gpsStatus = .idle
        savedLocations = []
        saveToStorage()
    }

    // MARK: - Saved Locations

    func addSavedLocation(name: String, latitude: Double, longitude: Double) {
        let location = SavedLocation(
            id: UUID().uuidString,
            name: name,
            latitude: latitude,
            longitude: longitude
        )
        savedLocations.append(location)
        saveToStorage()
    }

    func updateSavedLocation(id: String, name: String, latitude: Double, longitude: Double) {
        if let index = savedLocations.firstIndex(where: { $0.id == id }) {
            savedLocations[index] = SavedLocation(id: id, name: name, latitude: latitude, longitude: longitude)
            saveToStorage()
        }
    }

    func removeSavedLocation(id: String) {
        savedLocations.removeAll { $0.id == id }
        saveToStorage()
    }

    // MARK: - GPS

    func requestLocation() {
        gpsStatus = .requesting
        let status = locationManager.authorizationStatus

        switch status {
        case .notDetermined:
            locationManager.requestWhenInUseAuthorization()
        case .authorizedWhenInUse, .authorizedAlways:
            gpsStatus = .granted
            locationManager.requestLocation()
        case .denied, .restricted:
            gpsStatus = .denied
        @unknown default:
            gpsStatus = .error
        }
    }

    // MARK: - Persistence

    private struct StoredState: Codable {
        var latitude: Double
        var longitude: Double
        var name: String?
        var gpsEnabled: Bool
        var savedLocations: [SavedLocation]
    }

    private func saveToStorage() {
        let state = StoredState(
            latitude: latitude,
            longitude: longitude,
            name: name,
            gpsEnabled: gpsEnabled,
            savedLocations: savedLocations
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
    }
}

// MARK: - CLLocationManager Delegate

private final class LocationDelegate: NSObject, CLLocationManagerDelegate {
    weak var store: LocationStore?

    init(store: LocationStore) {
        self.store = store
    }

    func locationManager(_ manager: CLLocationManager, didUpdateLocations locations: [CLLocation]) {
        guard let location = locations.last else { return }
        store?.gpsStatus = .granted

        // Reverse geocode to get city name
        if let request = MKReverseGeocodingRequest(location: location) {
            request.getMapItems { [weak self] mapItems, _ in
                let name = mapItems?.first?.name
                DispatchQueue.main.async {
                    self?.store?.setLocation(
                        lat: location.coordinate.latitude,
                        lon: location.coordinate.longitude,
                        name: name
                    )
                }
            }
        } else {
            store?.setLocation(lat: location.coordinate.latitude, lon: location.coordinate.longitude, name: nil)
        }
    }

    func locationManager(_ manager: CLLocationManager, didFailWithError error: Error) {
        store?.gpsStatus = .error
    }

    func locationManagerDidChangeAuthorization(_ manager: CLLocationManager) {
        switch manager.authorizationStatus {
        case .authorizedWhenInUse, .authorizedAlways:
            store?.gpsStatus = .granted
            manager.requestLocation()
        case .denied, .restricted:
            store?.gpsStatus = .denied
        default:
            break
        }
    }
}

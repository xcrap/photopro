import SwiftUI

@main
struct PhotoProApp: App {
    @State private var locationStore: LocationStore
    @State private var settingsStore = SettingsStore()
    @State private var weatherStore: WeatherStore

    init() {
        let location = LocationStore()
        _locationStore = State(initialValue: location)
        // Only the current location's cached forecast is loaded at startup.
        _weatherStore = State(initialValue: WeatherStore(latitude: location.latitude, longitude: location.longitude))
    }

    var body: some Scene {
        WindowGroup {
            ContentView()
                .modifier(WeatherSync())
                .environment(locationStore)
                .environment(settingsStore)
                .environment(weatherStore)
                .preferredColorScheme(.dark)
        }
    }
}

/// Keeps the forecast in step with the current location (ALGORITHM.md → "Weather Data Source"):
/// refetch whenever the location changes, re-check the 3 h cache every 30 min and on foreground,
/// and adopt the forecast's IANA time zone as the location time zone.
private struct WeatherSync: ViewModifier {
    @Environment(LocationStore.self) private var locationStore
    @Environment(WeatherStore.self) private var weatherStore
    @Environment(\.scenePhase) private var scenePhase

    private var forecastSignature: String? {
        guard let forecast = weatherStore.forecast else { return nil }
        return "\(forecast.cacheKey)|\(forecast.timezone)"
    }

    func body(content: Content) -> some View {
        content
            .task(id: locationStore.coordinateKey) {
                while !Task.isCancelled {
                    await weatherStore.fetchForecast(
                        latitude: locationStore.latitude,
                        longitude: locationStore.longitude
                    )
                    try? await Task.sleep(for: .seconds(30 * 60))
                }
            }
            .onChange(of: scenePhase) { _, phase in
                guard phase == .active else { return }
                Task {
                    await weatherStore.fetchForecast(
                        latitude: locationStore.latitude,
                        longitude: locationStore.longitude
                    )
                }
            }
            .onChange(of: forecastSignature, initial: true) {
                guard let forecast = weatherStore.forecast else { return }
                locationStore.applyForecastTimeZone(
                    forecast.timezone,
                    latitude: forecast.latitude,
                    longitude: forecast.longitude
                )
            }
    }
}

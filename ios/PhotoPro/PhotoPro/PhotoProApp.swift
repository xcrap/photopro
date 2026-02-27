import SwiftUI

@main
struct PhotoProApp: App {
    @State private var locationStore = LocationStore()
    @State private var settingsStore = SettingsStore()
    @State private var weatherStore = WeatherStore()

    var body: some Scene {
        WindowGroup {
            ContentView()
                .environment(locationStore)
                .environment(settingsStore)
                .environment(weatherStore)
                .preferredColorScheme(.dark)
        }
    }
}

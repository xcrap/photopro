import SwiftUI

struct ContentView: View {
    init() {
        let normalAttrs: [NSAttributedString.Key: Any] = [
            .font: UIFont.systemFont(ofSize: 9, weight: .semibold),
            .kern: 1.2
        ]
        let selectedAttrs: [NSAttributedString.Key: Any] = [
            .font: UIFont.systemFont(ofSize: 9, weight: .semibold),
            .kern: 1.2
        ]

        let itemAppearance = UITabBarItemAppearance()
        itemAppearance.normal.titleTextAttributes = normalAttrs
        itemAppearance.normal.titlePositionAdjustment = UIOffset(horizontal: 0, vertical: 3)
        itemAppearance.selected.titleTextAttributes = selectedAttrs
        itemAppearance.selected.titlePositionAdjustment = UIOffset(horizontal: 0, vertical: 3)

        let tabBarAppearance = UITabBarAppearance()
        tabBarAppearance.stackedLayoutAppearance = itemAppearance
        tabBarAppearance.inlineLayoutAppearance = itemAppearance
        tabBarAppearance.compactInlineLayoutAppearance = itemAppearance

        UITabBar.appearance().standardAppearance = tabBarAppearance
        UITabBar.appearance().scrollEdgeAppearance = tabBarAppearance
    }

    var body: some View {
        TabView {
            Tab("HOME", systemImage: "house.fill") {
                NavigationStack {
                    HomePage()
                }
            }
            Tab("WEEK", systemImage: "cloud.sun.fill") {
                NavigationStack {
                    WeatherPage()
                }
            }
            Tab("SUN", systemImage: "sun.max.fill") {
                NavigationStack {
                    SunPage()
                }
            }
            Tab("MOON", systemImage: "moon.fill") {
                NavigationStack {
                    MoonPage()
                }
            }
            Tab("NIGHT", systemImage: "star.fill") {
                NavigationStack {
                    NightPage()
                }
            }
        }
        .tint(Theme.primary)
    }
}

#Preview {
    ContentView()
        .environment(LocationStore())
        .environment(SettingsStore())
        .environment(WeatherStore())
        .preferredColorScheme(.dark)
}

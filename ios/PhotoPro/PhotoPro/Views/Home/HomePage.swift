import SwiftUI

struct HomePage: View {
    @Environment(LocationStore.self) private var locationStore
    @Environment(SettingsStore.self) private var settingsStore
    @Environment(WeatherStore.self) private var weatherStore

    @State private var selectedDate = Date()
    @State private var currentTime = Date()
    @State private var navigateToSettings = false

    private let timer = Timer.publish(every: 30, on: .main, in: .common).autoconnect()

    var body: some View {
        ScrollView {
            VStack(spacing: Theme.spacingXL) {
                DateNavigator(selectedDate: $selectedDate)
                    .padding(.top, Theme.spacingSM)

                SunCard(date: selectedDate, currentTime: currentTime)
                    .surfaceCard(accent: Theme.sunAccent)

                MoonCard(date: selectedDate, currentTime: currentTime)
                    .surfaceCard(accent: Theme.moonAccent)

                WeatherCard()
                    .surfaceCard()

                UpcomingEventsList(date: selectedDate)
                    .surfaceCard()
            }
            .padding(.horizontal, Theme.spacingLG)
            .padding(.vertical, Theme.spacingMD)
        }
        .background(Theme.background)
        .navigationTitle("PhotoPro")
        .toolbarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .topBarTrailing) {
                HStack(spacing: 5) {
                    Circle()
                        .fill(locationStore.gpsStatus == .granted ? .green : (locationStore.gpsStatus == .denied ? .red : .gray))
                        .frame(width: 7, height: 7)
                    Text("GPS")
                        .font(.system(size: 11, weight: .bold))
                        .foregroundStyle(locationStore.gpsStatus == .granted ? .green : (locationStore.gpsStatus == .denied ? .red : Theme.mutedForeground))
                }
            }
            .sharedBackgroundVisibility(.hidden)
            ToolbarItem(placement: .topBarTrailing) {
                Button {
                    navigateToSettings = true
                } label: {
                    Image(systemName: "gearshape.fill")
                        .foregroundStyle(Theme.mutedForeground)
                }
            }
        }
        .navigationDestination(isPresented: $navigateToSettings) {
            SettingsPage()
        }
        .onReceive(timer) { _ in
            currentTime = Date()
        }
        .task {
            if weatherStore.forecast == nil {
                await weatherStore.fetchForecast(
                    latitude: locationStore.latitude,
                    longitude: locationStore.longitude
                )
            }
            weatherStore.startAutoRefresh(
                latitude: locationStore.latitude,
                longitude: locationStore.longitude
            )
        }
    }
}

// MARK: - Sun Card

struct SunCard: View {
    let date: Date
    let currentTime: Date

    @Environment(LocationStore.self) private var locationStore
    @Environment(SettingsStore.self) private var settingsStore

    private var sunTimes: SunTimes {
        SunCalculator.getSunTimes(date: date, lat: locationStore.latitude, lon: locationStore.longitude)
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            // Title
            HStack {
                Image(systemName: "sun.max.fill")
                    .foregroundStyle(Theme.sunAccent)
                Text("Sun")
                    .font(.subheadline.weight(.semibold))
                    .foregroundStyle(Theme.foreground)
            }
            .padding(.bottom, Theme.spacingLG)

            // InfoRows
            VStack(spacing: 0) {
                InfoRow(icon: "sunrise", label: "Sunrise",
                        value: Formatting.formatTime(sunTimes.sunrise, format: settingsStore.timeFormat))
                Divider().opacity(0.1)
                InfoRow(icon: "sunset", label: "Sunset",
                        value: Formatting.formatTime(sunTimes.sunset, format: settingsStore.timeFormat))
                Divider().opacity(0.1)
                InfoRow(icon: "camera", label: "Golden Hour",
                        value: "\(Formatting.formatTime(sunTimes.goldenHourStart, format: settingsStore.timeFormat)) – \(Formatting.formatTime(sunTimes.sunset, format: settingsStore.timeFormat))")
            }
        }
    }
}

// MARK: - Moon Card

struct MoonCard: View {
    let date: Date
    let currentTime: Date

    @Environment(LocationStore.self) private var locationStore
    @Environment(SettingsStore.self) private var settingsStore

    private var moonData: MoonData {
        MoonCalculator.getMoonData(date: date, lat: locationStore.latitude, lon: locationStore.longitude)
    }

    private var nextFullMoon: FullMoonEvent? {
        FullMoonFinder.findFullMoons(startDate: date, months: 3).first { $0.date > date }
    }

    var body: some View {
        let moon = moonData

        VStack(alignment: .leading, spacing: 0) {
            // Title
            HStack {
                Image(systemName: "moon.fill")
                    .foregroundStyle(Theme.moonAccent)
                Text("Moon")
                    .font(.subheadline.weight(.semibold))
                    .foregroundStyle(Theme.foreground)
            }
            .padding(.bottom, Theme.spacingLG)

            // Phase icon + name
            HStack(spacing: Theme.spacingXL) {
                MoonPhaseIcon(phase: moon.phase, size: 56, tiltAngle: moon.tiltAngle)

                VStack(alignment: .leading, spacing: 4) {
                    Text(moon.phaseName)
                        .font(.callout.weight(.semibold))
                        .foregroundStyle(Theme.foreground)
                    Text("\(Int(moon.illumination))% illuminated")
                        .font(.caption)
                        .foregroundStyle(Theme.mutedForeground)
                }
                Spacer()
            }
            .padding(.bottom, Theme.spacingMD)

            // InfoRows
            VStack(spacing: 0) {
                InfoRow(icon: "moon.fill", label: "Moonrise",
                        value: moon.moonrise != nil ? Formatting.formatTime(moon.moonrise!, format: settingsStore.timeFormat) : "—")
                Divider().opacity(0.1)
                InfoRow(icon: "moon.fill", label: "Moonset",
                        value: moon.moonset != nil ? Formatting.formatTime(moon.moonset!, format: settingsStore.timeFormat) : "—")
                if let fm = nextFullMoon {
                    Divider().opacity(0.1)
                    InfoRow(icon: "calendar", label: "Next Full Moon",
                            value: "\(Formatting.formatDateShort(fm.date)) · \(fm.folkName)")
                }
            }
        }
    }
}

// MARK: - Weather Card

struct WeatherCard: View {
    @Environment(WeatherStore.self) private var weatherStore

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            // Title
            HStack {
                Image(systemName: "cloud.sun.fill")
                    .foregroundStyle(Theme.primary)
                Text("This Week")
                    .font(.subheadline.weight(.semibold))
                    .foregroundStyle(Theme.foreground)
            }
            .padding(.bottom, Theme.spacingLG)

            if weatherStore.isLoading {
                ProgressView()
                    .frame(maxWidth: .infinity)
                    .padding()
            } else if let error = weatherStore.error {
                Text(error)
                    .font(.caption)
                    .foregroundStyle(.red)
            } else {
                let topDays = weatherStore.getTopDays(count: 3)
                if topDays.isEmpty {
                    Text("No good or excellent days in this forecast")
                        .font(.caption)
                        .foregroundStyle(Theme.mutedForeground)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, Theme.spacingXL)
                } else {
                    VStack(spacing: 0) {
                        ForEach(topDays) { day in
                            WeatherDayRow(day: day)
                        }
                    }
                }
            }
        }
    }
}

// MARK: - Weather Day Row

struct WeatherDayRow: View {
    let day: DailyPhotoScore

    var body: some View {
        let isToday = Calendar.current.isDateInToday(day.displayDate)

        HStack(spacing: Theme.spacingSM) {
            Text(isToday ? "Today" : Formatting.formatDateShort(day.displayDate))
                .font(.subheadline.weight(.medium))
                .foregroundStyle(isToday ? Theme.scoreGood : Theme.foreground.opacity(0.8))
                .frame(width: 54, alignment: .leading)

            Text(day.conditions.summary)
                .font(.caption2)
                .foregroundStyle(Theme.mutedForeground)
                .lineLimit(1)

            Spacer(minLength: 4)

            // Score badge - compact
            let color = Theme.scoreColor(for: day.score)
            HStack(spacing: 3) {
                Image(systemName: WeatherScoring.getScoreIcon(day.score))
                    .font(.system(size: 9))
                Text("\(day.score)")
                    .font(.caption2.weight(.bold).monospacedDigit())
            }
            .foregroundStyle(color)
            .padding(.horizontal, 8)
            .padding(.vertical, 5)
            .background(color.opacity(0.1))
            .clipShape(RoundedRectangle(cornerRadius: 6))
            .overlay(
                RoundedRectangle(cornerRadius: 6)
                    .strokeBorder(color.opacity(0.2), lineWidth: 1)
            )
        }
        .padding(.vertical, 10)
    }
}

// MARK: - Upcoming Events List

struct UpcomingEventsList: View {
    let date: Date

    @Environment(LocationStore.self) private var locationStore
    @Environment(WeatherStore.self) private var weatherStore

    private var fullMoons: [FullMoonEvent] {
        FullMoonFinder.findFullMoons(startDate: date, months: 3)
    }

    private var proximityEvents: [ProximityEvent] {
        ProximityFinder.findProximityEvents(
            startDate: date, days: 90,
            lat: locationStore.latitude, lon: locationStore.longitude
        )
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            // Title
            HStack {
                Image(systemName: "calendar")
                    .foregroundStyle(Theme.mutedForeground)
                Text("Upcoming")
                    .font(.subheadline.weight(.semibold))
                    .foregroundStyle(Theme.foreground)
            }
            .padding(.bottom, Theme.spacingLG)

            let nextFullMoon = fullMoons.first { $0.date > date }
            let nextProximity = proximityEvents.first { $0.date > date }
            let nextMeteor = MeteorCalculator.getNextMeteorShower(fromDate: date, userLatitude: locationStore.latitude)

            let hasEvents = nextFullMoon != nil || nextProximity != nil || nextMeteor != nil

            if hasEvents {
                VStack(spacing: 0) {
                    if let fm = nextFullMoon {
                        UpcomingRow(
                            date: fm.date,
                            referenceDate: date,
                            icon: "moon.fill",
                            iconColor: Theme.moonAccent,
                            iconBg: Theme.moonAccent.opacity(0.08),
                            title: fm.folkName,
                            subtitle: "Full Moon\(fm.isSupermoon ? " · Supermoon" : "")"
                        )
                    }

                    if let prox = nextProximity {
                        UpcomingRow(
                            date: prox.date,
                            referenceDate: date,
                            icon: "camera.fill",
                            iconColor: Theme.proximityAccent,
                            iconBg: Theme.proximityAccent.opacity(0.08),
                            title: "Photo Opportunity",
                            subtitle: prox.description
                        )
                    }

                    if let meteor = nextMeteor {
                        UpcomingRow(
                            date: meteor.peakDate,
                            referenceDate: date,
                            icon: "sparkle",
                            iconColor: Color(red: 0.49, green: 0.42, blue: 0.95),
                            iconBg: Color(red: 0.49, green: 0.42, blue: 0.95).opacity(0.1),
                            title: meteor.name,
                            subtitle: "Meteor Shower · ZHR \(meteor.zhr)"
                        )
                    }
                }
            } else {
                Text("No upcoming events")
                    .font(.caption)
                    .foregroundStyle(Theme.mutedForeground)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, Theme.spacingXL)
            }
        }
    }
}

// MARK: - Upcoming Row

struct UpcomingRow: View {
    let date: Date
    let referenceDate: Date
    let icon: String
    let iconColor: Color
    let iconBg: Color
    let title: String
    let subtitle: String

    var body: some View {
        let isToday = Calendar.current.isDateInToday(date)

        HStack(spacing: Theme.spacingMD) {
            // Date column
            Text(isToday ? "Today" : Formatting.formatDateShort(date))
                .font(.subheadline.weight(.medium))
                .foregroundStyle(isToday ? Color(red: 0.49, green: 0.73, blue: 0.95) : Theme.foreground.opacity(0.8))
                .frame(width: 56, alignment: .leading)

            // Icon in rounded square
            Image(systemName: icon)
                .font(.caption)
                .foregroundStyle(iconColor)
                .frame(width: 32, height: 32)
                .background(iconBg)
                .clipShape(RoundedRectangle(cornerRadius: Theme.radiusSM))

            // Title + subtitle
            VStack(alignment: .leading, spacing: 2) {
                Text(title)
                    .font(.subheadline.weight(.medium))
                    .foregroundStyle(Theme.foreground)
                    .lineLimit(1)
                Text(subtitle)
                    .font(.caption2)
                    .foregroundStyle(Theme.mutedForeground)
                    .lineLimit(1)
            }

            Spacer()
        }
        .padding(.vertical, Theme.spacingMD)
        .background(isToday ? Color(red: 0.49, green: 0.73, blue: 0.95).opacity(0.06) : Color.clear)
    }
}

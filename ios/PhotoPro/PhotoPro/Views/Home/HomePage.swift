import Combine
import SwiftUI

struct HomePage: View {
    @Environment(LocationStore.self) private var locationStore

    @State private var selectedDate = Date()
    @State private var currentTime = Date()
    @State private var navigateToSettings = false

    private let timer = Timer.publish(every: 30, on: .main, in: .common).autoconnect()

    var body: some View {
        ScrollView {
            VStack(spacing: Theme.spacingXL) {
                NextEventCard(now: currentTime)
                    .surfaceCard(accent: Theme.sunAccent)
                    .padding(.top, Theme.spacingSM)

                DateNavigator(selectedDate: $selectedDate)

                SunCard(date: selectedDate)
                    .surfaceCard(accent: Theme.sunAccent)

                MoonCard(date: selectedDate)
                    .surfaceCard(accent: Theme.moonAccent)

                WeatherCard()
                    .surfaceCard()

                UpcomingEventsList(date: selectedDate, now: currentTime)
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
                .accessibilityElement(children: .ignore)
                .accessibilityLabel("GPS \(locationStore.gpsEnabled ? locationStore.gpsStatus.rawValue : "off")")
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
        .onAppear {
            currentTime = Date()
        }
    }
}

// MARK: - Next Event (countdown)

/// Next photography event across today and tomorrow, refreshed by the 30 s timer
/// (ALGORITHM.md → "Countdown").
struct NextEventCard: View {
    let now: Date

    @Environment(LocationStore.self) private var locationStore
    @Environment(SettingsStore.self) private var settingsStore

    var body: some View {
        let timeZone = locationStore.timeZone
        let event = Countdown.getNextEvent(
            now: now,
            latitude: locationStore.latitude,
            longitude: locationStore.longitude,
            timeZone: timeZone
        )

        HStack(spacing: Theme.spacingMD) {
            Image(systemName: event?.type.icon ?? "clock")
                .font(.callout)
                .foregroundStyle(Theme.sunAccent)
                .frame(width: 36, height: 36)
                .background(Theme.sunAccent.opacity(0.1))
                .clipShape(RoundedRectangle(cornerRadius: Theme.radiusSM))
                .accessibilityHidden(true)

            VStack(alignment: .leading, spacing: 2) {
                Text("Next event")
                    .font(.caption2)
                    .foregroundStyle(Theme.mutedForeground)
                Text(event?.label ?? "No upcoming events")
                    .font(.subheadline.weight(.semibold))
                    .foregroundStyle(Theme.foreground)
                    .lineLimit(1)
            }

            Spacer()

            if let event {
                VStack(alignment: .trailing, spacing: 2) {
                    Text(Formatting.formatCountdown(seconds: event.secondsUntil))
                        .font(.subheadline.weight(.semibold).monospacedDigit())
                        .foregroundStyle(Theme.sunAccent)
                    Text(eventTimeLabel(event, timeZone: timeZone))
                        .font(.caption2.monospacedDigit())
                        .foregroundStyle(Theme.mutedForeground)
                }
            }
        }
        .accessibilityElement(children: .combine)
    }

    private func eventTimeLabel(_ event: CountdownEvent, timeZone: TimeZone) -> String {
        if event.type == .meteorShower {
            return Formatting.formatRelativeDay(event.time, from: now, timeZone: timeZone)
        }
        let time = Formatting.formatTime(event.time, format: settingsStore.timeFormat, timeZone: timeZone)
        return AstroDateHelper.isSameDay(event.time, now, in: timeZone) ? time : "Tomorrow \(time)"
    }
}

// MARK: - Sun Card

struct SunCard: View {
    let date: Date

    @Environment(LocationStore.self) private var locationStore
    @Environment(SettingsStore.self) private var settingsStore

    var body: some View {
        let timeZone = locationStore.timeZone
        let sunTimes = SunCalculator.getSunTimes(
            date: date, lat: locationStore.latitude, lon: locationStore.longitude, timeZone: timeZone
        )
        let fmt: (Date?) -> String = { Formatting.formatTime($0, format: settingsStore.timeFormat, timeZone: timeZone) }

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

            if let message = sunTimes.polarState.message {
                PolarNotice(message: message)
                    .padding(.bottom, Theme.spacingSM)
            }

            // InfoRows
            VStack(spacing: 0) {
                InfoRow(icon: "sunrise", label: "Sunrise", value: fmt(sunTimes.sunrise))
                Divider().opacity(0.1)
                InfoRow(icon: "sunset", label: "Sunset", value: fmt(sunTimes.sunset))
                Divider().opacity(0.1)
                InfoRow(icon: "camera", label: "Golden Hour",
                        value: Formatting.formatTimeRange(sunTimes.goldenHourStart, sunTimes.goldenHourEnd,
                                                          format: settingsStore.timeFormat, timeZone: timeZone))
            }
        }
    }
}

/// "Sun stays up all day" / "Sun stays below the horizon" banner for polar days and nights.
struct PolarNotice: View {
    let message: String

    var body: some View {
        Label(message, systemImage: "globe.europe.africa")
            .font(.caption)
            .foregroundStyle(Theme.sunAccent)
            .padding(.horizontal, 10)
            .padding(.vertical, 6)
            .background(Theme.sunAccent.opacity(0.1))
            .clipShape(Capsule())
    }
}

// MARK: - Moon Card

struct MoonCard: View {
    let date: Date

    @Environment(LocationStore.self) private var locationStore
    @Environment(SettingsStore.self) private var settingsStore

    var body: some View {
        let timeZone = locationStore.timeZone
        let moon = MoonCalculator.getMoonData(
            date: date, lat: locationStore.latitude, lon: locationStore.longitude, timeZone: timeZone
        )
        let nextFullMoon = FullMoonFinder.findFullMoons(startDate: date, months: 2, timeZone: timeZone).first

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
                    .accessibilityHidden(true)

                VStack(alignment: .leading, spacing: 4) {
                    Text(moon.phaseName)
                        .font(.callout.weight(.semibold))
                        .foregroundStyle(Theme.foreground)
                    Text("\(Int(moon.illumination.rounded()))% illuminated")
                        .font(.caption)
                        .foregroundStyle(Theme.mutedForeground)
                }
                Spacer()
            }
            .padding(.bottom, Theme.spacingMD)

            // InfoRows
            VStack(spacing: 0) {
                InfoRow(icon: "moon.fill", label: "Moonrise",
                        value: Formatting.formatTime(moon.moonrise, format: settingsStore.timeFormat, timeZone: timeZone))
                Divider().opacity(0.1)
                InfoRow(icon: "moon.fill", label: "Moonset",
                        value: Formatting.formatTime(moon.moonset, format: settingsStore.timeFormat, timeZone: timeZone))
                if let fm = nextFullMoon {
                    Divider().opacity(0.1)
                    InfoRow(icon: "calendar", label: "Next Full Moon",
                            value: "\(Formatting.formatDateShort(fm.date, timeZone: timeZone)) · \(fm.folkName)\(fm.isSupermoon ? " · Supermoon" : "")")
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

            if weatherStore.forecast == nil && weatherStore.isLoading {
                ProgressView()
                    .frame(maxWidth: .infinity)
                    .padding()
            } else if weatherStore.forecast == nil, let error = weatherStore.error {
                Text(error)
                    .font(.caption)
                    .foregroundStyle(.red)
            } else {
                if let error = weatherStore.error {
                    Label(error, systemImage: "exclamationmark.triangle")
                        .font(.caption2)
                        .foregroundStyle(Theme.scoreFair)
                        .padding(.bottom, Theme.spacingSM)
                }
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

    @Environment(LocationStore.self) private var locationStore

    var body: some View {
        let timeZone = locationStore.timeZone
        let isToday = AstroDateHelper.isToday(day.displayDate, in: timeZone)

        HStack(spacing: Theme.spacingSM) {
            Text(isToday ? "Today" : Formatting.formatDateShort(day.displayDate, timeZone: timeZone))
                .font(.subheadline.weight(.medium))
                .foregroundStyle(isToday ? Theme.scoreGood : Theme.foreground.opacity(0.8))
                .frame(width: 54, alignment: .leading)

            Text(day.conditions.summary)
                .font(.caption2)
                .foregroundStyle(Theme.mutedForeground)
                .lineLimit(1)

            Spacer(minLength: 4)

            // Score badge — tap for the breakdown
            WeatherBadge(conditions: day.conditions)
        }
        .padding(.vertical, 10)
    }
}

// MARK: - Upcoming Events List

struct UpcomingEventsList: View {
    let date: Date
    let now: Date

    @Environment(LocationStore.self) private var locationStore
    /// 90-day proximity scan, recomputed off the main thread only when the day or location changes.
    @State private var proximityEvents: [ProximityEvent] = []

    private var scanKey: String {
        let timeZone = locationStore.timeZone
        let day = Formatting.string(from: max(date, now), pattern: "yyyy-MM-dd", timeZone: timeZone)
        return "\(locationStore.coordinateKey)|\(timeZone.identifier)|\(day)"
    }

    var body: some View {
        let timeZone = locationStore.timeZone
        // Events after the selected moment (or after now when viewing today).
        let reference = max(date, now)
        let nextFullMoon = FullMoonFinder.findFullMoons(startDate: reference, months: 2, timeZone: timeZone).first
        // Filter on the Sun event time, not the day's midnight, so tonight's pair is included.
        let nextProximity = proximityEvents.first { $0.sunTime > reference }
        let nextMeteor = MeteorCalculator.getNextMeteorShower(
            fromDate: reference, userLatitude: locationStore.latitude, timeZone: timeZone
        )
        let nextComet = CometCalculator.getComets(userLatitude: locationStore.latitude, now: now).first

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

            let hasEvents = nextFullMoon != nil || nextProximity != nil || nextMeteor != nil || nextComet != nil

            if hasEvents {
                VStack(spacing: 0) {
                    if let fm = nextFullMoon {
                        UpcomingRow(
                            date: fm.date,
                            icon: "moon.fill",
                            iconColor: Theme.moonAccent,
                            iconBg: Theme.moonAccent.opacity(0.08),
                            title: fm.folkName,
                            subtitle: "Full Moon\(fm.isSupermoon ? " · Supermoon" : "")"
                        )
                    }

                    if let prox = nextProximity {
                        UpcomingRow(
                            date: prox.sunTime,
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
                            icon: "sparkle",
                            iconColor: Color(red: 0.49, green: 0.42, blue: 0.95),
                            iconBg: Color(red: 0.49, green: 0.42, blue: 0.95).opacity(0.1),
                            title: meteor.name,
                            subtitle: "Meteor Shower · ZHR \(meteor.zhr)"
                        )
                    }

                    if let comet = nextComet {
                        UpcomingRow(
                            date: comet.isActive ? now : comet.peakDate,
                            icon: "wind",
                            iconColor: Theme.cometAccent,
                            iconBg: Theme.cometAccent.opacity(0.08),
                            title: comet.name,
                            subtitle: comet.isActive ? "Comet · visible now" : "Comet · \(comet.magnitudeRating)"
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
        .task(id: scanKey) {
            let start = max(date, now)
            let lat = locationStore.latitude
            let lon = locationStore.longitude
            let timeZone = locationStore.timeZone
            proximityEvents = await Task.detached(priority: .userInitiated) {
                ProximityFinder.findProximityEvents(startDate: start, days: 90, lat: lat, lon: lon, timeZone: timeZone)
            }.value
        }
    }
}

// MARK: - Upcoming Row

struct UpcomingRow: View {
    let date: Date
    let icon: String
    let iconColor: Color
    let iconBg: Color
    let title: String
    let subtitle: String

    @Environment(LocationStore.self) private var locationStore

    var body: some View {
        let timeZone = locationStore.timeZone
        let isToday = AstroDateHelper.isToday(date, in: timeZone)

        HStack(spacing: Theme.spacingMD) {
            // Date column
            Text(isToday ? "Today" : Formatting.formatDateShort(date, timeZone: timeZone))
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

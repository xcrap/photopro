import SwiftUI
import MapKit
import Combine

/// Sunrise/sunset map planner (ported from Waka Sun): rays from the pin toward the day's sun and
/// moon rise/set, the Sun and Moon now, and the solstice extremes, plus terrain first/last light.
/// Long-press the map or drag the pin to move the location.
struct MapPlannerPage: View {
    @Environment(LocationStore.self) private var locationStore
    @Environment(SettingsStore.self) private var settingsStore
    @Environment(HorizonStore.self) private var horizonStore

    @State private var selectedDate = Date()
    @State private var now = Date()
    @State private var position: MapCameraPosition = .automatic
    @State private var visibleRegion: MKCoordinateRegion?
    @State private var dragCoordinate: CLLocationCoordinate2D?
    @State private var showImagery = false
    @State private var didCenter = false

    private let timer = Timer.publish(every: 30, on: .main, in: .common).autoconnect()

    private var pin: CLLocationCoordinate2D {
        dragCoordinate ?? CLLocationCoordinate2D(latitude: locationStore.latitude, longitude: locationStore.longitude)
    }

    private var rayLength: Double {
        guard let region = visibleRegion else { return 60_000 }
        return Geodesy.rayLength(latitudeDelta: region.span.latitudeDelta,
                                 longitudeDelta: region.span.longitudeDelta,
                                 centerLatitude: region.center.latitude)
    }

    var body: some View {
        let timeZone = locationStore.timeZone
        let events = PlannerRays.events(day: selectedDate, now: now, lat: pin.latitude, lon: pin.longitude, timeZone: timeZone)

        GeometryReader { geo in
            VStack(spacing: 0) {
                map(events: events)
                    .frame(height: max(280, geo.size.height * 0.52))
                    .overlay(alignment: .bottomTrailing) {
                        Button {
                            recenter()
                        } label: {
                            Image(systemName: "location.viewfinder")
                                .font(.title3)
                                .padding(10)
                                .background(.ultraThinMaterial, in: Circle())
                        }
                        .padding(12)
                        .accessibilityLabel("Center on the pin")
                    }

                ScrollView {
                    VStack(spacing: Theme.spacingLG) {
                        DateNavigator(selectedDate: $selectedDate)
                        locationHeader(timeZone: timeZone)
                        eventsCard(events: events, timeZone: timeZone)
                        terrainCard(timeZone: timeZone)
                    }
                    .padding(.horizontal, Theme.spacingLG)
                    .padding(.vertical, Theme.spacingMD)
                }
            }
        }
        .background(Theme.background)
        .navigationTitle("Sun & Moon Map")
        .toolbarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .topBarTrailing) {
                Button {
                    showImagery.toggle()
                } label: {
                    Image(systemName: showImagery ? "map" : "globe.europe.africa.fill")
                }
                .accessibilityLabel(showImagery ? "Show map" : "Show satellite imagery")
            }
        }
        .onReceive(timer) { _ in now = Date() }
        .onAppear {
            now = Date()
            if !didCenter {
                didCenter = true
                let region = MKCoordinateRegion(center: pin, span: MKCoordinateSpan(latitudeDelta: 0.35, longitudeDelta: 0.35))
                position = .region(region)
                visibleRegion = region
            }
        }
        .task(id: locationStore.coordinateKey) {
            await horizonStore.load(latitude: locationStore.latitude, longitude: locationStore.longitude)
        }
    }

    // MARK: - Map

    private func map(events: [PlannerEvent]) -> some View {
        MapReader { proxy in
            Map(position: $position) {
                ForEach(events) { event in
                    let line = Geodesy.bearingLine(from: pin, bearing: event.azimuth, meters: rayLength)
                    let color = PlannerColors.color(for: event.kind)
                    if event.isSolstice || event.kind == .sunBelow {
                        MapPolyline(coordinates: line)
                            .stroke(color.opacity(0.9), style: StrokeStyle(lineWidth: 2, lineCap: .round, dash: [7, 6]))
                    } else {
                        MapPolyline(coordinates: line)
                            .stroke(Color.black.opacity(0.55), style: StrokeStyle(lineWidth: 6, lineCap: .round))
                        MapPolyline(coordinates: line)
                            .stroke(color, style: StrokeStyle(lineWidth: 3, lineCap: .round))
                    }
                }

                Annotation("Selected location", coordinate: pin, anchor: .center) {
                    pinView
                        .gesture(
                            DragGesture(minimumDistance: 2, coordinateSpace: .global)
                                .onChanged { value in
                                    dragCoordinate = proxy.convert(value.location, from: .global)
                                }
                                .onEnded { value in
                                    if let coordinate = proxy.convert(value.location, from: .global) {
                                        commit(coordinate)
                                    }
                                    dragCoordinate = nil
                                }
                        )
                }
                .annotationTitles(.hidden)
            }
            .mapStyle(showImagery
                      ? .hybrid(elevation: .realistic, pointsOfInterest: .excludingAll)
                      : .standard(elevation: .realistic, emphasis: .muted, pointsOfInterest: .excludingAll))
            .mapControls {
                MapCompass()
                MapScaleView()
            }
            .environment(\.colorScheme, .dark)
            .onMapCameraChange(frequency: .onEnd) { context in
                visibleRegion = context.region
            }
            .simultaneousGesture(
                LongPressGesture(minimumDuration: 0.5)
                    .sequenced(before: DragGesture(minimumDistance: 0, coordinateSpace: .local))
                    .onEnded { value in
                        if case .second(true, let drag?) = value,
                           let coordinate = proxy.convert(drag.location, from: .local) {
                            commit(coordinate)
                        }
                    }
            )
            .accessibilityElement(children: .contain)
            .accessibilityLabel("Map. Long-press to move the location, or drag the pin.")
        }
    }

    private var pinView: some View {
        ZStack {
            Circle()
                .fill(Theme.sunAccent.opacity(0.25))
                .frame(width: 34, height: 34)
            Circle()
                .fill(Theme.sunAccent)
                .frame(width: 16, height: 16)
                .overlay(Circle().strokeBorder(Color.black.opacity(0.7), lineWidth: 2))
        }
        .contentShape(Circle())
        .accessibilityLabel("Location pin")
        .accessibilityHint("Drag to move the location")
    }

    private func recenter() {
        let span = visibleRegion?.span ?? MKCoordinateSpan(latitudeDelta: 0.35, longitudeDelta: 0.35)
        withAnimation {
            position = .region(MKCoordinateRegion(center: pin, span: span))
        }
    }

    private func commit(_ coordinate: CLLocationCoordinate2D) {
        locationStore.useMapPoint(latitude: coordinate.latitude, longitude: coordinate.longitude)
    }

    // MARK: - Panel

    private func locationHeader(timeZone: TimeZone) -> some View {
        VStack(alignment: .leading, spacing: 2) {
            Text(locationStore.name ?? "Selected location")
                .font(.subheadline.weight(.semibold))
                .foregroundStyle(Theme.foreground)
            Text(String(format: "%.5f, %.5f", pin.latitude, pin.longitude)
                 + " · \(timeZone.identifier) (\(Formatting.timeZoneAbbreviation(timeZone, at: selectedDate)))")
                .font(.caption.monospacedDigit())
                .foregroundStyle(Theme.mutedForeground)
            Text("Long-press the map or drag the pin to move it.")
                .font(.caption2)
                .foregroundStyle(Theme.mutedForeground)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }

    private func eventsCard(events: [PlannerEvent], timeZone: TimeZone) -> some View {
        VStack(alignment: .leading, spacing: 0) {
            Label("Directions", systemImage: "location.north.line")
                .font(.subheadline.weight(.semibold))
                .foregroundStyle(Theme.sunAccent)
                .padding(.bottom, Theme.spacingSM)

            ForEach(Array(events.enumerated()), id: \.element.id) { index, event in
                if index > 0 { Divider().opacity(0.1) }
                eventRow(event, timeZone: timeZone)
            }
            if !events.contains(where: { $0.kind == .sunrise || $0.kind == .sunset }),
               let message = SunCalculator.getSunTimes(date: selectedDate, lat: pin.latitude, lon: pin.longitude, timeZone: timeZone).polarState.message {
                PolarNotice(message: message)
                    .padding(.top, Theme.spacingSM)
            }
        }
        .surfaceCard(accent: Theme.sunAccent)
    }

    private func eventRow(_ event: PlannerEvent, timeZone: TimeZone) -> some View {
        let direction = "\(Int(event.azimuth.rounded()))° \(Formatting.compassDirection(event.azimuth))"
        let detail: String
        if event.kind == .sunNow || event.kind == .sunBelow || event.kind == .moonNow {
            detail = String(format: "Altitude %.1f°", event.altitude ?? 0)
        } else if event.isSolstice, let time = event.time {
            detail = "\(Formatting.formatDateShort(time, timeZone: timeZone)), \(Formatting.formatTime(time, format: settingsStore.timeFormat, timeZone: timeZone))"
        } else {
            detail = Formatting.formatTime(event.time, format: settingsStore.timeFormat, timeZone: timeZone)
        }
        return HStack(spacing: Theme.spacingMD) {
            LegendSwatch(color: PlannerColors.color(for: event.kind), dashed: event.isSolstice || event.kind == .sunBelow)
            VStack(alignment: .leading, spacing: 2) {
                Text(event.label)
                    .font(.caption)
                    .foregroundStyle(Theme.foreground)
                Text(detail)
                    .font(.caption2.monospacedDigit())
                    .foregroundStyle(Theme.mutedForeground)
            }
            Spacer()
            Text(direction)
                .font(.subheadline.weight(.medium).monospacedDigit())
                .foregroundStyle(Theme.foreground.opacity(0.9))
        }
        .padding(.vertical, 8)
        .accessibilityElement(children: .combine)
    }

    private func terrainCard(timeZone: TimeZone) -> some View {
        VStack(alignment: .leading, spacing: 0) {
            Label("Real Horizon", systemImage: "mountain.2.fill")
                .font(.subheadline.weight(.semibold))
                .foregroundStyle(Theme.sunAccent)
                .padding(.bottom, Theme.spacingSM)

            if dragCoordinate != nil {
                Text("Release the pin to read the terrain.")
                    .font(.caption)
                    .foregroundStyle(Theme.mutedForeground)
            } else {
                switch horizonStore.state(for: locationStore.coordinateKey) {
                case .idle, .loading:
                    HStack(spacing: Theme.spacingSM) {
                        ProgressView()
                        Text("Reading terrain…")
                            .font(.caption)
                            .foregroundStyle(Theme.mutedForeground)
                    }
                case .failed:
                    Text("Elevation data is unavailable right now.")
                        .font(.caption)
                        .foregroundStyle(Theme.mutedForeground)
                case .loaded(let profile):
                    TerrainLightRows(
                        summary: TerrainLightSummary(profile: profile, day: selectedDate, timeZone: timeZone),
                        timeZone: timeZone,
                        timeFormat: settingsStore.timeFormat
                    )
                }
            }
            Text("Terrain only: trees and buildings aren't in the elevation data.")
                .font(.caption2)
                .foregroundStyle(Theme.mutedForeground)
                .padding(.top, Theme.spacingSM)
        }
        .surfaceCard(accent: Theme.sunAccent)
    }
}

/// Legend swatch: a short solid or dashed line in the ray colour.
private struct LegendSwatch: View {
    let color: Color
    let dashed: Bool

    var body: some View {
        Path { path in
            path.move(to: CGPoint(x: 0, y: 6))
            path.addLine(to: CGPoint(x: 22, y: 6))
        }
        .stroke(color, style: StrokeStyle(lineWidth: 3, lineCap: .round, dash: dashed ? [4, 3] : []))
        .frame(width: 22, height: 12)
        .accessibilityHidden(true)
    }
}

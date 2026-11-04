import SwiftUI
import MapKit
import Combine

/// Sunrise/sunset map planner (ported from Waka Sun): rays from the pin toward the day's sun and
/// moon rise/set, the Sun and Moon now, and the solstice extremes, plus terrain first/last light.
/// Double-tap or long-press the map, drag the pin, or search a place to move the location.
struct MapPlannerPage: View {
    /// The body whose rays and rows are shown — one at a time, never mixed.
    enum Bodies: String, CaseIterable, Identifiable {
        case sun = "Sun", moon = "Moon"
        var id: String { rawValue }
    }

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
    @State private var bodies: Bodies = .sun
    @State private var search = PlaceSearchModel()
    @State private var searchPresented = false

    private let timer = Timer.publish(every: 30, on: .main, in: .common).autoconnect()

    private var pin: CLLocationCoordinate2D {
        dragCoordinate ?? CLLocationCoordinate2D(latitude: locationStore.latitude, longitude: locationStore.longitude)
    }

    /// Radius of the sky drawing (the horizon) in metres: a fixed share of the map's smaller side.
    private func skyRadius(mapSize: CGSize) -> Double {
        guard let region = visibleRegion, mapSize.height > 0 else { return 5_000 }
        let metersPerPoint = region.span.latitudeDelta * Geodesy.earthRadius * .pi / 180 / mapSize.height
        return 0.42 * min(mapSize.width, mapSize.height) * metersPerPoint
    }

    private var skyBody: SkyPath.Body { bodies == .sun ? .sun : .moon }

    var body: some View {
        let timeZone = locationStore.timeZone
        let events = PlannerRays.events(day: selectedDate, now: now, lat: pin.latitude, lon: pin.longitude, timeZone: timeZone)
        let sunEvents = events.filter { !$0.isMoon }
        let moonEvents = events.filter(\.isMoon)
        let shown = bodies == .sun ? sunEvents : moonEvents

        GeometryReader { geo in
            let mapSize = CGSize(width: geo.size.width, height: max(280, geo.size.height * 0.52))
            VStack(spacing: 0) {
                map(events: shown, size: mapSize, timeZone: timeZone)
                    .frame(height: mapSize.height)
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
                        Picker("Show", selection: $bodies) {
                            ForEach(Bodies.allCases) { Text($0.rawValue).tag($0) }
                        }
                        .pickerStyle(.segmented)
                        DateNavigator(selectedDate: $selectedDate)
                        locationHeader(timeZone: timeZone)
                        switch bodies {
                        case .sun: sunCard(events: sunEvents, timeZone: timeZone)
                        case .moon: moonCard(events: moonEvents, timeZone: timeZone)
                        }
                        Text("Terrain only: trees and buildings aren't in the elevation data.")
                            .font(.caption2)
                            .foregroundStyle(Theme.mutedForeground)
                            .frame(maxWidth: .infinity, alignment: .leading)
                    }
                    .padding(.horizontal, Theme.spacingLG)
                    .padding(.vertical, Theme.spacingMD)
                }
            }
        }
        .background(Theme.background)
        .navigationTitle("Map")
        .toolbarTitleDisplayMode(.inline)
        .searchable(text: $search.query, isPresented: $searchPresented,
                    placement: .navigationBarDrawer(displayMode: .always), prompt: "Search places")
        .autocorrectionDisabled()
        .searchSuggestions {
            ForEach(search.suggestions) { suggestion in
                Button {
                    Task { await pick(suggestion) }
                } label: {
                    VStack(alignment: .leading, spacing: 2) {
                        Text(suggestion.title)
                            .foregroundStyle(Theme.foreground)
                        if !suggestion.subtitle.isEmpty {
                            Text(suggestion.subtitle)
                                .font(.caption)
                                .foregroundStyle(Theme.mutedForeground)
                        }
                    }
                }
            }
            if let message = search.errorMessage {
                Text(message)
                    .font(.caption)
                    .foregroundStyle(Theme.mutedForeground)
            }
        }
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

    /// The sky seen from above: the horizon is a circle around the pin (its radius follows the
    /// zoom) and a point at altitude h sits at radius × cos h. Rise/set lines end on the horizon;
    /// the "now" line ends at the body's disc on today's path.
    private func map(events: [PlannerEvent], size: CGSize, timeZone: TimeZone) -> some View {
        let radius = skyRadius(mapSize: size)
        let body = skyBody
        let calendar = AstroDateHelper.calendar(for: timeZone)
        let dayStart = calendar.startOfDay(for: selectedDate)
        let dayEnd = calendar.date(byAdding: .day, value: 1, to: dayStart) ?? dayStart.addingTimeInterval(86_400)
        let runs = SkyPath.runs(body, from: dayStart, to: dayEnd, lat: pin.latitude, lon: pin.longitude)
        let disc = events.first(where: { $0.kind == .sunNow || $0.kind == .moonNow })
            .flatMap { $0.time }
            .map { SkyPath.position(body, at: $0, lat: pin.latitude, lon: pin.longitude).point }
        let sky = { (point: SkyPath.Point) in
            Geodesy.destination(from: pin, bearing: point.azimuth, meters: SkyPath.distance(altitude: point.altitude, radius: radius))
        }

        return MapReader { proxy in
            Map(position: $position) {
                ForEach(Array(runs.enumerated()), id: \.offset) { _, run in
                    MapPolyline(coordinates: run.map(sky))
                        .stroke((body == .sun ? PlannerColors.sunPath : PlannerColors.moonPath).opacity(0.9),
                                style: StrokeStyle(lineWidth: 3, lineCap: .round, lineJoin: .round))
                }

                ForEach(events) { event in
                    let length = (event.kind == .sunNow || event.kind == .moonNow) && disc != nil
                        ? SkyPath.distance(altitude: disc!.altitude, radius: radius)
                        : radius
                    let line = Geodesy.bearingLine(from: pin, bearing: event.azimuth, meters: length)
                    let color = PlannerColors.color(for: event.kind)
                    if event.isDashed {
                        MapPolyline(coordinates: line)
                            .stroke(color.opacity(0.9), style: StrokeStyle(lineWidth: 2, lineCap: .round, dash: [7, 6]))
                    } else {
                        MapPolyline(coordinates: line)
                            .stroke(Color.black.opacity(0.55), style: StrokeStyle(lineWidth: 6, lineCap: .round))
                        MapPolyline(coordinates: line)
                            .stroke(color, style: StrokeStyle(lineWidth: 3, lineCap: .round))
                    }
                }

                if let disc {
                    Annotation(body == .sun ? "Sun" : "Moon", coordinate: sky(disc), anchor: .center) {
                        Circle()
                            .fill(body == .sun ? PlannerColors.sunDisc : PlannerColors.moonDisc)
                            .frame(width: 22, height: 22)
                            .overlay(Circle().strokeBorder(Color.white.opacity(0.85), lineWidth: 2))
                            .allowsHitTesting(false)
                    }
                    .annotationTitles(.hidden)
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
            // Simultaneous, like the long-press: a plain onTapGesture loses to MapKit's own gestures.
            .simultaneousGesture(
                SpatialTapGesture(count: 2, coordinateSpace: .local)
                    .onEnded { value in
                        if let coordinate = proxy.convert(value.location, from: .local) {
                            commit(coordinate)
                        }
                    }
            )
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
            .accessibilityLabel("Map. Double-tap or long-press to move the location, or drag the pin.")
        }
    }

    private var pinView: some View {
        // A red ring, so the spot never looks like the sun or moon disc.
        ZStack {
            Circle()
                .strokeBorder(Color.white.opacity(0.7), lineWidth: 2)
                .frame(width: 24, height: 24)
            Circle()
                .strokeBorder(Color(red: 0.94, green: 0.27, blue: 0.27), lineWidth: 3)
                .frame(width: 20, height: 20)
        }
        .frame(width: 40, height: 40)
        .contentShape(Circle())
        .accessibilityLabel("Location pin")
        .accessibilityHint("Drag to move the location")
    }

    private func recenter(span: MKCoordinateSpan? = nil) {
        let span = span ?? visibleRegion?.span ?? MKCoordinateSpan(latitudeDelta: 0.35, longitudeDelta: 0.35)
        withAnimation {
            position = .region(MKCoordinateRegion(center: pin, span: span))
        }
    }

    /// Move the location to a searched place and fly the map there.
    private func pick(_ suggestion: PlaceSearchModel.Suggestion) async {
        guard let place = await search.resolve(suggestion) else { return }
        locationStore.useSearchedPlace(place)
        search.clear()
        searchPresented = false
        recenter(span: MKCoordinateSpan(latitudeDelta: 0.35, longitudeDelta: 0.35))
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
            Text("Double-tap the map, long-press, or drag the pin to move it.")
                .font(.caption2)
                .foregroundStyle(Theme.mutedForeground)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }

    private func sunCard(events: [PlannerEvent], timeZone: TimeZone) -> some View {
        VStack(alignment: .leading, spacing: 0) {
            Label("Sun", systemImage: "sun.max.fill")
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
            terrainSection(.sun, timeZone: timeZone)
        }
        .surfaceCard(accent: Theme.sunAccent)
    }

    private func moonCard(events: [PlannerEvent], timeZone: TimeZone) -> some View {
        VStack(alignment: .leading, spacing: 0) {
            Label("Moon", systemImage: "moon.fill")
                .font(.subheadline.weight(.semibold))
                .foregroundStyle(Theme.moonAccent)
                .padding(.bottom, Theme.spacingSM)

            ForEach(Array(events.enumerated()), id: \.element.id) { index, event in
                if index > 0 { Divider().opacity(0.1) }
                eventRow(event, timeZone: timeZone)
            }
            if !events.contains(where: { $0.kind == .moonrise || $0.kind == .moonset }) {
                Text("No moonrise or moonset this day.")
                    .font(.caption)
                    .foregroundStyle(Theme.mutedForeground)
                    .padding(.vertical, 8)
            }
            terrainSection(.moon, timeZone: timeZone)
        }
        .surfaceCard(accent: Theme.moonAccent)
    }

    private func eventRow(_ event: PlannerEvent, timeZone: TimeZone) -> some View {
        let direction = "\(Int(event.azimuth.rounded()))° \(Formatting.compassDirection(event.azimuth))"
        let detail: String
        if event.isNow {
            detail = String(format: "Altitude %.1f°", event.altitude ?? 0)
        } else {
            detail = Formatting.formatTime(event.time, format: settingsStore.timeFormat, timeZone: timeZone)
        }
        return HStack(spacing: Theme.spacingMD) {
            LegendSwatch(color: PlannerColors.color(for: event.kind), dashed: event.isDashed)
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

    /// Real-horizon rows for one body, under its directions.
    private func terrainSection(_ part: TerrainLightRows.Part, timeZone: TimeZone) -> some View {
        VStack(alignment: .leading, spacing: 0) {
            Label("Over the real horizon", systemImage: "mountain.2.fill")
                .font(.caption.weight(.semibold))
                .foregroundStyle(Theme.mutedForeground)
                .padding(.top, Theme.spacingMD)
                .padding(.bottom, 4)

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
                    .padding(.vertical, 4)
                case .failed:
                    Text("Elevation data is unavailable right now.")
                        .font(.caption)
                        .foregroundStyle(Theme.mutedForeground)
                case .loaded(let profile):
                    TerrainLightRows(
                        summary: TerrainLightSummary(profile: profile, day: selectedDate, timeZone: timeZone),
                        timeZone: timeZone,
                        timeFormat: settingsStore.timeFormat,
                        parts: [part]
                    )
                }
            }
        }
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

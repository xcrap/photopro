import SwiftUI

struct SettingsPage: View {
    @Environment(LocationStore.self) private var locationStore
    @Environment(SettingsStore.self) private var settingsStore
    @State private var showingLocationDialog = false
    @State private var editingLocation: SavedLocation?
    @State private var manualLat = ""
    @State private var manualLon = ""
    @State private var search = PlaceSearchModel()
    @State private var placeToSave: PlaceResult?
    @FocusState private var searchFocused: Bool

    var body: some View {
        Form {
            // MARK: - Search
            Section {
                TextField("Search places", text: $search.query)
                    .focused($searchFocused)
                    .textInputAutocapitalization(.words)
                    .autocorrectionDisabled()
                    .submitLabel(.search)
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
                    .disabled(search.isSearching)
                }
                if let message = search.errorMessage {
                    Text(message)
                        .font(.caption)
                        .foregroundStyle(Theme.destructive)
                }
            } header: {
                Text("Find a Place")
            }

            // MARK: - Location
            Section("Location") {
                Toggle("Use GPS", isOn: Binding(
                    get: { locationStore.gpsEnabled },
                    set: { locationStore.setGpsEnabled($0) }
                ))

                if locationStore.gpsEnabled {
                    HStack {
                        Text("Status")
                        Spacer()
                        GpsStatusBadge(
                            gpsEnabled: locationStore.gpsEnabled,
                            gpsStatus: locationStore.gpsStatus,
                            locationName: locationStore.name
                        )
                    }
                }

                HStack {
                    Text("Latitude")
                    Spacer()
                    Text(String(format: "%.4f", locationStore.latitude))
                        .foregroundStyle(Theme.mutedForeground)
                        .monospacedDigit()
                }

                HStack {
                    Text("Longitude")
                    Spacer()
                    Text(String(format: "%.4f", locationStore.longitude))
                        .foregroundStyle(Theme.mutedForeground)
                        .monospacedDigit()
                }

                HStack {
                    Text("Time Zone")
                    Spacer()
                    Text(locationStore.timeZone.identifier)
                        .foregroundStyle(Theme.mutedForeground)
                }

                if !locationStore.gpsEnabled {
                    VStack(alignment: .leading, spacing: 6) {
                        HStack {
                            TextField("Latitude", text: $manualLat)
                                .coordinateField()
                            TextField("Longitude", text: $manualLon)
                                .coordinateField()
                            Button("Set") {
                                if let coordinate = CoordinateInput.validated(latitude: manualLat, longitude: manualLon) {
                                    locationStore.setLocation(lat: coordinate.latitude, lon: coordinate.longitude, name: "Manual")
                                }
                            }
                            .disabled(CoordinateInput.validated(latitude: manualLat, longitude: manualLon) == nil)
                        }
                        CoordinateErrors(latitude: manualLat, longitude: manualLon)
                    }
                }
            }

            // MARK: - Saved Locations
            Section("Saved Locations") {
                ForEach(locationStore.savedLocations) { saved in
                    HStack {
                        VStack(alignment: .leading) {
                            Text(saved.name)
                                .font(.subheadline)
                            Text("\(String(format: "%.4f", saved.latitude)), \(String(format: "%.4f", saved.longitude))")
                                .font(.caption)
                                .foregroundStyle(Theme.mutedForeground)
                        }
                        Spacer()
                        Button("Use") {
                            locationStore.useSavedLocation(saved)
                        }
                        .font(.caption.weight(.medium))
                    }
                    .swipeActions(edge: .trailing) {
                        Button(role: .destructive) {
                            locationStore.removeSavedLocation(id: saved.id)
                        } label: {
                            Label("Delete", systemImage: "trash")
                        }
                        Button {
                            editingLocation = saved
                            showingLocationDialog = true
                        } label: {
                            Label("Edit", systemImage: "pencil")
                        }
                        .tint(.orange)
                    }
                }

                Button {
                    editingLocation = nil
                    showingLocationDialog = true
                } label: {
                    Label("Add Location", systemImage: "plus")
                }

                if !locationStore.gpsEnabled || locationStore.gpsStatus == .granted {
                    Button("Save Current Location") {
                        locationStore.addSavedLocation(
                            name: locationStore.name ?? "Current Location",
                            latitude: locationStore.latitude,
                            longitude: locationStore.longitude,
                            timeZoneIdentifier: locationStore.timeZoneIdentifier
                        )
                    }
                }
            }

            // MARK: - Display
            Section("Display") {
                Picker("Time Format", selection: Binding(
                    get: { settingsStore.timeFormat },
                    set: { settingsStore.timeFormat = $0 }
                )) {
                    ForEach(TimeFormat.allCases, id: \.self) { format in
                        Text(format.label).tag(format)
                    }
                }
            }

            // MARK: - Data Range
            Section("Data Range") {
                VStack(alignment: .leading) {
                    Text("Eclipse Years Range: \(settingsStore.eclipseYearsRange)")
                    Slider(
                        value: Binding(
                            get: { Double(settingsStore.eclipseYearsRange) },
                            set: { settingsStore.setEclipseYearsRange(Int($0.rounded())) }
                        ),
                        in: 1...5,
                        step: 1
                    )
                }
            }
        }
        .scrollContentBackground(.hidden)
        .background(Theme.background)
        .navigationTitle("Settings")
        .toolbarTitleDisplayMode(.inline)
        .confirmationDialog(
            "Save \(placeToSave?.name ?? "this place")?",
            isPresented: Binding(get: { placeToSave != nil }, set: { if !$0 { placeToSave = nil } }),
            titleVisibility: .visible
        ) {
            Button("Save to Saved Locations") {
                if let place = placeToSave {
                    locationStore.addSavedLocation(
                        name: place.name,
                        latitude: place.latitude,
                        longitude: place.longitude,
                        timeZoneIdentifier: place.timeZoneIdentifier ?? locationStore.coordinateTimeZoneIdentifier
                    )
                }
                placeToSave = nil
            }
            Button("Not Now", role: .cancel) { placeToSave = nil }
        } message: {
            Text("It's now the current location.")
        }
        .sheet(isPresented: $showingLocationDialog) {
            LocationDialog(
                editingLocation: editingLocation,
                onSave: { name, lat, lon in
                    if let editing = editingLocation {
                        locationStore.updateSavedLocation(id: editing.id, name: name, latitude: lat, longitude: lon)
                    } else {
                        locationStore.addSavedLocation(name: name, latitude: lat, longitude: lon)
                    }
                }
            )
        }
    }
}

// MARK: - Search

extension SettingsPage {
    /// Set the picked place as the location, then offer to save it.
    private func pick(_ suggestion: PlaceSearchModel.Suggestion) async {
        guard let place = await search.resolve(suggestion) else { return }
        locationStore.useSearchedPlace(place)
        search.clear()
        searchFocused = false
        let alreadySaved = locationStore.savedLocations.contains {
            LocationKey.make(latitude: $0.latitude, longitude: $0.longitude)
                == LocationKey.make(latitude: place.latitude, longitude: place.longitude)
        }
        if !alreadySaved { placeToSave = place }
    }
}

// MARK: - Location Dialog

struct LocationDialog: View {
    let editingLocation: SavedLocation?
    let onSave: (String, Double, Double) -> Void

    @Environment(\.dismiss) private var dismiss
    @State private var name = ""
    @State private var latitude = ""
    @State private var longitude = ""

    var body: some View {
        NavigationStack {
            Form {
                TextField("Name", text: $name)
                TextField("Latitude", text: $latitude)
                    .coordinateField()
                TextField("Longitude", text: $longitude)
                    .coordinateField()
                CoordinateErrors(latitude: latitude, longitude: longitude)
            }
            .navigationTitle(editingLocation == nil ? "Add Location" : "Edit Location")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Save") {
                        let trimmedName = name.trimmingCharacters(in: .whitespacesAndNewlines)
                        if let coordinate = CoordinateInput.validated(latitude: latitude, longitude: longitude),
                           !trimmedName.isEmpty {
                            onSave(trimmedName, coordinate.latitude, coordinate.longitude)
                            dismiss()
                        }
                    }
                    .disabled(
                        name.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
                            || CoordinateInput.validated(latitude: latitude, longitude: longitude) == nil
                    )
                }
            }
        }
        .onAppear {
            if let loc = editingLocation {
                name = loc.name
                latitude = String(loc.latitude)
                longitude = String(loc.longitude)
            }
        }
    }
}

// MARK: - Coordinate Entry

private extension View {
    /// Keyboard with a minus sign and both "." and "," (parsed by `CoordinateInput`).
    func coordinateField() -> some View {
        keyboardType(.numbersAndPunctuation)
            .autocorrectionDisabled()
            .textInputAutocapitalization(.never)
    }
}

/// Range errors for typed coordinates (shown only for non-empty fields).
private struct CoordinateErrors: View {
    let latitude: String
    let longitude: String

    var body: some View {
        let errors = [CoordinateInput.latitudeError(latitude), CoordinateInput.longitudeError(longitude)].compactMap { $0 }
        if !errors.isEmpty {
            VStack(alignment: .leading, spacing: 2) {
                ForEach(errors, id: \.self) { error in
                    Text(error)
                        .font(.caption)
                        .foregroundStyle(Theme.destructive)
                }
            }
        }
    }
}

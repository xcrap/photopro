import SwiftUI

struct SettingsPage: View {
    @Environment(LocationStore.self) private var locationStore
    @Environment(SettingsStore.self) private var settingsStore
    @State private var showingLocationDialog = false
    @State private var editingLocation: SavedLocation?
    @State private var manualLat = ""
    @State private var manualLon = ""

    var body: some View {
        @Bindable var settings = settingsStore
        @Bindable var location = locationStore

        Form {
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

                if !locationStore.gpsEnabled {
                    HStack {
                        TextField("Latitude", text: $manualLat)
                            .keyboardType(.decimalPad)
                        TextField("Longitude", text: $manualLon)
                            .keyboardType(.decimalPad)
                        Button("Set") {
                            if let lat = Double(manualLat), let lon = Double(manualLon) {
                                locationStore.setLocation(lat: lat, lon: lon, name: "Manual")
                            }
                        }
                        .disabled(Double(manualLat) == nil || Double(manualLon) == nil)
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
                            locationStore.setGpsEnabled(false)
                            locationStore.setLocation(lat: saved.latitude, lon: saved.longitude, name: saved.name)
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
                            longitude: locationStore.longitude
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
                            set: { settingsStore.eclipseYearsRange = Int($0) }
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
                    .keyboardType(.decimalPad)
                TextField("Longitude", text: $longitude)
                    .keyboardType(.decimalPad)
            }
            .navigationTitle(editingLocation == nil ? "Add Location" : "Edit Location")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Save") {
                        if let lat = Double(latitude), let lon = Double(longitude), !name.isEmpty {
                            onSave(name, lat, lon)
                            dismiss()
                        }
                    }
                    .disabled(name.isEmpty || Double(latitude) == nil || Double(longitude) == nil)
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

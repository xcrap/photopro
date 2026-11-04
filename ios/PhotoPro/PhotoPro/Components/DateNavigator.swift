import SwiftUI

/// Day picker. Days, "Today" and the date label use the location time zone.
struct DateNavigator: View {
    @Binding var selectedDate: Date
    @Environment(LocationStore.self) private var locationStore
    @State private var showingDatePicker = false

    private var timeZone: TimeZone { locationStore.timeZone }

    private var isToday: Bool {
        AstroDateHelper.isToday(selectedDate, in: timeZone)
    }

    var body: some View {
        HStack(spacing: 12) {
            // Left side: nav arrows + today
            HStack(spacing: 10) {
                Button {
                    selectedDate = AstroDateHelper.addDays(-1, to: selectedDate, in: timeZone)
                } label: {
                    Image(systemName: "chevron.left")
                        .font(.body.weight(.medium))
                        .foregroundStyle(Theme.primary)
                }
                .accessibilityLabel("Previous day")

                Button {
                    selectedDate = AstroDateHelper.addDays(1, to: selectedDate, in: timeZone)
                } label: {
                    Image(systemName: "chevron.right")
                        .font(.body.weight(.medium))
                        .foregroundStyle(Theme.primary)
                }
                .accessibilityLabel("Next day")

                if !isToday {
                    Button("Today") {
                        selectedDate = Date()
                    }
                    .font(.caption.weight(.medium))
                    .foregroundStyle(Theme.primary)
                }
            }

            Spacer()

            // Right side: date label
            Button {
                showingDatePicker = true
            } label: {
                Text(dateLabel)
                    .font(.subheadline.weight(.medium))
                    .foregroundStyle(Theme.foreground)
            }
        }
        .sheet(isPresented: $showingDatePicker) {
            NavigationStack {
                DatePicker("Select Date", selection: $selectedDate, displayedComponents: .date)
                    .datePickerStyle(.graphical)
                    .environment(\.timeZone, timeZone)
                    .environment(\.calendar, AstroDateHelper.calendar(for: timeZone))
                    .padding()
                    .preferredColorScheme(.dark)
                    .navigationTitle("Select Date")
                    .navigationBarTitleDisplayMode(.inline)
                    .toolbar {
                        ToolbarItem(placement: .confirmationAction) {
                            Button("Done") { showingDatePicker = false }
                        }
                    }
            }
            .presentationDetents([.medium])
        }
    }

    private var dateLabel: String {
        if isToday {
            return "Today, \(Formatting.formatDateShort(selectedDate, timeZone: timeZone))"
        }
        return Formatting.formatDate(selectedDate, timeZone: timeZone)
    }
}

#Preview {
    DateNavigator(selectedDate: .constant(Date()))
        .padding()
        .background(Theme.background)
        .environment(LocationStore())
}

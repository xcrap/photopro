import SwiftUI

struct DateNavigator: View {
    @Binding var selectedDate: Date
    @State private var showingDatePicker = false

    private var isToday: Bool {
        Calendar.current.isDateInToday(selectedDate)
    }

    var body: some View {
        HStack(spacing: 12) {
            // Left side: nav arrows + today
            HStack(spacing: 10) {
                Button {
                    selectedDate = Calendar.current.date(byAdding: .day, value: -1, to: selectedDate) ?? selectedDate
                } label: {
                    Image(systemName: "chevron.left")
                        .font(.body.weight(.medium))
                        .foregroundStyle(Theme.primary)
                }

                Button {
                    selectedDate = Calendar.current.date(byAdding: .day, value: 1, to: selectedDate) ?? selectedDate
                } label: {
                    Image(systemName: "chevron.right")
                        .font(.body.weight(.medium))
                        .foregroundStyle(Theme.primary)
                }

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
        if Calendar.current.isDateInToday(selectedDate) {
            return "Today, \(Formatting.formatDateShort(selectedDate))"
        }
        return Formatting.formatDate(selectedDate)
    }
}

#Preview {
    DateNavigator(selectedDate: .constant(Date()))
        .padding()
        .background(Theme.background)
}

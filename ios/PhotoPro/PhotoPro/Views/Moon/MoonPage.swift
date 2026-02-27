import SwiftUI

struct MoonPage: View {
    @State private var selectedTab = 0
    @State private var selectedDate = Date()

    private let tabs = ["Current", "Full Moons", "Opportunities", "Eclipses", "Special"]

    var body: some View {
        ScrollView {
            VStack(spacing: Theme.spacingXL) {
                // Pill tabs
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: Theme.spacingSM) {
                        ForEach(Array(tabs.enumerated()), id: \.offset) { index, title in
                            Button {
                                withAnimation(.easeInOut(duration: 0.2)) {
                                    selectedTab = index
                                }
                            } label: {
                                Text(title)
                                    .font(.caption.weight(.medium))
                                    .padding(.horizontal, 14)
                                    .padding(.vertical, 8)
                                    .background(
                                        selectedTab == index
                                            ? Theme.moonAccent.opacity(0.15)
                                            : Color.white.opacity(0.04)
                                    )
                                    .foregroundStyle(
                                        selectedTab == index
                                            ? Theme.moonAccent
                                            : Theme.mutedForeground
                                    )
                                    .clipShape(Capsule())
                                    .overlay(
                                        Capsule()
                                            .strokeBorder(
                                                selectedTab == index
                                                    ? Theme.moonAccent.opacity(0.3)
                                                    : Color.white.opacity(0.06),
                                                lineWidth: 1
                                            )
                                    )
                            }
                            .buttonStyle(.plain)
                        }
                    }
                }

                // Sub-tab content
                switch selectedTab {
                case 0: MoonCurrentTab(selectedDate: $selectedDate)
                case 1: MoonFullMoonsTab()
                case 2: MoonOpportunitiesTab()
                case 3: MoonEclipsesTab()
                case 4: MoonSpecialTab()
                default: MoonCurrentTab(selectedDate: $selectedDate)
                }
            }
            .padding(.horizontal, Theme.spacingLG)
            .padding(.vertical, Theme.spacingMD)
        }
        .background(Theme.background)
        .navigationTitle("Moon")
        .toolbarTitleDisplayMode(.inline)
    }
}

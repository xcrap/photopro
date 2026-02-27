import SwiftUI

struct NightPage: View {
    @State private var selectedTab = 0

    private let tabs = ["Meteors", "Comets"]

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
                                            ? Theme.primary.opacity(0.15)
                                            : Color.white.opacity(0.04)
                                    )
                                    .foregroundStyle(
                                        selectedTab == index
                                            ? Theme.primary
                                            : Theme.mutedForeground
                                    )
                                    .clipShape(Capsule())
                                    .overlay(
                                        Capsule()
                                            .strokeBorder(
                                                selectedTab == index
                                                    ? Theme.primary.opacity(0.3)
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
                case 0: NightMeteorsTab()
                case 1: NightCometsTab()
                default: NightMeteorsTab()
                }
            }
            .padding(.horizontal, Theme.spacingLG)
            .padding(.vertical, Theme.spacingMD)
        }
        .background(Theme.background)
        .navigationTitle("Night Sky")
        .toolbarTitleDisplayMode(.inline)
    }
}

import Foundation
import MapKit
import Observation

/// A place picked from search: name, coordinate and (when MapKit knows it) IANA time zone.
struct PlaceResult: Sendable, Equatable {
    var name: String
    var subtitle: String
    var latitude: Double
    var longitude: Double
    var timeZoneIdentifier: String?
}

/// Place search with `MKLocalSearchCompleter` suggestions, resolved with `MKLocalSearch`.
@MainActor
@Observable
final class PlaceSearchModel: NSObject {
    struct Suggestion: Identifiable {
        let id: Int
        let title: String
        let subtitle: String
        fileprivate let completion: MKLocalSearchCompletion
    }

    var query = "" {
        didSet { updateQuery() }
    }
    private(set) var suggestions: [Suggestion] = []
    private(set) var isSearching = false
    private(set) var errorMessage: String?

    @ObservationIgnored private let completer = MKLocalSearchCompleter()

    override init() {
        super.init()
        completer.resultTypes = [.address, .pointOfInterest]
        completer.delegate = self
    }

    private func updateQuery() {
        let trimmed = query.trimmingCharacters(in: .whitespacesAndNewlines)
        errorMessage = nil
        if trimmed.isEmpty {
            completer.cancel()
            suggestions = []
        } else {
            completer.queryFragment = trimmed
        }
    }

    fileprivate func receive(_ results: [MKLocalSearchCompletion]) {
        suggestions = results.prefix(8).enumerated().map { index, completion in
            Suggestion(id: index, title: completion.title, subtitle: completion.subtitle, completion: completion)
        }
    }

    fileprivate func fail(_ message: String) {
        errorMessage = message
    }

    /// Resolve a suggestion to a coordinate and time zone.
    func resolve(_ suggestion: Suggestion) async -> PlaceResult? {
        isSearching = true
        defer { isSearching = false }
        let search = MKLocalSearch(request: MKLocalSearch.Request(completion: suggestion.completion))
        guard let item = try? await search.start().mapItems.first else {
            errorMessage = "Couldn't find that place"
            return nil
        }
        let coordinate = item.location.coordinate
        return PlaceResult(
            name: item.name ?? suggestion.title,
            subtitle: suggestion.subtitle,
            latitude: coordinate.latitude,
            longitude: coordinate.longitude,
            timeZoneIdentifier: item.timeZone?.identifier
        )
    }

    func clear() {
        query = ""
        suggestions = []
    }
}

// MapKit calls the completer delegate on the main thread.
extension PlaceSearchModel: @MainActor MKLocalSearchCompleterDelegate {
    func completerDidUpdateResults(_ completer: MKLocalSearchCompleter) {
        receive(completer.results)
    }

    func completer(_ completer: MKLocalSearchCompleter, didFailWithError error: Error) {
        fail(error.localizedDescription)
    }
}

import Foundation
import SunCalc

/// The terrain skyline around a point: the highest apparent angle of the ground in every direction,
/// accounting for Earth's curvature and terrestrial refraction (ALGORITHM.md → "Terrain Horizon").
/// Trees and buildings are not in the elevation data.
struct HorizonProfile: Sendable {
    static let rayCount = 720 // one ray every 0.5°

    let latitude: Double
    let longitude: Double
    /// Ground elevation at the point (m).
    let elevation: Double
    /// Apparent skyline altitude (degrees) for every half degree of azimuth from north.
    let angles: [Float]
    /// Distance (m) to the point that forms the skyline.
    let distances: [Float]
    /// `true` where the skyline is the open sea rather than land.
    let sea: [Bool]
    /// `false` when no elevation tiles could be fetched (the skyline is then a flat sea horizon).
    var hasElevationData = true

    /// Skyline altitude at any azimuth: linear interpolation between the two neighbouring rays.
    func skyline(atAzimuth azimuth: Double) -> Double {
        let steps = angles.count
        let normalized = (azimuth.truncatingRemainder(dividingBy: 360) + 360).truncatingRemainder(dividingBy: 360)
        let x = normalized / 360 * Double(steps)
        let i = Int(x) % steps
        let j = (i + 1) % steps
        let f = x - floor(x)
        return Double(angles[i]) * (1 - f) + Double(angles[j]) * f
    }

    private func nearestRay(_ azimuth: Double) -> Int {
        let normalized = (azimuth.truncatingRemainder(dividingBy: 360) + 360).truncatingRemainder(dividingBy: 360)
        return Int((normalized / 360 * Double(angles.count)).rounded()) % angles.count
    }

    func skylineDistance(atAzimuth azimuth: Double) -> Double { Double(distances[nearestRay(azimuth)]) }
    func skylineIsSea(atAzimuth azimuth: Double) -> Bool { sea[nearestRay(azimuth)] }
}

enum TerrainHorizon {
    private static let refraction = 0.13
    private static let eyeHeight = 1.7
    private static let maxDistance = 160_000.0
    private static let levels: [(zoom: Int, radius: Double)] = [(12, 4_500), (10, 32_000), (8, 170_000)]

    /// Build the 720-ray skyline. Fetches ~20 elevation tiles; run off the main actor.
    static func compute(latitude: Double, longitude: Double, store: TerrainTileStore = .shared) async -> HorizonProfile {
        let mosaics = await withTaskGroup(of: (Int, ElevationMosaic).self) { group in
            for (index, level) in levels.enumerated() {
                group.addTask {
                    (index, await ElevationMosaic.load(latitude: latitude, longitude: longitude, zoom: level.zoom, radius: level.radius, store: store))
                }
            }
            var result = [ElevationMosaic?](repeating: nil, count: levels.count)
            for await (index, mosaic) in group { result[index] = mosaic }
            return result.compactMap { $0 }
        }
        return skyline(latitude: latitude, longitude: longitude, mosaics: mosaics)
    }

    /// The ray march itself (pure; `mosaics` are zoom 12, 10 and 8).
    static func skyline(latitude: Double, longitude: Double, mosaics: [ElevationMosaic]) -> HorizonProfile {
        let earth = Geodesy.earthRadius
        let ground = mosaics[0].sample(latitude: latitude, longitude: longitude)
        let elevation = ground.isFinite ? max(0, ground) : 0
        let eye = elevation + eyeHeight
        let cosLat = cos(latitude * .pi / 180)
        let degreesPerRadian = 180 / Double.pi

        var angles = [Float](repeating: 0, count: HorizonProfile.rayCount)
        var distances = [Float](repeating: 0, count: HorizonProfile.rayCount)
        var sea = [Bool](repeating: true, count: HorizonProfile.rayCount)

        for ray in 0..<HorizonProfile.rayCount {
            let azimuth = Double(ray) * 360 / Double(HorizonProfile.rayCount) * .pi / 180
            let north = cos(azimuth)
            let east = sin(azimuth)
            var best = -Double.infinity
            var bestDistance = maxDistance
            var bestSea = true

            var d = 25.0
            while d <= maxDistance {
                let lat = latitude + (d * north / earth) * degreesPerRadian
                let lon = longitude + (d * east / (earth * cosLat)) * degreesPerRadian
                let level = d < 4_000 ? 0 : (d < 30_000 ? 1 : 2)
                var h = mosaics[level].sample(latitude: lat, longitude: lon)
                if !h.isFinite { h = mosaics[2].sample(latitude: lat, longitude: lon) }
                if !h.isFinite { h = 0 }
                let drop = (d * d) / (2 * earth) * (1 - refraction)
                let angle = atan((h - drop - eye) / d)
                if angle > best {
                    best = angle
                    bestDistance = d
                    bestSea = h < 1
                }
                d += max(15, d * 0.008)
            }

            angles[ray] = Float(best * degreesPerRadian)
            distances[ray] = Float(bestDistance)
            sea[ray] = bestSea
        }

        return HorizonProfile(latitude: latitude, longitude: longitude, elevation: elevation,
                              angles: angles, distances: distances, sea: sea,
                              hasElevationData: mosaics.contains { $0.loadedTiles > 0 })
    }

    // MARK: - First and last light

    enum Body: Sendable {
        case sun
        case moon

        /// Upper-limb semi-diameter (degrees).
        var semiDiameter: Double { self == .sun ? 0.27 : 0.26 }
    }

    struct Light: Sendable {
        /// First hidden → visible change of the local day (sun: first light; moon: clears the terrain).
        var first: Date?
        /// Last visible → hidden change (sun: last light; moon: drops behind the terrain).
        var last: Date?
    }

    /// Apparent altitude and azimuth (degrees, azimuth from north) of the body.
    static func apparentPosition(_ body: Body, at date: Date, latitude: Double, longitude: Double) -> (altitude: Double, azimuth: Double) {
        switch body {
        case .sun:
            let pos = SunCalc.getSunPosition(timeAndDate: date, latitude: latitude, longitude: longitude)
            // SunCalc's sun altitude is geometric; add astronomical refraction (h clamped to ≥ 0).
            let h = max(0, pos.altitude)
            let refraction = 0.0002967 / tan(h + 0.00312536 / (h + 0.08901179))
            return ((pos.altitude + refraction) * 180 / .pi, (pos.azimuth * 180 / .pi + 180).truncatingRemainder(dividingBy: 360))
        case .moon:
            // The fork's moon altitude already includes refraction.
            let pos = SunCalc.getMoonPosition(timeAndDate: date, latitude: latitude, longitude: longitude)
            return (pos.altitude * 180 / .pi, (pos.azimuth * 180 / .pi + 180).truncatingRemainder(dividingBy: 360))
        }
    }

    /// Visible once the upper limb clears the skyline.
    static func isVisible(_ body: Body, at date: Date, profile: HorizonProfile) -> Bool {
        let p = apparentPosition(body, at: date, latitude: profile.latitude, longitude: profile.longitude)
        return p.altitude + body.semiDiameter > profile.skyline(atAzimuth: p.azimuth)
    }

    private static func refine(_ body: Body, profile: HorizonProfile, before: Date, after: Date, rising: Bool) -> Date {
        var lo = before.timeIntervalSince1970
        var hi = after.timeIntervalSince1970
        while hi - lo > 5 {
            let mid = (lo + hi) / 2
            if isVisible(body, at: Date(timeIntervalSince1970: mid), profile: profile) == rising {
                hi = mid
            } else {
                lo = mid
            }
        }
        return Date(timeIntervalSince1970: (lo + hi) / 2)
    }

    /// First and last light over the real skyline for the local day containing `date`:
    /// scan from local midnight every 2 minutes, bisecting each change to within 5 s.
    static func light(_ body: Body, on date: Date, profile: HorizonProfile, timeZone: TimeZone) -> Light {
        let start = AstroDateHelper.localMidnight(for: date, in: timeZone)
        let end = AstroDateHelper.addDays(1, to: start, in: timeZone)
        var light = Light()
        var previous: (at: Date, up: Bool)?
        var t = start
        while t <= end {
            let up = isVisible(body, at: t, profile: profile)
            if let previous, up != previous.up {
                let edge = refine(body, profile: profile, before: previous.at, after: t, rising: up)
                if up, light.first == nil { light.first = edge }
                if !up { light.last = edge }
            }
            previous = (t, up)
            t = t.addingTimeInterval(120)
        }
        return light
    }
}

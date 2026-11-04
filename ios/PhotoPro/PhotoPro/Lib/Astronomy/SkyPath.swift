import Foundation

/// The Sun's or Moon's path across the sky for the map planner, drawn as the sky dome seen from
/// above: the horizon is a circle around the spot and a point at altitude h sits at
/// radius × cos h. Mirrors web `lib/geo/sky-path.ts`.
enum SkyPath {
    enum Body: Sendable { case sun, moon }

    struct Point: Sendable {
        /// Degrees from north, clockwise.
        var azimuth: Double
        /// Degrees above the horizon (0 at rise/set).
        var altitude: Double
    }

    /// Altitude at which SunCalc's rise/set happen, so the path meets the horizon exactly at the
    /// rise/set directions: the Sun's geometric altitude −0.833°, the Moon's (refracted) +0.133°.
    static func horizon(_ body: Body) -> Double { body == .sun ? -0.833 : 0.133 }

    private static func raw(_ body: Body, _ date: Date, _ lat: Double, _ lon: Double) -> (azimuth: Double, altitude: Double) {
        switch body {
        case .sun:
            let pos = SunCalculator.getSunPosition(date: date, lat: lat, lon: lon)
            return (pos.azimuth, pos.altitude)
        case .moon:
            return PlannerRays.moonPosition(at: date, lat: lat, lon: lon)
        }
    }

    /// Where the body is at `date`, on the same scale as `runs` (altitude 0 = on the horizon).
    static func position(_ body: Body, at date: Date, lat: Double, lon: Double) -> (point: Point, up: Bool) {
        let pos = raw(body, date, lat, lon)
        let altitude = pos.altitude - horizon(body)
        return (Point(azimuth: pos.azimuth, altitude: altitude), altitude > 0)
    }

    /// The body's path between `start` and `end`, as runs of points while it is up. Each run
    /// starts/ends exactly on the horizon (interpolated rise/set) unless `start`/`end` cut it.
    static func runs(_ body: Body, from start: Date, to end: Date, lat: Double, lon: Double, stepMinutes: Double = 5) -> [[Point]] {
        let h0 = horizon(body)
        var runs: [[Point]] = []
        var current: [Point]?
        var previous: (time: Date, altitude: Double)?
        var time = start
        while time <= end {
            let pos = raw(body, time, lat, lon)
            let up = pos.altitude > h0
            if let prev = previous, up != (prev.altitude > h0) {
                let f = (h0 - prev.altitude) / (pos.altitude - prev.altitude)
                let crossing = prev.time.addingTimeInterval(f * time.timeIntervalSince(prev.time))
                let onHorizon = Point(azimuth: raw(body, crossing, lat, lon).azimuth, altitude: 0)
                if up {
                    current = [onHorizon]
                } else if var run = current {
                    run.append(onHorizon)
                    runs.append(run)
                    current = nil
                }
            } else if previous == nil && up {
                current = []
            }
            if up { current?.append(Point(azimuth: pos.azimuth, altitude: max(0, pos.altitude - h0))) }
            previous = (time, pos.altitude)
            time = time.addingTimeInterval(stepMinutes * 60)
        }
        if let current { runs.append(current) }
        return runs.filter { $0.count > 1 }
    }

    /// Ground distance from the spot for a sky point.
    static func distance(altitude: Double, radius: Double) -> Double {
        radius * cos(max(0, altitude) * .pi / 180)
    }
}

import Foundation

struct SunTimes {
    var sunrise: Date
    var sunset: Date
    var solarNoon: Date
    var goldenHourStart: Date
    var goldenHourEnd: Date
    var goldenHourMorningStart: Date
    var goldenHourMorningEnd: Date
    var blueHourMorningStart: Date
    var blueHourMorningEnd: Date
    var blueHourEveningStart: Date
    var blueHourEveningEnd: Date
    var dawn: Date
    var dusk: Date
    var nauticalDawn: Date
    var nauticalDusk: Date
    var nightStart: Date
    var nightEnd: Date
}

struct SunPosition {
    var altitude: Double // degrees
    var azimuth: Double  // degrees, 0-360 from north
}

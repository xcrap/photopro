//
//  MoonPosition.swift
//  suncalc-example
//
//  Created by Shaun Meredith on 10/2/14.
//

import Foundation

public class MoonPosition {
	public var azimuth: Double
	public var altitude: Double
	public var distance: Double
	/// Parallactic angle in radians (angle from zenith to celestial north at the moon's position).
	public var parallacticAngle: Double

	init(azimuth: Double, altitude: Double, distance: Double, parallacticAngle: Double = 0) {
		self.azimuth = azimuth
		self.altitude = altitude
		self.distance = distance
		self.parallacticAngle = parallacticAngle
	}
}

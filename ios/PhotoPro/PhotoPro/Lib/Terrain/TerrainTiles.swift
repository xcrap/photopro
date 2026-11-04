import Foundation
import CoreGraphics
import ImageIO

/// Mapzen Terrarium elevation tiles (AWS Open Data), decoded to whole metres.
/// ALGORITHM.md → "Terrain Horizon": `elevation = R·256 + G + B/256 − 32768`, no colour conversion,
/// sea (negative) clamped to 0.
actor TerrainTileStore {
    static let shared = TerrainTileStore()

    static let urlTemplate = "https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png"
    static let tileSize = 256
    private static let maxCachedTiles = 160 // 128 KB each

    private let session: URLSession
    private var cache: [String: [Int16]] = [:]
    private var order: [String] = [] // least recently used first
    private var inFlight: [String: Task<[Int16]?, Never>] = [:]

    init() {
        let configuration = URLSessionConfiguration.default
        // Elevation tiles never change, so a disk cache lets the skyline work offline later.
        configuration.urlCache = URLCache(memoryCapacity: 4 * 1024 * 1024, diskCapacity: 200 * 1024 * 1024)
        configuration.requestCachePolicy = .returnCacheDataElseLoad
        configuration.timeoutIntervalForRequest = 20
        session = URLSession(configuration: configuration)
    }

    /// Decoded 256×256 elevations (row-major, metres), or `nil` if the tile is unavailable.
    func tile(z: Int, x: Int, y: Int) async -> [Int16]? {
        let key = "\(z)/\(x)/\(y)"
        if let cached = cache[key] {
            touch(key)
            return cached
        }
        if let task = inFlight[key] {
            return await task.value
        }

        let session = self.session
        let task = Task<[Int16]?, Never> {
            let url = URL(string: Self.urlTemplate
                .replacingOccurrences(of: "{z}", with: String(z))
                .replacingOccurrences(of: "{x}", with: String(x))
                .replacingOccurrences(of: "{y}", with: String(y)))
            guard let url,
                  let (data, response) = try? await session.data(from: url),
                  (response as? HTTPURLResponse)?.statusCode == 200 else { return nil }
            return Self.decode(png: data)
        }
        inFlight[key] = task
        let result = await task.value
        inFlight[key] = nil

        if let result {
            cache[key] = result
            touch(key)
            while order.count > Self.maxCachedTiles {
                cache[order.removeFirst()] = nil
            }
        }
        return result
    }

    private func touch(_ key: String) {
        order.removeAll { $0 == key }
        order.append(key)
    }

    /// Decode a Terrarium PNG by reading the decoded sample bytes straight from the CGImage's data
    /// provider — no drawing into a context, so no colour matching or gamma is applied.
    nonisolated static func decode(png data: Data) -> [Int16]? {
        let options = [kCGImageSourceShouldCache: false] as CFDictionary
        guard let source = CGImageSourceCreateWithData(data as CFData, options),
              let image = CGImageSourceCreateImageAtIndex(source, 0, options),
              image.width == tileSize, image.height == tileSize,
              image.bitsPerComponent == 8,
              let colorSpace = image.colorSpace,
              let bytes = image.dataProvider?.data,
              let base = CFDataGetBytePtr(bytes) else { return nil }

        let bytesPerPixel = image.bitsPerPixel / 8
        let bytesPerRow = image.bytesPerRow
        guard CFDataGetLength(bytes) >= bytesPerRow * tileSize else { return nil }

        // Indexed PNGs: map palette indices through the colour table.
        var palette: [UInt8] = []
        if colorSpace.model == .indexed {
            palette = colorSpace.colorTable ?? []
            guard bytesPerPixel == 1, !palette.isEmpty else { return nil }
        } else {
            guard colorSpace.model == .rgb, bytesPerPixel == 3 || bytesPerPixel == 4 else { return nil }
        }

        // Where R, G, B sit within each pixel.
        let alphaInfo = CGImageAlphaInfo(rawValue: image.bitmapInfo.rawValue & CGBitmapInfo.alphaInfoMask.rawValue) ?? .none
        let byteOrder = image.bitmapInfo.intersection(.byteOrderMask)
        let littleEndian32 = byteOrder == .byteOrder32Little
        let alphaFirst = alphaInfo == .first || alphaInfo == .premultipliedFirst || alphaInfo == .noneSkipFirst
        var (r, g, b) = (0, 1, 2)
        if bytesPerPixel == 4 {
            if littleEndian32 {
                // Memory order is reversed: BGRA (alpha last in value) or ABGR… handled by the flags.
                (r, g, b) = alphaFirst ? (2, 1, 0) : (3, 2, 1)
            } else {
                (r, g, b) = alphaFirst ? (1, 2, 3) : (0, 1, 2)
            }
        }

        var out = [Int16](repeating: 0, count: tileSize * tileSize)
        for row in 0..<tileSize {
            let rowBase = base + row * bytesPerRow
            for col in 0..<tileSize {
                let pixel = rowBase + col * bytesPerPixel
                let red: Double, green: Double, blue: Double
                if palette.isEmpty {
                    red = Double(pixel[r]); green = Double(pixel[g]); blue = Double(pixel[b])
                } else {
                    let index = Int(pixel[0]) * 3
                    guard index + 2 < palette.count else { continue }
                    red = Double(palette[index]); green = Double(palette[index + 1]); blue = Double(palette[index + 2])
                }
                let h = red * 256 + green + blue / 256 - 32768
                // The sea surface is the floor; bathymetry never blocks the view.
                out[row * tileSize + col] = h > 0 ? Int16(clamping: Int(h.rounded())) : 0
            }
        }
        return out
    }
}

/// A block of tiles around a point at one zoom level, sampled with bilinear interpolation.
struct ElevationMosaic: Sendable {
    let zoom: Int
    let x0: Int
    let y0: Int
    let cols: Int
    let rows: Int
    let data: [Int16]
    /// Number of tiles that were fetched and decoded.
    let loadedTiles: Int

    static func worldX(_ lon: Double, zoom: Int) -> Double {
        (lon + 180) / 360 * 256 * pow(2, Double(zoom))
    }

    static func worldY(_ lat: Double, zoom: Int) -> Double {
        let s = sin(max(-85, min(85, lat)) * .pi / 180)
        return (0.5 - log((1 + s) / (1 - s)) / (4 * .pi)) * 256 * pow(2, Double(zoom))
    }

    /// Fetch every tile within `radius` metres of the point.
    static func load(latitude: Double, longitude: Double, zoom: Int, radius: Double, store: TerrainTileStore) async -> ElevationMosaic {
        let dLat = radius / Geodesy.earthRadius * 180 / .pi
        let dLon = dLat / max(0.05, cos(latitude * .pi / 180))
        let maxIndex = (1 << zoom) - 1
        let x0 = max(0, Int(floor(worldX(longitude - dLon, zoom: zoom) / 256)))
        let x1 = min(maxIndex, Int(floor(worldX(longitude + dLon, zoom: zoom) / 256)))
        let y0 = max(0, Int(floor(worldY(latitude + dLat, zoom: zoom) / 256)))
        let y1 = min(maxIndex, Int(floor(worldY(latitude - dLat, zoom: zoom) / 256)))
        let cols = x1 - x0 + 1
        let rows = y1 - y0 + 1

        let tiles = await withTaskGroup(of: (Int, Int, [Int16]?).self) { group in
            for ty in y0...y1 {
                for tx in x0...x1 {
                    group.addTask { (tx, ty, await store.tile(z: zoom, x: tx, y: ty)) }
                }
            }
            var collected: [(Int, Int, [Int16]?)] = []
            for await tile in group { collected.append(tile) }
            return collected
        }

        let stride = cols * 256
        var data = [Int16](repeating: 0, count: stride * rows * 256)
        for (tx, ty, pixels) in tiles {
            guard let pixels else { continue }
            let ox = (tx - x0) * 256
            let oy = (ty - y0) * 256
            for row in 0..<256 {
                let dst = (oy + row) * stride + ox
                data.replaceSubrange(dst..<(dst + 256), with: pixels[(row * 256)..<(row * 256 + 256)])
            }
        }
        return ElevationMosaic(zoom: zoom, x0: x0, y0: y0, cols: cols, rows: rows, data: data,
                               loadedTiles: tiles.filter { $0.2 != nil }.count)
    }

    /// Bilinear elevation, or NaN outside the mosaic.
    func sample(latitude: Double, longitude: Double) -> Double {
        let x = Self.worldX(longitude, zoom: zoom) - Double(x0 * 256) - 0.5
        let y = Self.worldY(latitude, zoom: zoom) - Double(y0 * 256) - 0.5
        let w = cols * 256
        let h = rows * 256
        guard x >= 0, y >= 0, x < Double(w - 1), y < Double(h - 1) else { return .nan }
        let ix = Int(x), iy = Int(y)
        let fx = x - Double(ix), fy = y - Double(iy)
        let i = iy * w + ix
        return data.withUnsafeBufferPointer { d in
            (Double(d[i]) * (1 - fx) + Double(d[i + 1]) * fx) * (1 - fy)
                + (Double(d[i + w]) * (1 - fx) + Double(d[i + w + 1]) * fx) * fy
        }
    }
}

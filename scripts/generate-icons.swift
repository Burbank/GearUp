import AppKit
import Foundation

let root = URL(fileURLWithPath: CommandLine.arguments[1], isDirectory: true)
let srcURL = root.appendingPathComponent("GearUP.jpg")
let outDir = root.appendingPathComponent("icons")

guard let srcImg = NSImage(contentsOf: srcURL),
      let tiff = srcImg.tiffRepresentation,
      let srcRep = NSBitmapImageRep(data: tiff),
      let srcBytes = srcRep.bitmapData
else {
  fputs("Could not load GearUP.jpg\n", stderr)
  exit(1)
}

let width = srcRep.pixelsWide
let height = srcRep.pixelsHigh
let bpr = srcRep.bytesPerRow
let stride = max(srcRep.bitsPerPixel / 8, 3)

func readPixel(_ x: Int, _ y: Int) -> (UInt8, UInt8, UInt8) {
  let i = y * bpr + x * stride
  return (srcBytes[i], srcBytes[i + 1], srcBytes[i + 2])
}

func isPad(_ r: UInt8, _ g: UInt8, _ b: UInt8) -> Bool {
  r > 245 && g > 245 && b > 245
}

var padding = [Bool](repeating: false, count: width * height)
var queue: [(Int, Int)] = [(0, 0), (width - 1, 0), (0, height - 1), (width - 1, height - 1)]
var q = 0
while q < queue.count {
  let (x, y) = queue[q]
  q += 1
  if x < 0 || y < 0 || x >= width || y >= height { continue }
  let i = y * width + x
  if padding[i] { continue }
  let p = readPixel(x, y)
  if !isPad(p.0, p.1, p.2) { continue }
  padding[i] = true
  queue.append((x + 1, y))
  queue.append((x - 1, y))
  queue.append((x, y + 1))
  queue.append((x, y - 1))
}

let cx = Double(width - 1) / 2
let cy = Double(height - 1) / 2
var filled = [UInt8](repeating: 0, count: width * height * 4)

for y in 0 ..< height {
  for x in 0 ..< width {
    var (r, g, b) = readPixel(x, y)
    if padding[y * width + x] {
      let dx = cx - Double(x)
      let dy = cy - Double(y)
      let dist = max(hypot(dx, dy), 1)
      let stepX = dx / dist
      let stepY = dy / dist
      var fx = Double(x)
      var fy = Double(y)
      var found = false
      for _ in 0 ..< max(width, height) {
        fx += stepX
        fy += stepY
        let ix = Int(fx.rounded())
        let iy = Int(fy.rounded())
        if ix < 0 || iy < 0 || ix >= width || iy >= height { break }
        if padding[iy * width + ix] { continue }
        let p = readPixel(ix, iy)
        r = p.0
        g = p.1
        b = p.2
        found = true
        break
      }
      if !found {
        let p = readPixel(Int(cx), Int(cy))
        r = p.0
        g = p.1
        b = p.2
      }
    }
    let o = (y * width + x) * 4
    filled[o] = r
    filled[o + 1] = g
    filled[o + 2] = b
    filled[o + 3] = 255
  }
}

let side = min(width, height)
let originX = (width - side) / 2
let originY = (height - side) / 2

guard let square = NSBitmapImageRep(
  bitmapDataPlanes: nil,
  pixelsWide: side,
  pixelsHigh: side,
  bitsPerSample: 8,
  samplesPerPixel: 4,
  hasAlpha: true,
  isPlanar: false,
  colorSpaceName: .deviceRGB,
  bytesPerRow: side * 4,
  bitsPerPixel: 32
), let dest = square.bitmapData else {
  fputs("Could not allocate square bitmap\n", stderr)
  exit(1)
}

for y in 0 ..< side {
  for x in 0 ..< side {
    let s = ((y + originY) * width + (x + originX)) * 4
    let d = (y * side + x) * 4
    dest[d] = filled[s]
    dest[d + 1] = filled[s + 1]
    dest[d + 2] = filled[s + 2]
    dest[d + 3] = 255
  }
}

let squareImage = NSImage(size: NSSize(width: side, height: side))
squareImage.addRepresentation(square)

func png(at size: Int) -> Data {
  let rep = NSBitmapImageRep(
    bitmapDataPlanes: nil,
    pixelsWide: size,
    pixelsHigh: size,
    bitsPerSample: 8,
    samplesPerPixel: 4,
    hasAlpha: true,
    isPlanar: false,
    colorSpaceName: .deviceRGB,
    bytesPerRow: 0,
    bitsPerPixel: 0
  )!
  NSGraphicsContext.saveGraphicsState()
  NSGraphicsContext.current = NSGraphicsContext(bitmapImageRep: rep)
  NSGraphicsContext.current?.imageInterpolation = .high
  squareImage.draw(
    in: NSRect(x: 0, y: 0, width: size, height: size),
    from: NSRect(x: 0, y: 0, width: side, height: side),
    operation: .copy,
    fraction: 1
  )
  NSGraphicsContext.restoreGraphicsState()
  return rep.representation(using: .png, properties: [:])!
}

try FileManager.default.createDirectory(at: outDir, withIntermediateDirectories: true)

let files: [(String, Int)] = [
  ("favicon.png", 32),
  ("apple-touch-icon.png", 180),
  ("icon-192.png", 192),
  ("icon-512.png", 512),
]

for (name, size) in files {
  let url = outDir.appendingPathComponent(name)
  try png(at: size).write(to: url)
  print("Wrote \(name) (\(size)x\(size))")
}

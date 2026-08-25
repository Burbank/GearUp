import AppKit
import Foundation

let root = URL(fileURLWithPath: CommandLine.arguments[1], isDirectory: true)
let srcURL = root.appendingPathComponent("GearUP.jpg")
let outDir = root.appendingPathComponent("icons")

guard let srcImg = NSImage(contentsOf: srcURL) else {
  fputs("Could not load GearUP.jpg\n", stderr)
  exit(1)
}

let srcSize = srcImg.size
let side = min(srcSize.width, srcSize.height)
let srcRect = NSRect(
  x: (srcSize.width - side) / 2,
  y: (srcSize.height - side) / 2,
  width: side,
  height: side
)

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
  NSColor.white.setFill()
  NSRect(x: 0, y: 0, width: size, height: size).fill()
  srcImg.draw(
    in: NSRect(x: 0, y: 0, width: size, height: size),
    from: srcRect,
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

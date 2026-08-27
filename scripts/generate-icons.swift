import AppKit
import Foundation

let root = URL(fileURLWithPath: CommandLine.arguments[1], isDirectory: true)
let srcURL = root.appendingPathComponent("GearUP.jpg")
let outDir = root.appendingPathComponent("icons")

guard let srcImg = NSImage(contentsOf: srcURL),
      let srcCG = srcImg.cgImage(forProposedRect: nil, context: nil, hints: nil)
else {
  fputs("Could not load GearUP.jpg\n", stderr)
  exit(1)
}

let srcW = srcCG.width
let srcH = srcCG.height
let cs = CGColorSpaceCreateDeviceRGB()
var srcBytes = [UInt8](repeating: 0, count: srcW * srcH * 4)
guard let srcCtx = CGContext(
  data: &srcBytes,
  width: srcW,
  height: srcH,
  bitsPerComponent: 8,
  bytesPerRow: srcW * 4,
  space: cs,
  bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue
) else {
  exit(1)
}
srcCtx.draw(srcCG, in: CGRect(x: 0, y: 0, width: srcW, height: srcH))

func isInk(_ r: Int, _ g: Int, _ b: Int) -> Bool {
  let maxc = max(r, g, b)
  let minc = min(r, g, b)
  let lum = r + g + b
  return b > r + 12 && b > g && maxc - minc > 30 && lum < 230 * 3
}

var minX = srcW, maxX = 0, minY = srcH, maxY = 0, inkN = 0
for y in 0..<srcH {
  for x in 0..<srcW {
    let i = (y * srcW + x) * 4
    if isInk(Int(srcBytes[i]), Int(srcBytes[i + 1]), Int(srcBytes[i + 2])) {
      inkN += 1
      if x < minX { minX = x }
      if x > maxX { maxX = x }
      if y < minY { minY = y }
      if y > maxY { maxY = y }
    }
  }
}

if inkN < 100 {
  fputs("No icon ink found in GearUP.jpg\n", stderr)
  exit(1)
}

let pad = max(8, Int(Double(max(maxX - minX, maxY - minY)) * 0.02))
let cropX = max(0, minX - pad)
let cropYTop = max(0, minY - pad)
let cropW = min(srcW - cropX, maxX - minX + 1 + pad * 2)
let cropH = min(srcH - cropYTop, maxY - minY + 1 + pad * 2)
let fromRect = NSRect(
  x: CGFloat(cropX),
  y: CGFloat(srcH - cropYTop - cropH),
  width: CGFloat(cropW),
  height: CGFloat(cropH)
)

func png(at size: Int, dark: Bool) -> Data {
  let br = dark ? 26 : 255
  let bgc = dark ? 35 : 255
  let bb = dark ? 50 : 255
  let bg = NSColor(
    deviceRed: CGFloat(br) / 255,
    green: CGFloat(bgc) / 255,
    blue: CGFloat(bb) / 255,
    alpha: 1
  )
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
  func fillBg() {
    guard let data = rep.bitmapData else { return }
    let row = rep.bytesPerRow
    for y in 0..<size {
      for x in 0..<size {
        let p = data + y * row + x * 4
        p[0] = UInt8(br)
        p[1] = UInt8(bgc)
        p[2] = UInt8(bb)
        p[3] = 255
      }
    }
  }
  fillBg()
  NSGraphicsContext.saveGraphicsState()
  NSGraphicsContext.current = NSGraphicsContext(bitmapImageRep: rep)
  NSGraphicsContext.current?.imageInterpolation = .high
  bg.setFill()
  NSRect(x: 0, y: 0, width: size, height: size).fill()

  let box = CGFloat(size)
  let scale = min(box / CGFloat(cropW), box / CGFloat(cropH))
  let dw = CGFloat(cropW) * scale
  let dh = CGFloat(cropH) * scale
  let dest = NSRect(
    x: (CGFloat(size) - dw) / 2,
    y: (CGFloat(size) - dh) / 2,
    width: dw,
    height: dh
  )
  srcImg.draw(in: dest, from: fromRect, operation: .copy, fraction: 1)
  NSGraphicsContext.restoreGraphicsState()

  for y in 0..<size {
    for x in 0..<size {
      guard let c = rep.colorAt(x: x, y: y) else { continue }
      var r: CGFloat = 0, g: CGFloat = 0, b: CGFloat = 0, a: CGFloat = 0
      c.getRed(&r, green: &g, blue: &b, alpha: &a)
      let ri = Int(r * 255), gi = Int(g * 255), bi = Int(b * 255)
      let maxc = max(ri, gi, bi)
      let minc = min(ri, gi, bi)
      let lum = ri + gi + bi
      let paper = maxc - minc < 28 && lum > 640
      let alreadyBg =
        abs(ri - br) < 12 && abs(gi - bgc) < 12 && abs(bi - bb) < 12
      if paper || alreadyBg {
        rep.setColor(bg, atX: x, y: y)
        continue
      }
      if dark {
        let luma = r * 0.2126 + g * 0.7152 + b * 0.0722
        let t = min(1, max(0, (1 - luma) * 1.12))
        let glyph = NSColor(
          deviceRed: min(1, CGFloat(br) / 255 + t * (1 - CGFloat(br) / 255)),
          green: min(1, CGFloat(bgc) / 255 + t * (1 - CGFloat(bgc) / 255)),
          blue: min(1, CGFloat(bb) / 255 + t * (1 - CGFloat(bb) / 255)),
          alpha: 1
        )
        rep.setColor(glyph, atX: x, y: y)
      }
    }
  }

  return rep.representation(using: .png, properties: [:])!
}

try FileManager.default.createDirectory(at: outDir, withIntermediateDirectories: true)

let files: [(String, Int, Bool)] = [
  ("favicon.png", 32, false),
  ("favicon-dark.png", 32, true),
  ("apple-touch-icon.png", 180, false),
  ("icon-192.png", 192, false),
  ("icon-192-dark.png", 192, true),
  ("icon-512.png", 512, false),
]

for (name, size, dark) in files {
  let url = outDir.appendingPathComponent(name)
  try png(at: size, dark: dark).write(to: url)
  print("Wrote \(name) (\(size)x\(size)\(dark ? ", dark" : ""))")
}
print("Ink crop \(cropW)x\(cropH) from \(cropX),\(cropYTop) of \(srcW)x\(srcH)")

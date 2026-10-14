// Subject mask via macOS Vision (the engine behind "lift subject" in Photos).
// usage: swift liftmask.swift in.jpg out-mask.png
import Foundation
import Vision
import CoreImage
import ImageIO
import UniformTypeIdentifiers

let args = CommandLine.arguments
guard args.count == 3 else { print("usage: in out"); exit(1) }
let inURL = URL(fileURLWithPath: args[1]), outURL = URL(fileURLWithPath: args[2])
guard let src = CGImageSourceCreateWithURL(inURL as CFURL, nil),
      let cg = CGImageSourceCreateImageAtIndex(src, 0, nil) else { print("cannot read"); exit(1) }
let handler = VNImageRequestHandler(cgImage: cg, options: [:])
let req = VNGenerateForegroundInstanceMaskRequest()
do { try handler.perform([req]) } catch { print("vision failed: \(error)"); exit(1) }
guard let obs = req.results?.first else { print("no subject"); exit(2) }
do {
    let buf = try obs.generateScaledMaskForImage(forInstances: obs.allInstances, from: handler)
    let ci = CIImage(cvPixelBuffer: buf)
    let ctx = CIContext()
    guard let outCG = ctx.createCGImage(ci, from: ci.extent, format: .L8, colorSpace: CGColorSpaceCreateDeviceGray()) else { exit(3) }
    guard let dest = CGImageDestinationCreateWithURL(outURL as CFURL, UTType.png.identifier as CFString, 1, nil) else { exit(4) }
    CGImageDestinationAddImage(dest, outCG, nil)
    CGImageDestinationFinalize(dest)
    print("ok \(outCG.width)x\(outCG.height) instances \(obs.allInstances.count)")
} catch { print("mask failed: \(error)"); exit(1) }

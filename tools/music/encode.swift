// Reads raw BGRA frames from stdin and writes an H.264 movie, with macOS's
// own encoder, so filming needs nothing installed.
//
//   swiftc -O tools/music/encode.swift -o /tmp/pc-encode
//   … | /tmp/pc-encode out.mp4 <width> <height> <fps>
import AVFoundation
import CoreVideo
import Foundation

let args = CommandLine.arguments
guard args.count == 5, let w = Int(args[2]), let h = Int(args[3]), let fps = Int32(args[4]) else {
  FileHandle.standardError.write("usage: pc-encode out.mp4 width height fps\n".data(using: .utf8)!)
  exit(2)
}
let url = URL(fileURLWithPath: args[1])
try? FileManager.default.removeItem(at: url)

let writer = try AVAssetWriter(outputURL: url, fileType: .mp4)
let input = AVAssetWriterInput(mediaType: .video, outputSettings: [
  AVVideoCodecKey: AVVideoCodecType.h264,
  AVVideoWidthKey: w,
  AVVideoHeightKey: h,
  AVVideoCompressionPropertiesKey: [
    AVVideoAverageBitRateKey: 6_000_000,              // small UI text needs it
    AVVideoMaxKeyFrameIntervalKey: Int(fps) * 2,
    AVVideoProfileLevelKey: AVVideoProfileLevelH264HighAutoLevel,
  ],
])
input.expectsMediaDataInRealTime = false
let adaptor = AVAssetWriterInputPixelBufferAdaptor(assetWriterInput: input, sourcePixelBufferAttributes: [
  kCVPixelBufferPixelFormatTypeKey as String: kCVPixelFormatType_32BGRA,
  kCVPixelBufferWidthKey as String: w,
  kCVPixelBufferHeightKey as String: h,
])
writer.add(input)
writer.startWriting()
writer.startSession(atSourceTime: .zero)

let frameBytes = w * h * 4
let frame = UnsafeMutablePointer<UInt8>.allocate(capacity: frameBytes)
var n: Int64 = 0
reading: while true {
  var got = 0
  while got < frameBytes {
    let r = fread(frame + got, 1, frameBytes - got, stdin)
    if r == 0 { break reading }
    got += r
  }
  while !input.isReadyForMoreMediaData { usleep(500) }
  var pb: CVPixelBuffer?
  CVPixelBufferPoolCreatePixelBuffer(nil, adaptor.pixelBufferPool!, &pb)
  guard let buf = pb else { break }
  CVPixelBufferLockBaseAddress(buf, [])
  let dst = CVPixelBufferGetBaseAddress(buf)!.assumingMemoryBound(to: UInt8.self)
  let stride = CVPixelBufferGetBytesPerRow(buf)
  for y in 0..<h { memcpy(dst + y * stride, frame + y * w * 4, w * 4) }
  CVPixelBufferUnlockBaseAddress(buf, [])
  adaptor.append(buf, withPresentationTime: CMTime(value: n, timescale: fps))
  n += 1
}
input.markAsFinished()
let done = DispatchSemaphore(value: 0)
writer.finishWriting { done.signal() }
done.wait()
print("pc-encode: \(n) frames, status \(writer.status.rawValue)\(writer.error.map { " " + $0.localizedDescription } ?? "")")
exit(writer.status == .completed ? 0 : 1)

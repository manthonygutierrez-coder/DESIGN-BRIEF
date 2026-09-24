// Puts the filmed picture and the recorded music into one movie, without
// re-encoding either: the video is already H.264 and the music AAC.
//
//   swiftc -O -parse-as-library tools/music/mux.swift -o /tmp/pc-mux
//   /tmp/pc-mux video.mp4 audio.m4a out.mp4 [audio-offset-seconds]
import AVFoundation
import Foundation

@main
struct Mux {
  static func main() async throws {
    let args = CommandLine.arguments
    guard args.count >= 4 else {
      FileHandle.standardError.write("usage: pc-mux video.mp4 audio.m4a out.mp4 [offset]\n".data(using: .utf8)!)
      exit(2)
    }
    let offset = args.count > 4 ? Double(args[4]) ?? 0 : 0
    let out = URL(fileURLWithPath: args[3])
    try? FileManager.default.removeItem(at: out)

    let video = AVURLAsset(url: URL(fileURLWithPath: args[1]))
    let audio = AVURLAsset(url: URL(fileURLWithPath: args[2]))
    guard let vt = try await video.loadTracks(withMediaType: .video).first,
          let at = try await audio.loadTracks(withMediaType: .audio).first else {
      print("pc-mux: missing a track"); exit(1)
    }
    let vd = try await video.load(.duration), ad = try await audio.load(.duration)

    let comp = AVMutableComposition()
    let cv = comp.addMutableTrack(withMediaType: .video, preferredTrackID: kCMPersistentTrackID_Invalid)!
    try cv.insertTimeRange(CMTimeRange(start: .zero, duration: vd), of: vt, at: .zero)
    // A positive offset trims the head of the music: it started a hair before the picture.
    let skip = CMTime(seconds: max(0, offset), preferredTimescale: 48000)
    let take = CMTimeMinimum(CMTimeSubtract(ad, skip), vd)
    let ca = comp.addMutableTrack(withMediaType: .audio, preferredTrackID: kCMPersistentTrackID_Invalid)!
    try ca.insertTimeRange(CMTimeRange(start: skip, duration: take), of: at, at: .zero)

    guard let ex = AVAssetExportSession(asset: comp, presetName: AVAssetExportPresetPassthrough) else { print("pc-mux: no export session"); exit(1) }
    try await ex.export(to: out, as: .mp4)
    print("pc-mux: \(String(format: "%.2f", vd.seconds))s of picture, \(String(format: "%.2f", take.seconds))s of music")
  }
}

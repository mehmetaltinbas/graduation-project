import { useState } from "react";
import DetectionList from "./components/DetectionList";
import Header from "./components/Header";
import ImagePreview from "./components/ImagePreview";
import LivePreview from "./components/LivePreview";
import UploadControls from "./components/UploadControls";
import VideoPreview from "./components/VideoPreview";
import { useDetectionResult } from "./hooks/use-detection-result.hook";
import { useImageDetection } from "./hooks/use-image-detection.hook";
import { useLiveDetection } from "./hooks/use-live-detection.hook";
import { useVideoDetection } from "./hooks/use-video-detection.hook";
import { getFriendlyError } from "./utils/friendly-error.util";

export default function App() {
    const [inputMode, setInputMode] = useState("video");
    const result = useDetectionResult();
    const video = useVideoDetection(result);
    const image = useImageDetection(result);
    const live = useLiveDetection(result);

    const handleModeChange = (mode) => {
        if (mode === inputMode) return;
        video.reset();
        image.reset();
        live.reset();
        result.reset();
        setInputMode(mode);
    };

    const isVideo = inputMode === "video";
    const isImage = inputMode === "image";
    const isLive = inputMode === "live";
    const friendlyError = getFriendlyError(result.error, inputMode);
    const detectionCount = result.detections?.length ?? 0;

    // Live always shows the preview (it prompts to enable the camera); video and
    // image only once a source is loaded.
    const showPreview = isLive || Boolean(isVideo ? video.url : image.url);

    return (
        <div className="min-h-screen bg-black text-white">
            <Header />

            <main className="mx-auto w-full max-w-5xl lg:max-w-6xl xl:max-w-7xl 2xl:max-w-[1500px] px-6 py-10 space-y-8">
                <UploadControls
                    inputMode={inputMode}
                    onModeChange={handleModeChange}
                    video={video}
                    image={image}
                    live={live}
                    result={result}
                />

                {friendlyError && (
                    <p className="text-sm text-red-400">{friendlyError}</p>
                )}

                {showPreview && (
                    <section className="grid gap-8 lg:grid-cols-[1fr_280px]">
                        {isLive ? (
                            <LivePreview
                                videoRef={live.videoRef}
                                captureCanvasRef={live.captureCanvasRef}
                                displayCanvasRef={live.displayCanvasRef}
                                cameraReady={live.cameraReady}
                                isDetecting={live.isDetecting}
                            />
                        ) : isVideo ? (
                            <VideoPreview
                                videoRef={video.videoRef}
                                captureCanvasRef={video.captureCanvasRef}
                                displayCanvasRef={video.displayCanvasRef}
                                videoUrl={video.url}
                                loading={result.loading}
                                isDetecting={video.isDetecting}
                                onEnded={video.handleVideoEnded}
                                onPlaying={video.handleVideoPlaying}
                                onPause={video.handleVideoPause}
                            />
                        ) : (
                            <ImagePreview
                                imageUrl={image.url}
                                detections={result.detections}
                                imageDims={result.imageDims}
                                loading={result.loading}
                            />
                        )}

                        <div>
                            <h2 className="text-xs font-medium uppercase tracking-wider text-white/40 mb-3">
                                Results
                            </h2>

                            <p className="mb-3 text-xs text-white/50">
                                {/* During continuous video/live detection, keep showing
                                    the live count instead of flipping to "Analyzing..."
                                    every frame — that toggles ~5x/sec and flickers. */}
                                {result.loading && !((isVideo && video.isDetecting) || (isLive && live.isDetecting))
                                    ? (isImage ? "Analyzing image..." : "Analyzing latest frame...")
                                    : `Detections: ${detectionCount}`}
                            </p>

                            <DetectionList detections={result.detections} loading={result.loading} />
                        </div>
                    </section>
                )}
            </main>
        </div>
    );
}

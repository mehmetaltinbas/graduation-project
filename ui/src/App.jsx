import { useState } from "react";
import DetectionList from "./components/DetectionList";
import Header from "./components/Header";
import ImagePreview from "./components/ImagePreview";
import UploadControls from "./components/UploadControls";
import VideoPreview from "./components/VideoPreview";
import { useDetectionResult } from "./hooks/use-detection-result.hook";
import { useImageDetection } from "./hooks/use-image-detection.hook";
import { useVideoDetection } from "./hooks/use-video-detection.hook";
import { getFriendlyError } from "./utils/friendly-error.util";

export default function App() {
    const [inputMode, setInputMode] = useState("video");
    const result = useDetectionResult();
    const video = useVideoDetection(result);
    const image = useImageDetection(result);

    const handleModeChange = (mode) => {
        if (mode === inputMode) return;
        video.reset();
        image.reset();
        result.reset();
        setInputMode(mode);
    };

    const isVideo = inputMode === "video";
    const url = isVideo ? video.url : image.url;
    const friendlyError = getFriendlyError(result.error, inputMode);
    const detectionCount = result.detections?.length ?? 0;

    return (
        <div className="min-h-screen bg-black text-white">
            <Header />

            <main className="mx-auto w-full max-w-5xl lg:max-w-6xl xl:max-w-7xl 2xl:max-w-[1500px] px-6 py-10 space-y-8">
                <UploadControls
                    inputMode={inputMode}
                    onModeChange={handleModeChange}
                    video={video}
                    image={image}
                    result={result}
                />

                {friendlyError && (
                    <p className="text-sm text-red-400">{friendlyError}</p>
                )}

                {url && (
                    <section className="grid gap-8 lg:grid-cols-[1fr_280px]">
                        {isVideo ? (
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
                                {/* During continuous video detection, keep showing
                                    the live count instead of flipping to "Analyzing..."
                                    every frame — that toggles ~5x/sec and flickers. */}
                                {result.loading && !(isVideo && video.isDetecting)
                                    ? (isVideo ? "Analyzing latest frame..." : "Analyzing image...")
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

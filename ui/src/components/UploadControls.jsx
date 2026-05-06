import ImageControls from "./ImageControls";
import ModeToggle from "./ModeToggle";
import VideoControls from "./VideoControls";

export default function UploadControls({
    inputMode,
    onModeChange,
    video,
    image,
    result,
    speedOptions,
}) {
    const isVideo = inputMode === "video";

    return (
        <div className="flex items-center gap-3 flex-wrap">
            <ModeToggle inputMode={inputMode} onModeChange={onModeChange} />

            {isVideo ? (
                <VideoControls
                    file={video.file}
                    isPlaying={video.isPlaying}
                    isDetecting={video.isDetecting}
                    loading={result.loading}
                    hasError={Boolean(result.error)}
                    isDetectionWaiting={video.isDetecting && !video.isPlaying}
                    lastLatencyMs={result.lastLatencyMs}
                    sentFrameCount={video.sentFrameCount}
                    sessionSeconds={video.sessionSeconds}
                    effectiveFps={video.effectiveFps}
                    frameIntervalMs={video.frameIntervalMs}
                    speedOptions={speedOptions}
                    onFileChange={video.handleFileChange}
                    onPlayPause={video.handlePlayPause}
                    onToggleDetection={video.handleToggleDetection}
                    onFrameIntervalChange={video.setFrameIntervalMs}
                />
            ) : (
                <ImageControls
                    file={image.file}
                    loading={result.loading}
                    hasError={Boolean(result.error)}
                    lastLatencyMs={result.lastLatencyMs}
                    onFileChange={image.handleFileChange}
                    onDetect={image.runDetection}
                />
            )}
        </div>
    );
}

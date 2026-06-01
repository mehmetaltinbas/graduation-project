import { ImageMainControls } from "./ImageControls";
import { ImageStatsControls } from "./ImageStatsControls";
import ModeToggle from "./ModeToggle";
import { VideoMainControls } from "./VideoControls";
import { VideoStatsControls } from "./VideoStatsControls";

export default function UploadControls({
    inputMode,
    onModeChange,
    video,
    image,
    result,
}) {
    const isVideo = inputMode === "video";

    return (
        <div className="flex flex-col gap-3">
            <div className="flex items-center gap-3 flex-wrap">
                <ModeToggle inputMode={inputMode} onModeChange={onModeChange} />

                {isVideo ? (
                    <VideoMainControls
                        file={video.file}
                        isPlaying={video.isPlaying}
                        isDetecting={video.isDetecting}
                        onFileChange={video.handleFileChange}
                        onPlayPause={video.handlePlayPause}
                        onToggleDetection={video.handleToggleDetection}
                    />
                ) : (
                    <ImageMainControls
                        file={image.file}
                        loading={result.loading}
                        onFileChange={image.handleFileChange}
                        onDetect={image.runDetection}
                    />
                )}
            </div>

            {isVideo && video.isDetecting && (
                <p className="text-xs text-white/40">
                    While detection is running, the video timeline is locked and
                    you are watching the analyzed frames. To move the video
                    forward or back, scrub, or step through frames, stop
                    detection first.
                </p>
            )}

            {isVideo ? (
                <VideoStatsControls
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
                />
            ) : (
                <ImageStatsControls
                    file={image.file}
                    loading={result.loading}
                    hasError={Boolean(result.error)}
                    lastLatencyMs={result.lastLatencyMs}
                />
            )}
        </div>
    );
}

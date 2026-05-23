import StatusBadge from "./StatusBadge";

export default function VideoControls({
    file,
    isPlaying,
    isDetecting,
    loading,
    hasError,
    isDetectionWaiting,
    lastLatencyMs,
    sentFrameCount,
    sessionSeconds,
    effectiveFps,
    onFileChange,
    onPlayPause,
    onToggleDetection,
}) {
    return (
        <>
            <label className="cursor-pointer rounded-full bg-white px-5 py-2 text-sm font-medium text-black transition-opacity hover:opacity-80">
                Upload Video
                <input
                    type="file"
                    accept="video/*"
                    onChange={onFileChange}
                    className="hidden"
                />
            </label>

            {file && (
                <>
                    <span className="text-xs text-white/40 truncate max-w-48">
                        {file.name}
                    </span>

                    <button
                        onClick={onPlayPause}
                        className="rounded-full bg-white/10 px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-white/20 disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                        {isPlaying ? "Pause" : "Play"}
                    </button>

                    <button
                        onClick={onToggleDetection}
                        className="rounded-full bg-white/10 px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-white/20"
                    >
                        {isDetecting ? "Stop Detection" : "Start Detection"}
                    </button>

                    <span className="text-xs text-white/50">
                        Frames sent: {sentFrameCount}
                    </span>

                    <span className="text-xs text-white/50">
                        Last latency: {lastLatencyMs === null ? "-" : `${lastLatencyMs}ms`}
                    </span>

                    <span className="text-xs text-white/50">
                        Session: {sessionSeconds}s
                    </span>

                    <span className="text-xs text-white/50">
                        Effective FPS: {effectiveFps}
                    </span>

                    <StatusBadge
                        hasError={hasError}
                        loading={loading}
                        isVideo
                        isPlaying={isPlaying}
                        isDetecting={isDetecting}
                        isDetectionWaiting={isDetectionWaiting}
                    />
                </>
            )}
        </>
    );
}

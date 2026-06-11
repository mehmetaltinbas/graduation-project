import StatusBadge from "./StatusBadge";

export function LiveStatsControls({
    cameraReady,
    isDetecting,
    loading,
    hasError,
    lastLatencyMs,
    sentFrameCount,
    sessionSeconds,
    effectiveFps,
}) {
    if (!cameraReady) return null;

    return (
        <div className="flex items-center gap-3 flex-wrap">
            <span className="inline-block shrink-0 w-32 text-xs text-white/50">
                Frames sent: {sentFrameCount}
            </span>

            <span className="inline-block shrink-0 w-40 text-xs text-white/50">
                Last latency: {lastLatencyMs === null ? "-" : `${lastLatencyMs}ms`}
            </span>

            <span className="inline-block shrink-0 w-24 text-xs text-white/50">
                Session: {sessionSeconds}s
            </span>

            <span className="inline-block shrink-0 w-32 text-xs text-white/50">
                Effective FPS: {effectiveFps}
            </span>

            <span className="inline-flex shrink-0 w-50 justify-start">
                {/* isVideo gives the steady "Detecting" label (vs per-frame
                    "Processing" flicker), which fits the continuous live loop too. */}
                <StatusBadge
                    hasError={hasError}
                    loading={loading}
                    isVideo
                    isDetecting={isDetecting}
                />
            </span>
        </div>
    );
}

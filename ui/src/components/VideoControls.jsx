import { getApproxFps } from "../utils/get-approx-fps.util";
import { getPerformanceHint } from "../utils/get-performance-hint.util";
import { getSpeedLabel } from "../utils/get-speed-label.util";
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
    frameIntervalMs,
    speedOptions,
    onFileChange,
    onPlayPause,
    onToggleDetection,
    onFrameIntervalChange,
}) {
    const performanceHint = getPerformanceHint({ isDetecting, lastLatencyMs, effectiveFps });

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
                        disabled={loading && !isDetecting}
                        className="rounded-full bg-white/10 px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-white/20 disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                        {isDetecting ? (loading ? "Detecting..." : "Stop Detection") : "Start Detection"}
                    </button>

                    <label className="flex items-center gap-2 text-xs text-white/60">
                        <span>Speed</span>

                        <select
                            value={frameIntervalMs}
                            onChange={(e) => onFrameIntervalChange(Number(e.target.value))}
                            className="rounded-md border border-white/20 bg-black px-2 py-1 text-xs text-white"
                        >
                            {speedOptions.map((option) => (
                                <option key={option} value={option}>
                                    {getSpeedLabel(option)} ({option}ms)
                                </option>
                            ))}
                        </select>
                    </label>

                    <span className="text-xs text-white/50">
                        Mode: {getSpeedLabel(frameIntervalMs)} (~{getApproxFps(frameIntervalMs)} FPS)
                    </span>

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

                    {performanceHint && (
                        <span className="text-xs text-white/60">
                            Hint: {performanceHint}
                        </span>
                    )}
                </>
            )}
        </>
    );
}

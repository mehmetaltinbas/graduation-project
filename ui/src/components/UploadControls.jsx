export default function UploadControls({
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
    const getSpeedLabel = (intervalMs) => {
        if (intervalMs <= 200) return "Fast";
        if (intervalMs <= 400) return "Balanced";
        return "Stable";
    };

    const getApproxFps = (intervalMs) => (1000 / intervalMs).toFixed(1);

    const status = (() => {
        if (hasError) return { label: "Error", dot: "bg-red-400" };
        if (loading) return { label: "Processing", dot: "bg-yellow-300" };
        if (isDetectionWaiting) return { label: "Detecting (Paused)", dot: "bg-amber-400" };
        if (isDetecting) return { label: "Detecting", dot: "bg-emerald-400" };
        if (isPlaying) return { label: "Playing", dot: "bg-sky-400" };
        return { label: "Idle", dot: "bg-white/40" };
    })();

    const performanceHint = (() => {
        if (!isDetecting) return null;
        if (lastLatencyMs !== null && lastLatencyMs > 1200) {
            return "High latency detected. Use Stable mode (500ms/800ms).";
        }
        if (effectiveFps > 0 && effectiveFps < 1.5) {
            return "Effective FPS is low. Consider raising interval to 500ms+.";
        }
        if (lastLatencyMs !== null && lastLatencyMs < 500 && effectiveFps >= 2) {
            return "Performance looks healthy.";
        }
        return null;
    })();

    return (
        <div className="flex items-center gap-3 flex-wrap">
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
                    <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs text-white/80">
                        <span className={`h-2 w-2 rounded-full ${status.dot}`} />
                        Status: {status.label}
                    </span>
                    {performanceHint && (
                        <span className="text-xs text-white/60">
                            Hint: {performanceHint}
                        </span>
                    )}
                </>
            )}
        </div>
    );
}

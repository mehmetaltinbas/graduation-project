export function getStatus({ hasError, loading, isVideo, isPlaying, isDetecting, isDetectionWaiting }) {
    if (hasError) return { label: "Error", dot: "bg-red-400" };

    // During continuous video detection, `loading` toggles on every frame
    // request (~5x/sec). Let the steady "Detecting" / "Detecting (Paused)"
    // states win over per-frame loading so the badge doesn't flicker.
    // "Processing" still applies for one-off image uploads.
    if (isVideo && isDetectionWaiting) return { label: "Detecting (Paused)", dot: "bg-amber-400" };

    if (isVideo && isDetecting) return { label: "Detecting", dot: "bg-emerald-400" };

    if (loading) return { label: "Processing", dot: "bg-yellow-300" };

    if (isVideo && isPlaying) return { label: "Playing", dot: "bg-sky-400" };

    return { label: "Idle", dot: "bg-white/40" };
}

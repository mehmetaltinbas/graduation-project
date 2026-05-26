import StatusBadge from "./StatusBadge";

export function ImageStatsControls({
    file,
    loading,
    hasError,
    lastLatencyMs,
}) {
    if (!file) return null;

    return (
        <div className="flex items-center gap-3 flex-wrap">
            <span className="inline-block shrink-0 w-40 text-xs text-white/50">
                Last latency: {lastLatencyMs === null ? "-" : `${lastLatencyMs}ms`}
            </span>

            <span className="inline-flex shrink-0 w-50 justify-start">
                <StatusBadge hasError={hasError} loading={loading} isVideo={false} />
            </span>
        </div>
    );
}

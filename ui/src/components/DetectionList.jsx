export default function DetectionList({ detections, loading }) {
    if (!detections && loading) {
        return (
            <p className="text-xs text-white/40">
                Analyzing latest frame...
            </p>
        );
    }

    if (!detections && !loading) {
        return (
            <p className="text-xs text-white/30">
                Upload a video and start detection.
            </p>
        );
    }

    if (!detections) return null;

    if (detections.length === 0) {
        return (
            <p className="text-sm text-white/50">No weapons detected.</p>
        );
    }

    return (
        <ul className="space-y-1.5">
            {detections.map((det, i) => (
                <li
                key={i}
                className="flex items-center justify-between rounded-lg bg-white/5 px-4 py-3"
                >
                    <span className="text-sm text-white/90">{det.label}</span>
                    <span className="text-xs tabular-nums text-white/40">
                        {Math.round(det.confidence * 100)}%
                    </span>
                </li>
            ))}
        </ul>
    );
}

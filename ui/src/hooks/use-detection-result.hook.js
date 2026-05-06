import { useCallback, useState } from "react";

export function useDetectionResult() {
    const [detections, setDetections] = useState(null);
    const [imageDims, setImageDims] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [lastLatencyMs, setLastLatencyMs] = useState(null);

    const reset = useCallback(() => {
        setDetections(null);
        setImageDims(null);
        setLoading(false);
        setError(null);
        setLastLatencyMs(null);
    }, []);

    return {
        detections,
        imageDims,
        loading,
        error,
        lastLatencyMs,
        setDetections,
        setImageDims,
        setLoading,
        setError,
        setLastLatencyMs,
        reset,
    };
}

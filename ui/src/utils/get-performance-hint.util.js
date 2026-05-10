export function getPerformanceHint({ isDetecting, lastLatencyMs, effectiveFps }) {
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
}

export function getSpeedLabel(intervalMs) {
    if (intervalMs <= 200) return "Fast";

    if (intervalMs <= 400) return "Balanced";

    return "Stable";
}

export function getFriendlyError(rawError) {
    if (!rawError) return null;

    const message = String(rawError);
    const lower = message.toLowerCase();

    if (lower.includes("network") || lower.includes("failed to fetch")) {
        return "Could not connect to the API. Check if the server is running.";
    }

    if (lower.includes("invalid image")) {
        return "Could not read video frame. Try a different video.";
    }

    if (lower.includes("upload an image")) {
        return "Invalid frame submission. Try clicking 'Start Detection' again from the UI.";
    }

    return message;
}

export function getFriendlyError(rawError, inputMode = "video") {
    if (!rawError) return null;

    const message = String(rawError);
    const lower = message.toLowerCase();

    if (lower.includes("network") || lower.includes("failed to fetch")) {
        return "Could not connect to the API. Check if the server is running.";
    }

    // The API returns the same "Invalid image data." for both the image upload
    // and the per-frame video path, so word the message for the active mode.
    if (lower.includes("invalid image")) {
        return inputMode === "image"
            ? "Couldn't read that image. Try a JPEG or PNG file."
            : "Could not read video frame. Try a different video.";
    }

    if (lower.includes("upload an image")) {
        return "Invalid frame submission. Try clicking 'Start Detection' again from the UI.";
    }

    return message;
}

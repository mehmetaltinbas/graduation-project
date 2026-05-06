export function getFriendlyError(rawError) {
    if (!rawError) return null;
    const message = String(rawError);
    const lower = message.toLowerCase();
    if (lower.includes("network") || lower.includes("failed to fetch")) {
        return "API baglantisi kurulamadı. Sunucunun calistigini kontrol et.";
    }
    if (lower.includes("invalid image")) {
        return "Video karesi okunamadi. Farkli bir video deneyin.";
    }
    if (lower.includes("upload an image")) {
        return "Frame gonderimi gecersiz. UI'dan yeniden Start Detection deneyin.";
    }
    return message;
}

export default function ModeToggle({ inputMode, onModeChange }) {
    const buttonClass = (active) =>
        `rounded-full px-4 py-1.5 text-xs font-medium transition-colors ${
            active ? "bg-white text-black" : "bg-white/10 text-white hover:bg-white/20"
        }`;

    return (
        <div className="inline-flex items-center gap-1 rounded-full border border-white/15 bg-white/5 p-1">
            <button
                type="button"
                onClick={() => onModeChange("video")}
                className={buttonClass(inputMode === "video")}
            >
                Video
            </button>
            <button
                type="button"
                onClick={() => onModeChange("image")}
                className={buttonClass(inputMode === "image")}
            >
                Image
            </button>
            <button
                type="button"
                onClick={() => onModeChange("live")}
                className={buttonClass(inputMode === "live")}
            >
                Live
            </button>
        </div>
    );
}

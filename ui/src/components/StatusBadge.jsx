import { getStatus } from "../utils/get-status.util";

export default function StatusBadge(props) {
    const { label, dot } = getStatus(props);
    return (
        <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs text-white/80">
            <span className={`h-2 w-2 rounded-full ${dot}`} />
            Status: {label}
        </span>
    );
}

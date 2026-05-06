import axios from "axios";
import { useEffect, useRef, useState } from "react";
import { API_URL } from "../constants/api-url.constant";

export function useImageDetection(result) {
    const { setDetections, setImageDims, setLoading, setError, setLastLatencyMs, reset: resetResult } = result;

    const requestInFlightRef = useRef(false);
    const detectionRunIdRef = useRef(0);

    const [file, setFile] = useState(null);
    const [url, setUrl] = useState(null);

    useEffect(() => {
        if (!file) {
            setUrl(null);
            return;
        }
        const next = URL.createObjectURL(file);
        setUrl(next);
        return () => URL.revokeObjectURL(next);
    }, [file]);

    const handleFileChange = (e) => {
        const nextFile = e.target.files[0] || null;
        if (!nextFile) return;

        requestInFlightRef.current = false;
        detectionRunIdRef.current += 1;
        resetResult();
        setFile(nextFile);
    };

    const runDetection = async () => {
        if (!file) return;
        if (requestInFlightRef.current) return;

        const requestRunId = detectionRunIdRef.current;
        requestInFlightRef.current = true;
        setLoading(true);
        setError(null);
        const startedAt = performance.now();

        try {
            const form = new FormData();
            form.append("file", file, file.name);
            const { data } = await axios.post(`${API_URL}/predict`, form, {
                headers: { "Content-Type": "multipart/form-data" },
            });

            if (requestRunId !== detectionRunIdRef.current) return;
            setDetections(data.detections);
            setImageDims({ width: data.image_width, height: data.image_height });
            setLastLatencyMs(Math.round(performance.now() - startedAt));
        } catch (err) {
            if (requestRunId !== detectionRunIdRef.current) return;
            setLastLatencyMs(Math.round(performance.now() - startedAt));
            setError(err.response?.data?.detail || err.message || "Prediction failed");
        } finally {
            requestInFlightRef.current = false;
            if (requestRunId === detectionRunIdRef.current) {
                setLoading(false);
            }
        }
    };

    const reset = () => {
        requestInFlightRef.current = false;
        detectionRunIdRef.current += 1;
        setFile(null);
    };

    return {
        file,
        url,
        handleFileChange,
        runDetection,
        reset,
    };
}

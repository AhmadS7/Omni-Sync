"use client";

import { NodeViewWrapper, NodeViewProps } from "@tiptap/react";
import { useEffect, useState, useRef } from "react";
import { Terminal, Trash2 } from "lucide-react";

export function K8sLogsNodeView({ node, deleteNode }: NodeViewProps) {
    const { podName } = node.attrs;
    const [logs, setLogs] = useState<string[]>([]);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        // Connect to the specific log stream API on our Go backend
        const ws = new WebSocket(`ws://localhost:8080/logs/${podName}`);

        ws.onmessage = (event) => {
            setLogs((prev) => {
                const newLogs = [...prev, event.data];
                // Keep only top 100 logs to avoid memory bloat
                if (newLogs.length > 100) return newLogs.slice(newLogs.length - 100);
                return newLogs;
            });
        };

        return () => {
            ws.close();
        };
    }, [podName]);

    useEffect(() => {
        // Auto-scroll to bottom
        if (containerRef.current) {
            containerRef.current.scrollTop = containerRef.current.scrollHeight;
        }
    }, [logs]);

    // Colorizer helper
    const renderLogStr = (line: string, idx: number) => {
        let className = "";
        if (line.includes("[INFO]")) className = "info";
        if (line.includes("[WARN]")) className = "warn";
        if (line.includes("[ERROR]")) className = "error";

        return (
            <div key={idx} className={`k8s-log-line ${className}`}>
                {line}
            </div>
        );
    };

    return (
        <NodeViewWrapper className="k8s-log-window">
            <div className="k8s-log-header">
                <div className="k8s-log-title">
                    <Terminal size={14} color="#6366f1" />
                    <span style={{ fontWeight: 600, color: "#e2e8f0" }}>Tail Logs</span>
                    <span style={{ marginLeft: "6px", color: "#64748b" }}>{podName}</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <div className="k8s-log-dot"></div>
                        <span>Streaming</span>
                    </div>
                    <button
                        onClick={deleteNode}
                        style={{
                            background: "none", border: "none", cursor: "pointer",
                            color: "var(--danger-text)", display: "flex", alignItems: "center"
                        }}
                        title="Remove block"
                    >
                        <Trash2 size={16} />
                    </button>
                </div>
            </div>
            <div className="k8s-log-body" ref={containerRef}>
                {logs.length === 0 ? (
                    <div style={{ color: "#52525b", fontStyle: "italic" }}>Waiting for logs...</div>
                ) : (
                    logs.map((log, i) => renderLogStr(log, i))
                )}
            </div>
        </NodeViewWrapper>
    );
}

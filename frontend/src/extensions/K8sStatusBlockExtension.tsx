"use client";

import { Node, mergeAttributes } from "@tiptap/core";
import { ReactNodeViewRenderer, NodeViewWrapper } from "@tiptap/react";
import { useState, useEffect } from "react";
import { LineChart, Line, YAxis, ResponsiveContainer } from "recharts";
import { Activity, CheckCircle2, XCircle } from "lucide-react";

// Generate initial mock data for the sparkline
const generateData = () => {
    return Array.from({ length: 20 }, (_, i) => ({
        time: i,
        latency: Math.floor(Math.random() * 50) + 10,
    }));
};

const K8sStatusComponent = (props: any) => {
    const [data, setData] = useState(generateData());
    const [isHealthy, setIsHealthy] = useState(true);
    const serviceName = props.node.attrs.serviceName || "api-gateway-deployment";

    // Simulate live data rolling in
    useEffect(() => {
        const interval = setInterval(() => {
            setData((currentData) => {
                const newLatency = Math.floor(Math.random() * 100) + 10;
                // Chance to spike error
                if (newLatency > 90) setIsHealthy(false);
                else if (Math.random() > 0.8) setIsHealthy(true);

                const newData = [...currentData.slice(1), { time: Date.now(), latency: newLatency }];
                return newData;
            });
        }, 2000);

        return () => clearInterval(interval);
    }, []);

    return (
        <NodeViewWrapper className="k8s-status-block my-4">
            <div className="bg-[#111118] border border-[#2b2b36] rounded-xl overflow-hidden shadow-lg p-4 flex flex-col gap-4 relative">

                {/* Header */}
                <div className="flex items-center justify-between border-b border-[#2b2b36] pb-3">
                    <div className="flex items-center gap-2">
                        <Activity size={18} className="text-[#a1a1aa]" />
                        <span className="text-sm font-semibold text-[#f8f8f8]">{serviceName}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        {isHealthy ? (
                            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#10b981]/10 border border-[#10b981]/20">
                                <CheckCircle2 size={14} className="text-[#10b981]" />
                                <span className="text-xs font-bold text-[#10b981] uppercase tracking-wider">Healthy</span>
                            </div>
                        ) : (
                            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#ef4444]/10 border border-[#ef4444]/20">
                                <XCircle size={14} className="text-[#ef4444]" />
                                <span className="text-xs font-bold text-[#ef4444] uppercase tracking-wider">Degraded</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Body / Sparkline */}
                <div className="flex items-end justify-between gap-4">
                    <div className="flex flex-col">
                        <span className="text-xs text-[#a1a1aa] uppercase tracking-wide">P99 Latency</span>
                        <div className="flex items-baseline gap-1">
                            <span className="text-2xl font-bold text-white">{data[data.length - 1].latency}</span>
                            <span className="text-sm text-[#a1a1aa]">ms</span>
                        </div>
                    </div>

                    <div className="h-12 w-48 ml-auto">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={data}>
                                <YAxis domain={[0, 120]} hide />
                                <Line
                                    type="monotone"
                                    dataKey="latency"
                                    stroke={isHealthy ? "#10b981" : "#ef4444"}
                                    strokeWidth={2}
                                    dot={false}
                                    isAnimationActive={true}
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>
        </NodeViewWrapper>
    );
};

export const K8sStatusBlockExtension = Node.create({
    name: "k8sStatusBlock",
    group: "block",
    atom: true,

    addAttributes() {
        return {
            serviceName: {
                default: "api-gateway-deployment",
            },
        };
    },

    parseHTML() {
        return [
            {
                tag: "k8s-status-block",
            },
        ];
    },

    renderHTML({ HTMLAttributes }) {
        return ["k8s-status-block", mergeAttributes(HTMLAttributes)];
    },

    addNodeView() {
        return ReactNodeViewRenderer(K8sStatusComponent);
    },
});

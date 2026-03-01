"use client";

import React, { useEffect, useState } from "react";
import { WebsocketProvider } from "y-websocket";
import { motion, AnimatePresence } from "framer-motion";
import { MousePointer2 } from "lucide-react";

interface CursorOverlayProps {
    provider: WebsocketProvider;
    containerRef: React.RefObject<HTMLDivElement | null>;
}

interface CursorState {
    user?: { name: string; color: string };
    mouse?: { x: number; y: number } | null;
}

export const CursorOverlay = React.memo(function CursorOverlay({ provider, containerRef }: CursorOverlayProps) {
    const [awarenessStates, setAwarenessStates] = useState<Map<number, CursorState>>(new Map());

    useEffect(() => {
        const handleAwarenessUpdate = () => {
            // Create a shallow copy to trigger React re-render
            const states = new Map<number, CursorState>(provider.awareness.getStates() as Map<number, CursorState>);
            setAwarenessStates(states);
        };

        provider.awareness.on("change", handleAwarenessUpdate);

        // Initial state
        handleAwarenessUpdate();

        return () => {
            provider.awareness.off("change", handleAwarenessUpdate);
        };
    }, [provider]);

    return (
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, pointerEvents: "none", zIndex: 50, overflow: "hidden" }}>
            <AnimatePresence>
                {Array.from(awarenessStates.entries()).map(([clientId, state]) => {
                    // Don't render our own cursor
                    if (clientId === provider.awareness.clientID) return null;

                    // Don't render if there's no mouse position or user info
                    if (!state.mouse || !state.user) return null;

                    return (
                        <motion.div
                            key={clientId}
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{
                                opacity: 1,
                                scale: 1,
                                x: state.mouse.x,
                                y: state.mouse.y
                            }}
                            exit={{ opacity: 0, scale: 0.8 }}
                            transition={{
                                type: "spring",
                                damping: 25,
                                stiffness: 250,
                                mass: 0.5
                            }}
                            style={{
                                position: "absolute",
                                top: 0, left: 0,
                                pointerEvents: "none",
                                display: "flex",
                                flexDirection: "column",
                            }}
                        >
                            {/* Fake SVG cursor tilted slightly */}
                            <MousePointer2
                                size={20}
                                fill={state.user.color}
                                color="white"
                                strokeWidth={1.5}
                                style={{
                                    transform: "rotate(-15deg) translate(-4px, -4px)",
                                    filter: "drop-shadow(0px 2px 4px rgba(0,0,0,0.3))"
                                }}
                            />
                            <div
                                style={{
                                    backgroundColor: state.user.color,
                                    color: "white",
                                    padding: "4px 8px",
                                    borderRadius: "8px",
                                    borderTopLeftRadius: 0,
                                    fontSize: "12px",
                                    fontWeight: 600,
                                    marginTop: "-2px",
                                    marginLeft: "10px",
                                    boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
                                    whiteSpace: "nowrap"
                                }}
                            >
                                {state.user.name}
                            </div>
                        </motion.div>
                    );
                })}
            </AnimatePresence>
        </div>
    );
});

"use client";

import { useEffect, useState, useRef } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Collaboration from "@tiptap/extension-collaboration";
import CollaborationCursor from "@tiptap/extension-collaboration-cursor";
import * as Y from "yjs";
import { WebsocketProvider } from "y-websocket";
import { CursorOverlay } from "./CursorOverlay";
import { K8sLogsExtension } from "../extensions/K8sLogsExtension";

// Random color generator for this user
const colors = ["#f87171", "#fb923c", "#fbbf24", "#a3e635", "#4ade80", "#34d399", "#2dd4bf", "#38bdf8", "#818cf8", "#c084fc", "#e879f9", "#f472b6"];
const myColor = colors[Math.floor(Math.random() * colors.length)];
const names = ["Alice", "Bob", "Charlie", "Dave", "Eve", "Frank"];
const myName = names[Math.floor(Math.random() * names.length)];

export default function Editor() {
    const [provider, setProvider] = useState<WebsocketProvider | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    // Initialize Yjs and WebSocket provider
    useEffect(() => {
        const ydoc = new Y.Doc();

        // Connect to the Go signaling server on port 8080.
        // We use a static room name "playbook-incident-1" for this demo.
        const wsProvider = new WebsocketProvider(
            "ws://localhost:8080",
            "sync/playbook-incident-1",
            ydoc
        );

        wsProvider.awareness.setLocalStateField("user", {
            name: myName,
            color: myColor,
        });

        setProvider(wsProvider);

        return () => {
            wsProvider.destroy();
            ydoc.destroy();
        };
    }, []);

    const editor = useEditor({
        extensions: provider
            ? [
                StarterKit.configure({
                    history: false, // History is handled by Yjs
                }),
                Collaboration.configure({
                    document: provider.doc,
                }),
                CollaborationCursor.configure({
                    provider: provider,
                    user: {
                        name: myName,
                        color: myColor,
                    },
                }),
                K8sLogsExtension,
            ]
            : [],
        content: "",
        editable: true,
    }, [provider]);

    // Track mouse movements to broadcast over Yjs awareness for Framer Motion overlay
    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!provider || !containerRef.current) return;

        const rect = containerRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        provider.awareness.setLocalStateField("mouse", { x, y });
    };

    const handleMouseLeave = () => {
        if (!provider) return;
        provider.awareness.setLocalStateField("mouse", null);
    };

    if (!provider || !editor) {
        return <div className="editor-container">Connecting to Sync Engine...</div>;
    }

    return (
        <div
            className="editor-container"
            ref={containerRef}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
        >
            <CursorOverlay provider={provider} containerRef={containerRef} />
            <EditorContent editor={editor} />
        </div>
    );
}

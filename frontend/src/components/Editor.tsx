"use client";

import { useEffect, useState, useRef, useMemo } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Collaboration from "@tiptap/extension-collaboration";
import CollaborationCursor from "@tiptap/extension-collaboration-cursor";
import * as Y from "yjs";
import { WebsocketProvider } from "y-websocket";
import { CursorOverlay } from "./CursorOverlay";
import { K8sLogsExtension } from "../extensions/K8sLogsExtension";

const colors = ["#f87171", "#fb923c", "#fbbf24", "#a3e635", "#4ade80", "#34d399", "#2dd4bf", "#38bdf8", "#818cf8", "#c084fc", "#e879f9", "#f472b6"];
const names = ["Alice", "Bob", "Charlie", "Dave", "Eve", "Frank"];

function EditorInner({ provider, ydoc, myName, myColor }: any) {
    const containerRef = useRef<HTMLDivElement>(null);

    const editor = useEditor({
        extensions: [
            StarterKit.configure({ history: false } as any),
            Collaboration.configure({
                document: ydoc,
            }),
            K8sLogsExtension,
        ],
        content: "",
        editable: true,
        immediatelyRender: false,
    });

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

    return (
        <div className="editor-container" ref={containerRef} onMouseMove={handleMouseMove} onMouseLeave={handleMouseLeave}>
            <CursorOverlay provider={provider} containerRef={containerRef} />
            <EditorContent editor={editor} />
        </div>
    );
}

export default function Editor() {
    const ydoc = useMemo(() => new Y.Doc(), []);
    const [provider, setProvider] = useState<WebsocketProvider | null>(null);
    const [isMounted, setIsMounted] = useState(false);

    const { myName, myColor } = useMemo(() => {
        return {
            myName: names[Math.floor(Math.random() * names.length)],
            myColor: colors[Math.floor(Math.random() * colors.length)]
        }
    }, []);

    useEffect(() => {
        setIsMounted(true);
    }, []);

    useEffect(() => {
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
        };
    }, [ydoc, myName, myColor]);

    if (!isMounted || !provider) {
        return <div className="editor-container">Connecting to Sync Engine...</div>;
    }

    return <EditorInner provider={provider} ydoc={ydoc} myName={myName} myColor={myColor} />;
}

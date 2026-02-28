"use client";

import dynamic from "next/dynamic";
import { Terminal } from "lucide-react";

// Disable SSR for the collaborative editor because Yjs/Websockets rely on browser window objects
const Editor = dynamic(() => import("@/components/Editor"), {
  ssr: false,
  loading: () => <div className="editor-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}><div className="status-dot"></div><span style={{ marginLeft: '10px', color: 'var(--text-secondary)' }}>Initializing Sync Engine...</span></div>
});

export default function Home() {
  return (
    <main className="container">
      <header className="header">
        <div className="logo">
          <Terminal size={28} color="#0cebeb" strokeWidth={2.5} />
          <span style={{ letterSpacing: "-0.02em" }}>Omni-Sync Playbooks</span>
        </div>
        <div className="status-indicator">
          <div className="status-dot"></div>
          <span>System Online</span>
        </div>
      </header>

      <section>
        <p style={{ color: "var(--text-secondary)", marginBottom: "1.5rem" }}>
          Real-time collaborative incident response. Type <code>/k8s-logs [pod-name]</code> to embed a live production log stream.
        </p>
        <Editor />
      </section>
    </main>
  );
}

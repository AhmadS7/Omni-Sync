import Editor from "@/components/Editor";
import { Terminal } from "lucide-react";

export default function Home() {
  return (
    <main className="container">
      <header className="header">
        <div className="logo">
          <Terminal size={24} color="#a855f7" />
          Omni-Sync Playbooks
        </div>
        <div className="status-indicator">
          <div className="status-dot"></div>
          <span>Connected</span>
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

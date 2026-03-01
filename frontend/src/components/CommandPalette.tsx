"use client";

import { useEffect, useState } from "react";
import { Command } from "cmdk";
import { Editor } from "@tiptap/react";
import { Activity, Camera, Terminal } from "lucide-react";

interface CommandPaletteProps {
    editor: Editor | null;
}

export function CommandPalette({ editor }: CommandPaletteProps) {
    const [open, setOpen] = useState(false);

    useEffect(() => {
        const down = (e: KeyboardEvent) => {
            if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                setOpen((open) => !open);
            }
        };

        document.addEventListener("keydown", down);
        return () => document.removeEventListener("keydown", down);
    }, []);

    if (!open) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] bg-black/50 backdrop-blur-sm">
            <div className="w-full max-w-lg bg-[#171721] border border-[#2b2b36] rounded-xl shadow-2xl overflow-hidden">
                <Command
                    label="Command Menu"
                    onKeyDown={(e) => {
                        if (e.key === "Escape") setOpen(false);
                    }}
                    className="flex flex-col h-full"
                >
                    <Command.Input
                        autoFocus
                        placeholder="Type a command or search..."
                        className="w-full bg-transparent border-b border-[#2b2b36] px-4 py-4 text-[#f8f8f8] placeholder:text-[#a1a1aa] focus:outline-none focus:ring-0 text-sm"
                    />

                    <Command.List className="max-h-[300px] overflow-y-auto p-2">
                        <Command.Empty className="py-6 text-center text-sm text-[#a1a1aa]">
                            No results found.
                        </Command.Empty>

                        <Command.Group heading="SRE Actions" className="text-xs font-semibold text-[#a1a1aa] px-2 py-1.5 mt-2 mb-1 uppercase tracking-wider">
                            <Command.Item
                                onSelect={() => {
                                    if (editor) {
                                        editor.chain().focus().insertContent({ type: "k8sStatusBlock" }).run();
                                    }
                                    setOpen(false);
                                }}
                                className="flex items-center gap-2 px-2 py-2.5 text-sm text-[#f8f8f8] rounded-md cursor-pointer data-[selected=true]:bg-[#6366f1]/20 data-[selected=true]:text-[#6366f1] transition-colors"
                            >
                                <Activity size={16} />
                                <span>Insert K8s Health Block</span>
                            </Command.Item>

                            <Command.Item
                                onSelect={() => {
                                    if (editor) {
                                        editor.chain().focus().insertContent("/k8s-logs backend-sync-pod").run();
                                    }
                                    setOpen(false);
                                }}
                                className="flex items-center gap-2 px-2 py-2.5 text-sm text-[#f8f8f8] rounded-md cursor-pointer data-[selected=true]:bg-[#6366f1]/20 data-[selected=true]:text-[#6366f1] transition-colors"
                            >
                                <Terminal size={16} />
                                <span>Insert Log Stream</span>
                            </Command.Item>
                        </Command.Group>

                        <Command.Group heading="General" className="text-xs font-semibold text-[#a1a1aa] px-2 py-1.5 mt-2 mb-1 uppercase tracking-wider border-t border-[#2b2b36] pt-3">
                            <Command.Item
                                onSelect={() => {
                                    alert("Snapshot Triggered! State saved successfully.");
                                    setOpen(false);
                                }}
                                className="flex items-center gap-2 px-2 py-2.5 text-sm text-[#f8f8f8] rounded-md cursor-pointer data-[selected=true]:bg-[#6366f1]/20 data-[selected=true]:text-[#6366f1] transition-colors"
                            >
                                <Camera size={16} />
                                <span>Take Snapshot</span>
                            </Command.Item>
                        </Command.Group>
                    </Command.List>
                </Command>
            </div>
        </div>
    );
}

import { Node, mergeAttributes, textblockTypeInputRule } from "@tiptap/core";
import { ReactNodeViewRenderer } from "@tiptap/react";
import { K8sLogsNodeView } from "../components/K8sLogsNodeView";

export const K8sLogsExtension = Node.create({
    name: "k8sLogs",

    group: "block",

    atom: true, // It's treated as a single unbreakable node

    addAttributes() {
        return {
            podName: {
                default: "unknown-pod",
            },
        };
    },

    parseHTML() {
        return [
            {
                tag: 'div[data-type="k8s-logs"]',
            },
        ];
    },

    renderHTML({ HTMLAttributes }) {
        return ["div", mergeAttributes(HTMLAttributes, { "data-type": "k8s-logs" })];
    },

    addNodeView() {
        return ReactNodeViewRenderer(K8sLogsNodeView);
    },

    addInputRules() {
        // Typing `/k8s-logs my-pod` at the start of a block converts it
        const regex = /^\/k8s-logs\s+([a-zA-Z0-9-]+)\s$/;

        return [
            textblockTypeInputRule({
                find: regex,
                type: this.type,
                getAttributes: (match) => {
                    return {
                        podName: match[1],
                    };
                },
            }),
        ];
    },
});

import type { TFile } from './types/files';
import type { TMessage } from './types';

export type ParentMessage = TMessage & { children: TMessage[]; depth: number };

/**
 * Builds the render tree from the flat messages array. Order-robust: live
 * stream/steer/preempt cache writes can momentarily place a child before its
 * parent, and a single-pass link would hoist such rows into phantom root
 * branches — folding the visible thread to one dangling branch until a
 * refetch restores creation order. Linking happens only after every message
 * is indexed, so array order never changes the tree shape.
 */
export function buildTree({
  messages,
  fileMap,
}: {
  messages: (TMessage | undefined)[] | null;
  fileMap?: Record<string, TFile>;
}) {
  if (messages === null) {
    return null;
  }

  // Performance optimization: Map lookup avoids Object prototype overhead and dynamic key allocation overhead
  const messageMap = new Map<string, ParentMessage>();
  const orderedMessages: ParentMessage[] = [];
  const rootMessages: ParentMessage[] = [];
  const childrenCount = new Map<string, number>();

  // Performance optimization: Indexed loop avoids iterator allocation over messages
  const len = messages.length;
  for (let i = 0; i < len; i++) {
    const message = messages[i];
    if (!message) {
      continue;
    }
    /** A self-parented row can never link under itself (it becomes a root),
     *  so count it with the parentless group — charging its own id would
     *  inflate the sibling indices of its real children past
     *  `children.length`. */
    const parentId =
      message.parentMessageId === message.messageId ? '' : (message.parentMessageId ?? '');
    const currentCount = childrenCount.get(parentId) ?? 0;
    childrenCount.set(parentId, currentCount + 1);

    const extendedMessage: ParentMessage = {
      ...message,
      children: [],
      depth: 0,
      siblingIndex: currentCount,
    };

    if (message.files && fileMap) {
      extendedMessage.files = message.files.map((file) => fileMap[file.file_id ?? ''] ?? file);
    }

    messageMap.set(message.messageId, extendedMessage);
    orderedMessages.push(extendedMessage);
  }

  const orderedLen = orderedMessages.length;
  for (let i = 0; i < orderedLen; i++) {
    const extendedMessage = orderedMessages[i];
    const parentMessage = messageMap.get(extendedMessage.parentMessageId ?? '');
    if (parentMessage && parentMessage !== extendedMessage) {
      parentMessage.children.push(extendedMessage);
    } else {
      rootMessages.push(extendedMessage);
    }
  }

  /** Depth comes from a roots-down walk (a child linked before its parent
   *  can't inherit depth at link time). The `visited` set doubles as the
   *  cycle guard: nodes on a corrupt parent cycle are unreachable from any
   *  root, so they resurface as roots instead of disappearing. */
  const visited = new Set<ParentMessage>();
  const assignDepths = (root: ParentMessage) => {
    visited.add(root);
    const stack: ParentMessage[] = [root];
    while (stack.length > 0) {
      const node = stack.pop() as ParentMessage;
      let children = node.children as ParentMessage[];
      let hasVisitedChild = false;
      const childCount = children.length;
      for (let i = 0; i < childCount; i++) {
        if (visited.has(children[i] as ParentMessage)) {
          hasVisitedChild = true;
          break;
        }
      }
      if (hasVisitedChild) {
        node.children = children.filter((child) => !visited.has(child as ParentMessage));
        children = node.children as ParentMessage[];
      }
      const finalChildCount = children.length;
      for (let i = 0; i < finalChildCount; i++) {
        const child = children[i] as ParentMessage;
        child.depth = node.depth + 1;
        visited.add(child);
        stack.push(child);
      }
    }
  };

  const rootLen = rootMessages.length;
  for (let i = 0; i < rootLen; i++) {
    assignDepths(rootMessages[i]);
  }

  for (let i = 0; i < orderedLen; i++) {
    const extendedMessage = orderedMessages[i];
    if (!visited.has(extendedMessage)) {
      rootMessages.push(extendedMessage);
      assignDepths(extendedMessage);
    }
  }

  return rootMessages as TMessage[];
}

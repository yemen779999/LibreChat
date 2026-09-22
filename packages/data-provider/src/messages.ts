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

  // Performance optimization: Use prototype-less objects for faster key lookup
  const messageMap: Record<string, ParentMessage> = Object.create(null);
  const orderedMessages: ParentMessage[] = [];
  const rootMessages: ParentMessage[] = [];
  const childrenCount: Record<string, number> = Object.create(null);

  // Performance optimization: Use indexed for loops instead of for...of for hot path iteration
  for (let i = 0; i < messages.length; i++) {
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
    const count = (childrenCount[parentId] || 0) + 1;
    childrenCount[parentId] = count;

    const extendedMessage: ParentMessage = {
      ...message,
      children: [],
      depth: 0,
      siblingIndex: count - 1,
    };

    if (message.files && fileMap) {
      extendedMessage.files = message.files.map((file) => fileMap[file.file_id ?? ''] ?? file);
    }

    messageMap[message.messageId] = extendedMessage;
    orderedMessages.push(extendedMessage);
  }

  for (let i = 0; i < orderedMessages.length; i++) {
    const extendedMessage = orderedMessages[i];
    const parentMessage = messageMap[extendedMessage.parentMessageId ?? ''];
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
      const children = node.children as ParentMessage[];
      let hasCycle = false;

      // Check if any child was already visited without allocating array overhead unless a cycle exists
      for (let i = 0; i < children.length; i++) {
        if (visited.has(children[i])) {
          hasCycle = true;
          break;
        }
      }

      let validChildren = children;
      if (hasCycle) {
        validChildren = [];
        for (let i = 0; i < children.length; i++) {
          if (!visited.has(children[i])) {
            validChildren.push(children[i]);
          }
        }
        node.children = validChildren;
      }

      const nextDepth = node.depth + 1;
      for (let i = 0; i < validChildren.length; i++) {
        const child = validChildren[i];
        child.depth = nextDepth;
        visited.add(child);
        stack.push(child);
      }
    }
  };

  for (let i = 0; i < rootMessages.length; i++) {
    assignDepths(rootMessages[i]);
  }
  for (let i = 0; i < orderedMessages.length; i++) {
    const extendedMessage = orderedMessages[i];
    if (!visited.has(extendedMessage)) {
      rootMessages.push(extendedMessage);
      assignDepths(extendedMessage);
    }
  }

  return rootMessages as TMessage[];
}

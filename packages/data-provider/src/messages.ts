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

  const messageMap: Record<string, ParentMessage> = {};
  const orderedMessages: ParentMessage[] = [];
  const rootMessages: ParentMessage[] = [];
  const childrenCount: Record<string, number> = {};

  // Optimization: use index-based loops to minimize overhead during frequent tree rebuilds
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
    const currentCount = (childrenCount[parentId] || 0) + 1;
    childrenCount[parentId] = currentCount;

    const extendedMessage: ParentMessage = {
      ...message,
      children: [],
      depth: 0,
      siblingIndex: currentCount - 1,
    };

    if (message.files && fileMap) {
      const files = message.files;
      const mappedFiles = new Array(files.length);
      for (let j = 0; j < files.length; j++) {
        const file = files[j];
        mappedFiles[j] = fileMap[file.file_id ?? ''] ?? file;
      }
      extendedMessage.files = mappedFiles;
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
      /** Optimization: Single-pass traversal through `node.children`.
       *  Assigns child depth, marks as visited, pushes to stack, and severs
       *  any cycle back-edges in-place without allocating temporary arrays
       *  or running `some()` + `filter()` passes. */
      let validIndex = 0;
      for (let i = 0; i < children.length; i++) {
        const child = children[i];
        if (visited.has(child)) {
          continue;
        }
        child.depth = node.depth + 1;
        visited.add(child);
        stack.push(child);
        if (validIndex !== i) {
          children[validIndex] = child;
        }
        validIndex++;
      }
      if (validIndex < children.length) {
        children.length = validIndex;
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

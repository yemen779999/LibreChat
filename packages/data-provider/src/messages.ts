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

  // Performance optimization: Use Map lookups and indexed loops to avoid prototype lookup overhead
  // and eliminate intermediate array/closure allocations during tree building on hot render paths.
  const messageMap = new Map<string, ParentMessage>();
  const orderedMessages: ParentMessage[] = [];
  const rootMessages: ParentMessage[] = [];
  const childrenCount = new Map<string, number>();

  const messageCount = messages.length;
  for (let i = 0; i < messageCount; i++) {
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
    const currentCount = (childrenCount.get(parentId) ?? 0) + 1;
    childrenCount.set(parentId, currentCount);

    const extendedMessage: ParentMessage = {
      ...message,
      children: [],
      depth: 0,
      siblingIndex: currentCount - 1,
    };

    if (message.files && fileMap) {
      const filesCount = message.files.length;
      const hydratedFiles = new Array(filesCount);
      for (let j = 0; j < filesCount; j++) {
        const file = message.files[j];
        hydratedFiles[j] = fileMap[file.file_id ?? ''] ?? file;
      }
      extendedMessage.files = hydratedFiles;
    }

    messageMap.set(message.messageId, extendedMessage);
    orderedMessages.push(extendedMessage);
  }

  const orderedCount = orderedMessages.length;
  for (let i = 0; i < orderedCount; i++) {
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

  // Performance optimization: Single-pass depth assignment and cycle severing to avoid multiple array iterations (.some / .filter) and function call overhead per node
  const assignDepths = (root: ParentMessage) => {
    visited.add(root);
    const stack: ParentMessage[] = [root];
    while (stack.length > 0) {
      const node = stack.pop() as ParentMessage;
      const children = node.children as ParentMessage[];
      let validCount = 0;

      /** Every node has one parent, so this walk reaches each node once — an
       *  already-visited child is a cycle back-edge. Sever it in-place and assign
       *  depths without intermediate array filtering or redundant passes. */
      for (let i = 0; i < children.length; i++) {
        const child = children[i];
        if (visited.has(child)) {
          continue;
        }

        child.depth = node.depth + 1;
        visited.add(child);
        stack.push(child);

        if (validCount !== i) {
          children[validCount] = child;
        }
        validCount++;
      }

      if (validCount !== children.length) {
        children.length = validCount;
      }
    }
  };

  const rootCount = rootMessages.length;
  for (let i = 0; i < rootCount; i++) {
    assignDepths(rootMessages[i]);
  }

  for (let i = 0; i < orderedCount; i++) {
    const extendedMessage = orderedMessages[i];
    if (!visited.has(extendedMessage)) {
      rootMessages.push(extendedMessage);
      assignDepths(extendedMessage);
    }
  }

  return rootMessages as TMessage[];
}

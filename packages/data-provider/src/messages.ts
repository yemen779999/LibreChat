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

  const messageMap = new Map<string, ParentMessage>();
  const childrenCount = new Map<string, number>();
  const orderedMessages: ParentMessage[] = [];
  const rootMessages: ParentMessage[] = [];

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
    const currentCount = (childrenCount.get(parentId) ?? 0) + 1;
    childrenCount.set(parentId, currentCount);

    const extendedMessage: ParentMessage = {
      ...message,
      children: [],
      depth: 0,
      siblingIndex: currentCount - 1,
    };

    if (message.files && fileMap) {
      extendedMessage.files = message.files.map((file) => fileMap[file.file_id ?? ''] ?? file);
    }

    messageMap.set(message.messageId, extendedMessage);
    orderedMessages.push(extendedMessage);
  }

  for (let i = 0; i < orderedMessages.length; i++) {
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
      /** Every node has one parent, so this walk reaches each node once — an
       *  already-visited child is a cycle back-edge. Sever it (not just skip
       *  it) so consumers that recurse `children` terminate.
       *  Consolidate cycle detection, back-edge severing, depth assignment,
       *  visited tracking, and stack pushing into a single pass over node.children.
       */
      const children = node.children as ParentMessage[];
      let validChildren: ParentMessage[] | null = null;

      for (let i = 0; i < children.length; i++) {
        const child = children[i];
        if (visited.has(child)) {
          if (!validChildren) {
            validChildren = children.slice(0, i);
          }
          continue;
        }
        child.depth = node.depth + 1;
        visited.add(child);
        stack.push(child);
        if (validChildren) {
          validChildren.push(child);
        }
      }

      if (validChildren) {
        node.children = validChildren;
      }
    }
  };
  for (const root of rootMessages) {
    assignDepths(root);
  }
  for (const extendedMessage of orderedMessages) {
    if (!visited.has(extendedMessage)) {
      rootMessages.push(extendedMessage);
      assignDepths(extendedMessage);
    }
  }

  return rootMessages as TMessage[];
}

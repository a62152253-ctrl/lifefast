/**
 * Command router — dispatches validated AI actions to the correct Firestore
 * collection and returns a structured result for each operation.
 */

import { addDoc, collection, doc, updateDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import type { ValidatedAction } from './actionValidator';

export interface ActionResult {
  success: boolean;
  actionType: string;
  entityId?: string;
  entityTitle: string;
  error?: string;
}

export interface RouterResult {
  performed: ActionResult[];
  failed: ActionResult[];
  totalSuccess: number;
  totalFailed: number;
}

// ─── Firestore writers ────────────────────────────────────────────────────────

async function writeTask(action: ValidatedAction, userId: string): Promise<string> {
  const ref = await addDoc(collection(db, 'tasks'), {
    userId,
    title: action.title,
    description: action.description || '',
    dueDate: action.dueDate ?? null,
    dueTime: action.dueTime ?? null,
    priority: action.priority,
    category: action.category || 'general',
    completed: false,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    source: 'ai',
  });
  return ref.id;
}

async function writeNote(action: ValidatedAction, userId: string): Promise<string> {
  const ref = await addDoc(collection(db, 'notes'), {
    userId,
    title: action.title,
    content: action.description || action.title,
    category: action.category || 'general',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    source: 'ai',
  });
  return ref.id;
}

async function writeShoppingItem(action: ValidatedAction, userId: string): Promise<string> {
  const ref = await addDoc(collection(db, 'shoppingItems'), {
    userId,
    name: action.title,
    quantity: 1,
    purchased: false,
    category: action.category || 'other',
    createdAt: serverTimestamp(),
    source: 'ai',
  });
  return ref.id;
}

async function writeEvent(action: ValidatedAction, userId: string): Promise<string> {
  const ref = await addDoc(collection(db, 'events'), {
    userId,
    title: action.title,
    description: action.description || '',
    date: action.dueDate ?? new Date().toISOString().split('T')[0],
    time: action.dueTime ?? null,
    category: action.category || 'general',
    createdAt: serverTimestamp(),
    source: 'ai',
  });
  return ref.id;
}

async function writeGoal(action: ValidatedAction, userId: string): Promise<string> {
  const ref = await addDoc(collection(db, 'goals'), {
    userId,
    title: action.title,
    description: action.description || '',
    targetDate: action.dueDate ?? null,
    progress: 0,
    completed: false,
    createdAt: serverTimestamp(),
    source: 'ai',
  });
  return ref.id;
}

async function writeBudgetEntry(
  action: ValidatedAction,
  userId: string,
  type: 'income' | 'expense',
): Promise<string> {
  const ref = await addDoc(collection(db, 'budgetEntries'), {
    userId,
    title: action.title,
    description: action.description || '',
    amount: action.amount,
    currency: action.currency,
    type,
    date: action.dueDate ?? new Date().toISOString().split('T')[0],
    category: action.category || 'other',
    createdAt: serverTimestamp(),
    source: 'ai',
  });
  return ref.id;
}

async function completeTask(action: ValidatedAction, userId: string): Promise<string> {
  if (!action.targetId) throw new Error('targetId required for complete_task');
  const ref = doc(db, 'tasks', action.targetId);
  await updateDoc(ref, { completed: true, completedAt: serverTimestamp() });
  return action.targetId;
}

async function deleteTask(action: ValidatedAction, userId: string): Promise<string> {
  if (!action.targetId) throw new Error('targetId required for delete_task');
  const ref = doc(db, 'tasks', action.targetId);
  await deleteDoc(ref);
  return action.targetId;
}

// ─── Dispatch ─────────────────────────────────────────────────────────────────

async function dispatchAction(action: ValidatedAction, userId: string): Promise<ActionResult> {
  try {
    let entityId: string | undefined;

    switch (action.type) {
      case 'add_task':
        entityId = await writeTask(action, userId);
        break;
      case 'add_note':
        entityId = await writeNote(action, userId);
        break;
      case 'add_shopping':
        entityId = await writeShoppingItem(action, userId);
        break;
      case 'add_event':
        entityId = await writeEvent(action, userId);
        break;
      case 'add_goal':
        entityId = await writeGoal(action, userId);
        break;
      case 'add_expense':
        entityId = await writeBudgetEntry(action, userId, 'expense');
        break;
      case 'add_income':
        entityId = await writeBudgetEntry(action, userId, 'income');
        break;
      case 'complete_task':
        entityId = await completeTask(action, userId);
        break;
      case 'delete_task':
        entityId = await deleteTask(action, userId);
        break;
      case 'no_action':
        return { success: true, actionType: 'no_action', entityTitle: '' };
      default:
        throw new Error(`Unhandled action type: ${action.type}`);
    }

    return { success: true, actionType: action.type, entityId, entityTitle: action.title };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { success: false, actionType: action.type, entityTitle: action.title, error: message };
  }
}

// ─── Main export ─────────────────────────────────────────────────────────────

export async function routeActions(
  actions: ValidatedAction[],
  userId: string,
): Promise<RouterResult> {
  const results = await Promise.allSettled(actions.map((a) => dispatchAction(a, userId)));

  const performed: ActionResult[] = [];
  const failed: ActionResult[] = [];

  results.forEach((result, i) => {
    if (result.status === 'fulfilled') {
      const r = result.value;
      if (r.success) performed.push(r);
      else failed.push(r);
    } else {
      failed.push({
        success: false,
        actionType: actions[i].type,
        entityTitle: actions[i].title,
        error: result.reason instanceof Error ? result.reason.message : String(result.reason),
      });
    }
  });

  return {
    performed,
    failed,
    totalSuccess: performed.length,
    totalFailed: failed.length,
  };
}

export function summarizeRouterResult(result: RouterResult): string {
  if (result.totalSuccess === 0 && result.totalFailed === 0) return '';

  const lines: string[] = [];

  if (result.totalSuccess > 0) {
    lines.push(`✓ ${result.totalSuccess} operacji wykonanych pomyślnie`);
  }

  if (result.totalFailed > 0) {
    lines.push(`✗ ${result.totalFailed} operacji nieudanych`);
    result.failed.forEach((f) => {
      lines.push(`  - ${f.entityTitle || f.actionType}: ${f.error ?? 'nieznany błąd'}`);
    });
  }

  return lines.join('\n');
}

import 'server-only';
import { headers } from 'next/headers';
import mockData from '../../mock_data.json';
import type { Paycheque, PaydayState, Source, SourceKind } from '@/types/payday';
import type { AllocationCategory, AllocationRule } from '@/lib/allocation-engine';

const PRESETS: Record<string, Omit<AllocationRule, 'id'>[]> = {
  '50-30-20': [
    { name: 'Essentials (Needs)', category: 'essentials', weight_bps: 5000, color: '#0066ff', sort_order: 1, active: 1 },
    { name: 'Lifestyle (Wants)', category: 'lifestyle', weight_bps: 3000, color: '#f59e0b', sort_order: 2, active: 1 },
    { name: 'Savings & Investments', category: 'savings', weight_bps: 2000, color: '#10b981', sort_order: 3, active: 1 },
  ],
  'student-coop': [
    { name: 'Tuition & Housing', category: 'essentials', weight_bps: 4500, color: '#0066ff', sort_order: 1, active: 1 },
    { name: 'Next-Term Buffer', category: 'savings', weight_bps: 2500, color: '#8b5cf6', sort_order: 2, active: 1 },
    { name: 'TFSA Growth', category: 'investments', weight_bps: 1500, color: '#10b981', sort_order: 3, active: 1 },
    { name: 'Campus & Social', category: 'lifestyle', weight_bps: 1500, color: '#f59e0b', sort_order: 4, active: 1 },
  ],
  'aggressive-saver': [
    { name: 'Core Living', category: 'essentials', weight_bps: 3500, color: '#0066ff', sort_order: 1, active: 1 },
    { name: 'Index ETFs', category: 'investments', weight_bps: 3500, color: '#10b981', sort_order: 2, active: 1 },
    { name: 'High-Yield Cash', category: 'savings', weight_bps: 2000, color: '#8b5cf6', sort_order: 3, active: 1 },
    { name: 'Guilt-Free Spending', category: 'lifestyle', weight_bps: 1000, color: '#f59e0b', sort_order: 4, active: 1 },
  ],
};

function createInitialState(): PaydayState {
  return structuredClone(mockData) as PaydayState;
}

const globalForMock = globalThis as unknown as { __paydayMockState?: PaydayState };
if (!globalForMock.__paydayMockState) {
  globalForMock.__paydayMockState = createInitialState();
}

function getStore(): PaydayState {
  return globalForMock.__paydayMockState!;
}

function toCents(val: unknown): number {
  const n = Number(String(val ?? 0).replace(/[,$]/g, ''));
  return Number.isFinite(n) ? Math.round(n * 100) : 0;
}

function toOptionalCents(val: unknown): number | null {
  if (val === null || val === undefined || val === '') return null;
  const n = Number(String(val).replace(/[,$]/g, ''));
  return Number.isFinite(n) ? Math.round(n * 100) : null;
}

function nextId(items: { id: number }[]): number {
  return items.reduce((max, item) => Math.max(max, item.id), 0) + 1;
}

export async function verifySession(): Promise<{ authenticated: true }> {
  await headers();
  return { authenticated: true };
}

export const db = {
  async getState(): Promise<PaydayState> {
    return structuredClone(getStore());
  },

  async request<T = Record<string, unknown>>(
    method: 'POST' | 'PUT' | 'DELETE',
    path: string,
    body?: Record<string, unknown>
  ): Promise<T> {
    const store = getStore();
    const parts = path.split('/').filter(Boolean);
    const resource = parts[0];
    const id = parts[1] ? Number(parts[1]) : undefined;

    if (resource === 'settings' && method === 'PUT') {
      const goalRaw = String(body?.goal ?? '').trim();
      store.settings.goal_cents = goalRaw ? String(toCents(goalRaw)) : '';
      return { ok: true } as T;
    }

    if (resource === 'sources') {
      if (method === 'POST') {
        const newId = nextId(store.sources);
        const source: Source = {
          id: newId,
          name: String(body?.name ?? 'Untitled'),
          kind: (body?.kind as SourceKind) ?? 'job',
          color: String(body?.color ?? '#0066ff'),
          archived: Number(body?.archived ?? 0),
          is_tax_withheld: Number(body?.is_tax_withheld ?? 1),
          tax_reserve_bps: Number(body?.tax_reserve_bps ?? 0),
        };
        store.sources.push(source);
        return { id: newId } as T;
      }
      if (method === 'PUT' && id) {
        const idx = store.sources.findIndex((s) => s.id === id);
        if (idx === -1) throw new Error('Source not found');
        store.sources[idx] = {
          ...store.sources[idx],
          name: String(body?.name ?? store.sources[idx].name),
          kind: (body?.kind as SourceKind) ?? store.sources[idx].kind,
          color: String(body?.color ?? store.sources[idx].color),
          archived: Number(body?.archived ?? store.sources[idx].archived),
          is_tax_withheld: Number(body?.is_tax_withheld ?? store.sources[idx].is_tax_withheld ?? 1),
          tax_reserve_bps: Number(body?.tax_reserve_bps ?? store.sources[idx].tax_reserve_bps ?? 0),
        };
        return { id } as T;
      }
      if (method === 'DELETE' && id) {
        store.sources = store.sources.filter((s) => s.id !== id);
        store.paycheques = store.paycheques.filter((p) => p.source_id !== id);
        return { ok: true } as T;
      }
    }

    if (resource === 'paycheques') {
      if (method === 'POST') {
        const newId = nextId(store.paycheques);
        const paycheque: Paycheque = {
          id: newId,
          source_id: Number(body?.source_id),
          paid_on: String(body?.paid_on ?? ''),
          amount_cents: toCents(body?.amount),
          gross_cents: toOptionalCents(body?.gross),
          tax_cents: toOptionalCents(body?.tax),
          deductions_cents: toOptionalCents(body?.deductions),
          hours: body?.hours === null || body?.hours === undefined || body?.hours === '' ? null : Number(body.hours),
          note: String(body?.note ?? ''),
        };
        store.paycheques.push(paycheque);
        return { id: newId } as T;
      }
      if (method === 'PUT' && id) {
        const idx = store.paycheques.findIndex((p) => p.id === id);
        if (idx === -1) throw new Error('Paycheque not found');
        store.paycheques[idx] = {
          ...store.paycheques[idx],
          source_id: Number(body?.source_id ?? store.paycheques[idx].source_id),
          paid_on: String(body?.paid_on ?? store.paycheques[idx].paid_on),
          amount_cents: body?.amount !== undefined ? toCents(body.amount) : store.paycheques[idx].amount_cents,
          gross_cents: body?.gross !== undefined ? toOptionalCents(body.gross) : store.paycheques[idx].gross_cents,
          tax_cents: body?.tax !== undefined ? toOptionalCents(body.tax) : store.paycheques[idx].tax_cents,
          deductions_cents:
            body?.deductions !== undefined ? toOptionalCents(body.deductions) : store.paycheques[idx].deductions_cents,
          hours: body?.hours === undefined ? store.paycheques[idx].hours : body.hours === null ? null : Number(body.hours),
          note: body?.note !== undefined ? String(body.note) : store.paycheques[idx].note,
        };
        return { id } as T;
      }
      if (method === 'DELETE' && id) {
        store.paycheques = store.paycheques.filter((p) => p.id !== id);
        return { ok: true } as T;
      }
    }

    if (resource === 'allocations') {
      if (parts[1] === 'presets' && method === 'POST') {
        const presetKey = String(body?.preset ?? '');
        const template = PRESETS[presetKey];
        if (!template) throw new Error('Unknown preset');
        store.allocations = template.map((rule, index) => ({
          ...rule,
          id: index + 1,
        }));
        return { count: store.allocations.length } as T;
      }
      if (method === 'POST') {
        const newId = nextId(store.allocations);
        const rule: AllocationRule = {
          id: newId,
          name: String(body?.name ?? 'Bucket'),
          category: (body?.category as AllocationCategory) ?? 'essentials',
          weight_bps: Number(body?.weight_bps ?? 0),
          color: String(body?.color ?? '#0066ff'),
          sort_order: Number(body?.sort_order ?? store.allocations.length + 1),
          active: Number(body?.active ?? 1),
        };
        store.allocations.push(rule);
        return { id: newId } as T;
      }
      if (method === 'PUT' && id) {
        const idx = store.allocations.findIndex((a) => a.id === id);
        if (idx === -1) throw new Error('Allocation rule not found');
        store.allocations[idx] = {
          ...store.allocations[idx],
          name: String(body?.name ?? store.allocations[idx].name),
          category: (body?.category as AllocationCategory) ?? store.allocations[idx].category,
          weight_bps: Number(body?.weight_bps ?? store.allocations[idx].weight_bps),
          color: String(body?.color ?? store.allocations[idx].color),
          sort_order: Number(body?.sort_order ?? store.allocations[idx].sort_order),
          active: Number(body?.active ?? store.allocations[idx].active),
        };
        return { id } as T;
      }
      if (method === 'DELETE' && id) {
        store.allocations = store.allocations.filter((a) => a.id !== id);
        return { ok: true } as T;
      }
    }

    throw new Error(`Unsupported mock operation: ${method} ${path}`);
  },
};

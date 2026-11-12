import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

type RouteContext = {
  params: Promise<{ path: string[] }>;
};

function csvEscape(value: string | number | null | undefined): string {
  const str = value === null || value === undefined ? '' : String(value);
  return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
}

async function handleApi(_req: Request, { params }: RouteContext): Promise<Response> {
  const { path } = await params;
  const endpoint = path.join('/');

  if (endpoint === 'state') {
    const state = await db.getState();
    return Response.json(state);
  }

  if (endpoint === 'export.csv') {
    const state = await db.getState();
    const sourceById = new Map(state.sources.map((s) => [s.id, s]));
    const header = ['paid_on', 'source', 'kind', 'net_amount', 'gross_amount', 'tax', 'deductions', 'hours', 'note'];
    const rows = [...state.paycheques]
      .sort((a, b) => b.paid_on.localeCompare(a.paid_on))
      .map((p) => {
        const src = sourceById.get(p.source_id);
        return [
          p.paid_on,
          src?.name ?? 'Unknown',
          src?.kind ?? 'other',
          (p.amount_cents / 100).toFixed(2),
          p.gross_cents != null ? (p.gross_cents / 100).toFixed(2) : '',
          p.tax_cents != null ? (p.tax_cents / 100).toFixed(2) : '',
          p.deductions_cents != null ? (p.deductions_cents / 100).toFixed(2) : '',
          p.hours ?? '',
          p.note ?? '',
        ]
          .map(csvEscape)
          .join(',');
      });

    const csv = [header.join(','), ...rows].join('\n');
    return new Response(csv, {
      status: 200,
      headers: {
        'content-type': 'text/csv; charset=utf-8',
        'content-disposition': 'attachment; filename="payday-export.csv"',
      },
    });
  }

  return Response.json({ error: 'Not found' }, { status: 404 });
}

export { handleApi as GET, handleApi as POST, handleApi as PUT, handleApi as DELETE };

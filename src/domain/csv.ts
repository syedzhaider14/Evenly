import { categoryOf } from './categories';
import { toDecimalString } from './money';
import type { Expense, Group, Member, Settlement } from './types';

export type CsvCell = string | number | null | undefined;

const NEEDS_QUOTING = /[",\r\n]/;
/** Cells starting with these characters are treated as formulas by spreadsheet apps. */
const FORMULA_TRIGGER = /^[=+\-@\t\r]/;

export function escapeCsvCell(cell: CsvCell): string {
  if (cell === null || cell === undefined) return '';
  if (typeof cell === 'number') return Number.isFinite(cell) ? String(cell) : '';

  let value = cell;
  if (FORMULA_TRIGGER.test(value)) {
    value = `'${value}`;
  }
  if (NEEDS_QUOTING.test(value)) {
    value = `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

/** Serialises rows as RFC 4180 CSV with CRLF line endings. */
export function toCsv(rows: readonly (readonly CsvCell[])[]): string {
  return rows.map((row) => row.map(escapeCsvCell).join(',')).join('\r\n');
}

function isoDate(timestamp: number): string {
  return new Date(timestamp).toISOString().slice(0, 10);
}

/**
 * Exports a group's ledger with one column per member showing their share of each expense,
 * which is the shape people expect when they open it in a spreadsheet.
 */
export function groupLedgerToCsv(
  group: Group,
  members: readonly Member[],
  expenses: readonly Expense[],
  settlements: readonly Settlement[],
): string {
  const memberName = new Map(members.map((member) => [member.id, member.name]));
  const amount = (value: number) => toDecimalString(value, group.currency);

  const header: CsvCell[] = [
    'Date',
    'Type',
    'Description',
    'Category',
    `Amount (${group.currency})`,
    'Paid by',
    ...members.map((member) => member.name),
  ];

  type Row = { at: number; cells: CsvCell[] };
  const rows: Row[] = [];

  for (const expense of expenses) {
    const shareByMember = new Map(expense.shares.map((share) => [share.memberId, share.amount]));
    rows.push({
      at: expense.occurredAt,
      cells: [
        isoDate(expense.occurredAt),
        'Expense',
        expense.description,
        categoryOf(expense.category).label,
        amount(expense.amount),
        expense.payers
          .map((payer) => `${memberName.get(payer.memberId) ?? 'Unknown'} (${amount(payer.amount)})`)
          .join('; '),
        ...members.map((member) => {
          const share = shareByMember.get(member.id);
          return share === undefined ? '' : amount(share);
        }),
      ],
    });
  }

  for (const settlement of settlements) {
    rows.push({
      at: settlement.occurredAt,
      cells: [
        isoDate(settlement.occurredAt),
        'Payment',
        `${memberName.get(settlement.from) ?? 'Unknown'} paid ${memberName.get(settlement.to) ?? 'Unknown'}`,
        '',
        amount(settlement.amount),
        memberName.get(settlement.from) ?? 'Unknown',
        ...members.map(() => ''),
      ],
    });
  }

  rows.sort((a, b) => a.at - b.at);
  return toCsv([header, ...rows.map((row) => row.cells)]);
}

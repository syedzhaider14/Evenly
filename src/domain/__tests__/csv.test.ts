import { escapeCsvCell, groupLedgerToCsv, toCsv } from '../csv';
import type { Expense, Group, Member, Settlement } from '../types';

describe('escapeCsvCell', () => {
  it('leaves plain values alone', () => {
    expect(escapeCsvCell('Dinner')).toBe('Dinner');
    expect(escapeCsvCell(12.5)).toBe('12.5');
    expect(escapeCsvCell(null)).toBe('');
    expect(escapeCsvCell(undefined)).toBe('');
  });

  it('quotes values with separators, quotes or new lines', () => {
    expect(escapeCsvCell('Fish, chips')).toBe('"Fish, chips"');
    expect(escapeCsvCell('The "good" place')).toBe('"The ""good"" place"');
    expect(escapeCsvCell('two\nlines')).toBe('"two\nlines"');
  });

  it('neutralises spreadsheet formulas', () => {
    expect(escapeCsvCell('=SUM(A1:A2)')).toBe("'=SUM(A1:A2)");
    expect(escapeCsvCell('+1')).toBe("'+1");
    expect(escapeCsvCell('@cmd')).toBe("'@cmd");
  });

  it('does not touch negative numbers', () => {
    expect(escapeCsvCell(-5)).toBe('-5');
  });
});

describe('toCsv', () => {
  it('joins rows with CRLF', () => {
    expect(
      toCsv([
        ['a', 'b'],
        [1, 2],
      ]),
    ).toBe('a,b\r\n1,2');
  });
});

describe('groupLedgerToCsv', () => {
  const group: Group = {
    id: 'g',
    name: 'Trip',
    emoji: '✈️',
    currency: 'EUR',
    simplifyDebts: true,
    archived: false,
    createdAt: 0,
    updatedAt: 0,
  };
  const members: Member[] = [
    { id: 'ana', groupId: 'g', name: 'Ana', color: '#000', isSelf: true, createdAt: 0 },
    { id: 'ben', groupId: 'g', name: 'Ben', color: '#000', isSelf: false, createdAt: 0 },
  ];
  const expenses: Expense[] = [
    {
      id: 'e1',
      groupId: 'g',
      description: 'Hotel, 2 nights',
      amount: 20000,
      category: 'lodging',
      payers: [{ memberId: 'ana', amount: 20000 }],
      shares: [
        { memberId: 'ana', amount: 10000 },
        { memberId: 'ben', amount: 10000 },
      ],
      split: { method: 'equal', participants: ['ana', 'ben'] },
      notes: null,
      occurredAt: Date.UTC(2026, 4, 2),
      createdAt: 0,
      updatedAt: 0,
    },
  ];
  const settlements: Settlement[] = [
    {
      id: 's1',
      groupId: 'g',
      from: 'ben',
      to: 'ana',
      amount: 10000,
      note: null,
      occurredAt: Date.UTC(2026, 4, 3),
      createdAt: 0,
    },
  ];

  it('produces one row per expense and payment in date order', () => {
    const csv = groupLedgerToCsv(group, members, expenses, settlements).split('\r\n');
    expect(csv).toEqual([
      'Date,Type,Description,Category,Amount (EUR),Paid by,Ana,Ben',
      '2026-05-02,Expense,"Hotel, 2 nights",Lodging,200.00,Ana (200.00),100.00,100.00',
      '2026-05-03,Payment,Ben paid Ana,,100.00,Ben,,',
    ]);
  });
});

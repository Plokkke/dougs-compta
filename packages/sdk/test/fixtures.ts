export const user = {
  id: 1,
  email: 'jane@example.com',
  company: { id: 42, brandName: 'Acme Consulting' },
  companies: [{ id: 42, brandName: 'Acme Consulting' }],
  locale: 'fr',
};

export function operation(id: number, overrides: Record<string, unknown> = {}) {
  return {
    id,
    companyId: 42,
    type: 'expense',
    amount: 12.5,
    date: '2026-03-31',
    wording: 'Train ticket',
    hasVat: true,
    vatRate: 0.1,
    vatAmount: 1.14,
    totalAmount: 12.5,
    memo: null,
    validated: false,
    breakdowns: [{ id: 7, amount: 12.5, categoryId: 77 }],
    transactionId: 900 + id,
    ...overrides,
  };
}

export const vendorInvoice = {
  id: '3f0b3e1c-6a3d-4c52-9a55-2d1f7b1e2a10',
  fileName: 'invoice.pdf',
  fileType: 'application/pdf',
  filePath: '/files/3f0b3e1c/actions/download',
  date: '2026-03-01',
  supplierName: 'Rail Co',
  amount: 12.5,
  amountTva: 1.14,
  currency: 'EUR',
  paymentStatus: 'paid',
  companyId: 42,
};

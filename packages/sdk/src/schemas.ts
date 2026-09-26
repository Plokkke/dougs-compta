import { z } from 'zod';

/** Responses keep every field Dougs sends (loose objects): typed where we rely on it, lossless elsewhere. */
const personSchema = z.looseObject({
  id: z.number(),
  firstName: z.string(),
  lastName: z.string(),
  fullName: z.string(),
  initials: z.string(),
});

export const companySchema = z.looseObject({
  id: z.number(),
  brandName: z.string(),
});

export const userSchema = z.looseObject({
  id: z.number(),
  email: z.email(),
  company: companySchema,
  companies: z.array(companySchema),
});

export const carSchema = z.looseObject({
  id: z.number(),
  name: z.string(),
  content: z.looseObject({ licensePlate: z.string() }),
  partner: z.looseObject({ naturalPerson: personSchema }).nullable(),
});

export const categorySchema = z.looseObject({
  id: z.number(),
  wording: z.string(),
  keywords: z.array(z.string()).default([]),
  description: z.string().nullable(),
});

export const partnerSchema = z.looseObject({
  id: z.number(),
  position: z.string(),
  naturalPerson: personSchema,
});

export const operationSchema = z.looseObject({
  id: z.number(),
  companyId: z.number(),
  type: z.string(),
  amount: z.number(),
  date: z.iso.date(),
  wording: z.string(),
  hasVat: z.boolean(),
  vatRate: z.number().nullable(),
  vatAmount: z.number().nullable(),
  totalAmount: z.number(),
  memo: z.string().nullable(),
  validated: z.boolean(),
  breakdowns: z.array(z.looseObject({})),
});

export const vendorInvoiceSchema = z.looseObject({
  id: z.uuid(),
  fileName: z.string(),
  fileType: z.string(),
  filePath: z.string(),
  date: z.string().nullable(),
  supplierName: z.string().nullable(),
  amount: z.number().nullable(),
  amountTva: z.number().nullable(),
  currency: z.string(),
  paymentStatus: z.enum(['not_paid', 'partially_paid', 'paid']),
  companyId: z.number(),
});

export const recordSchema = z.looseObject({});

export type Company = z.infer<typeof companySchema>;
export type User = z.infer<typeof userSchema>;
export type Car = z.infer<typeof carSchema>;
export type Category = z.infer<typeof categorySchema>;
export type Partner = z.infer<typeof partnerSchema>;
export type Operation = z.infer<typeof operationSchema>;
export type VendorInvoice = z.infer<typeof vendorInvoiceSchema>;
export type ApiRecord = z.infer<typeof recordSchema>;

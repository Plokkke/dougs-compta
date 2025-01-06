import { DateTime } from 'luxon';
import { z } from 'zod';

const isoDateTimeSchema = z
  .string()
  .transform((value) => DateTime.fromISO(value))
  .refine((value) => value.isValid, { message: 'Invalid date' });

export type DougsCredentials = {
  username: string;
  password: string;
};

export const operationSchema = z.object({
  id: z.number(),
  companyId: z.number(),
  type: z.string(),
  amount: z.number(),
  date: z.string().date(),
  wording: z.string(),
  name: z.string(),
  hasVat: z.boolean(),
  vatRate: z.union([z.number(), z.null()]),
  vatAmount: z.union([z.number(), z.null()]),
  totalAmount: z.number(),
  memo: z.union([z.string(), z.null()]),
  validated: z.boolean(),
  breakdowns: z.array(z.unknown()),
});

export type Operation = z.infer<typeof operationSchema>;

export const mileageInfosSchema = z.object({
  date: isoDateTimeSchema,
  memo: z.string().optional(),
  distance: z.number().int(),
  carId: z.number().int().optional(),
});

export type MileageInfos = z.infer<typeof mileageInfosSchema>;

export const expenseInfosSchema = z.object({
  date: isoDateTimeSchema,
  memo: z.string().optional(),
  amount: z.number().int(),
  categoryId: z.number().int(),
  partnerId: z.number().int(),
  vatExemption: z.union([z.boolean(), z.enum(['exemption:outbound:outsideEuropeanUnion'])]).default(false),
});

export type ExpenseInfos = z.infer<typeof expenseInfosSchema>;

export const companySchema = z.object({
  id: z.number(),
  brandName: z.string(),
});

export type Company = z.infer<typeof companySchema>;

export const userSchema = z.object({
  id: z.number(),
  email: z.string().email(),
  company: companySchema,
  companies: z.array(companySchema),
});

export type User = z.infer<typeof userSchema>;

export const carSchema = z.object({
  id: z.number(),
  name: z.string(),
  content: z.object({
    licensePlate: z.string(),
  }),
  partner: z.object({
    naturalPerson: z.object({
      id: z.number(),
      firstName: z.string(),
      lastName: z.string(),
      fullName: z.string(),
      initials: z.string(),
    }),
  }),
});

export type Car = z.infer<typeof carSchema>;

export const categorySchema = z.object({
  id: z.number(),
  wording: z.string(),
  keywords: z.array(z.string()),
  description: z.string(),
});

export type Category = z.infer<typeof categorySchema>;

export const partnerSchema = z.object({
  id: z.number(),
  position: z.string(),
  naturalPerson: z.object({
    id: z.number(),
    firstName: z.string(),
    lastName: z.string(),
    fullName: z.string(),
    initials: z.string(),
  }),
});

export type Partner = z.infer<typeof partnerSchema>;

export const uploadVendorInvoiceResponseSchema = z.object({
  id: z.string().uuid(),
  createdAt: isoDateTimeSchema,
  updatedAt: isoDateTimeSchema,
  fileName: z.string(),
  ownerId: z.string(),
  memo: z.string().nullable(),
  paymentStatus: z.enum(['not_paid', 'paid']),
  prefillStatus: z.enum(['initialised', 'prefilled']),
  amount: z.number().nullable(),
  isLocked: z.boolean(),
  fileId: z.number(),
  filePath: z.string(),
  fileType: z.string(),
  label: z.string(),
  supplierName: z.string().nullable(),
  supplierCountry: z.string().nullable(),
  clientName: z.string(),
  clientCountry: z.string().nullable(),
  amountTva: z.number().nullable(),
  currency: z.string(),
  isRefund: z.boolean().nullable(),
  type: z.string().nullable(),
  reference: z.string().nullable(),
  transactionType: z.string().nullable(),
  date: isoDateTimeSchema.nullable(),
  companyId: z.number(),
  sourceDocumentId: z.number(),
  operationAttachments: z.array(z.unknown()),
  accrualOperationAttachment: z.unknown().nullable(),
  operationCandidate: z.unknown().nullable(),
  receiptId: z.number(),
  operations: z.array(z.unknown()),
  matchedOperation: z.unknown().nullable(),
});

export type UploadVendorInvoiceResponse = z.infer<typeof uploadVendorInvoiceResponseSchema>;

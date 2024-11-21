import { DateTime } from 'luxon';
import { z } from 'zod';

export type DougsCredentials = {
  username: string;
  password: string;
};

export const operationSchema = z.object({
  date: z
    .string()
    .date()
    .transform((value) => DateTime.fromISO(value)),
  memo: z.string().optional(),
});

export type Operation = z.infer<typeof operationSchema>;

export const mileageInfosSchema = operationSchema.extend({
  distance: z.number().int(),
  carId: z.number().int().optional(),
});

export type MileageInfos = z.infer<typeof mileageInfosSchema>;

export const expenseInfosSchema = operationSchema.extend({
  amount: z.number().int(),
  categoryId: z.number().int(),
  partnerId: z.number().int(),
  hasVat: z.boolean().optional().default(true),
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

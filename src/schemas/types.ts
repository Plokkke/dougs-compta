import { DateTime } from 'luxon';
import { z } from 'zod';

export type DougsCredentials = {
  username: string;
  password: string;
};

export type MileageInfos = {
  date: DateTime<true>;
  distance: number;
  reason: string;
  carId?: number;
};

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

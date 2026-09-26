import type { z } from 'zod';

import { DougsSchemaError } from './errors';
import { DEFAULT_RETRY_POLICY, HttpClient, type FetchLike, type Query, type RetryPolicy } from './http';
import {
  expensePayload,
  mergeDeep,
  mileagePayload,
  uploadMimeType,
  type ExpenseInput,
  type MileageInput,
} from './payloads';
import * as schemas from './schemas';
import { SessionAuthenticator, sessionFromSetCookie, type DougsAuth, type Session } from './session';

export const DOUGS_BASE_URL = 'https://app.dougs.fr';

/** Read-only company collections confirmed against the live API. */
export const COMPANY_COLLECTIONS = [
  'partners',
  'cars',
  'accounts',
  'attachments',
  'declarations',
  'vendor-invoices',
  'sales-invoices',
  'customers',
  'suppliers',
] as const;

export type CompanyCollection = (typeof COMPANY_COLLECTIONS)[number];

export type CategoryType = 'expense' | 'revenue';

export type OperationsQuery = { type?: string; validated?: boolean; date?: string };

/** The operations endpoint caps pages at 500 items. */
export const OPERATIONS_PAGE_SIZE = 500;

export type DougsClientOptions = {
  auth: DougsAuth;
  baseUrl?: string;
  fetch?: FetchLike;
  retry?: RetryPolicy;
  sleep?: (ms: number) => Promise<void>;
  now?: () => number;
};

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

export class DougsClient {
  private readonly http: HttpClient;
  private readonly session: SessionAuthenticator;

  constructor(options: DougsClientOptions) {
    const now = options.now ?? Date.now;
    const base = {
      baseUrl: options.baseUrl ?? DOUGS_BASE_URL,
      fetch: options.fetch ?? fetch,
      retry: options.retry ?? DEFAULT_RETRY_POLICY,
      sleep: options.sleep ?? wait,
    };
    const anonymous = new HttpClient(base);
    this.session = new SessionAuthenticator(
      options.auth,
      (email, password) => login(anonymous, now, email, password),
      now,
    );
    this.http = new HttpClient({ ...base, auth: this.session });
  }

  sessionToken(): Promise<string> {
    return this.session.token();
  }

  getMe(): Promise<schemas.User> {
    return this.get('/users/me', schemas.userSchema);
  }

  getCompany(companyId: number): Promise<schemas.ApiRecord> {
    return this.get(`/companies/${companyId}`, schemas.recordSchema);
  }

  listCars(companyId: number): Promise<schemas.Car[]> {
    return this.get(`/companies/${companyId}/cars`, schemas.carSchema.array());
  }

  listPartners(companyId: number): Promise<schemas.Partner[]> {
    return this.get(`/companies/${companyId}/partners`, schemas.partnerSchema.array());
  }

  listCategories(companyId: number, type: CategoryType, search?: string): Promise<schemas.Category[]> {
    const query = { type, full: true, search: search || undefined };
    return this.get(`/companies/${companyId}/categories`, schemas.categorySchema.array(), query);
  }

  listCollection(companyId: number, collection: CompanyCollection): Promise<schemas.ApiRecord[]> {
    return this.get(`/companies/${companyId}/${collection}`, schemas.recordSchema.array());
  }

  listVendorInvoices(companyId: number): Promise<schemas.VendorInvoice[]> {
    return this.get(`/companies/${companyId}/vendor-invoices`, schemas.vendorInvoiceSchema.array());
  }

  async *iterateOperations(companyId: number, filter: OperationsQuery = {}): AsyncGenerator<schemas.Operation> {
    for (let offset = 0; ; offset += OPERATIONS_PAGE_SIZE) {
      const query = { ...filter, limit: OPERATIONS_PAGE_SIZE, offset };
      const page = await this.get(`/companies/${companyId}/operations`, schemas.operationSchema.array(), query);
      yield* page;
      if (page.length < OPERATIONS_PAGE_SIZE) {
        return;
      }
    }
  }

  async listOperations(companyId: number, filter?: OperationsQuery): Promise<schemas.Operation[]> {
    const operations: schemas.Operation[] = [];
    for await (const operation of this.iterateOperations(companyId, filter)) {
      operations.push(operation);
    }
    return operations;
  }

  getOperation(companyId: number, operationId: number): Promise<schemas.Operation> {
    return this.get(`/companies/${companyId}/operations/${operationId}`, schemas.operationSchema);
  }

  registerExpense(companyId: number, expense: ExpenseInput): Promise<schemas.Operation> {
    return this.createOperation(companyId, expensePayload(expense));
  }

  registerMileageAllowance(companyId: number, mileage: MileageInput): Promise<schemas.Operation> {
    return this.createOperation(companyId, mileagePayload(mileage));
  }

  /** Dougs has no PATCH: the full operation is read, merged with `changes` and posted back. */
  async updateOperation(companyId: number, operationId: number, changes: Record<string, unknown>) {
    const path = `/companies/${companyId}/operations/${operationId}`;
    const current = await this.get(path, schemas.recordSchema);
    return this.send('POST', path, schemas.operationSchema, { json: mergeDeep(current, changes), idempotent: true });
  }

  validateOperation(companyId: number, operationId: number): Promise<schemas.Operation> {
    return this.updateOperation(companyId, operationId, { validated: true });
  }

  invalidateOperation(companyId: number, operationId: number): Promise<schemas.Operation> {
    return this.updateOperation(companyId, operationId, { validated: false });
  }

  async deleteOperation(companyId: number, operationId: number): Promise<void> {
    await this.http.request('DELETE', `/companies/${companyId}/operations/${operationId}`);
  }

  async uploadVendorInvoice(companyId: number, fileName: string, content: Uint8Array): Promise<schemas.VendorInvoice> {
    const form = new FormData();
    form.append('file', new Blob([new Uint8Array(content)], { type: uploadMimeType(fileName) }), fileName);
    const query = { filename: fileName, type: 'attachment' };
    return this.send('POST', `/companies/${companyId}/vendor-invoices`, schemas.vendorInvoiceSchema, { form, query });
  }

  /** Downloads a stored document, given the `filePath` found on invoices and attachments. */
  async downloadFile(filePath: string): Promise<Uint8Array> {
    const response = await this.http.request('GET', filePath);
    return new Uint8Array(await response.arrayBuffer());
  }

  private createOperation(companyId: number, payload: unknown): Promise<schemas.Operation> {
    return this.send('POST', `/companies/${companyId}/operations`, schemas.operationSchema, { json: payload });
  }

  private get<S extends z.ZodType>(path: string, schema: S, query?: Query): Promise<z.infer<S>> {
    return this.send('GET', path, schema, { query });
  }

  private async send<S extends z.ZodType>(
    method: string,
    path: string,
    schema: S,
    opts: Parameters<HttpClient['json']>[2],
  ): Promise<z.infer<S>> {
    const result = schema.safeParse(await this.http.json(method, path, opts));
    if (!result.success) {
      throw new DougsSchemaError(path, result.error.issues);
    }
    return result.data;
  }
}

async function login(http: HttpClient, now: () => number, email: string, password: string): Promise<Session> {
  const response = await http.request('POST', '/auth/api/login', { json: { email, password }, anonymous: true });
  return sessionFromSetCookie(response.headers.getSetCookie(), now());
}

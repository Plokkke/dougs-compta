import axios, { AxiosError, AxiosRequestConfig } from 'axios';
import * as _ from 'lodash';
import { DateTime } from 'luxon';

import {
  Car,
  carSchema,
  Category,
  categorySchema,
  DougsCredentials,
  ExpenseInfos,
  MileageInfos,
  Operation,
  operationSchema,
  Partner,
  partnerSchema,
  User,
  userSchema,
} from '@/schemas/types';
import { parseCookies } from '@/utils';

export { Car, Category, Company, DougsCredentials, ExpenseInfos, MileageInfos, Partner, User } from '@/schemas/types';

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

type RetryConfig = {
  maxRetries: number;
  retryableStatusCodes: number[];
};

function isRetryableError({ config: request, response }: AxiosError, config: RetryConfig): boolean {
  if (!request || !response) {
    return false;
  }

  if (!config.retryableStatusCodes.includes(response.status)) {
    return false;
  }

  const r = <AxiosRequestConfig & { retryCount?: number }>request;
  r.retryCount = r.retryCount || 0;
  if (r.retryCount > config.maxRetries) {
    return false;
  }

  return true;
}

const RETRY_CONFIG = {
  maxRetries: 3,
  retryableStatusCodes: [429, 500, 502, 503, 504],
  delayStepMs: 350,
};

export abstract class DougsApi {
  protected readonly axios;

  protected constructor() {
    this.axios = axios.create({
      baseURL: 'https://app.dougs.fr',
      headers: {
        Accept: 'application/json',
        origin: 'https://app.dougs.fr',
      },
    });

    this.axios.interceptors.response.use(
      (r) => r,
      async (error) => {
        if (!(error instanceof axios.AxiosError)) {
          throw error;
        }

        if (isRetryableError(error, RETRY_CONFIG)) {
          const config = error.config as AxiosRequestConfig & { retryCount: number };
          config.retryCount += 1;
          await delay(config.retryCount * RETRY_CONFIG.delayStepMs);
          return axios(config);
        }

        throw error;
      },
    );
  }

  async getMe(): Promise<User> {
    const response = await this.axios.get('/users/me');
    return userSchema.parse(response.data);
  }

  async getCars(companyId: number): Promise<Car[]> {
    const response = await this.axios.get(`/companies/${companyId}/cars`);
    return carSchema.array().parse(response.data);
  }

  // TODO type is enum
  async getCategories(companyId: number, type: string, search?: string): Promise<Category[]> {
    const response = await this.axios.get(`/companies/${companyId}/categories`, {
      params: {
        full: true,
        type,
        ...(search && { search }),
      },
    });
    return categorySchema.array().parse(response.data);
  }

  async getPartners(companyId: number): Promise<Partner[]> {
    const response = await this.axios.get(`/companies/${companyId}/partners`);
    return partnerSchema.array().parse(response.data);
  }

  async registerMileageAllowance(companyId: number, mileage: MileageInfos): Promise<Operation> {
    const response = await this.axios.post(`/companies/${companyId}/operations`, {
      type: 'kilometricIndemnity',
      date: mileage.date.toISO(),
      memo: mileage.memo,
      breakdowns: [
        {
          amount: 0,
          categoryId: -1,
          associationData: {
            kilometers: mileage.distance,
            ...(mileage.carId && { carId: mileage.carId }),
          },
        },
      ],
    });
    return operationSchema.parse(response.data);
  }

  async registerExpense(companyId: number, expense: ExpenseInfos): Promise<Operation> {
    const amount = expense.amount / 100;
    const response = await this.axios.post(`/companies/${companyId}/operations`, {
      type: 'expense',
      date: expense.date.toISO(),
      memo: expense.memo,
      amount,
      attachments: [],
      breakdowns: [
        { amount, categoryId: expense.categoryId },
        { amount: 0, categoryId: -1, isCounterpart: true, associationData: { partnerId: expense.partnerId } },
      ],
    });
    return operationSchema.parse(response.data);
  }

  async listOperations(companyId: number, filter?: Partial<Operation>): Promise<Operation[]> {
    const response = await this.axios.get<unknown[]>(`/companies/${companyId}/operations`, {
      params: filter,
    });
    return operationSchema.array().parse(response.data);
  }

  async updateOperation(companyId: number, operationId: number, infos: Record<string, unknown>): Promise<Operation> {
    const { data } = await this.axios.get(`/companies/${companyId}/operations/${operationId}`);
    const { data: operation } = await this.axios.post(
      `/companies/${companyId}/operations/${operationId}`,
      _.merge(data, infos),
    );
    return operationSchema.parse(operation);
  }

  async validateOperation(companyId: number, operationId: number): Promise<Operation> {
    return await this.updateOperation(companyId, operationId, { validated: true });
  }

  async invalidateOperation(companyId: number, operationId: number): Promise<Operation> {
    return await this.updateOperation(companyId, operationId, { validated: false });
  }

  async deleteOperation(companyId: number, operationId: number): Promise<void> {
    await this.axios.delete(`/companies/${companyId}/operations/${operationId}`);
  }
}

export class DougsApiByLogin extends DougsApi {
  private sessionToken: string;
  private sessionExpiresAt: DateTime;

  public static readonly SESSION_EXPIRATION_THRESHOLD = 30;

  constructor(private readonly credentials: DougsCredentials) {
    super();
    this.sessionToken = '';
    this.sessionExpiresAt = DateTime.invalid('Session not authenticated');

    this.axios.interceptors.request.use(async (config) => {
      if (config.url === '/auth/api/login') {
        return config;
      }
      const previousCookie = config.headers.Cookie ?? '';
      const authSession = await this.getSessionToken();
      config.headers.Cookie = `auth_session=${authSession}; ${previousCookie}`;
      return config;
    });
  }

  private async login(): Promise<void> {
    const response = await this.axios.post('/auth/api/login', {
      email: this.credentials.username,
      password: this.credentials.password,
    });

    const { auth_session: authSession, Expires: expireStr } = parseCookies(response.headers['set-cookie'] ?? []);
    this.sessionToken = authSession;
    this.sessionExpiresAt = DateTime.fromRFC2822(expireStr);
  }

  get haveValidSession(): boolean {
    return (
      this.sessionExpiresAt.isValid &&
      this.sessionExpiresAt.diff(DateTime.now(), 'seconds').seconds > DougsApiByLogin.SESSION_EXPIRATION_THRESHOLD
    );
  }

  async getSessionToken(): Promise<string> {
    if (!this.haveValidSession) {
      await this.login();
    }
    return this.sessionToken;
  }
}

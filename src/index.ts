import axios from 'axios';
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
  User,
  userSchema,
} from '@/schemas/types';
import { parseCookies } from '@/utils';

export { DougsCredentials, MileageInfos, Company, User } from '@/schemas/types';

export class DougsApi {
  private readonly axios;
  private sessionToken: string;
  private sessionExpiresAt: DateTime;

  constructor(private readonly credentials: DougsCredentials) {
    this.sessionExpiresAt = DateTime.invalid('Session not authenticated');
    this.sessionToken = '';
    this.axios = axios.create({
      baseURL: 'https://app.dougs.fr',
      headers: {
        Accept: 'application/json',
        origin: 'https://app.dougs.fr',
      },
    });
  }

  get haveValidSession(): boolean {
    return this.sessionExpiresAt.isValid && this.sessionExpiresAt > DateTime.now();
  }

  private async authenticate(): Promise<void> {
    if (this.haveValidSession) {
      return;
    }

    const response = await this.axios.post('/auth/api/login', {
      email: this.credentials.username,
      password: this.credentials.password,
    });

    const cookie = response.headers['set-cookie'];
    if (!cookie) {
      throw new Error('No cookie found in the login response');
    }
    const { auth_session: authSession, Expires: expireStr } = parseCookies(cookie);
    this.sessionToken = authSession;
    this.axios.defaults.headers.Cookie = `auth_session=${authSession}`;
    this.sessionExpiresAt = DateTime.fromRFC2822(expireStr);
  }

  async getSessionToken(): Promise<string> {
    await this.authenticate();
    return this.sessionToken;
  }

  async getMe(): Promise<User> {
    await this.authenticate();
    const response = await this.axios.get('/users/me');
    return userSchema.parse(response.data);
  }

  async getCars(companyId: number): Promise<Car[]> {
    await this.authenticate();
    const response = await this.axios.get(`/companies/${companyId}/cars`);
    return carSchema.array().parse(response.data);
  }

  async registerMileageAllowance(companyId: number, mileage: MileageInfos): Promise<void> {
    await this.authenticate();
    await this.axios.post(`/companies/${companyId}/operations`, {
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
  }

  async registerExpense(companyId: number, expense: ExpenseInfos): Promise<void> {
    await this.authenticate();
    const amount = expense.amount / 100;
    await this.axios.post(`/companies/${companyId}/operations`, {
      type: 'expense',
      date: expense.date.toISO(),
      memo: expense.memo,
      amount: amount,
      attachments: [],
      breakdowns: [
        { amount: amount, categoryId: expense.categoryId },
        { amount: 0, categoryId: -1, isCounterpart: true, associationData: { partnerId: expense.partnerId } },
      ],
    });
  }

  async getCategories(companyId: number, type: string, search?: string): Promise<Category[]> {
    await this.authenticate();
    const response = await this.axios.get(`/companies/${companyId}/categories`, {
      params: {
        full: true,
        type: type,
        ...(search && { search }),
      },
    });
    return categorySchema.array().parse(response.data);
  }

  async updateOperation(companyId: number, operationId: number, infos: Record<string, unknown>): Promise<void> {
    const response = await this.axios.get(`/companies/${companyId}/operations/${operationId}`);

    const payload = _.merge(response.data, infos);
    await this.axios.post(`/companies/${companyId}/operations/${operationId}`, payload);
  }

  async validateOperation(companyId: number, operationId: number): Promise<void> {
    await this.updateOperation(companyId, operationId, { validated: true });
  }

  async deleteOperation(companyId: number, operationId: number): Promise<void> {
    await this.authenticate();
    await this.axios.delete(`/companies/${companyId}/operations/${operationId}`);
  }
}

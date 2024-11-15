import axios from 'axios';
import { DateTime } from 'luxon';

import { DougsCredentials, MileageInfos, User, userSchema } from '@/schemas/types';
import { parseCookies } from '@/utils';

export { DougsCredentials, MileageInfos, Company, User } from '@/schemas/types';

export class DougsApi {
  private readonly axios;
  private sessionExpiresAt: DateTime;

  constructor(private readonly credentials: DougsCredentials) {
    this.sessionExpiresAt = DateTime.invalid('Session not authenticated');
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
    this.axios.defaults.headers.Cookie = `auth_session=${authSession}`;
    this.sessionExpiresAt = DateTime.fromRFC2822(expireStr);
  }

  async getMe(): Promise<User> {
    await this.authenticate();
    const response = await this.axios.get('/users/me');
    return userSchema.parse(response.data);
  }

  async registerMileageAllowance(companyId: number, mileage: MileageInfos): Promise<void> {
    await this.authenticate();
    await this.axios.post(`/companies/${companyId}/operations`, {
      type: 'kilometricIndemnity',
      date: mileage.date.toISO(),
      memo: mileage.reason,
      breakdowns: [
        {
          amount: 0,
          associationData: {
            kilometers: mileage.distance,
            ...(mileage.carId && { carId: mileage.carId }),
          },
          categoryId: -1,
        },
      ],
    });
  }
}

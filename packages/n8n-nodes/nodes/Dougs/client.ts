import type { IExecuteFunctions, ILoadOptionsFunctions } from 'n8n-workflow';

import { DougsClient } from '@plokkke/dougs-compta';

import { authFrom } from '../../credentials/DougsLoginApi.credentials';

export const CREDENTIALS_NAME = 'dougsLoginApi';

export async function dougsClient(context: IExecuteFunctions | ILoadOptionsFunctions): Promise<DougsClient> {
  return new DougsClient({ auth: authFrom(await context.getCredentials(CREDENTIALS_NAME)) });
}

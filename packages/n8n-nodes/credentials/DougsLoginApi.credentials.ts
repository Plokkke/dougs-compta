import type {
  ICredentialDataDecryptedObject,
  ICredentialTestRequest,
  ICredentialType,
  IHttpRequestOptions,
  INodeProperties,
} from 'n8n-workflow';

import { DOUGS_BASE_URL, DougsClient } from '@plokkke/dougs-compta';

export class DougsLoginApi implements ICredentialType {
  name = 'dougsLoginApi';

  displayName = 'Dougs Login API';

  icon = { light: 'file:../icons/dougs.png', dark: 'file:../icons/dougs.png' } as const;

  documentationUrl = 'https://github.com/Plokkke/dougs-compta/tree/main/packages/n8n-nodes#credentials';

  properties: INodeProperties[] = [
    { displayName: 'Email', name: 'username', type: 'string', placeholder: 'name@email.com', default: '' },
    { displayName: 'Password', name: 'password', type: 'string', typeOptions: { password: true }, default: '' },
    {
      displayName: 'Session Token',
      name: 'sessionToken',
      type: 'string',
      typeOptions: { password: true },
      default: '',
      description:
        'Value of the auth_session cookie after logging in to app.dougs.fr. Required when Dougs asks for a code sent by email, which n8n cannot type.',
    },
  ];

  async authenticate(
    credentials: ICredentialDataDecryptedObject,
    requestOptions: IHttpRequestOptions,
  ): Promise<IHttpRequestOptions> {
    const token = await new DougsClient({ auth: authFrom(credentials) }).sessionToken();
    return { ...requestOptions, headers: { ...requestOptions.headers, Cookie: `auth_session=${token}` } };
  }

  test: ICredentialTestRequest = {
    request: { baseURL: DOUGS_BASE_URL, url: '/users/me' },
  };
}

export function authFrom(credentials: ICredentialDataDecryptedObject) {
  const sessionToken = String(credentials.sessionToken ?? '') || undefined;
  return { email: String(credentials.username ?? ''), password: String(credentials.password ?? ''), sessionToken };
}

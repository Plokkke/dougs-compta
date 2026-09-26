import type { ILoadOptionsFunctions, INodeListSearchItems, INodeListSearchResult } from 'n8n-workflow';

import type { DougsClient } from '@plokkke/dougs-compta';

import { dougsClient } from './client';

type Search = (client: DougsClient, companyId: number, filter?: string) => Promise<INodeListSearchItems[]>;

function searchWithin(search: Search) {
  return async function (this: ILoadOptionsFunctions, filter?: string): Promise<INodeListSearchResult> {
    const companyId = Number(this.getCurrentNodeParameter('companyId', { extractValue: true }));
    return { results: await search(await dougsClient(this), companyId, filter) };
  };
}

export const listSearch = {
  async getCompanies(this: ILoadOptionsFunctions): Promise<INodeListSearchResult> {
    const me = await (await dougsClient(this)).getMe();
    return { results: me.companies.map((company) => ({ name: company.brandName, value: String(company.id) })) };
  },

  getCars: searchWithin(async (client, companyId) =>
    (await client.listCars(companyId)).map((car) => ({
      name: `${car.name} (${car.content.licensePlate})`,
      value: String(car.id),
    })),
  ),

  getPartners: searchWithin(async (client, companyId) =>
    (await client.listPartners(companyId)).map((p) => ({ name: p.naturalPerson.fullName, value: String(p.id) })),
  ),

  getCategories: searchWithin(async (client, companyId, filter) =>
    (await client.listCategories(companyId, 'expense', filter)).map((category) => ({
      name: category.wording,
      value: String(category.id),
      description: category.description ?? undefined,
    })),
  ),
};

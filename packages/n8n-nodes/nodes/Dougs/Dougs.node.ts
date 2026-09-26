import {
  NodeConnectionTypes,
  NodeOperationError,
  type IExecuteFunctions,
  type INodeExecutionData,
  type INodeType,
  type INodeTypeDescription,
} from 'n8n-workflow';

import type { DougsClient } from '@plokkke/dougs-compta';

import { CREDENTIALS_NAME, dougsClient } from './client';
import { toNodeError } from './errors';
import { listSearch } from './lookups';
import { findOperation, OPERATIONS, toJson, type OperationDefinition } from './operations';
import { buildProperties } from './properties';

export class Dougs implements INodeType {
  description: INodeTypeDescription = {
    displayName: 'Dougs',
    name: 'dougs',
    icon: { light: 'file:../../icons/dougs.png', dark: 'file:../../icons/dougs.png' },
    group: ['transform'],
    version: 1,
    subtitle: '={{ $parameter["operation"] + ": " + $parameter["resource"] }}',
    description: 'Record expenses, mileage allowances and invoices in Dougs',
    defaults: { name: 'Dougs' },
    usableAsTool: true,
    inputs: [NodeConnectionTypes.Main],
    outputs: [NodeConnectionTypes.Main],
    credentials: [{ name: CREDENTIALS_NAME, required: true }],
    properties: buildProperties(OPERATIONS),
  };

  methods = { listSearch };

  async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
    const resource = this.getNodeParameter('resource', 0) as string;
    const operation = this.getNodeParameter('operation', 0) as string;
    const definition = findOperation(resource, operation);
    if (!definition) {
      throw new NodeOperationError(this.getNode(), `Unsupported operation "${operation}" on "${resource}"`);
    }
    const client = await dougsClient(this);
    const output: INodeExecutionData[] = [];
    for (let item = 0; item < this.getInputData().length; item++) {
      output.push(await runItem(this, client, definition, item));
    }
    return [output];
  }
}

async function runItem(context: IExecuteFunctions, client: DougsClient, definition: OperationDefinition, item: number) {
  try {
    return { json: toJson(await definition.run(client, context, item)), pairedItem: { item } };
  } catch (error) {
    if (!context.continueOnFail()) {
      throw toNodeError(context.getNode(), error, item);
    }
    return { json: { error: (error as Error).message }, pairedItem: { item } };
  }
}

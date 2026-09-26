import {
  NodeConnectionTypes,
  NodeOperationError,
  type IExecuteFunctions,
  type INodeExecutionData,
  type INodeType,
  type INodeTypeDescription,
} from 'n8n-workflow';

import { CREDENTIALS_NAME, dougsClient } from './client';
import { listSearch } from './lookups';
import { findOperation, OPERATIONS, toJson } from './operations';
import { buildProperties } from './properties';

export class Dougs implements INodeType {
  description: INodeTypeDescription = {
    displayName: 'Dougs',
    name: 'dougs',
    // eslint-disable-next-line n8n-nodes-base/node-class-description-icon-not-svg
    icon: 'file:logo.png',
    group: ['transform'],
    version: 1,
    subtitle: '={{ $parameter["operation"] + ": " + $parameter["resource"] }}',
    description: 'Record expenses, mileage allowances and invoices in Dougs',
    defaults: { name: 'Dougs' },
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
      try {
        output.push({ json: toJson(await definition.run(client, this, item)), pairedItem: { item } });
      } catch (error) {
        if (!this.continueOnFail()) {
          throw new NodeOperationError(this.getNode(), error as Error, { itemIndex: item });
        }
        output.push({ json: { error: (error as Error).message }, pairedItem: { item } });
      }
    }
    return [output];
  }
}

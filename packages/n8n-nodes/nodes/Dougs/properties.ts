import type { INodeProperties } from 'n8n-workflow';

import { fields, type FieldName } from './fields';
import { RESOURCES, type OperationDefinition } from './operations';

const resourceProperty: INodeProperties = {
  displayName: 'Resource',
  name: 'resource',
  type: 'options',
  noDataExpression: true,
  options: [...RESOURCES],
  default: 'expense',
};

function operationProperty(resource: string, operations: OperationDefinition[]): INodeProperties {
  // eslint-disable-next-line n8n-nodes-base/node-param-default-missing -- computed below, the rule only sees literals
  return {
    displayName: 'Operation',
    name: 'operation',
    type: 'options',
    noDataExpression: true,
    displayOptions: { show: { resource: [resource] } },
    options: operations.map(({ name, value, action }) => ({ name, value, action })),
    default: operations[0]?.value ?? '',
  };
}

/** One copy of a field per resource, shown only for the operations of that resource which use it. */
function fieldProperties(resource: string, operations: OperationDefinition[]): INodeProperties[] {
  const used = [...new Set(operations.flatMap((operation) => operation.fields))];
  return used.map((name: FieldName) => ({
    ...fields[name].property,
    displayOptions: {
      show: {
        resource: [resource],
        operation: operations.filter((operation) => operation.fields.includes(name)).map(({ value }) => value),
      },
    },
  }));
}

export function buildProperties(operations: OperationDefinition[]): INodeProperties[] {
  const perResource = RESOURCES.map(({ value }) => [value, operations.filter((o) => o.resource === value)] as const);
  return [
    resourceProperty,
    ...perResource.map(([resource, ops]) => operationProperty(resource, ops)),
    ...perResource.flatMap(([resource, ops]) => fieldProperties(resource, ops)),
  ];
}

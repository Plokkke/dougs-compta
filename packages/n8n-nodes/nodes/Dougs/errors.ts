import { NodeApiError, NodeOperationError, type INode, type JsonObject } from 'n8n-workflow';

import { DougsApiError, DougsMfaRequiredError } from '@plokkke/dougs-compta';

const RENEW_SESSION =
  'Run the Dougs login workflow (Session → Request Code, then Verify Code) to store a fresh session token in the ' +
  'credentials, or paste the auth_session cookie of a browser session into them.';

/** Maps SDK failures to the n8n error types, so the UI shows the HTTP status and what to do next. */
export function toNodeError(node: INode, error: unknown, itemIndex: number): NodeApiError | NodeOperationError {
  if (error instanceof DougsApiError) {
    const response: JsonObject = { message: error.message, body: error.body, status: error.status };
    return new NodeApiError(node, response, { itemIndex, message: error.message, httpCode: String(error.status) });
  }
  if (error instanceof DougsMfaRequiredError) {
    return new NodeOperationError(node, 'The Dougs session has expired', { itemIndex, description: RENEW_SESSION });
  }
  return new NodeOperationError(node, error instanceof Error ? error : String(error), { itemIndex });
}

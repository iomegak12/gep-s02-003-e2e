/**
 * Normalises a back-end error envelope:
 *   { error: { code, message, correlation_id, details? } }
 * into a flat object the UI can render.
 */
export function normaliseError(err) {
  if (err?.response?.data?.error) {
    const e = err.response.data.error;
    return {
      status: err.response.status,
      code: e.code || 'UNKNOWN_ERROR',
      message: e.message || 'Unexpected error',
      correlationId: e.correlation_id || err.response.headers?.['x-correlation-id'],
      details: e.details
    };
  }
  return {
    status: err?.response?.status,
    code: 'NETWORK_ERROR',
    message: err?.message || 'Network error',
    correlationId: err?.config?.headers?.['X-Correlation-Id']
  };
}

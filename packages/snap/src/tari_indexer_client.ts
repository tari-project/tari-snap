/**
 * Get the URL of the Tari indexer. If the `TARI_INDEXER_URL` environment
 * variable is set, it will be used. Otherwise, the default URL
 *
 * @returns The URL of the Tari indexer.
 */
function getIndexerUrl() {
  return process.env.TARI_INDEXER_URL || 'http://localhost:18300';
}

async function rawIndexerCall(method: string, params: object) {
  let headers: HeadersInit = {
    'content-type': 'application/json',
    accept: 'application/json',
  };

  const body = {
    jsonrpc: '2.0',
    method,
    params,
    id: 1,
  };

  const requestParams: RequestInit = {
    headers,
    method: 'POST',
    body: JSON.stringify(body),
  };

  // TODO: handle/display/log errors
  const response = await fetch(getIndexerUrl(), requestParams);
  const json_response = await response.json();
  return json_response;
}

export async function sendIndexerRequest(method: string, params: object) {
  const { result, error } = await rawIndexerCall(method, params);
  if (error) {
    throw new Error(error.message);
  }
  return result;
}

export async function getSubstate(substate_address: string) {
  const method = 'inspect_substate';
  const params = {
    address: substate_address,
    version: null,
  };
  return await sendIndexerRequest(method, params);
}

export async function substateExists(substate_address: string) {
  try {
    const result = await getSubstate(substate_address);

    if (result && !result.error) {
      return true;
    }

    return false;
  } catch (error) {
    return false;
  }
}

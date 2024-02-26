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
  const { result } = await rawIndexerCall(method, params);
  return result;
}

export async function getSubstate(substate_address: string) {
  const method = 'inspect_substate';
  const params = {
    address: substate_address,
    version: null,
  };
  const result = await rawIndexerCall(method, params);
  return result;
}

export async function substateExists(substate_address: string) {
  const result = await getSubstate(substate_address);

  if (result && !result.error) {
    return true;
  }

  return false;
}

export function decode_resource_address(tagged: Object): string {
  const int_array = extract_tagged_int_array(tagged);
  const hex = int_array_to_hex(int_array);
  return `resource_${hex}`;
}

export function decode_vault_id(tagged: Object): string {
  const int_array = extract_tagged_int_array(tagged);
  const hex = int_array_to_hex(int_array);
  return `vault_${hex}`;
}

export function int_array_to_hex(int_array: number[]) {
  return int_array
    .map((i) => {
      var h = i.toString(16);
      return h.length % 2 ? '0' + h : h;
    })
    .join('');
}

export function extract_tagged_int_array(tagged: Object): number[] {
  // position 0 is the binary tag and position 1 is the actual value
  return tagged['@@TAGGED@@'][1];
}

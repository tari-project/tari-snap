import { Json, JsonRpcRequest } from '@metamask/snaps-types';
import { heading, panel, text } from '@metamask/snaps-ui';
import * as tari_wallet_lib from './tari_wallet_lib';
import { sendIndexerRequest } from './tari_indexer_client';
import { getRistrettoKeyPair } from './keys';
import { SendInstructionRequest, SendTransactionRequest } from './types';

const POLLING_INTERVAL_MILLIS = 500;
const DEFAULT_WAIT_TIMEOUT_MILLIS = 10000;

export async function waitForTransactionResult(transaction_id: string, timeout_millis = DEFAULT_WAIT_TIMEOUT_MILLIS ) {
  let startTime = new Date().getTime();

  while (new Date().getTime() < startTime + timeout_millis) {
    await new Promise(resolve => setTimeout(resolve, POLLING_INTERVAL_MILLIS));
    const response = await await sendIndexerRequest('get_transaction_result', {
      transaction_id,
    });
    if(response.result && response.result.Finalized) {
      return response.result.Finalized;
    }
  }

  throw new Error(`Timeout waiting for transaction "${transaction_id}"`);
}

export async function sendTransactionInternal(
  _wasm: tari_wallet_lib.InitOutput,
  request: SendTransactionRequest,
) {
  const {
    fee_instructions,
    instructions,
    input_refs,
    required_substates,
    is_dry_run,
  } = request;

  const userConfirmation = await snap.request({
    method: 'snap_dialog',
    params: {
      type: 'confirmation',
      content: panel([
        heading('New transaction'),
        text(
          `This website requests a transaction from your account, do you want to proceed?.`,
        ),
        text(`**Fee Instructions:** ${JSON.stringify(fee_instructions)}`),
        text(`**Instructions:** ${JSON.stringify(instructions)}`),
      ]),
    },
  });
  if (!userConfirmation) {
    return null;
  }

  const accountIndex = 0;
  const { secret_key } = await getRistrettoKeyPair(accountIndex);

  // build and sign transaction using the wasm lib
  const transaction = tari_wallet_lib.create_transaction(
    secret_key,
    instructions,
    fee_instructions,
    input_refs,
  );

  // send the transaction to the indexer
  const submit_method = 'submit_transaction';
  const submit_params = {
    transaction,
    is_dry_run,
    required_substates,
  };

  return await sendIndexerRequest(submit_method, submit_params);
}

export async function sendTransaction(
  wasm: tari_wallet_lib.InitOutput,
  request: JsonRpcRequest<Json[] | Record<string, Json>>,
) {
  const params = request.params as SendTransactionRequest;
  return await sendTransactionInternal(wasm, params);
}

export async function getTransactionResult(
  request: JsonRpcRequest<Json[] | Record<string, Json>>,
) {
  const { transaction_id } = request.params as { transaction_id: string };

  return await sendIndexerRequest('get_transaction_result', {
    transaction_id,
  });
}

export async function sendInstructionInternal(
  wasm: tari_wallet_lib.InitOutput,
  request: SendInstructionRequest,
) {
  const {
    instructions,
    input_refs,
    required_substates,
    is_dry_run,
    fee,
    dump_account,
  } = request;

  if (dump_account) {
    // TODO: the instruction type should accept strings as well
    const key = [97, 95, 98, 117, 99, 107, 101, 116];

    instructions.push({
      PutLastInstructionOutputOnWorkspace: {
        key,
      },
    });

    instructions.push({
      CallMethod: {
        component_address: dump_account,
        method: 'deposit',
        args: [{ Workspace: key }],
      },
    });
  }

  // automatically add fee payment instruction at the end
  const encoded_fee = await tari_wallet_lib.encode_amount(fee);
  const fee_instructions = [{
    CallMethod: {
      component_address: dump_account,
      method: 'pay_fee',
      args: [{ Literal: encoded_fee }],
    },
  }];

  const sendTransactionRequest: SendTransactionRequest = {
    instructions,
    fee_instructions,
    input_refs,
    required_substates,
    is_dry_run,
  };

  return await sendTransactionInternal(wasm, sendTransactionRequest);
}

export async function sendInstruction(
  wasm: tari_wallet_lib.InitOutput,
  request: JsonRpcRequest<Json[] | Record<string, Json>>,
) {
  const params = request.params as SendInstructionRequest;
  return await sendInstructionInternal(wasm, params);
}

import { Json, JsonRpcRequest } from '@metamask/snaps-types';
import { heading, panel, text } from '@metamask/snaps-ui';
import * as tari_wallet_lib from './tari_wallet_lib';
import { sendIndexerRequest } from './tari_indexer_client';
import { getRistrettoKeyPair } from './keys';
import { SendInstructionRequest, SendTransactionRequest } from './types';

export async function sendTransactionInternal(
  wasm: tari_wallet_lib.InitOutput,
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
        text('**Fee Instructions:** ' + JSON.stringify(fee_instructions)),
        text('**Instructions:** ' + JSON.stringify(instructions)),
      ]),
    },
  });
  if (!userConfirmation) {
    return;
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
  let submit_params = {
    transaction,
    is_dry_run,
    required_substates,
  };

  const res = await sendIndexerRequest(submit_method, submit_params);

  // TODO: keep polling the indexer until we get a result for the transaction

  return res;
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
  let {
    instructions,
    input_refs,
    required_substates,
    is_dry_run,
    fee,
    dump_account,
  } = request;

  if (dump_account) {
    // TODO: the instruction type should accept strings as well
    let key = [97, 95, 98, 117, 99, 107, 101, 116];

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
  instructions.push({
    CallMethod: {
      component_address: dump_account,
      method: 'pay_fee',
      args: [`Amount(${fee})`],
    },
  });

  const sendTransactionRequest: SendTransactionRequest = {
    instructions,
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

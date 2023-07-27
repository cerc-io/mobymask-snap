import { OnRpcRequestHandler } from '@metamask/snaps-types';

import { SignMessageParams, getState, getWallet } from './util';

const SALT = 'Generate key';

/**
 * Handle incoming JSON-RPC requests, sent through `wallet_invokeSnap`.
 *
 * @param args - The request handler args as object.
 * @param args.request - A validated JSON-RPC request object.
 * @returns The result of `snap_dialog`.
 * @throws If the request method is not valid for this snap.
 */
export const onRpcRequest: OnRpcRequestHandler = async ({
  request,
}): Promise<string | boolean> => {
  switch (request.method) {
    case 'initKey': {
      const persistedData = await getState();

      if (!persistedData?.privateKey) {
        const privateKey = await snap.request({
          method: 'snap_getEntropy',
          params: {
            version: 1,
            salt: SALT,
          },
        });

        await snap.request({
          method: 'snap_manageState',
          params: { operation: 'update', newState: { privateKey } },
        });

        return true;
      }

      return false;
    }

    case 'getAddress': {
      const wallet = await getWallet();
      const address = await wallet.getAddress();

      return address;
    }

    case 'signMessage': {
      const params = request.params as SignMessageParams;
      const wallet = await getWallet();
      const signMessage = await wallet.signMessage(params.message);

      return signMessage;
    }

    default:
      throw new Error('Method not found.');
  }
};

import assert from 'assert';
import { Signature } from 'ethers';

import { utils } from '@cerc-io/nitro-client';
import { OnRpcRequestHandler } from '@metamask/snaps-types';
import { signData } from '@statechannels/nitro-protocol/dist/src/signatures';
import { JSONbigNative } from '@cerc-io/nitro-util';

import { SignMessageParams, getState, getWallet } from './util';

const SALT = 'MobyMask';

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
}): Promise<Signature | boolean | string> => {
  switch (request.method) {
    case 'initKey': {
      const persistedData = await getState();

      if (!persistedData.privateKey) {
        persistedData.privateKey = await snap.request({
          method: 'snap_getEntropy',
          params: {
            version: 1,
            salt: SALT,
          },
        });

        await snap.request({
          method: 'snap_manageState',
          params: { operation: 'update', newState: persistedData },
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
      const persistedData = await getState();
      assert(persistedData.privateKey);
      const signMessage = signData(params.message, persistedData.privateKey);
      return signMessage;
    }

    case 'updateRates': {
      const params = request.params as { endpoint: string; rates: string };
      const rates = JSONbigNative.parse(params.rates) as utils.RateInfo[];
      const persistedData = await getState();

      persistedData.payPermissions = rates.reduce((acc, rate) => {
        const permissionKey = `${params.endpoint}#${rate.type}#${rate.name}`;

        const payPermission = {
          amount: rate.amount.toString(),
          isAllowed: Boolean(acc[permissionKey]?.isAllowed),
        };

        if (
          acc[permissionKey] &&
          acc[permissionKey].amount !== rate.amount.toString()
        ) {
          payPermission.isAllowed = false;
        }

        acc[permissionKey] = payPermission;

        return acc;
      }, persistedData.payPermissions ?? {});

      await snap.request({
        method: 'snap_manageState',
        params: { operation: 'update', newState: persistedData },
      });

      return true;
    }

    case 'requestPermission': {
      const params = request.params as {
        endpoint: string;
        rateType: utils.RateType;
        name: string;
      };
      const permissionKey = `${params.endpoint}#${params.rateType}#${params.name}`;
      const persistedData = await getState();

      if (!persistedData.payPermissions?.[permissionKey]) {
        return false;
      }

      const { isAllowed } = persistedData.payPermissions[permissionKey];

      if (!isAllowed) {
        // TODO: Display dialog and allow
      }

      persistedData.payPermissions[permissionKey].isAllowed = true;

      await snap.request({
        method: 'snap_manageState',
        params: { operation: 'update', newState: persistedData },
      });

      return true;
    }

    default:
      throw new Error('Method not found.');
  }
};

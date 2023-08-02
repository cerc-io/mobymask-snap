import assert from 'assert';
import { Wallet } from 'ethers';

export type SignMessageParams = {
  message: string;
};

export type State = {
  privateKey?: string;
  payPermissions?: {
    [key: string]: {
      amount: string;
      isAllowed: boolean;
    };
  };
};

/**
 * Get the current state of the snap.
 *
 */
export async function getState(): Promise<State> {
  const persistedData = await snap.request({
    method: 'snap_manageState',
    params: { operation: 'get' },
  });

  return (persistedData as State | null) ?? {};
}

/**
 * Get Ethereum wallet.
 *
 */
export async function getWallet(): Promise<Wallet> {
  const persistedData = await getState();
  assert(persistedData);
  assert(persistedData.privateKey, `Private key not found`);
  const wallet = new Wallet(persistedData.privateKey.toString());

  return wallet;
}

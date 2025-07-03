import { AnchorProvider } from '@coral-xyz/anchor';
import { WalletError } from '@solana/wallet-adapter-base';
import {
  AnchorWallet,
  ConnectionProvider,
  useConnection,
  useWallet,
  WalletProvider,
} from '@solana/wallet-adapter-react';
import {
  WalletModalProvider,
  WalletMultiButton,
} from '@solana/wallet-adapter-react-ui';
import { SolflareWalletAdapter } from '@solana/wallet-adapter-wallets';
import { ReactNode, useCallback, useMemo } from 'react';
import {
  toWalletAdapterNetwork,
  useCluster,
} from '../components/ClusterDataAccess';
import { clusterApiUrl, Connection } from '@solana/web3.js';

require('@solana/wallet-adapter-react-ui/styles.css');

export const WalletButton = WalletMultiButton;

export function SolanaProvider({ children }: { children: ReactNode }) {
  const { cluster } = useCluster();
  const endpoint = useMemo(() => cluster.endpoint, [cluster]);
  const wallets = useMemo(
    () => [
    ],
    [cluster]
  );

  const onError = useCallback((error: WalletError) => {
    console.error(error);
  }, []);

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} onError={onError} autoConnect={true}>
        <WalletModalProvider>{children}</WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}

export function useAnchorProvider() {
  const { connection } = useConnection();
  const wallet = useWallet();

  return new AnchorProvider(connection, wallet as AnchorWallet, {
    commitment: 'confirmed',
  });
}
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
import { 
  SolflareWalletAdapter,
  PhantomWalletAdapter,
} from '@solana/wallet-adapter-wallets';
import { ReactNode, useCallback, useMemo } from 'react';
import {
  toWalletAdapterNetwork,
  useCluster,
  ClusterProvider,
} from '../components/ClusterDataAccess';
import { clusterApiUrl, Connection } from '@solana/web3.js';

require('@solana/wallet-adapter-react-ui/styles.css');

export const WalletButton = WalletMultiButton;

function SolanaProviderInner({ children }: { children: ReactNode }) {
  const { cluster } = useCluster();
  const endpoint = useMemo(() => cluster?.endpoint || 'https://rpc.gorbagana.wtf/', [cluster]);
  const wallets = useMemo(
    () => [
      new PhantomWalletAdapter(),
      new SolflareWalletAdapter(),
    ],
    [cluster]
  );

  const onError = useCallback((error: WalletError) => {
    console.error('Wallet error:', error);
  }, []);

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} onError={onError} autoConnect={true}>
        <WalletModalProvider>{children}</WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}

export function SolanaProvider({ children }: { children: ReactNode }) {
  return (
    <ClusterProvider>
      <SolanaProviderInner>
        {children}
      </SolanaProviderInner>
    </ClusterProvider>
  );
}

export function useAnchorProvider() {
  const { connection } = useConnection();
  const wallet = useWallet();

  return new AnchorProvider(connection, wallet as AnchorWallet, {
    commitment: 'confirmed',
    preflightCommitment: 'confirmed',
  });
}
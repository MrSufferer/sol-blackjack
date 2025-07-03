# Gorbagana Blackjack Deployment Guide

## Overview
This guide will help you deploy your Solana blackjack program to Gorbagana blockchain. Since Gorbagana is a fork of Solana with full SPL compatibility, your existing Solana program can be deployed with minimal modifications.

## About Gorbagana
- **High-performance blockchain** forked from Solana's codebase
- **Full SPL compatibility** - your Solana programs work seamlessly
- **Native currency**: $GOR token
- **Current status**: Testnet v2 (Devnet) is live - production-ready development environment
- **Documentation**: docs.gorbagana.wtf
- **GitHub**: github.com/gorbagana-dev

## Prerequisites

1. **Solana CLI Tools**: Ensure you have Solana CLI installed
   ```bash
   sh -c "$(curl -sSfL https://release.anza.xyz/stable/install)"
   ```

2. **Anchor Framework**: Make sure Anchor is installed
   ```bash
   npm install -g @coral-xyz/anchor-cli
   ```

3. **Rust**: Required for building Solana programs
   ```bash
   curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
   ```

## Step 1: Configure Solana CLI for Gorbagana

Since Gorbagana is Solana-compatible, you'll use the same Solana CLI tools but configure them for Gorbagana's network.

```bash
# Configure Solana CLI for Gorbagana Testnet v2 (Devnet)
# Using the official Gorbagana RPC endpoint
solana config set --url https://rpc.gorbagana.wtf/

# Create a new keypair or use existing one
solana-keygen new --outfile ~/.config/solana/id.json

# Get $GOR tokens from the faucet (check Gorbagana docs for faucet URL)
# solana airdrop 2  # This will request GOR tokens instead of SOL
```

## Step 2: Update Your Project Configuration

Your project is already configured for Gorbagana in `Anchor.toml`:

```toml
[provider]
cluster = "gorbagana-testnet"
wallet = "/Users/zeref/.config/solana/id.json"

[programs.gorbagana-testnet]
blackjack = "C48e3rcZc5urrHWk6kmDh4UcFkW3n5yGr8LzoRydeYKW"
```

## Step 3: Build and Deploy Your Program

```bash
# Build your program
anchor build

# Deploy to Gorbagana testnet
anchor deploy --provider.cluster gorbagana-testnet

# The program will be deployed using $GOR tokens for transaction fees
```

## Step 4: Configure Frontend for Gorbagana

Your frontend is already configured to connect to Gorbagana testnet. Update the RPC endpoint in the configuration if needed:

```typescript
// In zkblackjack-ui/src/components/ClusterDataAccess.tsx
{
  name: 'gorbagana-testnet',
  endpoint: 'https://rpc.gorbagana.wtf/',
  network: ClusterNetwork.Testnet,
}
```

## Step 5: Test Your Deployment

```bash
# Run your tests
anchor test --provider.cluster gorbagana-testnet

# Or run specific tests
npm run test
```

## Step 6: Frontend Deployment

```bash
cd zkblackjack-ui

# Install dependencies
npm install

# Build for production
npm run build

# Start the development server to test
npm run dev
```

## Important Differences from Solana

1. **Token**: Uses $GOR instead of SOL for transaction fees
2. **Network Speed**: Expected to have faster block times than Solana
3. **Fees**: Minimal transaction costs paid in $GOR
4. **Community**: Community-driven development approach

## Getting Gorbagana Network Information

Since Gorbagana is actively developing, check these resources for the latest information:

1. **Documentation**: https://docs.gorbagana.wtf
2. **GitHub**: https://github.com/gorbagana-dev
3. **RPC Endpoints**: Check docs for current testnet RPC URLs
4. **Faucet**: Look for testnet faucet information in the docs
5. **Explorer**: Check if there's a blockchain explorer available

## Troubleshooting

### Common Issues:

1. **RPC Endpoint**: Make sure you have the correct Gorbagana testnet RPC endpoint
2. **Token Balance**: Ensure you have enough $GOR tokens for deployment and testing
3. **Network Configuration**: Verify your Solana CLI is configured for the correct Gorbagana network

### Debugging Commands:

```bash
# Check your current configuration
solana config get

# Check your wallet balance (will show GOR balance)
solana balance

# View recent transactions
solana transaction-history

# Check program deployment
solana program show <PROGRAM_ID>
```

## Resources

- **Gorbagana Docs**: https://docs.gorbagana.wtf
- **GitHub**: https://github.com/gorbagana-dev
- **Your Project**: Solana-compatible blackjack game with ZK proofs

## Need Help?

Since Gorbagana is a newer project, consider:
1. Checking their documentation for the latest updates
2. Looking for community channels (Discord, Telegram, etc.)
3. Reviewing their GitHub repositories for examples
4. Following their development updates

Remember that as Gorbagana evolves from Testnet v1 to v2 and eventually mainnet, some configurations may change. Always refer to their latest documentation. 
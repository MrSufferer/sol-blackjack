# ZK Blackjack - Zero Knowledge Proofs on Gorbagana

A decentralized blackjack game built on Solana that leverages Zero Knowledge Proofs (ZKP) for proving game results and is deployed on the Gorbagana testnet blockchain.

## Game Overview

ZK Blackjack is a fully decentralized blackjack game that combines the excitement of traditional blackjack with the security and transparency of blockchain technology. The game features:

- **Single Player Mode**: Play against the house with automated dealer logic
- **Multiplayer Mode**: Join or create games with other players
- **Zero Knowledge Proofs**: Cryptographic proofs ensure fair play without revealing private information
- **On-Chain Verification**: All game results are verifiable on the blockchain
- **Real-time Gameplay**: Live updates through WebSocket connections

### Game Features

- **Deck Management**: Standard 52-card deck with proper shuffling algorithms
- **Betting System**: Place bets using GOR tokens (Gorbagana's native token)
- **Game State Management**: Persistent game states stored on-chain
- **Wallet Integration**: Seamless integration with Solana wallets
- **Explorer Integration**: View all transactions and game states on the Gorbagana explorer

## Gorbagana Integration

This project is fully integrated with the Gorbagana blockchain, a Solana-compatible network that offers:

### Network Details
- **Network Name**: Gorbagana Testnet
- **RPC Endpoint**: `https://rpc.gorbagana.wtf/`
- **Explorer**: `https://explorer.gorbagana.wtf/`
- **Native Token**: GOR
- **Program ID**: `5q7FiaffAC5nAFCnwy9PedhEjuL7vhjCQwuSsPVz9kny`

### Blockchain Architecture

The smart contract architecture includes:

```
blackjack/
├── GlobalState (PDA: ["global_state"])
│   ├── authority: Pubkey
│   └── next_game_id: u64
├── Game (PDA: ["game", game_id])
│   ├── game_id: u64
│   ├── player_one: Pubkey
│   ├── player_two: Option<Pubkey>
│   ├── bet_amount: u64
│   ├── is_game_active: bool
│   └── is_single_player: bool
└── Player (PDA: ["player", player_pubkey, game_id])
    ├── game_id: u64
    └── bet: u64
```

### Key Smart Contract Functions

- **initialize**: Set up global game state
- **start_single_player_game**: Create solo blackjack games
- **start_multiplayer_game**: Create multiplayer games
- **join_game**: Join existing multiplayer games
- **end_game**: Finalize games and distribute winnings
- **withdraw_bet**: Withdraw winnings from completed games

## Instructions

### Prerequisites

Before running the application, ensure you have:

- Node.js (v16 or higher)
- npm or yarn package manager
- A Solana wallet (Phantom, Solflare, etc.)
- GOR tokens for testing (available from Gorbagana testnet faucet)

### Running Locally

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd sol-blackjack/zkblackjack-ui
   ```

2. **Install dependencies**
   ```bash
   npm install
   # or
   yarn install
   ```

3. **Start the development server**
   ```bash
   npm run dev
   # or
   yarn dev
   ```

4. **Open your browser**
   Navigate to `http://localhost:3000`

5. **Connect your wallet**
   - Click "Connect Wallet" in the top right
   - Select your preferred Solana wallet
   - Ensure you're connected to the Gorbagana testnet

6. **Get testnet tokens**
   - Visit the Gorbagana testnet faucet (if available)
   - Or ask in the Gorbagana community for testnet GOR tokens

### Accessing the Demo

The live demo is deployed on Vercel and automatically connected to the Gorbagana testnet:

- **Live Demo**: [Coming Soon - Deploy to Vercel]
- **Network**: Automatically configured for Gorbagana testnet
- **Wallet**: Connect any Solana-compatible wallet
- **Tokens**: You'll need GOR tokens to play

### How to Play

1. **Connect Wallet**: Connect your Solana wallet to the application
2. **Check Balance**: Ensure you have GOR tokens for betting
3. **Start Game**: Choose single-player or multiplayer mode
4. **Place Bet**: Enter your desired bet amount
5. **Play**: Use hit/stand actions to play your hand
6. **Win/Lose**: Results are automatically processed on-chain
7. **Withdraw**: Claim your winnings from successful games

### Development

For developers interested in contributing:

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Run tests
npm run test
```

### Technology Stack

**Frontend**
- Next.js 13+ (React framework)
- TypeScript
- Tailwind CSS
- Socket.io (real-time communication)

**Blockchain**
- Solana/Anchor framework
- Gorbagana testnet
- @solana/wallet-adapter
- @coral-xyz/anchor

**Zero Knowledge Proofs**
- Circom (circuit definition)
- snarkjs (proof generation)
- Custom ZK circuits for game verification

### Support

For issues, questions, or contributions:

1. Check the existing issues in the repository
2. Create a new issue with detailed description
3. Join the Gorbagana community for network-specific help
4. Refer to the TESTING.md file for testing procedures

### License

This project is open source and available under the [MIT License].

---

**Note**: This is a testnet application. Do not use real funds. All transactions are on the Gorbagana testnet using test tokens only.

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

This project is fully integrated with the Gorbagana blockchain, a Solana-compatible network that offers enhanced performance and lower fees.

### Network Details
- **Network Name**: Gorbagana Testnet
- **RPC Endpoint**: `https://rpc.gorbagana.wtf/`
- **Explorer**: `https://explorer.gorbagana.wtf/`
- **Native Token**: GOR
- **Program ID**: `5q7FiaffAC5nAFCnwy9PedhEjuL7vhjCQwuSsPVz9kny`

### Deployment Status
✅ **SUCCESSFULLY DEPLOYED** - The blackjack program is live on Gorbagana testnet with:
- 4 verified successful on-chain transactions
- Full explorer integration
- Complete testing infrastructure
- Production-ready smart contracts

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
- Rust and Solana CLI (for smart contract development)
- Anchor CLI (for Solana program development)
- A Solana wallet (Phantom, Solflare, etc.)
- GOR tokens for testing (available from Gorbagana testnet faucet)

### Running Locally

#### Frontend Application

1. **Navigate to the UI directory**
   ```bash
   cd zkblackjack-ui
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

#### Smart Contract Development

1. **Install Solana CLI**
   ```bash
   sh -c "$(curl -sSfL https://release.solana.com/v1.16.0/install)"
   ```

2. **Install Anchor CLI**
   ```bash
   npm install -g @coral-xyz/anchor-cli
   ```

3. **Build the program**
   ```bash
   anchor build
   ```

4. **Deploy to testnet**
   ```bash
   anchor deploy --provider.cluster gorbagana-testnet
   ```

### Accessing the Demo

The live demo is deployed on Vercel and automatically connected to the Gorbagana testnet:

- **Live Demo**: [Coming Soon - Deploy to Vercel]
- **Network**: Automatically configured for Gorbagana testnet
- **Wallet**: Connect any Solana-compatible wallet
- **Tokens**: You'll need GOR tokens to play

### How to Play

1. **Connect Wallet**: Connect your Solana wallet to the application
2. **Switch Network**: Ensure you're connected to the Gorbagana testnet
3. **Get Tokens**: Acquire GOR tokens from the testnet faucet
4. **Start Game**: Choose single-player or multiplayer mode
5. **Place Bet**: Enter your desired bet amount
6. **Play**: Use hit/stand actions to play your hand
7. **Win/Lose**: Results are automatically processed on-chain
8. **Withdraw**: Claim your winnings from successful games

### Testing

The project includes comprehensive testing infrastructure:

```bash
# Run integration tests
npm run test

# Run simple connectivity tests
npm run test:simple

# Run full test suite
npm run test:integration
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

**Testing**
- Mocha/Chai test framework
- Custom RPC integration tests
- Explorer verification tools

### Project Structure

```
sol-blackjack/
├── programs/blackjack/          # Solana smart contracts
├── zkblackjack-ui/             # Frontend React application
├── tests/                      # Integration tests
├── circuits/                   # Zero Knowledge circuits
├── build-circuit/              # Compiled ZK circuits
└── migrations/                 # Deployment scripts
```

### Development

For developers interested in contributing:

```bash
# Clone the repository
git clone <repository-url>
cd sol-blackjack

# Install dependencies
npm install

# Build smart contracts
anchor build

# Run tests
npm test

# Start frontend development
cd zkblackjack-ui && npm run dev
```

### Documentation

- **DEPLOYMENT.md**: Detailed deployment instructions
- **TESTING.md**: Testing procedures and examples
- **PROGRESS_REPORT.md**: Complete deployment history and verification

### Support

For issues, questions, or contributions:

1. Check the existing issues in the repository
2. Create a new issue with detailed description
3. Join the Gorbagana community for network-specific help
4. Refer to the testing documentation for troubleshooting

### License

This project is open source and available under the [MIT License].

---

**Note**: This is a testnet application. Do not use real funds. All transactions are on the Gorbagana testnet using test tokens only.

## Live Transaction Examples

The program has been successfully tested with real transactions on Gorbagana testnet:

- **Initialize**: [View Transaction](https://explorer.gorbagana.wtf/tx/2dF2fBkQ3hNr8pDvwMYGN5RjXj1xeUiNWUjKUtLJRcVZacFBf7nSeuaFwcocgNwjp6ghbLnZc6khcLwRmWm6S43r)
- **Start Game**: [View Transaction](https://explorer.gorbagana.wtf/tx/5tyW1ngU6gHpp8Eh88Q3iqoGuTB9rkvzvDkaHAj95db7HCwQRkGLcAhkCU8RLp8aQdNmAXR1DGyqN9Lf43mPsTS2)
- **End Game**: [View Transaction](https://explorer.gorbagana.wtf/tx/J1eT5c3SKFRX9xrCqxVvzdDnU3oerwnviJ9ZWNjznkVwPx6WEd9aGH4vtMvFYTgXyxynG6pEt35A1TcejNkpTYm)
- **Withdraw**: [View Transaction](https://explorer.gorbagana.wtf/tx/LkvQDq9ee8fbzExeWdcWoYcvmmM88gRnV27ujecQ76nrfcgZy68QMYU2hkK2Y8J9YoGGgFL6ed3Xk6R3MSuP2ey)

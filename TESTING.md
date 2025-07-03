# Blackjack Program Testing Guide

This guide explains how to test your deployed Blackjack program on the Gorbagana testnet with complete on-chain verification.

## Overview

The testing suite provides comprehensive tests for the deployed Blackjack program, including:
- Connection testing to Gorbagana testnet
- RPC call demonstrations
- Integration examples for frontend development
- Transaction testing and wallet interactions
- **On-chain verification via Gorbagana Explorer**

## Deployed Program Details

- **Program ID**: `5q7FiaffAC5nAFCnwy9PedhEjuL7vhjCQwuSsPVz9kny`
- **Network**: Gorbagana Testnet v2
- **RPC Endpoint**: `https://rpc.gorbagana.wtf/`
- **Explorer**: `https://explorer.gorbagana.wtf/`
- **Native Token**: GOR

## On-Chain Verification

Every test transaction provides a link to the [Gorbagana Explorer](https://explorer.gorbagana.wtf/) for verification:

```
✅ Transaction completed successfully
📋 Transaction Hash: 5j7Ko2gBKz3rqR7...
🔗 View on Gorbagana Explorer: https://explorer.gorbagana.wtf/tx/5j7Ko2gBKz3rqR7...
```

### Explorer Features
- **Transaction Details**: View all transaction data, logs, and program interactions
- **Account Information**: Inspect Program Derived Addresses (PDAs) and account states
- **Program Code**: Examine the deployed program bytecode
- **Real-time Updates**: Live blockchain data identical to explorer.solana.com

## Test Files

### 1. `tests/blackjack-integration.js`
Main integration test file containing:
- `BlackjackClient` class for interacting with the program
- Demo functions showing how to use each program method
- Frontend integration examples
- **Explorer URL generation for every transaction**

### 2. `tests/blackjack-simple.ts`
TypeScript test file with comprehensive test cases:
- Program initialization tests
- Single player game tests
- Multiplayer game tests
- Error handling tests
- Account state verification

### 3. `run-tests.js`
Test runner with multiple commands:
- Connection testing
- Wallet funding tests
- Program method testing
- Full demo execution
- **Automatic explorer URL logging**

### 4. `simple-program-test.js`
Basic connectivity test with explorer integration:
- No dependencies required
- Verifies program deployment
- Shows explorer URLs for all accounts

## Running the Tests

### Prerequisites

```bash
# Install dependencies (optional - simple test works without)
npm install @coral-xyz/anchor @solana/web3.js

# Or if using the existing project
npm install
```

### Quick Start

```bash
# Run all tests with explorer URLs
node run-tests.js

# Run specific test types
node run-tests.js connection  # Test connection only
node run-tests.js demo        # Run full demo with explorer links
node run-tests.js help        # Show help

# Run integration demo directly
node tests/blackjack-integration.js

# Run simple test (no dependencies)
node simple-program-test.js
```

### Example Output

```bash
🎮 Starting single player game...
✅ Single player game started (Game ID: 1, Bet: 0.1 GOR)
📋 Transaction Hash: 5j7Ko2gBKz3rqR7qZ8yKmTnGdHsLf4X2vB9cE1wA3sD6...
🔗 View on Gorbagana Explorer: https://explorer.gorbagana.wtf/tx/5j7Ko2gBKz3rqR7...

🎮 Game Account PDA: 8k4pL9mN2oQ1rS3tU5vW7xY9zA1bC2dE3fG4hI5jK6lM...
🔗 View Account: https://explorer.gorbagana.wtf/account/8k4pL9mN2oQ1rS3...
```

## Program Functions Tested

All functions now include on-chain verification links:

### 1. `initialize`
- Initializes the global program state
- Only needs to be called once per program
- Sets up the authority and next game ID counter
- **Verifiable**: Global state account creation on explorer

### 2. `start_single_player_game`
- Creates a new single-player blackjack game
- Accepts a bet amount in lamports
- Creates game and player accounts
- **Verifiable**: Game and player account creation on explorer

### 3. `start_multiplayer_game`
- Creates a new multiplayer blackjack game
- Allows other players to join
- Manages game state for multiple participants
- **Verifiable**: Multiplayer game state on explorer

### 4. `create_game`
- Alternative method to create games
- More flexible game creation
- Can specify different game parameters
- **Verifiable**: Game account creation on explorer

### 5. `join_game`
- Allows players to join existing multiplayer games
- Validates game state and player eligibility
- Updates game participant list
- **Verifiable**: Player account updates on explorer

### 6. `end_game`
- Ends an active game
- Accepts final bet amount
- Triggers game result calculation
- **Verifiable**: Game state changes on explorer

### 7. `withdraw_bet`
- Allows players to withdraw winnings
- Only works on completed games
- Transfers GOR tokens to player
- **Verifiable**: Token transfers on explorer

## Using the BlackjackClient

### Basic Setup with Explorer Integration

```javascript
const { BlackjackClient, getExplorerUrl } = require('./tests/blackjack-integration.js');
const { Keypair } = require('@solana/web3.js');
const anchor = require('@coral-xyz/anchor');

// Create connection
const connection = new anchor.web3.Connection("https://rpc.gorbagana.wtf/");

// Create wallet (use your actual wallet in production)
const wallet = {
  publicKey: myKeypair.publicKey,
  signTransaction: async (tx) => {
    tx.partialSign(myKeypair);
    return tx;
  },
  signAllTransactions: async (txs) => {
    txs.forEach(tx => tx.partialSign(myKeypair));
    return txs;
  },
};

// Create client
const client = new BlackjackClient(wallet, connection);
```

### Example Usage with Verification

```javascript
// Start a game with explorer verification
const betAmount = 0.1 * LAMPORTS_PER_SOL; // 0.1 GOR
const gameId = 1;

try {
  const signature = await client.startSinglePlayerGame(betAmount, gameId);
  
  // Client automatically logs:
  // ✅ Single player game started (Game ID: 1, Bet: 0.1 GOR)
  // 📋 Transaction Hash: 5j7Ko2gBKz3rqR7...
  // 🔗 View on Gorbagana Explorer: https://explorer.gorbagana.wtf/tx/5j7Ko2gBKz3rqR7...
  
} catch (error) {
  console.error('Failed to start game:', error);
}

// End the game with verification
const finalBet = 0.2 * LAMPORTS_PER_SOL;
const endSignature = await client.endGame(gameId, finalBet);

// Withdraw winnings with verification
const withdrawAmount = 0.05 * LAMPORTS_PER_SOL;
const withdrawSignature = await client.withdrawBet(gameId, withdrawAmount);
```

## Frontend Integration

### React Example with Explorer URLs

```javascript
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { BlackjackClient, getExplorerUrl } from './blackjack-client';
import { toast } from 'react-toastify';

function BlackjackGame() {
  const { publicKey, signTransaction, signAllTransactions } = useWallet();
  const { connection } = useConnection();
  
  const [client, setClient] = useState(null);
  
  useEffect(() => {
    if (publicKey && signTransaction && signAllTransactions) {
      const wallet = { publicKey, signTransaction, signAllTransactions };
      setClient(new BlackjackClient(wallet, connection));
    }
  }, [publicKey, signTransaction, signAllTransactions, connection]);
  
  const startGame = async () => {
    if (!client) return;
    
    try {
      const betAmount = 0.1 * LAMPORTS_PER_SOL;
      const signature = await client.startSinglePlayerGame(betAmount, 1);
      
      // Show success notification with explorer link
      toast.success(
        <div>
          <div>Game started successfully!</div>
          <a 
            href={getExplorerUrl(signature)} 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-blue-500 underline"
          >
            View on Explorer
          </a>
        </div>
      );
      
    } catch (error) {
      console.error('Failed to start game:', error);
      toast.error('Failed to start game');
    }
  };
  
  return (
    <div>
      <button onClick={startGame}>Start Game</button>
    </div>
  );
}
```

## Account Structure

### Global State Account
```rust
pub struct GlobalState {
    pub authority: Pubkey,
    pub next_game_id: u64,
}
```
**Explorer View**: `https://explorer.gorbagana.wtf/account/<global_state_pda>`

### Game Account
```rust
pub struct Game {
    pub game_id: u64,
    pub player_one: Pubkey,
    pub player_two: Option<Pubkey>,
    pub bet_amount: u64,
    pub is_game_active: bool,
    pub is_single_player: bool,
}
```
**Explorer View**: `https://explorer.gorbagana.wtf/account/<game_pda>`

### Player Account
```rust
pub struct Player {
    pub game_id: u64,
    pub bet: u64,
}
```
**Explorer View**: `https://explorer.gorbagana.wtf/account/<player_pda>`

## PDA Derivation

The program uses Program Derived Addresses (PDAs) for account management:

```javascript
// Global state PDA
const [globalStatePDA] = await PublicKey.findProgramAddress(
  [Buffer.from("global_state")],
  PROGRAM_ID
);
// View: https://explorer.gorbagana.wtf/account/<globalStatePDA>

// Game PDA
const [gamePDA] = await PublicKey.findProgramAddress(
  [Buffer.from("game"), new anchor.BN(gameId).toArrayLike(Buffer, 'le', 8)],
  PROGRAM_ID
);
// View: https://explorer.gorbagana.wtf/account/<gamePDA>

// Player PDA
const [playerPDA] = await PublicKey.findProgramAddress(
  [Buffer.from("player"), playerPublicKey.toBuffer(), new anchor.BN(gameId).toArrayLike(Buffer, 'le', 8)],
  PROGRAM_ID
);
// View: https://explorer.gorbagana.wtf/account/<playerPDA>
```

## Troubleshooting

### Common Issues

1. **Airdrop Failures**
   - Gorbagana testnet airdrop may be rate-limited
   - Request smaller amounts or wait between requests
   - Check balance before requesting more tokens
   - **Verify**: Check wallet on explorer for balance updates

2. **Transaction Failures**
   - Ensure sufficient GOR balance for transactions
   - Check if accounts already exist (games/players)
   - Verify PDA derivation matches program expectations
   - **Debug**: Use explorer URLs to see failed transaction details

3. **Connection Issues**
   - Verify RPC endpoint is accessible
   - Check network connectivity
   - Try different RPC endpoints if needed
   - **Verify**: Test connection with explorer directly

### Debug Commands

```bash
# Check connection with explorer URLs
node run-tests.js connection

# Test wallet funding with explorer verification
node run-tests.js

# Run full demo with detailed logging and explorer links
node tests/blackjack-integration.js

# Simple connectivity test (no dependencies)
node simple-program-test.js
```

### Using the Explorer for Debugging

1. **Failed Transactions**: Click explorer links to see error logs
2. **Account States**: View PDA contents and data structures
3. **Program Interactions**: See all program calls and state changes
4. **Token Transfers**: Track GOR movements between accounts

## Verification Checklist

✅ **Connection Test**: RPC endpoint responding
✅ **Program Account**: Program deployed and executable
✅ **Wallet Funding**: Test wallet has GOR tokens
✅ **Transaction Success**: All operations complete successfully
✅ **Explorer Links**: Every transaction viewable on-chain
✅ **Account Creation**: PDAs created and accessible
✅ **State Changes**: Game states update correctly

## Next Steps

1. **Update Your UI**: Replace the old Light protocol integration with the new BlackjackClient
2. **Program ID**: Update your frontend to use the deployed program ID
3. **Network Configuration**: Configure your app to use Gorbagana testnet
4. **Wallet Integration**: Ensure your wallet adapter supports Gorbagana network
5. **Explorer Integration**: Add explorer links to your UI for transaction verification

## Support

For issues or questions:
- Check the [Gorbagana Explorer](https://explorer.gorbagana.wtf/) for transaction details
- Review the test output for specific error messages and explorer URLs
- Verify your wallet has sufficient GOR tokens for testing
- Use explorer links to debug failed transactions

Happy testing! 🎮

## Quick Links

- 🌐 **Gorbagana Explorer**: https://explorer.gorbagana.wtf/
- 📋 **Program Account**: https://explorer.gorbagana.wtf/account/5q7FiaffAC5nAFCnwy9PedhEjuL7vhjCQwuSsPVz9kny
- 🔗 **RPC Endpoint**: https://rpc.gorbagana.wtf/
- 📖 **Gorbagana Docs**: https://docs.gorbagana.wtf/ 
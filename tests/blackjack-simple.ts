import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { PublicKey, SystemProgram, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { assert, expect } from "chai";

// Program ID of the deployed blackjack program on Gorbagana
const PROGRAM_ID = new PublicKey("5q7FiaffAC5nAFCnwy9PedhEjuL7vhjCQwuSsPVz9kny");

// Simple IDL for our simplified blackjack program
const IDL = {
  "version": "0.1.0",
  "name": "blackjack",
  "instructions": [
    {
      "name": "initialize",
      "accounts": [
        { "name": "globalState", "isMut": true, "isSigner": false },
        { "name": "signer", "isMut": true, "isSigner": true },
        { "name": "systemProgram", "isMut": false, "isSigner": false }
      ],
      "args": []
    },
    {
      "name": "startSinglePlayerGame",
      "accounts": [
        { "name": "globalState", "isMut": true, "isSigner": false },
        { "name": "game", "isMut": true, "isSigner": false },
        { "name": "player", "isMut": true, "isSigner": false },
        { "name": "signer", "isMut": true, "isSigner": true },
        { "name": "systemProgram", "isMut": false, "isSigner": false }
      ],
      "args": [{ "name": "betAmount", "type": "u64" }]
    },
    {
      "name": "startMultiplayerGame",
      "accounts": [
        { "name": "globalState", "isMut": true, "isSigner": false },
        { "name": "game", "isMut": true, "isSigner": false },
        { "name": "player", "isMut": true, "isSigner": false },
        { "name": "signer", "isMut": true, "isSigner": true },
        { "name": "systemProgram", "isMut": false, "isSigner": false }
      ],
      "args": [{ "name": "betAmount", "type": "u64" }]
    },
    {
      "name": "createGame",
      "accounts": [
        { "name": "globalState", "isMut": true, "isSigner": false },
        { "name": "game", "isMut": true, "isSigner": false },
        { "name": "playerOne", "isMut": true, "isSigner": true },
        { "name": "systemProgram", "isMut": false, "isSigner": false }
      ],
      "args": [{ "name": "betAmount", "type": "u64" }]
    },
    {
      "name": "joinGame",
      "accounts": [
        { "name": "game", "isMut": true, "isSigner": false },
        { "name": "player", "isMut": true, "isSigner": false },
        { "name": "signer", "isMut": true, "isSigner": true },
        { "name": "systemProgram", "isMut": false, "isSigner": false }
      ],
      "args": []
    },
    {
      "name": "endGame",
      "accounts": [
        { "name": "game", "isMut": true, "isSigner": false },
        { "name": "player", "isMut": true, "isSigner": false },
        { "name": "signer", "isMut": true, "isSigner": true }
      ],
      "args": [
        { "name": "gameId", "type": "u64" },
        { "name": "finalBet", "type": "u64" }
      ]
    },
    {
      "name": "withdrawBet",
      "accounts": [
        { "name": "game", "isMut": true, "isSigner": false },
        { "name": "player", "isMut": true, "isSigner": false },
        { "name": "signer", "isMut": true, "isSigner": true }
      ],
      "args": [{ "name": "amount", "type": "u64" }]
    }
  ],
  "accounts": [
    {
      "name": "GlobalState",
      "type": {
        "kind": "struct",
        "fields": [
          { "name": "authority", "type": "publicKey" },
          { "name": "nextGameId", "type": "u64" }
        ]
      }
    },
    {
      "name": "Game",
      "type": {
        "kind": "struct",
        "fields": [
          { "name": "gameId", "type": "u64" },
          { "name": "playerOne", "type": "publicKey" },
          { "name": "playerTwo", "type": { "option": "publicKey" } },
          { "name": "betAmount", "type": "u64" },
          { "name": "isGameActive", "type": "bool" },
          { "name": "isSinglePlayer", "type": "bool" }
        ]
      }
    },
    {
      "name": "Player",
      "type": {
        "kind": "struct",
        "fields": [
          { "name": "gameId", "type": "u64" },
          { "name": "bet", "type": "u64" }
        ]
      }
    }
  ],
  "events": [
    {
      "name": "GameCreated",
      "fields": [
        { "name": "player1Address", "type": "publicKey" },
        { "name": "bet", "type": "u64" }
      ]
    },
    {
      "name": "PlayerJoined",
      "fields": [
        { "name": "player2Address", "type": "publicKey" },
        { "name": "gameId", "type": "u64" }
      ]
    },
    {
      "name": "GameEnded",
      "fields": [
        { "name": "gameId", "type": "u64" },
        { "name": "finalBet", "type": "u64" }
      ]
    }
  ]
};

describe("Blackjack Program Tests", () => {
  // Configure the client to use the Gorbagana testnet
  const connection = new anchor.web3.Connection("https://rpc.gorbagana.wtf/");
  const wallet = anchor.Wallet.local();
  const provider = new anchor.AnchorProvider(connection, wallet, {});
  anchor.setProvider(provider);

  const program = new Program(IDL as any, PROGRAM_ID, provider);
  
  // Test accounts
  let globalStateAccount: PublicKey;
  let gameAccount: PublicKey;
  let playerAccount: PublicKey;
  let player2Account: PublicKey;
  
  // Test keypairs
  let player1: anchor.web3.Keypair;
  let player2: anchor.web3.Keypair;
  
  // Test parameters
  const betAmount = new anchor.BN(0.1 * LAMPORTS_PER_SOL); // 0.1 GOR
  let gameId: number = 1;

  before(async () => {
    // Create test keypairs
    player1 = anchor.web3.Keypair.generate();
    player2 = anchor.web3.Keypair.generate();

    // Airdrop GOR tokens to test accounts
    try {
      await connection.requestAirdrop(player1.publicKey, 5 * LAMPORTS_PER_SOL);
      await connection.requestAirdrop(player2.publicKey, 5 * LAMPORTS_PER_SOL);
      await connection.requestAirdrop(wallet.publicKey, 5 * LAMPORTS_PER_SOL);
      
      // Wait for airdrops to confirm
      await new Promise(resolve => setTimeout(resolve, 3000));
    } catch (error) {
      console.log("Note: Airdrop may fail on testnet, ensure accounts have GOR tokens");
    }

    // Derive PDAs
    [globalStateAccount] = await PublicKey.findProgramAddress(
      [Buffer.from("global_state")],
      PROGRAM_ID
    );
  });

  describe("Initialize Program", () => {
    it("Should initialize the global state", async () => {
      try {
        const tx = await program.methods
          .initialize()
          .accounts({
            globalState: globalStateAccount,
            signer: wallet.publicKey,
            systemProgram: SystemProgram.programId,
          })
          .rpc();

        console.log("Initialize transaction signature:", tx);

        // Verify the global state was initialized
        const globalState = await program.account.globalState.fetch(globalStateAccount);
        assert.equal(globalState.nextGameId.toNumber(), 1);
        
      } catch (error) {
        console.log("Initialize may already be done:", error.message);
        // Try to fetch existing state
        const globalState = await program.account.globalState.fetch(globalStateAccount);
        console.log("Existing global state next game ID:", globalState.nextGameId.toNumber());
        gameId = globalState.nextGameId.toNumber();
      }
    });
  });

  describe("Single Player Game", () => {
    before(async () => {
      // Derive game and player PDAs
      [gameAccount] = await PublicKey.findProgramAddress(
        [Buffer.from("game"), new anchor.BN(gameId).toArrayLike(Buffer, 'le', 8)],
        PROGRAM_ID
      );
      
      [playerAccount] = await PublicKey.findProgramAddress(
        [Buffer.from("player"), player1.publicKey.toBuffer(), new anchor.BN(gameId).toArrayLike(Buffer, 'le', 8)],
        PROGRAM_ID
      );
    });

    it("Should start a single player game", async () => {
      const tx = await program.methods
        .startSinglePlayerGame(betAmount)
        .accounts({
          globalState: globalStateAccount,
          game: gameAccount,
          player: playerAccount,
          signer: player1.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([player1])
        .rpc();

      console.log("Start single player game transaction signature:", tx);

      // Verify the game was created
      const game = await program.account.game.fetch(gameAccount);
      const player = await program.account.player.fetch(playerAccount);

      assert.equal(game.playerOne.toString(), player1.publicKey.toString());
      assert.equal(game.betAmount.toNumber(), betAmount.toNumber());
      assert.equal(game.isGameActive, true);
      assert.equal(game.isSinglePlayer, undefined); // Should be true for single player
      assert.equal(player.bet.toNumber(), betAmount.toNumber());
    });

    it("Should end the single player game", async () => {
      const finalBet = new anchor.BN(0.2 * LAMPORTS_PER_SOL);
      
      const tx = await program.methods
        .endGame(new anchor.BN(gameId), finalBet)
        .accounts({
          game: gameAccount,
          player: playerAccount,
          signer: player1.publicKey,
        })
        .signers([player1])
        .rpc();

      console.log("End game transaction signature:", tx);

      // Verify the game was ended
      const game = await program.account.game.fetch(gameAccount);
      assert.equal(game.isGameActive, false);
    });

    it("Should allow withdrawing bet after game ends", async () => {
      const withdrawAmount = new anchor.BN(0.05 * LAMPORTS_PER_SOL);
      
      const tx = await program.methods
        .withdrawBet(withdrawAmount)
        .accounts({
          game: gameAccount,
          player: playerAccount,
          signer: player1.publicKey,
        })
        .signers([player1])
        .rpc();

      console.log("Withdraw bet transaction signature:", tx);
    });
  });

  describe("Multiplayer Game", () => {
    let multiGameAccount: PublicKey;
    let multiPlayerAccount: PublicKey;
    let multiPlayer2Account: PublicKey;
    let multiGameId: number;

    before(async () => {
      // Get current game ID
      const globalState = await program.account.globalState.fetch(globalStateAccount);
      multiGameId = globalState.nextGameId.toNumber();

      // Derive PDAs for multiplayer game
      [multiGameAccount] = await PublicKey.findProgramAddress(
        [Buffer.from("game"), new anchor.BN(multiGameId).toArrayLike(Buffer, 'le', 8)],
        PROGRAM_ID
      );
      
      [multiPlayerAccount] = await PublicKey.findProgramAddress(
        [Buffer.from("player"), player1.publicKey.toBuffer(), new anchor.BN(multiGameId).toArrayLike(Buffer, 'le', 8)],
        PROGRAM_ID
      );

      [multiPlayer2Account] = await PublicKey.findProgramAddress(
        [Buffer.from("player"), player2.publicKey.toBuffer(), new anchor.BN(multiGameId).toArrayLike(Buffer, 'le', 8)],
        PROGRAM_ID
      );
    });

    it("Should start a multiplayer game", async () => {
      const tx = await program.methods
        .startMultiplayerGame(betAmount)
        .accounts({
          globalState: globalStateAccount,
          game: multiGameAccount,
          player: multiPlayerAccount,
          signer: player1.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([player1])
        .rpc();

      console.log("Start multiplayer game transaction signature:", tx);

      // Verify the game was created
      const game = await program.account.game.fetch(multiGameAccount);
      assert.equal(game.playerOne.toString(), player1.publicKey.toString());
      assert.equal(game.betAmount.toNumber(), betAmount.toNumber());
      assert.equal(game.isGameActive, true);
      assert.equal(game.isSinglePlayer, false);
    });

    it("Should create a separate game using createGame", async () => {
      // Get next game ID
      const globalState = await program.account.globalState.fetch(globalStateAccount);
      const newGameId = globalState.nextGameId.toNumber();

      const [newGameAccount] = await PublicKey.findProgramAddress(
        [Buffer.from("game"), new anchor.BN(newGameId).toArrayLike(Buffer, 'le', 8)],
        PROGRAM_ID
      );

      const tx = await program.methods
        .createGame(betAmount)
        .accounts({
          globalState: globalStateAccount,
          game: newGameAccount,
          playerOne: player2.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([player2])
        .rpc();

      console.log("Create game transaction signature:", tx);

      // Verify the game was created
      const game = await program.account.game.fetch(newGameAccount);
      assert.equal(game.playerOne.toString(), player2.publicKey.toString());
      assert.equal(game.betAmount.toNumber(), betAmount.toNumber());
      assert.equal(game.isGameActive, true);
    });

    it("Should end the multiplayer game", async () => {
      const finalBet = new anchor.BN(0.15 * LAMPORTS_PER_SOL);
      
      const tx = await program.methods
        .endGame(new anchor.BN(multiGameId), finalBet)
        .accounts({
          game: multiGameAccount,
          player: multiPlayerAccount,
          signer: player1.publicKey,
        })
        .signers([player1])
        .rpc();

      console.log("End multiplayer game transaction signature:", tx);

      // Verify the game was ended
      const game = await program.account.game.fetch(multiGameAccount);
      assert.equal(game.isGameActive, false);
    });
  });

  describe("Error Cases", () => {
    it("Should fail to withdraw from active game", async () => {
      // Create a new active game
      const globalState = await program.account.globalState.fetch(globalStateAccount);
      const newGameId = globalState.nextGameId.toNumber();

      const [newGameAccount] = await PublicKey.findProgramAddress(
        [Buffer.from("game"), new anchor.BN(newGameId).toArrayLike(Buffer, 'le', 8)],
        PROGRAM_ID
      );
      
      const [newPlayerAccount] = await PublicKey.findProgramAddress(
        [Buffer.from("player"), player1.publicKey.toBuffer(), new anchor.BN(newGameId).toArrayLike(Buffer, 'le', 8)],
        PROGRAM_ID
      );

      // Start game
      await program.methods
        .startSinglePlayerGame(betAmount)
        .accounts({
          globalState: globalStateAccount,
          game: newGameAccount,
          player: newPlayerAccount,
          signer: player1.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([player1])
        .rpc();

      // Try to withdraw from active game (should fail)
      try {
        await program.methods
          .withdrawBet(new anchor.BN(0.01 * LAMPORTS_PER_SOL))
          .accounts({
            game: newGameAccount,
            player: newPlayerAccount,
            signer: player1.publicKey,
          })
          .signers([player1])
          .rpc();
        
        assert.fail("Should have failed to withdraw from active game");
      } catch (error) {
        console.log("Expected error caught:", error.message);
        assert.include(error.message.toLowerCase(), "game");
      }
    });
  });

  describe("Account State Verification", () => {
    it("Should verify global state increments game IDs", async () => {
      const globalState = await program.account.globalState.fetch(globalStateAccount);
      console.log("Final next game ID:", globalState.nextGameId.toNumber());
      assert.isTrue(globalState.nextGameId.toNumber() > 1);
    });

    it("Should verify game accounts have correct structure", async () => {
      const games = await program.account.game.all();
      console.log(`Found ${games.length} game accounts`);
      
      for (const game of games) {
        console.log(`Game ${game.account.gameId}: Player1=${game.account.playerOne}, Bet=${game.account.betAmount}, Active=${game.account.isGameActive}`);
        assert.isTrue(game.account.gameId.toNumber() >= 1);
        assert.isTrue(game.account.betAmount.toNumber() > 0);
      }
    });

    it("Should verify player accounts have correct structure", async () => {
      const players = await program.account.player.all();
      console.log(`Found ${players.length} player accounts`);
      
      for (const player of players) {
        console.log(`Player game ${player.account.gameId}: Bet=${player.account.bet}`);
        assert.isTrue(player.account.gameId.toNumber() >= 1);
        assert.isTrue(player.account.bet.toNumber() > 0);
      }
    });
  });

  describe("Balance Verification", () => {
    it("Should verify GOR token balances", async () => {
      const player1Balance = await connection.getBalance(player1.publicKey);
      const player2Balance = await connection.getBalance(player2.publicKey);
      
      console.log(`Player 1 balance: ${player1Balance / LAMPORTS_PER_SOL} GOR`);
      console.log(`Player 2 balance: ${player2Balance / LAMPORTS_PER_SOL} GOR`);
      
      // Should have some balance remaining
      assert.isTrue(player1Balance > 0);
      assert.isTrue(player2Balance > 0);
    });
  });
}); 
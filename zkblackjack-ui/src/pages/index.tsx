import type { NextPage } from "next"
import Head from "next/head"
import { useState, useEffect } from "react"
import { Wallet } from "../components/Wallet"
import Image from "next/image"
import { useRouter } from "next/router"
import { toast, ToastContainer } from "react-toastify"
import "react-toastify/dist/ReactToastify.css"
import { Game } from "../components/Game"
import Rules from "../components/Rules"
import { Modal } from "../components/Modal"
import { useSockets } from "../context/SocketContext"
import SafeComponent from "../components/SafeComponent"
import ProgramDebug from "../components/ProgramDebug"

import { SystemProgram, PublicKey, LAMPORTS_PER_SOL, Connection } from '@solana/web3.js';
import { BN } from "@coral-xyz/anchor";
import { Program, Idl } from '@coral-xyz/anchor';
import idl from '../../idl/blackjack.json';
import { useAnchorProvider } from "../context/Solana"
import { useAnchorWallet } from "@solana/wallet-adapter-react";
import { useConnection } from "@solana/wallet-adapter-react";

const PROGRAM_ID = "5q7FiaffAC5nAFCnwy9PedhEjuL7vhjCQwuSsPVz9kny";

interface IProps {
  isLoading: boolean
  setIsLoading: (val: boolean) => void
}

const Home: NextPage<IProps> = ({
  isLoading,
  setIsLoading,
}) => {
  const [isJoin, setIsJoin] = useState<boolean>(false)
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false)
  const [room, setRoom] = useState("")
  const router = useRouter()
  const [program, setProgram] = useState<Program | null>(null);
  const [programExists, setProgramExists] = useState<boolean>(false);
  const anchorProvider = useAnchorProvider();
  const wallet = useAnchorWallet();
  const { connection } = useConnection();

  const {
    socket,
    dealRoundCards,
    startDeck,
    isGameActive,
    setIsGameActive,
    setIsSinglePlayer,
    cards,
    setStand,
    sums,
    aces,
    setIsGameEnded,
  } = useSockets()

  useEffect(() => {
    setIsGameActive(false)
    setIsSinglePlayer(false)
    setIsGameEnded(false)
  }, [])

  // Check if program exists and set up program instance
  useEffect(() => {
    const checkProgramExists = async () => {
      try {
        const programPublicKey = new PublicKey(PROGRAM_ID);
        const programInfo = await connection.getAccountInfo(programPublicKey);
        
        if (programInfo && programInfo.executable) {
          console.log("✅ Program account found:", PROGRAM_ID);
          console.log("Program owner:", programInfo.owner.toString());
          console.log("Program executable:", programInfo.executable);
          setProgramExists(true);
          
          if (anchorProvider) {
            const solProgram = new Program(idl as Idl, programPublicKey, anchorProvider);
            setProgram(solProgram);
            console.log("✅ Program instance created successfully");
          }
        } else {
          console.error("❌ Program account not found or not executable");
          setProgramExists(false);
          toast.error("Program not found. Please ensure you're connected to the correct network.");
        }
      } catch (error) {
        console.error("❌ Error checking program:", error);
        setProgramExists(false);
        toast.error("Error connecting to program. Please check your connection.");
      }
    };

    if (connection) {
      checkProgramExists();
    }
  }, [connection, anchorProvider]);

  const constructDeck = () => {
    const deck: string[] = []

    const cardValues: string[] = [
      "A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K",
    ]
    const cardTypes: string[] = ["D", "C", "H", "S"]

    for (let i = 0; i < 2; i++) {
      for (let i = 0; i < cardTypes.length; i++) {
        for (let j = 0; j < cardValues.length; j++) {
          deck.push(cardValues[j] + "-" + cardTypes[i])
        }
      }
    }

    for (let i = 0; i < deck.length; i++) {
      const randomNumber = Math.floor(Math.random() * deck.length)
      const currentCard = deck[i]
      deck[i] = deck[randomNumber] ?? ""
      deck[randomNumber] = currentCard ?? ""
    }

    return deck
  }

  const verifyConnection = async () => {
    if (!connection) {
      throw new Error("No connection available");
    }

    try {
      const slot = await connection.getSlot();
      console.log("✅ Connected to network (slot:", slot, ")");
      console.log("✅ RPC endpoint:", connection.rpcEndpoint);
    } catch (error) {
      console.error("❌ Connection verification failed:", error);
      throw new Error("Unable to connect to network. Please check your connection.");
    }
  };

  const joinRoom = async (data: any) => {
    try {
      if (!wallet) {
        toast.error("Please connect your wallet first");
        return;
      }

      if (!programExists || !program) {
        toast.error("Program not available. Please check your network connection.");
        return;
      }

      setIsLoading(true);

      // Verify connection first
      await verifyConnection();

      // Initialize program if needed
      const globalStatePDA = await initializeProgramIfNeeded();

      // Parse the game ID from the room input
      const gameId = parseInt(room);
      if (isNaN(gameId) || gameId <= 0) {
        throw new Error("Invalid room number");
      }

      // Define bet amount (0.1 SOL/GOR)
      const betAmount = new BN(0.1 * LAMPORTS_PER_SOL);

      // Get game PDA for the existing game
      const [gamePDA] = await PublicKey.findProgramAddress(
        [Buffer.from("game"), new BN(gameId).toArrayLike(Buffer, 'le', 8)],
        new PublicKey(PROGRAM_ID)
      );

      // Get player PDA for the joining player
      const [playerPDA] = await PublicKey.findProgramAddress(
        [Buffer.from("player"), wallet.publicKey.toBuffer(), new BN(gameId).toArrayLike(Buffer, 'le', 8)],
        new PublicKey(PROGRAM_ID)
      );

      // Check if the game exists and is joinable
      try {
        if (program.account && program.account.game) {
          const gameAccount = await program.account.game.fetch(gamePDA);
          if (!(gameAccount as any).isGameActive) {
            throw new Error("Game is not active");
          }
          if ((gameAccount as any).isSinglePlayer) {
            throw new Error("Cannot join a single player game");
          }
        }
      } catch (error) {
        throw new Error("Game not found or not joinable");
      }

      // Call the Solana program to join the multiplayer game
      if (!program.methods || !program.methods.joinGame) {
        throw new Error("Join game method not available");
      }
      
      const tx = await program.methods
        .joinGame(new BN(gameId), betAmount)
        .accounts({
          globalState: globalStatePDA,
          game: gamePDA,
          player: playerPDA,
          signer: wallet.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      console.log("Successfully joined game!");
      console.log("Transaction signature:", tx);

      // Show success message
      toast.success("Successfully joined the game!");

      // Now do the socket communication for the UI
      const tempDeck = constructDeck();
      const {
        usedDeck,
        aceHouse,
        acePlayerOne,
        acePlayerTwo,
        houseValue,
        playerOneValue,
        playerTwoValue,
        housecurrentCards,
        playerOneCurrentCards,
        playerTwoCurrentCards,
      } = dealRoundCards(tempDeck);

      const sendData = {
        room: data,
        deck: usedDeck,
        cards: {
          playerOne: playerOneCurrentCards,
          playerTwo: playerTwoCurrentCards,
          house: housecurrentCards,
        },
        aces: {
          playerOne: acePlayerOne,
          playerTwo: acePlayerTwo,
          house: aceHouse,
        },
        sums: {
          playerOne: playerOneValue,
          playerTwo: playerTwoValue,
          house: houseValue,
        },
      };

      socket.emit("join_room", sendData);
      setIsJoin(false);
      setIsLoading(false);
      router.push(`/room/${data}`);
    } catch (err) {
      console.error("Join room error:", err);
      setIsLoading(false);
      toast.error("Failed to join room: " + (err as Error).message);
    }
  }

  const initializeProgramIfNeeded = async () => {
    if (!program || !wallet) {
      throw new Error("Program or wallet not available");
    }

    const [globalStatePDA] = await PublicKey.findProgramAddress(
      [Buffer.from("global_state")],
      new PublicKey(PROGRAM_ID)
    );

    try {
      // Check if program account exists first
      const programAccount = await connection.getAccountInfo(new PublicKey(PROGRAM_ID));
      if (!programAccount || !programAccount.executable) {
        throw new Error("Program account not found or not executable");
      }

      // Try to fetch the global state to see if it's initialized
      const globalStateAccount = await connection.getAccountInfo(globalStatePDA);
      if (globalStateAccount) {
        console.log("✅ Program already initialized");
        return globalStatePDA;
      }

      // Global state doesn't exist, need to initialize
      console.log("Program not initialized, initializing...");
      
      if (!program.methods || !program.methods.initialize) {
        throw new Error("Initialize method not available");
      }

      const tx = await program.methods
        .initialize()
        .accounts({
          globalState: globalStatePDA,
          signer: wallet.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      console.log("✅ Program initialized successfully:", tx);
      toast.success("Program initialized successfully!");
      return globalStatePDA;
    } catch (error) {
      console.error("❌ Failed to initialize program:", error);
      throw new Error("Failed to initialize program: " + (error as Error).message);
    }
  };

  const startSinglePlayer = async () => {
    try {
      if (!wallet) {
        toast.error("Please connect your wallet first");
        return;
      }

      if (!programExists || !program) {
        toast.error("Program not available. Please check your network connection.");
        return;
      }

      setIsLoading(true);

      // Verify connection first
      await verifyConnection();

      // Initialize program if needed
      const globalStatePDA = await initializeProgramIfNeeded();

      // Define bet amount (0.1 SOL/GOR)
      const betAmount = new BN(0.1 * LAMPORTS_PER_SOL);

      // Get the next game ID from global state
      let nextGameId = 1;
      try {
        const globalStateAccount = await connection.getAccountInfo(globalStatePDA);
        if (globalStateAccount) {
          // Read next_game_id from the account data (skip discriminator + authority)
          const data = globalStateAccount.data;
          nextGameId = Number(data.readBigUInt64LE(8 + 32)); // Skip discriminator (8) + authority (32)
        }
      } catch (error) {
        console.log("Using default game ID 1");
      }

      // Get game PDA
      const [gamePDA] = await PublicKey.findProgramAddress(
        [Buffer.from("game"), new BN(nextGameId).toArrayLike(Buffer, 'le', 8)],
        new PublicKey(PROGRAM_ID)
      );

      // Get player PDA
      const [playerPDA] = await PublicKey.findProgramAddress(
        [Buffer.from("player"), wallet.publicKey.toBuffer(), new BN(nextGameId).toArrayLike(Buffer, 'le', 8)],
        new PublicKey(PROGRAM_ID)
      );

      console.log("🎮 Starting single player game...");
      console.log("Game ID:", nextGameId);
      console.log("Bet amount:", betAmount.toString());
      console.log("Global State PDA:", globalStatePDA.toString());
      console.log("Game PDA:", gamePDA.toString());
      console.log("Player PDA:", playerPDA.toString());

      // Call the Solana program to start single player game
      if (!program.methods || !program.methods.startSinglePlayerGame) {
        throw new Error("Program method not available");
      }
      
      const tx = await program.methods
        .startSinglePlayerGame(betAmount)
        .accounts({
          globalState: globalStatePDA,
          game: gamePDA,
          player: playerPDA,
          signer: wallet.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      console.log("✅ Single player game started successfully!");
      console.log("📋 Transaction signature:", tx);

      // Show success message
      toast.success("Single player game started successfully!");

      // Set game state and navigate
      setIsGameActive(true);
      setIsSinglePlayer(true);
      setIsLoading(false);
      router.push("/room/single");
      
    } catch (err) {
      console.error("❌ Failed to start single player game:", err);
      setIsLoading(false);
      toast.error("Failed to start single player game: " + (err as Error).message);
    }
  }

  const createRoom = async () => {
    try {
      if (!wallet) {
        toast.error("Please connect your wallet first");
        return;
      }

      if (!programExists || !program) {
        toast.error("Program not available. Please check your network connection.");
        return;
      }

      setIsLoading(true);

      // Verify connection first
      await verifyConnection();

      // Initialize program if needed
      const globalStatePDA = await initializeProgramIfNeeded();

      // Define bet amount (0.1 SOL/GOR)
      const betAmount = new BN(0.1 * LAMPORTS_PER_SOL);

      // Get the next game ID from global state
      let nextGameId = 1;
      try {
        const globalStateAccount = await connection.getAccountInfo(globalStatePDA);
        if (globalStateAccount) {
          // Read next_game_id from the account data (skip discriminator + authority)
          const data = globalStateAccount.data;
          nextGameId = Number(data.readBigUInt64LE(8 + 32)); // Skip discriminator (8) + authority (32)
        }
      } catch (error) {
        console.log("Using default game ID 1");
      }

      // Get game PDA
      const [gamePDA] = await PublicKey.findProgramAddress(
        [Buffer.from("game"), new BN(nextGameId).toArrayLike(Buffer, 'le', 8)],
        new PublicKey(PROGRAM_ID)
      );

      // Get player PDA
      const [playerPDA] = await PublicKey.findProgramAddress(
        [Buffer.from("player"), wallet.publicKey.toBuffer(), new BN(nextGameId).toArrayLike(Buffer, 'le', 8)],
        new PublicKey(PROGRAM_ID)
      );

      console.log("🎮 Creating multiplayer game...");
      console.log("Game ID:", nextGameId);
      console.log("Bet amount:", betAmount.toString());
      console.log("Global State PDA:", globalStatePDA.toString());
      console.log("Game PDA:", gamePDA.toString());
      console.log("Player PDA:", playerPDA.toString());

      // Call the Solana program to start multiplayer game
      if (!program.methods || !program.methods.startMultiplayerGame) {
        throw new Error("Program method not available");
      }
      
      const tx = await program.methods
        .startMultiplayerGame(betAmount)
        .accounts({
          globalState: globalStatePDA,
          game: gamePDA,
          player: playerPDA,
          signer: wallet.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      console.log("✅ Multiplayer game created successfully!");
      console.log("📋 Transaction signature:", tx);

      // Show success message
      toast.success("Multiplayer game created successfully!");

      // Use the nextGameId as the room ID
      const gameId = nextGameId;
      socket.emit("create_room", gameId.toString());
      setIsGameActive(true);
      setIsSinglePlayer(false);
      setIsLoading(false);
      router.push(`/room/${gameId}`);
      
    } catch (err) {
      console.error("❌ Failed to create room:", err);
      setIsLoading(false);
      toast.error("Failed to create room: " + (err as Error).message);
    }
  }

  return (
    <div className="">
      <Head>
        <title>zkBlackjack</title>
        <meta name="description" content="blackjack dApp" />
      </Head>

      <main className="bg-[#144b1e]  pb-1 text-white">
        <nav className="px-8 md:px-2 fixed w-full -z-10 top-0 left-0 py-3.5    "></nav>
        <div className="max-w-4xl mx-auto p-4">
          <ProgramDebug />
        </div>
        {isLoading ? (
          <div className="flex  justify-center  flex-row  relative top-64 left-0 z-20">
            <div className=" absolute top-12 left-1/2">
              <svg
                width="36"
                height="36"
                fill="#fff"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <ellipse
                  className="spinner_rXNP"
                  cx="12"
                  cy="5"
                  rx="4"
                  ry="4"
                />
              </svg>
            </div>
            {/* <div className="relative -z-10 top-24 ml-6">
              <Image
                className="opacity-30"
                src={"/game.svg"}
                width={664}
                height={155}
                layout="fixed"
              />
            </div> */}
          </div>
        ) : (
          <div className="grid items-center justify-center  lg:grid-rows-none  md:grid-cols-3 mt-20 lg:mt-8">
            <div className="flex items-center justify-center row-start-2 lg:row-start-1 md:mt-4 md:col-start-2 lg:col-start-3 mx-auto w-fit">
              <button
                onClick={startSinglePlayer}
                className="mx-2 mt-4 md:mt-0 transition duration-300 ease-in-out lg:px-8 hover:scale-110"
              >
                <Image
                  src={"/single.svg"}
                  width={120}
                  height={120}
                  layout={"fixed"}
                />
              </button>
            </div>
            <div className="flex items-center justify-center row-start-1 col-start-1 md:col-start-2">
              <Rules />
            </div>
            <div className="flex flex-col md:flex-row lg:flex-col items-center  md:col-start-2 md:row-start-3 lg:col-start-1 lg:row-start-1 justify-center gap-10 mx-auto w-fit">
              <button
                onClick={createRoom}
                className="mx-2 md:mx-auto lg:mx-2 transition duration-300 ease-in-out lg:px-8 hover:scale-110"
              >
                <Image
                  src={"/create.svg"}
                  width={120}
                  height={120}
                  layout={"fixed"}
                />
              </button>
              <button
                onClick={() => {
                  setIsJoin(true)
                  setIsModalOpen(true)
                }}
                className="mx-2 md:mx-auto lg:mx-2 -mt-8 md:mt-0 transition duration-300 ease-in-out lg:px-8 hover:scale-110"
              >
                <Image
                  src={"/join.svg"}
                  width={120}
                  height={120}
                  layout={"fixed"}
                />
              </button>
            </div>
            <Modal
              // setIsGameStarted={setIsGameStarted}
              setIsModalOpen={setIsModalOpen}
              isModalOpen={isModalOpen}
              isJoin={isJoin}
              joinRoom={joinRoom}
              setRoom={setRoom}
              room={room}
            />
          </div>
        )}
      </main>
      <ToastContainer
        position="top-center"
        autoClose={4000}
        hideProgressBar
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss={false}
        draggable
        pauseOnHover
        theme="dark"
      />
    </div>
  )
}

export default Home

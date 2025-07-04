import React, {
  useState,
  useEffect,
  useRef,
  useReducer,
  useContext,
} from "react"
// BN import moved to the anchor import below
import Image from "next/image"
import { toast, ToastContainer } from "react-toastify"
import "react-toastify/dist/ReactToastify.css"
import { Modal } from "./Modal"
import { Table } from "./Table"
import { useRouter } from "next/router"
import { useSockets, Withdraw } from "../context/SocketContext"
import { Ace, Card, Sum, Stand, Score } from "../context/SocketContext"

import { AnchorProvider, BN } from "@coral-xyz/anchor"
import { useAnchorProvider } from "../context/Solana"
import { LAMPORTS_PER_SOL, PublicKey, SystemProgram, Transaction } from "@solana/web3.js"

import { Program, Idl } from '@coral-xyz/anchor';
import idl from '../../idl/blackjack.json'; // Your IDL file path
import { useAnchorWallet } from "@solana/wallet-adapter-react";

const PROGRAM_ID = "5q7FiaffAC5nAFCnwy9PedhEjuL7vhjCQwuSsPVz9kny";

interface IProps {
  room?: string
  isLoading: boolean
  setIsLoading: (val: boolean) => void
}

interface TransactionResponse {
  hash: string
}

// export interface RoundResult {
//   playerOne: string[]
//   playerTwo: string[]
// }

type CardGet = {
  tempDeck: string[]
  startDeck: string[]
  cardImage?: string
  playerValue: number
}

export const Game: React.FC<IProps> = ({
  isLoading,
  setIsLoading,
  room,
}) => {
  // Move all hooks to the top before any conditional logic
  const [currentDeck, setCurrentDeck] = useState<string[]>([])
  const [playerTwoKey, setPlayerTwoKey] = useState<string>("")
  const [playerOneKey, setPlayerOneKey] = useState<string>("")
  
  const {
    socket,
    isCanWithdraw,
    setIsCanWithdraw,
    startDeck,
    setStartDeck,
    isSinglePlayer,
    cards,
    setCards,
    sums,
    setSums,
    aces,
    setAces,
    deckData,
    setPlayerOneRound,
    setPlayerTwoRound,
    playerOneRound,
    playerTwoRound,
    isGameActive,
    dealRoundCards,
    stand,
    setScore,
    score,
    setStand,
    setIsGameActive,
    isGameEnded,
    setIsGameEnded,
  } = useSockets()

  const router = useRouter()
  const effectRan = useRef(false)
  const anchorProvider = useAnchorProvider()
  const wallet = useAnchorWallet()
  const [program, setProgram] = useState<Program>()

  // Convert string keys to PublicKey objects with error handling
  const playerOne = (() => {
    try {
      return playerOneKey ? new PublicKey(playerOneKey) : undefined;
    } catch (error) {
      console.error("Invalid PublicKey for playerOne:", playerOneKey);
      return undefined;
    }
  })();
  
  const playerTwo = (() => {
    try {
      return playerTwoKey ? new PublicKey(playerTwoKey) : undefined;
    } catch (error) {
      console.error("Invalid PublicKey for playerTwo:", playerTwoKey);
      return undefined;
    }
  })();

  useEffect(() => {
    if (effectRan.current === false) {
      setIsLoading(false)
      setIsGameEnded(false)
      setIsCanWithdraw({
        playerOne: false,
        playerTwo: false,
      })
      setPlayerOneRound([])
      setPlayerTwoRound([])
      setScore({
        playerOne: 0,
        playerTwo: 0,
      })
    }
    return () => {
      effectRan.current = true
    }
  }, [setIsLoading, setIsGameEnded, setIsCanWithdraw, setPlayerOneRound, setPlayerTwoRound, setScore])

  useEffect(() => {
    if (anchorProvider) {
      const programID = new PublicKey(PROGRAM_ID);
      const solProgram = new Program(idl as Idl, programID, anchorProvider);
      setProgram(solProgram);
    }
  }, [anchorProvider]);

  useEffect(() => {
    checkAce()
  }, [sums])

  // Early validation AFTER all hooks are called
  if (typeof isLoading !== 'boolean' || typeof setIsLoading !== 'function') {
    console.error('Game component: Invalid props received', { isLoading, setIsLoading, room });
    return <div>Error: Invalid component props</div>;
  }

  // Additional room validation AFTER all hooks are called
  if (!room || typeof room !== 'string') {
    console.error('Game component: Invalid room prop', { room });
    return <div>Error: Invalid room configuration</div>;
  }

  const deck: string[] = []

  const unlockBet = async (playerAddress: PublicKey, playerNumber: string) => {
    try {
      if (!program || !wallet || !wallet.publicKey) {
        toast.error("Please connect your wallet first");
        return;
      }

      // Parse the room ID to get the game ID
      const gameId = room === "single" ? 1 : parseInt(room || "1");
      if (isNaN(gameId)) {
        toast.error("Invalid game ID");
        return;
      }

      // Get game PDA
      const [gamePDA] = await PublicKey.findProgramAddress(
        [Buffer.from("game"), new BN(gameId).toArrayLike(Buffer, 'le', 8)],
        new PublicKey(PROGRAM_ID)
      );

      // Get player PDA
      const [playerPDA] = await PublicKey.findProgramAddress(
        [Buffer.from("player"), wallet.publicKey.toBuffer(), new BN(gameId).toArrayLike(Buffer, 'le', 8)],
        new PublicKey(PROGRAM_ID)
      );

      // Calculate final bet amount based on game outcome
      let finalBetAmount = new BN(0.1 * LAMPORTS_PER_SOL); // Default bet
      
      if (isSinglePlayer) {
        // For single player, final bet depends on score
        if (score.playerOne > 0) {
          finalBetAmount = new BN(0.2 * LAMPORTS_PER_SOL); // Winner gets more
        } else {
          finalBetAmount = new BN(0.05 * LAMPORTS_PER_SOL); // House wins, player gets less
        }
      } else {
        // For multiplayer, calculate based on scores
        if (playerNumber === "1" && score.playerOne > score.playerTwo) {
          finalBetAmount = new BN(0.2 * LAMPORTS_PER_SOL);
        } else if (playerNumber === "2" && score.playerTwo > score.playerOne) {
          finalBetAmount = new BN(0.2 * LAMPORTS_PER_SOL);
        } else {
          finalBetAmount = new BN(0.1 * LAMPORTS_PER_SOL); // Draw or lose
        }
      }

      // Call the Solana program to end the game
      if (!program.methods || !program.methods.endGame) {
        toast.error("End game method not available");
        return;
      }

      console.log("🎯 Ending game with parameters:");
      console.log("  Game ID (BN):", new BN(gameId).toString());
      console.log("  Final Bet (BN):", finalBetAmount.toString());
      console.log("  Game PDA:", gamePDA.toString());
      console.log("  Player PDA:", playerPDA.toString());
      console.log("  Signer:", wallet.publicKey.toString());

      const tx = await toast.promise(
        program.methods.endGame(new BN(gameId), finalBetAmount)
          .accounts({
            game: gamePDA,
            player: playerPDA,
            signer: wallet.publicKey,
          }).rpc(),
        {
          pending: "Ending game...",
          success: "Game ended successfully! You can now withdraw.",
          error: "Failed to end game",
        }
      );

      console.log("Game ended successfully:", tx);
      
      // Enable withdrawal
      if (isSinglePlayer) {
        setIsCanWithdraw((prevState: Withdraw) => ({
          ...prevState,
          playerOne: true,
        }));
      } else {
        if (playerNumber === "1") {
          setIsCanWithdraw((prevState: Withdraw) => ({
            ...prevState,
            playerOne: true,
          }));
        } else {
          setIsCanWithdraw((prevState: Withdraw) => ({
            ...prevState,
            playerTwo: true,
          }));
        }
      }
      
    } catch (error) {
      console.error("Unlock bet error:", error);
      toast.error("Failed to end game: " + (error as Error).message);
    }
  }

  const withdrawBet = async (player: string) => {
    try {
      if (!program || !wallet || !wallet.publicKey) {
        toast.error("Please connect your wallet first");
        return;
      }

      // Parse the room ID to get the game ID
      const gameId = room === "single" ? 1 : parseInt(room || "1");
      if (isNaN(gameId)) {
        toast.error("Invalid game ID");
        return;
      }

      // Get game PDA
      const [gamePDA] = await PublicKey.findProgramAddress(
        [Buffer.from("game"), new BN(gameId).toArrayLike(Buffer, 'le', 8)],
        new PublicKey(PROGRAM_ID)
      );

      // Get player PDA
      const [playerPDA] = await PublicKey.findProgramAddress(
        [Buffer.from("player"), wallet.publicKey.toBuffer(), new BN(gameId).toArrayLike(Buffer, 'le', 8)],
        new PublicKey(PROGRAM_ID)
      );

      // Calculate withdrawal amount based on game outcome
      let withdrawAmount = new BN(0);
      
      if (player === "1") {
        if (score.playerOne > 0) {
          withdrawAmount = new BN(0.15 * LAMPORTS_PER_SOL); // Winner's share
        } else {
          withdrawAmount = new BN(0.05 * LAMPORTS_PER_SOL); // Consolation amount
        }
      } else if (player === "2") {
        if (score.playerTwo > 0) {
          withdrawAmount = new BN(0.15 * LAMPORTS_PER_SOL); // Winner's share
        } else {
          withdrawAmount = new BN(0.05 * LAMPORTS_PER_SOL); // Consolation amount
        }
      }

      if (withdrawAmount.eq(new BN(0))) {
        toast.error("No funds available to withdraw");
        return;
      }

      // Call the Solana program to withdraw bet
      if (!program.methods || !program.methods.withdrawBet) {
        toast.error("Withdraw method not available");
        return;
      }
      
      const tx = await toast.promise(
        program.methods.withdrawBet(withdrawAmount)
          .accounts({
            game: gamePDA,
            player: playerPDA,
            signer: wallet.publicKey,
          }).rpc(),
        {
          pending: "Withdrawing funds...",
          success: `Successfully withdrew ${withdrawAmount.toNumber() / LAMPORTS_PER_SOL} GOR!`,
          error: "Withdrawal failed",
        }
      );

      console.log("Withdrawal successful:", tx);

      // Update withdrawal status
      if (player === "1") {
        setIsCanWithdraw((prevState: Withdraw) => ({
          ...prevState,
          playerOne: false, // Can't withdraw again
        }));
      } else {
        setIsCanWithdraw((prevState: Withdraw) => ({
          ...prevState,
          playerTwo: false, // Can't withdraw again
        }));
      }
      
    } catch (error) {
      console.error("Withdraw error:", error);
      toast.error("Failed to withdraw: " + (error as Error).message);
    }
  }

  useEffect(() => {
    if (isGameEnded && currentDeck.length <= 4) {
      if (isSinglePlayer) {
        unlockBet(anchorProvider.wallet.publicKey, "1")
      } else {
        if (playerOneRound.length > 0 && playerTwoRound.length > 0) {
          if (anchorProvider.wallet.publicKey === playerOne) {
            unlockBet(anchorProvider.wallet.publicKey, "1")
          } else {
            unlockBet(anchorProvider.wallet.publicKey, "2")
          }
        }
      }
      // setCards({ playerOneCards: [], playerTwoCards: [], houseCards: [] })
    }
  }, [isGameEnded])

  useEffect(() => {
    if (!isSinglePlayer) {
      if (stand.playerOne && stand.playerTwo) {
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
        } = dealRoundCards(startDeck)

        const sendData = {
          room: room,
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
          score: score,
          // cards: cards,
          // aces: aces,
          // sums: sums,
        }

        socket.emit("round_finished", sendData)
        setStand({
          playerOne: false,
          playerTwo: false,
        })
      }
    }
  }, [stand])

  

  const calculateProof = async (player: string) => {
    // Simplified game logic without zero-knowledge proofs
    let playerSum = 0;
    let houseSum = sums.houseSum;
    let result = "0"; // 0 = lose, 1 = win
    let draw = "0"; // 0 = no draw, 1 = draw, 2 = special case
    
    if (isSinglePlayer) {
      setPlayerOneRound([...playerOneRound, "Calculating..."])
      playerSum = sums.playerOneSum;
    } else {
      if (player === "1") {
        setPlayerOneRound([...playerOneRound, "Calculating..."])
        playerSum = sums.playerOneSum;
      } else {
        setPlayerTwoRound([...playerTwoRound, "Calculating..."])
        playerSum = sums.playerTwoSum;
      }
    }

    // Simple blackjack logic without ZK proofs
    if (playerSum > 21) {
      result = "0"; // Player busts, loses
      draw = "2"; // Special case for bust
    } else if (houseSum > 21) {
      result = "1"; // House busts, player wins
    } else if (playerSum > houseSum) {
      result = "1"; // Player wins with higher score
    } else if (playerSum === houseSum) {
      result = "0"; // Draw/tie, treated as no win
      draw = "1"; // Draw
    } else {
      result = "0"; // House wins with higher score
    }

    try {
      // Determine winner based on simple logic (no Solana program call needed here)
      getWinner(player, result, draw, playerSum.toString());
      
    } catch (error) {
      console.error("Calculate result error:", error);
      // Fallback to local game logic
      getWinner(player, result, draw, playerSum.toString());
    }
  }

  const constructDeck = () => {
    const cardValues: string[] = [
      "2",
      "3",
      "4",
      "A",
      "5",
      "6",
      "7",
      "8",
      "9",
      "10",
      "J",
      "Q",
      "K",
    ]
    const cardTypes: string[] = ["D", "C", "H", "S"]

    if (isSinglePlayer) {
      for (let i = 0; i < cardTypes.length; i++) {
        for (let j = 0; j < cardValues.length; j++) {
          deck.push(cardValues[j] + "-" + cardTypes[i])
        }
      }
    } else {
      for (let i = 0; i < 2; i++) {
        for (let i = 0; i < cardTypes.length; i++) {
          for (let j = 0; j < cardValues.length; j++) {
            deck.push(cardValues[j] + "-" + cardTypes[i])
          }
        }
      }
    }

    for (let i = 0; i < deck.length; i++) {
      const randomNumber = Math.floor(Math.random() * deck.length)
      const currentCard = deck[i]
      deck[i] = deck[randomNumber] ?? ""
      deck[randomNumber] = currentCard ?? ""
    }
    setCurrentDeck(deck)
    return deck
  }

  function getCard(deckData: string[], player: string): CardGet {
    // Initialize default return object
    const defaultReturn: CardGet = {
      tempDeck: deckData,
      startDeck: deckData,
      cardImage: undefined,
      playerValue: 0,
    };

    if (isSinglePlayer) {
      if (sums.playerOneSum >= 21) {
        toast.error("You can't get more cards", {
          position: "top-center",
          autoClose: 3000,
          hideProgressBar: true,
          closeOnClick: true,
          pauseOnHover: false,
          draggable: true,
          progress: undefined,
        })
        return defaultReturn;
      } else {
        const tempDeck = [...deckData]; // Create a copy
        let playerValue = 0
        const playerCard = tempDeck.pop()
        if (!playerCard) return defaultReturn;
        
        const cardImage = `/cards/${playerCard}.svg`
        const value = getValue(playerCard!)
        playerValue += value!
        if (value == 11) {
          setAces((prevState: Ace) => ({
            ...prevState,
            playerOneAces: prevState.playerOneAces + 1,
          }))
        }
        setCards((prevState: Card) => ({
          ...prevState,
          playerOneCards: [...prevState.playerOneCards, cardImage],
        }))

        setSums((prevState: Sum) => ({
          ...prevState,
          playerOneSum: prevState.playerOneSum + playerValue,
        }))
        setCurrentDeck(tempDeck)
        
        return {
          tempDeck,
          startDeck: tempDeck,
          cardImage,
          playerValue,
        };
      }
    } else {
      if (player === "1") {
        if (sums.playerOneSum >= 21) {
          toast.error("You can't get more cards", {
            position: "top-center",
            autoClose: 3000,
            hideProgressBar: true,
            closeOnClick: true,
            pauseOnHover: false,
            draggable: true,
            progress: undefined,
          })
          return {
            tempDeck: deckData,
            startDeck,
            cardImage: undefined,
            playerValue: 0,
          };
        } else {
          const tempDeck = [...deckData]; // Create a copy
          let playerValue = 0
          const playerCard = tempDeck.pop()
          if (!playerCard) return defaultReturn;
          
          const cardImage = `/cards/${playerCard}.svg`
          const value = getValue(playerCard!)
          playerValue += value!
          if (value == 11) {
            setAces((prevState: Ace) => ({
              ...prevState,
              playerOneAces: prevState.playerOneAces + 1,
            }))
          }
          setCards((prevState: Card) => ({
            ...prevState,
            playerOneCards: [...prevState.playerOneCards, cardImage],
          }))

          setSums((prevState: Sum) => ({
            ...prevState,
            playerOneSum: prevState.playerOneSum + playerValue,
          }))
          setCurrentDeck(tempDeck)
          return {
            tempDeck,
            startDeck: tempDeck,
            cardImage,
            playerValue,
          };
        }
      } else {
        if (sums.playerTwoSum >= 21) {
          toast.error("You can't get more cards", {
            position: "top-center",
            autoClose: 3000,
            hideProgressBar: true,
            closeOnClick: true,
            pauseOnHover: false,
            draggable: true,
            progress: undefined,
          })
          return {
            tempDeck: deckData,
            startDeck,
            cardImage: undefined,
            playerValue: 0,
          };
        } else {
          const tempDeck = [...deckData]; // Create a copy
          let playerValue = 0
          const playerCard = tempDeck.pop()
          if (!playerCard) return defaultReturn;
          
          const cardImage = `/cards/${playerCard}.svg`
          const value = getValue(playerCard!)
          playerValue += value!
          if (value == 11) {
            setAces((prevState: Ace) => ({
              ...prevState,
              playerTwoAces: prevState.playerTwoAces + 1,
            }))
          }
          setCards((prevState: Card) => ({
            ...prevState,
            playerTwoCards: [...prevState.playerTwoCards, cardImage],
          }))

          setSums((prevState: Sum) => ({
            ...prevState,
            playerTwoSum: prevState.playerTwoSum + playerValue,
          }))
          setCurrentDeck(tempDeck)
          return {
            tempDeck,
            startDeck: tempDeck,
            cardImage,
            playerValue,
          };
        }
      }
    }
  }

  const dealCards = (deckData: string[]) => {
    const usedDeck: string[] = deckData
    if (usedDeck.length >= 4) {
      // setRoundText([])
      setAces({
        playerOneAces: 0,
        playerTwoAces: 0,
        houseAces: 0,
      })
      setCards({
        playerOneCards: [],
        playerTwoCards: [],
        houseCards: [],
      })

      // setIsStand(false)
      let houseValue = 0
      const housecurrentCards: string[] = []
      for (let i = 0; i < 2; i++) {
        const dealerCard = usedDeck?.pop()

        const cardImage = `/cards/${dealerCard}.svg`

        const value = getValue(dealerCard!)
        houseValue += value!
        housecurrentCards.push(cardImage)
        if (value == 11) {
          // setAces({...aces, houseAces : aces.houseAces + 1})
          setAces({
            ...aces,
            houseAces: aces.houseAces + 1,
          })
        }
      }

      while (houseValue < 17) {
        if (usedDeck.length === 2) {
          break
        }
        const dealerCard = usedDeck.pop()
        const cardImage = `/cards/${dealerCard}.svg`
        housecurrentCards.push(cardImage)

        const value = getValue(dealerCard!)
        if (value == 11) {
          setAces({
            ...aces,
            houseAces: aces.houseAces + 1,
          })
        }

        houseValue += value!
      }
      // setSums({
      //   ...sums,
      //   houseSum: sums.houseSum + houseValue,
      // })
      // setCards({
      //   ...cards,
      //   houseCards: housecurrentCards,
      // })

      let playerOneValue = 0

      const playerOneCurrentCards: string[] = []

      for (let i = 0; i < 2; i++) {
        const playerCard = usedDeck.pop()
        const cardImage = `/cards/${playerCard}.svg`
        playerOneCurrentCards.push(cardImage)
        const value = getValue(playerCard!)
        playerOneValue += value!
        if (value == 11) {
          // setAceNumberPlayerOne((prevState) => prevState + 1)
          setAces({
            ...aces,
            playerOneAces: aces.playerOneAces + 1,
          })
        }
      }

      setCards({
        ...cards,
        houseCards: housecurrentCards,
        playerOneCards: playerOneCurrentCards,
      })
      setSums({
        ...sums,
        houseSum: houseValue,
        playerOneSum: playerOneValue,
      })
      setCurrentDeck(usedDeck)
    } else {
      toast.error("No more cards left. This is the final round!", {
        position: "top-center",
        autoClose: 3000,
        hideProgressBar: true,
        closeOnClick: true,
        pauseOnHover: false,
        draggable: true,
        progress: undefined,
      })
      setIsGameActive(false)
      setIsGameEnded(true)
    }
  }

  const checkAce = () => {
    if (sums.playerOneSum > 21 && aces.playerOneAces !== 0) {
      setSums({
        ...sums,
        playerOneSum: sums.playerOneSum - 10,
      })

      setAces({
        ...aces,
        playerOneAces: aces.playerOneAces - 1,
      })

      return true
    }
    // if (playerTwoSum > 21 && aceNumberPlayerTwo !== 0) {
    //   setPlayerOneSum((prevState: number) => prevState - 10)

    //   setAceNumberPlayerTwo((prevState) => prevState - 1)

    //   return true
    // }
    if (sums.houseSum > 21 && aces.houseAces !== 0) {
      // setHouseSum((prevState: number) => prevState - 10)
      setSums({
        ...sums,
        houseSum: sums.houseSum - 10,
      })

      setAces({
        ...aces,
        houseAces: aces.playerOneAces - 1,
      })

      // setAceNumberHouse((prevState) => prevState - 1)
      return true
    }
  }
  const getWinner = (
    player: string,
    result: string,
    draw: string,
    playerSum: string
  ) => {
    if (isSinglePlayer) {
      if (result === "1") {
        // const newRound = playerOneRound!.map((text, index) => {
        //   if (index === calculateIndex - 1) {
        //     // Create a *new* object with changes
        //     return "Win"
        //   } else {
        //     // No changes
        //     return text
        //   }
        // })
        // setRoundText(newRound)

        setPlayerOneRound((prev: string[]) =>
          prev.filter((text) => text !== "Calculating...")
        )
        setPlayerOneRound((prevState: string[]) => [...prevState, "Win"])

        setScore((prevState: Score) => ({
          ...prevState,
          playerOne: prevState.playerOne + 1,
        }))
      } else if (result === "0") {
        if (draw === "2") {
          if (parseInt(playerSum) > 21) {
            // const newRound = playerOneRound!.map((text, index) => {
            //   if (index === calculateIndex - 1) {
            //     // Create a *new* object with changes
            //     return "Lose"
            //   } else {
            //     // No changes
            //     return text
            //   }
            // })
            //  ("new round", newRound)
            // setRoundText(newRound)
            setPlayerOneRound((prev: string[]) =>
              prev.filter((text) => text !== "Calculating...")
            )
            setPlayerOneRound((prevState: string[]) => [...prevState, "Lose"])

            setScore((prevState: Score) => ({
              ...prevState,
              playerOne: prevState.playerOne - 1,
            }))
          } else {
            if (parseInt(playerSum) === 0) {
              setPlayerOneRound((prev: string[]) =>
                prev.filter((text) => text !== "Calculating...")
              )
              setPlayerOneRound((prevState: string[]) => [...prevState, "Lose"])

              setScore((prevState: Score) => ({
                ...prevState,
                playerOne: prevState.playerOne - 1,
              }))
            } else {
              setPlayerOneRound((prev: string[]) =>
                prev.filter((text) => text !== "Calculating...")
              )
              setPlayerOneRound((prevState: string[]) => [...prevState, "Draw"])
            }
          }
        } else {
          // const newRound = playerOneRound!.map((text, index) => {
          //   if (index === calculateIndex - 1) {
          //     // Create a *new* object with changes
          //     return "Lose"
          //   } else {
          //     // No changes
          //     return text
          //   }
          // })
          //  ("new round", newRound)
          // setRoundText(newRound)
          // const copyArr = [...playerOneRound]
          //  ("copyaarrr", copyArr)

          // copyArr.pop()
          // copyArr.push("Lose")
          // setPlayerOneRound(copyArr)
          setPlayerOneRound((prev: string[]) =>
            prev.filter((text) => text !== "Calculating...")
          )
          setPlayerOneRound((prevState: string[]) => [...prevState, "Lose"])

          setScore((prevState: Score) => ({
            ...prevState,
            playerOne: prevState.playerOne - 1,
          }))
        }
      } else if (result === "2") {
        if (parseInt(playerSum) > 21) {
          // const newRound = playerOneRound!.map((text, index) => {
          //   if (index === calculateIndex - 1) {
          //     // Create a *new* object with changes
          //     return "Lose"
          //   } else {
          //     // No changes
          //     return text
          //   }
          // })
          //  ("new round", newRound)
          // setRoundText(newRound)
          setPlayerOneRound((prev: string[]) =>
            prev.filter((text) => text !== "Calculating...")
          )
          setPlayerOneRound((prevState: string[]) => [...prevState, "Lose"])

          setScore((prevState: Score) => ({
            ...prevState,
            playerOne: prevState.playerOne - 1,
          }))
        } else {
          // const newRound = playerOneRound!.map((text, index) => {
          //   if (index === calculateIndex - 1) {
          //     // Create a *new* object with changes
          //     return "Draw"
          //   } else {
          //     // No changes
          //     return text
          //   }
          // })
          //  ("new round", newRound)
          // setRoundText(newRound)
          setPlayerOneRound((prev: string[]) =>
            prev.filter((text: string) => text !== "Calculating...")
          )
          setPlayerOneRound((prevState: string[]) => [...prevState, "Draw"])

          // setRoundText({
          //   ...roundText,
          //   playerOne: [...roundText.playerOne, "Lose"],
          // });
        }
      }
      // In single player mode, continue playing until explicitly ended
      if (currentDeck.length <= 4) {
        toast.info("Final round! You can end the game or continue.", {
          position: "top-center",
          autoClose: 5000,
        });
        // Don't automatically end the game - let player decide
      } else {
        // Deal next round automatically
        setTimeout(() => {
          dealCards(currentDeck);
        }, 2000); // 2 second delay to see results
      }
    } else {
      if (player === "1") {
        setStand({
          ...stand,
          playerOne: true,
        })
        if (result === "1") {
          setPlayerOneRound((prev: string[]) =>
            prev.filter((text) => text !== "Calculating...")
          )
          setPlayerOneRound((prevState: string[]) => [...prevState, "Win"])
          const eventData = {
            room: room,
            player: player,
            round: "Win",
            score: score.playerOne + 1,
          }
          setScore((prevState: Score) => ({
            ...prevState,
            playerOne: prevState.playerOne + 1,
          }))

          socket.emit("stand", eventData)
        } else if (result === "0") {
          setPlayerOneRound((prev: string[]) =>
            prev.filter((text) => text !== "Calculating...")
          )
          if (draw === "2") {
            if (parseInt(playerSum) > 21) {
              setPlayerOneRound((prevState: string[]) => [...prevState, "Lose"])
              const eventData = {
                room: room,
                player: player,
                round: "Lose",
                score: score.playerOne - 1,
              }
              setScore((prevState: Score) => ({
                ...prevState,
                playerOne: prevState.playerOne - 1,
              }))
              socket.emit("stand", eventData)
            } else {
              if (parseInt(playerSum) === 0) {
                setPlayerOneRound((prevState: string[]) => [
                  ...prevState,
                  "Lose",
                ])
                const eventData = {
                  room: room,
                  player: player,
                  round: "Lose",
                  score: score.playerOne - 1,
                }
                setScore((prevState: Score) => ({
                  ...prevState,
                  playerOne: prevState.playerOne - 1,
                }))
                socket.emit("stand", eventData)
              } else {
                setPlayerOneRound((prevState: string[]) => [
                  ...prevState,
                  "Draw",
                ])
                const eventData = {
                  room: room,
                  player: player,
                  round: "Draw",
                  score: score.playerOne,
                }
                socket.emit("stand", eventData)
              }
            }
          } else {
            setPlayerOneRound((prevState: string[]) => [...prevState, "Lose"])
            const eventData = {
              room: room,
              player: player,
              round: "Lose",
              score: score.playerOne - 1,
            }
            setScore((prevState: Score) => ({
              ...prevState,
              playerOne: prevState.playerOne - 1,
            }))
            socket.emit("stand", eventData)
          }
        } else if (result === "2") {
          if (parseInt(playerSum) > 21) {
            setPlayerOneRound((prev: string[]) =>
              prev.filter((text) => text !== "Calculating...")
            )
            setPlayerOneRound((prevState: string[]) => [...prevState, "Lose"])
            const eventData = {
              room: room,
              player: player,
              round: "Lose",
              score: score.playerOne - 1,
            }
            setScore((prevState: Score) => ({
              ...prevState,
              playerOne: prevState.playerOne - 1,
            }))
            socket.emit("stand", eventData)
            // setRoundText({
            //   ...roundText,
            //   playerOne: [...roundText.playerOne, "Lose"],
            // });
          } else {
            setPlayerOneRound((prev: string[]) =>
              prev.filter((text) => text !== "Calculating...")
            )
            setPlayerOneRound((prevState: string[]) => [...prevState, "Draw"])
          }
          const eventData = {
            room: room,
            player: player,
            round: "Draw",
            score: score.playerOne,
          }
          socket.emit("stand", eventData)
        }
      } else {
        setStand({
          ...stand,
          playerTwo: true,
        })
        if (result === "1") {
          setPlayerTwoRound((prev: string[]) =>
            prev.filter((text) => text !== "Calculating...")
          )
          setPlayerTwoRound((prevState: string[]) => [...prevState, "Win"])
          const eventData = {
            room: room,
            player: player,
            round: "Win",
            score: score.playerTwo + 1,
          }
          setScore((prevState: Score) => ({
            ...prevState,
            playerTwo: prevState.playerTwo + 1,
          }))
          socket.emit("stand", eventData)
        } else if (result === "0") {
          setPlayerTwoRound((prev: string[]) =>
            prev.filter((text) => text !== "Calculating...")
          )
          if (draw === "2") {
            if (parseInt(playerSum) > 21) {
              setPlayerTwoRound((prevState: string[]) => [...prevState, "Lose"])
              const eventData = {
                room: room,
                player: player,
                round: "Lose",
                score: score.playerTwo - 1,
              }
              setScore((prevState: Score) => ({
                ...prevState,
                playerTwo: prevState.playerTwo - 1,
              }))
              socket.emit("stand", eventData)
            } else {
              if (parseInt(playerSum) === 0) {
                setPlayerTwoRound((prevState: string[]) => [
                  ...prevState,
                  "Lose",
                ])
                const eventData = {
                  room: room,
                  player: player,
                  round: "Lose",
                  score: score.playerTwo - 1,
                }
                setScore((prevState: Score) => ({
                  ...prevState,
                  playerTwo: prevState.playerTwo - 1,
                }))
                socket.emit("stand", eventData)
              } else {
                setPlayerTwoRound((prevState: string[]) => [
                  ...prevState,
                  "Draw",
                ])
                const eventData = {
                  room: room,
                  player: player,
                  round: "Draw",
                  score: score.playerTwo,
                }
                socket.emit("stand", eventData)
              }
            }
          } else {
            setPlayerTwoRound((prevState: string[]) => [...prevState, "Lose"])
            const eventData = {
              room: room,
              player: player,
              round: "Lose",
              score: score.playerTwo - 1,
            }
            setScore((prevState: Score) => ({
              ...prevState,
              playerTwo: prevState.playerTwo - 1,
            }))
            socket.emit("stand", eventData)
          }
        } else if (result === "2") {
          if (parseInt(playerSum) > 21) {
            setPlayerTwoRound((prev: string[]) =>
              prev.filter((text) => text !== "Calculating...")
            )
            setPlayerTwoRound((prevState: string[]) => [...prevState, "Lose"])
            const eventData = {
              room: room,
              player: player,
              round: "Lose",
              score: score.playerTwo - 1,
            }
            setScore((prevState: Score) => ({
              ...prevState,
              playerTwo: prevState.playerTwo - 1,
            }))
            socket.emit("stand", eventData)
          } else {
            setPlayerTwoRound((prev: string[]) =>
              prev.filter((text) => text !== "Calculating...")
            )
            setPlayerTwoRound((prevState: string[]) => [...prevState, "Draw"])
          }
        }
      }
    }
  }

  const getValue = (card: string) => {
    const data = card?.split("-")
    const value = data[0]

    const check = /\d/.test(value!)

    if (check == false) {
      if (value == "A") {
        return 11
      }
      return 10
    } else {
      return parseInt(value!)
    }
  }

  return (
    <div className="h-fit">
      <Table
        isGameEnded={isGameEnded}
        getCard={getCard}
        library={anchorProvider}
        account={anchorProvider?.wallet.publicKey || null}
        room={room}
        isLoading={isLoading}
        currentDeck={currentDeck}
        playerOneRound={playerOneRound}
        playerTwoRound={playerTwoRound}
        score={score}
        calculateProof={calculateProof}
        withdrawBet={withdrawBet}
        playerOne={playerOne || null}
        setPlayerOne={(val: string) => {
          try {
            setPlayerOneKey(val);
          } catch (error) {
            console.error("Invalid PublicKey for playerOne:", val);
          }
        }}
        playerTwo={playerTwo || null}
        setPlayerTwo={(val: string) => {
          try {
            setPlayerTwoKey(val);
          } catch (error) {
            console.error("Invalid PublicKey for playerTwo:", val);
          }
        }}
      />
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

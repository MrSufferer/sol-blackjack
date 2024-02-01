import React, {
  useState,
  useEffect,
  useRef,
  useReducer,
  useContext,
} from "react"
import { BigNumber, Contract, ethers, providers, utils } from "ethers"
import {
  BLACKJACK_CONTRACT_ABI,
  BLACKJACK_CONTRACT_ADDRESS,
  BLACKJACK_VERIFIER_CONTRACT_ABI,
  BLACKJACK_VERIFIER_CONTRACT_ADDRESS,
} from "../../constants/index"
import Image from "next/image"
import { toast, ToastContainer } from "react-toastify"
import "react-toastify/dist/ReactToastify.css"
import { Modal } from "./Modal"
import { Table } from "./Table"
import { useRouter } from "next/router"
import { useSockets, Withdraw } from "../context/SocketContext"
import { blackjackCalldata } from "../../zkproof/snarkjsBlackjack"
import { Ace, Card, Sum, Stand, Score } from "../context/SocketContext"
import Router from "next/router"

interface IProps {
  library: ethers.providers.Web3Provider
  account: string
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
  tempDeck?: string[] | undefined
  startDeck?: string[] | undefined
  cardImage?: string | undefined
  playerValue?: number | undefined
}

export const Game: React.FC<IProps> = ({
  library,
  account,
  isLoading,
  setIsLoading,

  room,
}) => {
  const [currentDeck, setCurrentDeck] = useState<string[]>([])

  // const [roundText, setRoundText] = useState<RoundResult>({
  //   playerOne: [],
  //   playerTwo: [],
  // })

  const [playerTwo, setPlayerTwo] = useState("")
  const [playerOne, setPlayerOne] = useState("")

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
      if (isSinglePlayer) {
        const firstDeck = constructDeck()

        dealCards(firstDeck)
      }
    }
    return () => {
      effectRan.current = true
    }
  }, [])

  const deck: string[] = []

  const withdrawBet = async (player: string) => {
    try {
      const signer = library?.getSigner()

      const blackjackContract = new Contract(
        BLACKJACK_CONTRACT_ADDRESS,
        BLACKJACK_CONTRACT_ABI,
        signer
      )
      if (player === "1") {
        if (score.playerOne > 0) {
          const tx: TransactionResponse = await toast.promise(
            blackjackContract.withdrawBet(
              ethers.utils.parseEther("0.02"),
              parseInt(room!)
            ),

            {
              pending: "Withdrawing...",
              success: "Withdrew succesfully",
              error: "Something went wrong 🤯",
            }
          )
          const confirmation = await library.waitForTransaction(tx.hash)
          // setIsCanWithdraw((prevState: Withdraw) => ({
          //   ...prevState,
          //   playerOne: true,
          // }))
        } else if (score.playerOne === 0) {
          const tx: TransactionResponse = await toast.promise(
            blackjackContract.withdrawBet(
              ethers.utils.parseEther("0.01"),
              parseInt(room!)
            ),

            {
              pending: "Withdrawing...",
              success: "Withdrew succesfully",
              error: "Something went wrong 🤯",
            }
          )
          const confirmation = await library.waitForTransaction(tx.hash)
          // setIsCanWithdraw((prevState: Withdraw) => ({
          //   ...prevState,
          //   playerOne: true,
          // }))
        }
      } else {
        if (score.playerTwo > 0) {
          const tx: TransactionResponse = await toast.promise(
            blackjackContract.withdrawBet(
              ethers.utils.parseEther("0.02"),
              parseInt(room!)
            ),

            {
              pending: "Withdrawing...",
              success: "Withdrew succesfully",
              error: "Something went wrong 🤯",
            }
          )
          const confirmation = await library.waitForTransaction(tx.hash)
          // setIsCanWithdraw((prevState: Withdraw) => ({
          //   ...prevState,
          //   playerTwo: true,
          // }))
        } else if (score.playerTwo === 0) {
          const tx: TransactionResponse = await toast.promise(
            blackjackContract.withdrawBet(
              ethers.utils.parseEther("0.01"),
              parseInt(room!)
            ),

            {
              pending: "Withdrawing...",
              success: "Withdrew succesfully",
              error: "Something went wrong 🤯",
            }
          )
          const confirmation = await library.waitForTransaction(tx.hash)
          // setIsCanWithdraw((prevState: Withdraw) => ({
          //   ...prevState,
          //   playerTwo: true,
          // }))
        }
      }

      // setRoundText(["Play", "Again"])
      setIsGameEnded(false)
      setIsLoading(false)
      router.push("/")
    } catch (err) {
      console.error(err)
    }
  }

  useEffect(() => {
    if (isGameEnded && currentDeck.length <= 4) {
      if (isSinglePlayer) {
        unlockBet(account, "1")
      } else {
        if (playerOneRound.length > 0 && playerTwoRound.length > 0) {
          if (account === playerOne) {
            unlockBet(account, "1")
          } else {
            unlockBet(account, "2")
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

  const unlockBet = async (playerAddress: string, playerNumber: string) => {
    try {
      const signer = new ethers.Wallet(
        process.env.NEXT_PUBLIC_PRIVATE_KEY!,
        library
      )

      const signerAddress = signer.getAddress()

      const blackjackContract = new Contract(
        BLACKJACK_CONTRACT_ADDRESS,
        BLACKJACK_CONTRACT_ABI,
        signer
      )
      const player = await blackjackContract.players(playerAddress)

      const gameId = await player.gameId

      if (playerNumber === "1") {
        if (score.playerOne > 0) {
          toast.info(
            "You have won the game and extra 0.01 ETH! Wait for withdraw button to come",
            {
              position: "top-center",
              autoClose: 5000,
              hideProgressBar: true,
              closeOnClick: true,
              pauseOnHover: true,
              draggable: true,
              progress: 0,
            }
          )
          setIsLoading(true)

          const data = {
            from: signerAddress,
            to: BLACKJACK_CONTRACT_ADDRESS,
            value: ethers.utils.parseEther("0.01"),
          }

          const tx: TransactionResponse = await signer.sendTransaction(data)

          const confirmation = await library.waitForTransaction(tx.hash)

          const endGame: TransactionResponse = await blackjackContract.endGame(
            account,
            gameId,
            ethers.utils.parseEther("0.02")
          )
          const endGameReceipt = await library.waitForTransaction(endGame.hash)

          // setIsCanWithdraw(true)
          setIsCanWithdraw((prevState: Withdraw) => ({
            ...prevState,
            playerOne: true,
          }))
        } else if (score.playerOne === 0) {
          toast.info(
            "It was a close game but it ended in tie. Wait for withdraw button to come to get back your initial bet",
            {
              position: "top-center",
              autoClose: 5000,
              hideProgressBar: true,
              closeOnClick: true,
              pauseOnHover: true,
              draggable: true,
              progress: 0,
            }
          )
          setIsLoading(true)

          const endGame: TransactionResponse = await blackjackContract.endGame(
            account,
            gameId,
            ethers.utils.parseEther("0.01")
          )
          const endGameReceipt = await library.waitForTransaction(endGame.hash)
          setIsCanWithdraw((prevState: Withdraw) => ({
            ...prevState,
            playerOne: true,
          }))
          // setIsCanWithdraw(true)
        } else {
          toast.info(
            "It was a close game but you have lost it. Play again to earn back your 0.01 ETH ",
            {
              position: "top-center",
              autoClose: 5000,
              hideProgressBar: true,
              closeOnClick: true,
              pauseOnHover: true,
              draggable: true,
              progress: 0,
            }
          )
          setIsLoading(true)

          const endGame: TransactionResponse = await blackjackContract.endGame(
            account,
            gameId,
            ethers.utils.parseEther("0.00")
          )
          const endGameReceipt = await library.waitForTransaction(endGame.hash)
          setIsCanWithdraw((prevState: Withdraw) => ({
            ...prevState,
            playerOne: false,
          }))
          setIsLoading(false)

          router.push("/")
        }
      } else {
        const nonce = await library.getTransactionCount(
          "0xB402f112a2C8BF41739129F69c52bb97Eb95119a"
        )
        if (score.playerTwo > 0) {
          toast.info(
            "You have won the game and extra 0.01 ETH! Wait for withdraw button to come",
            {
              position: "top-center",
              autoClose: 5000,
              hideProgressBar: true,
              closeOnClick: true,
              pauseOnHover: true,
              draggable: true,
              progress: 0,
            }
          )
          setIsLoading(true)

          const data = {
            from: signerAddress,
            to: BLACKJACK_CONTRACT_ADDRESS,
            value: ethers.utils.parseEther("0.01"),
          }

          const tx: TransactionResponse = await signer.sendTransaction(data)

          const confirmation = await library.waitForTransaction(tx.hash)

          const endGame: TransactionResponse = await blackjackContract.endGame(
            account,
            gameId,
            ethers.utils.parseEther("0.02"),
            {
              nonce: nonce + 1,
            }
          )
          const endGameReceipt = await library.waitForTransaction(endGame.hash)

          setIsCanWithdraw((prevState: Withdraw) => ({
            ...prevState,
            playerTwo: true,
          }))
        } else if (score.playerTwo === 0) {
          toast.info(
            "It was a close game but it ended in tie. Wait for withdraw button to come to get back your initial bet",
            {
              position: "top-center",
              autoClose: 5000,
              hideProgressBar: true,
              closeOnClick: true,
              pauseOnHover: true,
              draggable: true,
              progress: 0,
            }
          )
          setIsLoading(true)
          const endGame: TransactionResponse = await blackjackContract.endGame(
            account,
            gameId,
            ethers.utils.parseEther("0.01"),
            {
              nonce: nonce + 1,
            }
          )
          const endGameReceipt = await library.waitForTransaction(endGame.hash)

          setIsCanWithdraw((prevState: Withdraw) => ({
            ...prevState,
            playerTwo: true,
          }))
        } else {
          toast.info(
            "It was a close game but you have lost it. Play again to earn back your 0.01 ETH ",
            {
              position: "top-center",
              autoClose: 5000,
              hideProgressBar: true,
              closeOnClick: true,
              pauseOnHover: true,
              draggable: true,
              progress: 0,
            }
          )
          setIsLoading(true)
          const endGame: TransactionResponse = await blackjackContract.endGame(
            account,
            gameId,
            ethers.utils.parseEther("0.00"),
            {
              nonce: nonce + 1,
            }
          )
          const endGameReceipt = await library.waitForTransaction(endGame.hash)
          setIsCanWithdraw((prevState: Withdraw) => ({
            ...prevState,
            playerTwo: false,
          }))
          setIsLoading(false)

          router.push("/")
        }
      }

      // setRoundText(["Play", "Again"])
    } catch (err) {
      console.error(err)
    }
  }

  const calculateProof = async (player: string) => {
    let calldata: any
    if (isSinglePlayer) {
      setPlayerOneRound([...playerOneRound, "Calculating..."])
      calldata = await blackjackCalldata(sums.playerOneSum, sums.houseSum)
    } else {
      if (player === "1") {
        setPlayerOneRound([...playerOneRound, "Calculating..."])

        calldata = await blackjackCalldata(sums.playerOneSum, sums.houseSum)
      } else {
        setPlayerTwoRound([...playerTwoRound, "Calculating..."])

        calldata = await blackjackCalldata(sums.playerTwoSum, sums.houseSum)
      }
    }

    try {
      const signer = library?.getSigner()

      const blackjackContract = new Contract(
        BLACKJACK_CONTRACT_ADDRESS,
        BLACKJACK_CONTRACT_ABI,
        signer
      )

      const result: TransactionResponse =
        await blackjackContract.verifyRoundWin(
          calldata.a,
          calldata.b,
          calldata.c,
          calldata.Input
        )
      if (result) {
        getWinner(
          player,
          calldata.Input[0],
          calldata.Input[1],
          calldata.Input[2]
        )
      } else {
        return false
      }
    } catch (error) {
      console.error(error)
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

  function getCard(deckData: string[], player: string): CardGet | any {
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
      } else {
        const tempDeck = deckData
        let playerValue = 0
        const playerCard = tempDeck.pop()
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
          return { startDeck }
        } else {
          const tempDeck = deckData
          let playerValue = 0
          const playerCard = tempDeck.pop()
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
            cardImage,
            playerValue,
          }
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
            startDeck,
          }
        } else {
          const tempDeck = deckData
          let playerValue = 0
          const playerCard = tempDeck.pop()
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
            cardImage,
            playerValue,
          }
        }
      }
    }
  }

  useEffect(() => {
    checkAce()
  }, [sums])

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
        const cardImage = `/${dealerCard}.png`
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
      if (currentDeck.length <= 4) {
        setIsGameActive(false)
        setIsGameEnded(true)

        // unlockBet(account, "1")
      } else {
        dealCards(currentDeck)
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
        library={library}
        account={account}
        // socket={socket}
        room={room}
        isLoading={isLoading}
        currentDeck={currentDeck}
        playerOneRound={playerOneRound!}
        playerTwoRound={playerTwoRound!}
        score={score}
        // isCanWithdraw={isCanWithdraw!}
        calculateProof={calculateProof}
        withdrawBet={withdrawBet}
        playerOne={playerOne}
        setPlayerOne={setPlayerOne}
        playerTwo={playerTwo}
        setPlayerTwo={setPlayerTwo}
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

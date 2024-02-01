import type { NextPage } from "next"
import Head from "next/head"
import { useState, useEffect, useContext } from "react"
import { Wallet } from "../components/Wallet"
import io from "socket.io-client"
import Image from "next/image"
import { useRouter } from "next/router"
import { toast, ToastContainer } from "react-toastify"
import "react-toastify/dist/ReactToastify.css"
// import { constructDeck } from "../utils/constructDeck"
import {
  BLACKJACK_CONTRACT_ABI,
  BLACKJACK_CONTRACT_ADDRESS,
} from "../../constants"

import { Game } from "../components/Game"
import { BigNumber, Contract, ethers, providers, utils } from "ethers"
import Rules from "../components/Rules"
import { Modal } from "../components/Modal"
import { useSockets } from "../context/SocketContext"

interface IProps {
  library: ethers.providers.Web3Provider
  account: string
  isLoading: boolean
  setIsLoading: (val: boolean) => void
}

interface TransactionResponse {
  hash: string
}

const Home: NextPage<IProps> = ({
  library,
  account,
  isLoading,
  setIsLoading,
}) => {
  const [isJoin, setIsJoin] = useState<boolean>(false)
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false)

  const [room, setRoom] = useState("")
  const router = useRouter()

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

  const constructDeck = () => {
    const deck: string[] = []

    const cardValues: string[] = [
      "A",
      "2",
      "3",
      "4",
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

  const joinRoom = async (data: any) => {
    try {
      setIsLoading(true)
      const tempDeck = constructDeck()

      const signer = library?.getSigner()

      const blackjackContract = new Contract(
        BLACKJACK_CONTRACT_ADDRESS,
        BLACKJACK_CONTRACT_ABI,
        signer
      )

      const roomCheck = await blackjackContract.games(parseInt(room))

      if (
        room !== "" &&
        roomCheck[2] !== "0x0000000000000000000000000000000000000000"
      ) {
        const joinGame: TransactionResponse = await toast.promise(
          blackjackContract.joinGame(room, {
            value: ethers.utils.parseEther("0.01"),
          }),
          {
            pending: "Sending transaction...",
            success: "Joining to room",
            error: "Something went wrong 🤯",
          }
        )
        const confirmation = await library.waitForTransaction(joinGame.hash)
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
        } = dealRoundCards(tempDeck)

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
          // cards: cards,
          // aces: aces,
          // sums: sums,
        }

        socket.emit("join_room", sendData)
        setStand({
          playerOne: false,
          playerTwo: false,
        })
        setIsGameActive(true)
        setIsSinglePlayer(false)
        setIsLoading(false)
        router.push(`/room/${data}`)
      }
    } catch (error) {
      setIsLoading(false)
      // setCards({})
      console.error(error)
    }
  }

  const createRoom = async () => {
    try {
      setIsLoading(true)
      const signer = library?.getSigner()

      const blackjackContract = new Contract(
        BLACKJACK_CONTRACT_ADDRESS,
        BLACKJACK_CONTRACT_ABI,
        signer
      )
      const gameRoom = await blackjackContract.gameId()

      const createGame: TransactionResponse = await toast.promise(
        blackjackContract.startMultiplayerGame({
          value: ethers.utils.parseEther("0.01"),
        }),

        {
          pending: "Sending transaction...",
          success: "Starting the game",
          error: "Something went wrong 🤯",
        }
      )

      const confirmation = await library.waitForTransaction(createGame.hash)

      socket.emit("create_room", gameRoom.toString())
      // const newRoom = window.prompt()
      // socket.emit("create_room", newRoom?.toString())
      setIsGameActive(true)
      setIsSinglePlayer(false)
      router.push(`/room/${gameRoom}`)
      // router.push(`/room/${newRoom}`)
    } catch (err) {
      console.error(err)
      setIsLoading(false)
    }
  }

  const startSinglePlayer = async () => {
    try {
      const signer = library?.getSigner()

      const blackjackContract = new Contract(
        BLACKJACK_CONTRACT_ADDRESS,
        BLACKJACK_CONTRACT_ABI,
        signer
      )

      const gameRoom = await blackjackContract.gameId()

      const createGame: TransactionResponse = await toast.promise(
        blackjackContract.startSinglePlayerGame({
          value: ethers.utils.parseEther("0.01"),
        }),

        {
          pending: "Sending transaction...",
          success: "Starting the game",
          error: "Something went wrong 🤯",
        }
      )
      setIsLoading(true)

      const confirmation = await library.waitForTransaction(createGame.hash)
      setIsSinglePlayer(true)
      setIsGameActive(true)

      router.push(`/room/${gameRoom}`)
    } catch (err) {
      console.error(err)
      setIsLoading(false)
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

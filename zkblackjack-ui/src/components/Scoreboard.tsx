import React, { useEffect } from "react"
import truncateEthAddress from "truncate-eth-address"
import { Score } from "../context/SocketContext"

interface IProps {
  playerOne: string
  playerTwo: string
  isSinglePlayer: boolean
  score: Score
  playerOneRound: string[]
  playerTwoRound?: string[]
}

export const Scoreboard: React.FC<IProps> = ({
  playerOne,
  playerOneRound,
  playerTwoRound,
  isSinglePlayer,
  playerTwo,
  score,
}) => {
  return (
    <div
      className={`hidden md:grid -mt-32 text-white font-poppins grid-cols-2 grid-rows-4 text-center lg:mt-4 ${
        isSinglePlayer ? "ml-16" : "ml-10"
      } ml-4 justify-center w-64 h-64 bg-transparent rounded-xl`}
    >
      <div
        className={`col-start-1 row-start-1 row-span-3  col-span-1  ${
          isSinglePlayer ? "" : "border-r-2 border-r-white "
        }border-opacity-20 mt-6 h-fit`}
      >
        <h1 className=" border-b-2 border-b-white pb-2 border-opacity-20">
          {playerOne ? truncateEthAddress(playerOne) : "Player 1"}
        </h1>
        <div className="mt-2 flex flex-col h-full">
          {playerOneRound!
            ? playerOneRound!.map((round: string, index: number) => {
                return (
                  <h1 className="" key={index}>
                    {round}
                  </h1>
                )
              })
            : ""}
        </div>
        <div className={`row-start-4 md:top-8 lg:top-28 relative`}>
          {playerOneRound && playerOneRound!.length > 0 && (
            <h1 className="font-poppins text-xl">Score : {score.playerOne}</h1>
          )}
        </div>
      </div>
      {!isSinglePlayer && (
        <div className="col-start-2 col-span-1 mt-6 ">
          <h1 className="border-b-2 border-b-white pb-2 border-opacity-20">
            {playerTwo ? truncateEthAddress(playerTwo) : "Player 2"}
          </h1>
          <div className="mt-2">
            {playerTwoRound!
              ? playerTwoRound!.map((round: string, index: number) => {
                  return (
                    <h1 className="" key={index}>
                      {round}
                    </h1>
                  )
                })
              : ""}
          </div>
          <div className={`row-start-4 top-28 relative`}>
            {playerTwoRound && playerTwoRound!.length > 0 && (
              <h1 className="font-poppins text-xl">
                Score : {score.playerTwo}
              </h1>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

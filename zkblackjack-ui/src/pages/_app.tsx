import "../styles/globals.css"
import type { AppType } from "next/dist/shared/lib/utils"
import React, { useState, useRef, useEffect, useImperativeHandle } from "react"
import { ethers } from "ethers"
import { Navbar } from "../components/Navbar"
import io, { Socket } from "socket.io-client"
// import { socket, SocketProvider } from "../../context/socket"
import SocketsProvider from "../context/SocketContext"
import { SolanaProvider } from "../context/Solana"
import { AnchorProvider } from "@coral-xyz/anchor"

const MyApp: AppType = ({ Component, pageProps }) => {
  // const anchorProvider = useAnchorProvider()
  const [provider, setProvider] = useState()
  const [isLoading, setIsLoading] = useState<boolean>(false)

  return (
    <>
      <SocketsProvider>

        <SolanaProvider>
          <div>
            <Navbar
              provider={provider}
              setProvider={setProvider}
            />
            <Component
              {...pageProps}
              isLoading={isLoading}
              setIsLoading={setIsLoading}
              // isSinglePlayer={isSinglePlayer}
              // setIsSinglePlayer={setIsSinglePlayer}
              // isGameActive={isGameActive}
              // setIsGameActive={setIsGameActive}
              // socket={socket}
            />
          </div>
        </SolanaProvider>
      </SocketsProvider>
    </>
  )
}

export default MyApp

import "../styles/globals.css"
import type { AppType } from "next/dist/shared/lib/utils"
import React, { useState, useRef, useEffect, useImperativeHandle } from "react"
import { Navbar } from "../components/Navbar"
import io, { Socket } from "socket.io-client"
// import { socket, SocketProvider } from "../../context/socket"
import SocketsProvider from "../context/SocketContext"
import dynamic from "next/dynamic"
import { AnchorProvider } from "@coral-xyz/anchor"

const SolanaProvider = dynamic(
  () => import("../context/Solana").then((mod) => ({ default: mod.SolanaProvider })),
  {
    ssr: false,
    loading: () => <div>Loading...</div>,
  }
)

const MyApp: AppType = ({ Component, pageProps }) => {
  const [isLoading, setIsLoading] = useState<boolean>(false)

  return (
    <>
      <SocketsProvider>
        <SolanaProvider>
          <div>
            <Navbar />
            <Component
              {...pageProps}
              isLoading={isLoading}
              setIsLoading={setIsLoading}
            />
          </div>
        </SolanaProvider>
      </SocketsProvider>
    </>
  )
}

export default MyApp

import "../styles/globals.css"
import type { AppType } from "next/dist/shared/lib/utils"
import React, { useState, useRef, useEffect, useImperativeHandle } from "react"
import { ethers } from "ethers"
import { Navbar } from "../components/Navbar"
import io, { Socket } from "socket.io-client"
// import { socket, SocketProvider } from "../../context/socket"
import SocketsProvider from "../context/SocketContext"

const MyApp: AppType = ({ Component, pageProps }) => {
  const [library, setLibrary] = useState<ethers.providers.Web3Provider>()
  const [account, setAccount] = useState<string>("")
  const [provider, setProvider] = useState()
  const [isLoading, setIsLoading] = useState<boolean>(false)

  return (
    <>
      <SocketsProvider>
        <Navbar
          library={library!}
          setLibrary={setLibrary}
          account={account}
          setAccount={setAccount}
          provider={provider}
          setProvider={setProvider}
        />
        <Component
          {...pageProps}
          library={library!}
          account={account}
          isLoading={isLoading}
          setIsLoading={setIsLoading}
          // isSinglePlayer={isSinglePlayer}
          // setIsSinglePlayer={setIsSinglePlayer}
          // isGameActive={isGameActive}
          // setIsGameActive={setIsGameActive}
          // socket={socket}
        />
      </SocketsProvider>
    </>
  )
}

export default MyApp

import "../styles/globals.css"
import type { AppType } from "next/dist/shared/lib/utils"
import React, { useState } from "react"
import { Navbar } from "../components/Navbar"
import SocketsProvider from "../context/SocketContext"
import ErrorBoundary from "../components/ErrorBoundary"
import SafeComponent from "../components/SafeComponent"
import dynamic from "next/dynamic"

const SolanaProvider = dynamic(
  () => import("../context/Solana").then((mod) => ({ default: mod.SolanaProvider })),
  {
    ssr: false,
    loading: () => <div style={{ padding: '20px', textAlign: 'center' }}>Loading wallet...</div>,
  }
)

const MyApp: AppType = ({ Component, pageProps }) => {
  const [isLoading, setIsLoading] = useState<boolean>(false)

  return (
    <ErrorBoundary>
      <SafeComponent name="SocketsProvider">
        <SocketsProvider>
          <SafeComponent name="SolanaProvider">
            <SolanaProvider>
              <div>
                <SafeComponent name="Navbar">
                  <Navbar />
                </SafeComponent>
                <SafeComponent name="MainComponent">
                  <Component
                    {...pageProps}
                    isLoading={isLoading}
                    setIsLoading={setIsLoading}
                  />
                </SafeComponent>
              </div>
            </SolanaProvider>
          </SafeComponent>
        </SocketsProvider>
      </SafeComponent>
    </ErrorBoundary>
  )
}

export default MyApp

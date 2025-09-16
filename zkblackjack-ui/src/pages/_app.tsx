import "../styles/globals.css"
import type { AppType } from "next/dist/shared/lib/utils"
import React, { useState } from "react"
import { Navbar } from "../components/Navbar"
import SocketsProvider from "../context/SocketContext"
import ErrorBoundary from "../components/ErrorBoundary"
import SafeComponent from "../components/SafeComponent"
import { SolanaProvider } from "../context/Solana"

const MyApp: AppType = ({ Component, pageProps }) => {
  const [isLoading, setIsLoading] = useState<boolean>(false)

  // Validate Component
  if (!Component || typeof Component !== 'function') {
    console.error('Invalid Component:', Component);
    return <div>Error: Invalid page component</div>;
  }

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

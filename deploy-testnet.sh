#!/bin/bash

# Gorbagana Blackjack Testnet Deployment Script

set -e

echo "🚀 Starting Solana Blackjack deployment to Gorbagana testnet..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if required tools are installed
check_dependencies() {
    print_status "Checking dependencies..."
    
    if ! command -v solana &> /dev/null; then
        print_error "Solana CLI not found. Please install it first."
        exit 1
    fi
    
    if ! command -v anchor &> /dev/null; then
        print_error "Anchor CLI not found. Please install it first."
        exit 1
    fi
    
    print_success "Dependencies check completed"
}

# Configure Solana CLI for Gorbagana
configure_gorbagana() {
    print_status "Configuring Solana CLI for Gorbagana testnet..."
    
    # Gorbagana Testnet v2 (Devnet) RPC endpoint
    GORBAGANA_RPC="https://rpc.gorbagana.wtf/"
    
    print_status "Using official Gorbagana Testnet v2 RPC endpoint: $GORBAGANA_RPC"
    read -p "Enter Gorbagana testnet RPC URL (or press Enter for default): " user_rpc
    
    if [ ! -z "$user_rpc" ]; then
        GORBAGANA_RPC="$user_rpc"
    fi
    
    # Set Solana config to Gorbagana testnet
    solana config set --url "$GORBAGANA_RPC"
    
    print_success "Configured Solana CLI for Gorbagana testnet: $GORBAGANA_RPC"
}

# Check wallet balance and request tokens if needed
check_balance() {
    print_status "Checking wallet balance..."
    
    balance=$(solana balance 2>/dev/null || echo "0")
    print_status "Current balance: $balance"
    
    if [[ "$balance" == "0"* ]]; then
        print_warning "Low GOR balance detected. You'll need GOR tokens for deployment."
        print_status "Please get GOR tokens from the Gorbagana faucet."
        print_status "Check docs.gorbagana.wtf for faucet information."
        read -p "Press Enter after getting GOR tokens to continue..."
    fi
}

# Build the program
build_program() {
    print_status "Building Solana program..."
    
    anchor build
    
    if [ $? -eq 0 ]; then
        print_success "Program built successfully"
    else
        print_error "Failed to build program"
        exit 1
    fi
}

# Deploy to Gorbagana testnet
deploy_program() {
    print_status "Deploying to Gorbagana testnet..."
    
    # Deploy with explicit cluster configuration
    anchor deploy --provider.cluster gorbagana-testnet
    
    if [ $? -eq 0 ]; then
        print_success "Program deployed successfully to Gorbagana testnet"
    else
        print_error "Failed to deploy program"
        exit 1
    fi
}

# Run tests
run_tests() {
    print_status "Running tests on Gorbagana testnet..."
    
    # Run tests against the deployed program
    anchor test --provider.cluster gorbagana-testnet --skip-local-validator
    
    if [ $? -eq 0 ]; then
        print_success "Tests passed successfully"
    else
        print_warning "Some tests failed. Please review the output."
    fi
}

# Setup frontend for Gorbagana
setup_frontend() {
    print_status "Setting up frontend for Gorbagana..."
    
    if [ -d "zkblackjack-ui" ]; then
        cd zkblackjack-ui
        
        print_status "Installing frontend dependencies..."
        npm install
        
        print_status "Building frontend..."
        npm run build
        
        print_success "Frontend setup completed"
        cd ..
    else
        print_warning "Frontend directory not found. Skipping frontend setup."
    fi
}

# Display deployment summary
show_summary() {
    print_success "🎉 Deployment to Gorbagana testnet completed!"
    echo
    print_status "=== Deployment Summary ==="
    echo "• Network: Gorbagana Testnet v1"
    echo "• Program deployed and tested"
    echo "• Frontend configured for Gorbagana"
    echo
    print_status "=== Next Steps ==="
    echo "1. Test your dApp in the browser"
    echo "2. Connect wallet to Gorbagana testnet"
    echo "3. Get GOR tokens from faucet if needed"
    echo "4. Play some blackjack! 🃏"
    echo
    print_status "=== Resources ==="
    echo "• Gorbagana Docs: https://docs.gorbagana.wtf"
    echo "• GitHub: https://github.com/gorbagana-dev"
    echo "• Your frontend: cd zkblackjack-ui && npm run dev"
}

# Main deployment flow
main() {
    print_status "🎯 Starting Gorbagana Blackjack deployment..."
    
    check_dependencies
    configure_gorbagana
    check_balance
    build_program
    deploy_program
    run_tests
    setup_frontend
    show_summary
    
    print_success "✅ All done! Your blackjack game is ready on Gorbagana!"
}

# Run main function
main "$@" 
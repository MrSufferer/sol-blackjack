# React Error #130 Troubleshooting Guide
**"Objects are not valid as a React child" - Complete Debugging Journey**

## 🔥 **Problem Summary**
Next.js frontend deployed on Vercel was failing with:
```
framework-9b5d6ec4444c80fa.js:11 Error: Minified React error #130; visit https://reactjs.org/docs/error-decoder.html?invariant=130&args[]=object&args[]= for the full message or use the non-minified dev environment for full errors and additional helpful warnings.
```

Additional symptoms:
- "Application error: a client-side exception has occurred"
- CORS errors from socket.io connection to `https://zkblackjack.onrender.com/`
- 404 error for favicon.ico
- Multiple failed XMLHttpRequest attempts with 502 Bad Gateway errors

## 🔍 **Root Cause Analysis**

### What React Error #130 Means
According to React's official documentation and web research, this error occurs when:
> **"Objects are not valid as a React child (found: object with keys {key}). If you meant to render a collection of children, use an array instead."**

### Common Causes Identified
1. **Rendering objects directly in JSX**: `{user}` instead of `{user.name}`
2. **Rendering arrays directly**: `{users}` instead of `{users.map(...)}`
3. **Rendering Date objects**: `{new Date()}` instead of `{new Date().toString()}`
4. **Double curly braces**: `{{message}}` instead of `{message}`
5. **Calling async functions in JSX**: Returns Promise objects
6. **Invalid component types**: Passing undefined or null components
7. **Props type mismatches**: Component expects one type but receives another

## 📋 **Project Context**
- **Application**: zkBlackjack - Solana blockchain game
- **Framework**: Next.js with TypeScript
- **Deployment**: Vercel
- **Features**: Multiplayer blackjack with WebSocket (socket.io), ZK proofs, Solana integration
- **Issue**: Mixed Ethereum/Solana blockchain implementations causing type conflicts

## 🛠️ **Solutions Attempted**

### 1. **Initial Mixed Blockchain Code Cleanup**
**Problem**: Code was attempting to use both Ethereum (ethers.js) and Solana simultaneously

**Files Modified**:
- `src/pages/index.tsx`
- `src/components/Game.tsx`

**Changes**:
- Removed all ethers.js imports and references
- Replaced Ethereum contract calls with Solana placeholder implementations
- Added proper wallet connection checks
- Updated props interfaces

### 2. **Enhanced Error Handling Implementation**
**Problem**: React errors were crashing the entire application

**Files Created**:
- `src/components/ErrorBoundary.tsx` - Class component to catch React errors
- `src/components/SafeComponent.tsx` - Wrapper to validate components before rendering

**Files Modified**:
- `src/pages/_app.tsx` - Added error boundaries and safe component wrappers

**Implementation**:
```tsx
// ErrorBoundary.tsx
class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return <div>Something went wrong. Please refresh the page.</div>;
    }
    return this.props.children;
  }
}
```

### 3. **Socket Connection Error Handling**
**Problem**: WebSocket connection failures causing additional errors

**Files Modified**:
- `src/context/SocketContext.tsx`

**Changes**:
- Enhanced socket connection with better error handling
- Added try-catch wrapper around socket initialization
- Implemented fallback mock socket for when connection fails
- Added connection error logging

### 4. **Missing Assets Fix**
**Problem**: 404 error for favicon.ico

**Files Modified**:
- `src/pages/_document.tsx`

**Changes**:
- Added SVG-based favicon using data URI
- Added proper meta tags for SEO and viewport

### 5. **Component Interface Fixes**
**Problem**: Type mismatches in component props

**Files Modified**:
- `src/components/Game.tsx`
- `src/pages/room/[id].tsx`

**Changes**:
- Fixed type mismatches (PublicKey to string conversions)
- Added null checks and error handling
- Removed premature function calls that could cause undefined references

### 6. **Critical Props Mismatch Fix**
**Problem**: Game component props interface didn't match usage

**Discovery**: The `/pages/room/[id].tsx` was passing `account` and `library` props to `Game` component, but these had been removed from the component's interface.

**Before (causing error #130)**:
```tsx
<Game account={account} library={library} isLoading={isLoading} setIsLoading={setIsLoading} room={room} />
```

**After (fixed)**:
```tsx
<Game isLoading={isLoading} setIsLoading={setIsLoading} room={room} />
```

### 7. **Scoreboard Component Type Safety**
**Problem**: Scoreboard component expecting PublicKey objects but receiving undefined values

**Files Modified**:
- `src/components/Scoreboard.tsx`
- `src/components/Table.tsx`

**Changes**:
```tsx
// Before
interface IProps {
  playerOne: PublicKey      // ❌ Could be undefined
  playerTwo: PublicKey      // ❌ Could be undefined
}

// After
interface IProps {
  playerOne?: PublicKey | null  // ✅ Properly typed
  playerTwo?: PublicKey | null  // ✅ Properly typed
}
```

**Added Safety Checks**:
- Early return if required props are missing
- Proper null/undefined handling for PublicKey objects
- Removed non-null assertion operators (`!`)

### 8. **Ethereum Code Removal**
**Problem**: Leftover Ethereum contract calls in Table component

**Files Modified**:
- `src/components/Table.tsx`

**Changes**:
- Replaced `Contract`, `ethers.utils`, `getSigner()` calls with Solana placeholders
- Fixed type conversion issues (`PublicKey | null` to `string`)
- Updated `setPlayerOne` calls to handle null values properly

## 📊 **Build Results**

### ✅ **Successful Build Output**
```bash
info  - Compiled successfully
info  - Collecting page data  
info  - Generating static pages (10/10)
info  - Finalizing page optimization  

Route (pages)                              Size     First Load JS
┌ ○ /                                      3.92 kB         301 kB
├   /_app                                  0 B             286 kB
├ ○ /404                                   2.44 kB         288 kB
├ λ /api                                   0 B             286 kB
├ λ /api/socket                            0 B             286 kB
├ ○ /create                                266 B           286 kB
└ ○ /room/[id]                             244 kB          541 kB
```

### ⚠️ **Remaining Issues**
Socket connection errors still present (expected):
```
Socket connection error: TransportError: websocket error
Error: Unexpected server response: 502
URL: 'wss://zkblackjack.onrender.com/socket.io/'
```

**Note**: These are backend-related (server down) and won't crash the frontend anymore.

## 🔄 **Current Status**
- ✅ **React Error #130**: Partially resolved for build process
- ✅ **Application loads**: No more complete crash
- ✅ **Error boundaries**: Graceful error handling implemented
- ⚠️ **Socket errors**: Backend server issues (expected)
- ❌ **Production deployment**: User reports error persists

## 🚀 **Additional Solutions to Try**

### 1. **Development vs Production Debugging**
```bash
# Run development build to see unminified errors
npm run dev

# Enable verbose logging in production
NEXT_PUBLIC_NODE_ENV=development npm run build
```

### 2. **Component Debugging Approach**
Add debugging to identify exact render location:
```tsx
// Add to any suspected component
console.log('Rendering component with props:', props);
console.log('All values about to be rendered:', {
  // List all JSX expressions
});
```

### 3. **Systematic JSX Validation**
Search for potential object rendering:
```bash
# Find potential object renders
grep -r "{[^}]*[^a-zA-Z0-9_.]}" src/ --include="*.tsx"

# Find potential array renders without map
grep -r "{\s*[a-zA-Z][a-zA-Z0-9]*\s*}" src/ --include="*.tsx"
```

### 4. **React Strict Mode Enhancement**
```tsx
// In _app.tsx
<React.StrictMode>
  <ErrorBoundary>
    <Component {...pageProps} />
  </ErrorBoundary>
</React.StrictMode>
```

### 5. **Type Validation Middleware**
```tsx
// Create validation HOC
const withTypeValidation = (Component) => {
  return (props) => {
    // Validate all props before rendering
    Object.keys(props).forEach(key => {
      const value = props[key];
      if (typeof value === 'object' && value !== null && !React.isValidElement(value)) {
        console.warn(`Potential invalid prop: ${key}`, value);
      }
    });
    return <Component {...props} />;
  };
};
```

### 6. **Socket Error Isolation**
```tsx
// In SocketContext.tsx
const createSafeSocket = () => {
  try {
    return io(SOCKET_URL);
  } catch (error) {
    console.error('Socket creation failed:', error);
    // Return mock socket
    return {
      emit: () => {},
      on: () => {},
      off: () => {},
      disconnect: () => {},
    };
  }
};
```

### 7. **PublicKey Safety Wrapper**
```tsx
// Create safe PublicKey renderer
const SafePublicKeyDisplay = ({ publicKey, fallback = "Not connected" }) => {
  if (!publicKey) return <>{fallback}</>;
  try {
    return <>{publicKey.toBase58()}</>;
  } catch (error) {
    console.error('PublicKey rendering error:', error);
    return <>{fallback}</>;
  }
};
```

## 📝 **Debugging Checklist**

### Immediate Actions
- [ ] Enable React development mode in production temporarily
- [ ] Add console.log statements before every JSX expression
- [ ] Verify all component props match their interfaces exactly
- [ ] Check for any remaining Ethereum imports
- [ ] Validate all array.map() implementations have proper keys

### Advanced Debugging
- [ ] Use React DevTools Profiler to identify problem components
- [ ] Enable source maps in production build
- [ ] Add custom error tracking (Sentry/LogRocket)
- [ ] Implement component render tracking
- [ ] Create isolated test pages for each component

### Production Deployment
- [ ] Test build locally before deploying
- [ ] Enable verbose Next.js logging
- [ ] Deploy to staging environment first
- [ ] Monitor error tracking services
- [ ] Have rollback plan ready

## 🔗 **Useful Resources**

### Official Documentation
- [React Error Decoder](https://react.dev/errors/130)
- [Next.js Error Handling](https://nextjs.org/docs/advanced-features/error-handling)
- [React Error Boundaries](https://react.dev/reference/react/Component#catching-rendering-errors-with-an-error-boundary)

### Community Solutions
- [Objects are not valid as a React child - Atomic Object](https://spin.atomicobject.com/objects-not-valid-react-child-2/)
- [React Minified Errors Guide - DevsArticles](https://devsarticles.com/react-minified-errors-debugging-prevention)
- [Complete Guide to React Error #130 - CoreUI](https://coreui.io/blog/how-to-fix-objects-are-not-valid-as-a-react-child/)

### Tools
- React DevTools
- Next.js Bundle Analyzer
- TypeScript strict mode
- ESLint React hooks plugin

## 💡 **Key Learnings**

1. **React Error #130 is often a type safety issue** - Objects being rendered where primitives expected
2. **Mixed blockchain implementations create complex type conflicts**
3. **Error boundaries are essential** for graceful error handling
4. **Production minification hides the real error location** - always test with development builds
5. **Socket connection errors can cascade into React rendering errors**
6. **Prop interface mismatches are a common source of this error**
7. **PublicKey objects need careful null/undefined handling**

---

**Created**: January 2025  
**Last Updated**: January 2025  
**Status**: Ongoing investigation required for production deployment 
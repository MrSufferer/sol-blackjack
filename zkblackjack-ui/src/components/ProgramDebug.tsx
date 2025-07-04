import React, { useState, useEffect } from 'react';
import { useConnection } from '@solana/wallet-adapter-react';
import { PublicKey } from '@solana/web3.js';
import { toast } from 'react-toastify';

const PROGRAM_ID = "5q7FiaffAC5nAFCnwy9PedhEjuL7vhjCQwuSsPVz9kny";

export const ProgramDebug: React.FC = () => {
  const [status, setStatus] = useState<string>('Checking...');
  const [details, setDetails] = useState<any>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const { connection } = useConnection();

  useEffect(() => {
    const checkProgram = async () => {
      try {
        setStatus('Checking connection...');
        
        // Check basic connection
        const slot = await connection.getSlot();
        console.log('✅ Connection successful, slot:', slot);
        console.log('✅ RPC endpoint:', connection.rpcEndpoint);
        
        setStatus('Checking program account...');
        
        // Check if program account exists
        const programPublicKey = new PublicKey(PROGRAM_ID);
        const programInfo = await connection.getAccountInfo(programPublicKey);
        
        if (programInfo) {
          setStatus('✅ Program found');
          setDetails({
            exists: true,
            owner: programInfo.owner.toString(),
            executable: programInfo.executable,
            lamports: programInfo.lamports,
            dataLength: programInfo.data.length,
            slot: slot,
            rpcEndpoint: connection.rpcEndpoint
          });
          
          console.log('✅ Program account details:', {
            programId: PROGRAM_ID,
            owner: programInfo.owner.toString(),
            executable: programInfo.executable,
            lamports: programInfo.lamports,
            dataLength: programInfo.data.length
          });
        } else {
          setStatus('❌ Program not found');
          setDetails({
            exists: false,
            slot: slot,
            rpcEndpoint: connection.rpcEndpoint
          });
          
          console.error('❌ Program account not found:', PROGRAM_ID);
        }
        
      } catch (error) {
        console.error('❌ Connection or program check failed:', error);
        setStatus('❌ Connection failed');
        setDetails({
          error: error instanceof Error ? error.message : 'Unknown error',
          rpcEndpoint: connection.rpcEndpoint
        });
      }
    };

    if (connection) {
      checkProgram();
    }
  }, [connection]);

  const handleCopyDetails = () => {
    const debugInfo = {
      programId: PROGRAM_ID,
      status,
      details,
      timestamp: new Date().toISOString()
    };
    
    navigator.clipboard.writeText(JSON.stringify(debugInfo, null, 2));
    toast.success('Debug info copied to clipboard');
  };

  return (
    <div className="bg-gray-100 p-4 rounded-lg mb-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-bold">Program Status</h3>
          <p className="text-sm">{status}</p>
        </div>
        <div className="flex space-x-2">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600"
          >
            {isExpanded ? 'Hide' : 'Show'} Details
          </button>
          <button
            onClick={handleCopyDetails}
            className="px-3 py-1 bg-green-500 text-white rounded text-sm hover:bg-green-600"
          >
            Copy Info
          </button>
        </div>
      </div>
      
      {isExpanded && details && (
        <div className="mt-4 bg-white p-3 rounded border">
          <h4 className="font-semibold mb-2">Debug Details:</h4>
          <pre className="text-xs overflow-x-auto bg-gray-50 p-2 rounded">
            {JSON.stringify(details, null, 2)}
          </pre>
          
          <div className="mt-3 text-sm">
            <p><strong>Program ID:</strong> {PROGRAM_ID}</p>
            <p><strong>Network:</strong> {details.rpcEndpoint}</p>
            {details.exists && (
              <>
                <p><strong>Executable:</strong> {details.executable ? 'Yes' : 'No'}</p>
                <p><strong>Owner:</strong> {details.owner}</p>
                <p><strong>Balance:</strong> {details.lamports} lamports</p>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ProgramDebug; 
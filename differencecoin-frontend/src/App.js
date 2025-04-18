import { useState, useEffect } from 'react';
import axios from 'axios';

export default function App() {
  const [sender, setSender] = useState('');
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');
  const [message, setMessage] = useState('');
  const [blockchain, setBlockchain] = useState([]);
  const [nodes, setNodes] = useState('');
  const [nodeMessage, setNodeMessage] = useState('');
  const [showChain, setShowChain] = useState(false);
  const [registeredNodes, setRegisteredNodes] = useState([]);

  const fetchBlockchain = async () => {
    try {
      const response = await axios.get('/api/node1/chain');
      setBlockchain(response.data.chain);
    } catch (error) {
      console.error('Error fetching blockchain:', error);
    }
  };

  const fetchRegisteredNodes = async () => {
    try {
      const response = await axios.get('/api/node1/nodes');
      setRegisteredNodes(response.data.nodes || []);
    } catch (error) {
      console.error('Error fetching registered nodes:', error);
    }
  };

  useEffect(() => {
    //fetchBlockchain();
    fetchRegisteredNodes();
  }, []);

  const handleTransaction = async () => {
    try {
      const response = await axios.post('/api/node1/transaction', {
        sender,
        recipient,
        amount: parseInt(amount),
      });
      setMessage(response.data.message);
    } catch (error) {
      console.error('Transaction failed:', error);
      setMessage('Transaction failed. Ensure the backend is running.');
    }
  };

  const mineBlock = async () => {
    try {
      const response = await axios.get('/api/node1/mine');
      setMessage(response.data.message);
      fetchBlockchain();
    } catch (error) {
      console.error('Mining failed:', error);
      setMessage('Mining failed. Ensure the backend is running.');
    }
  };

  const registerNodes = async () => {
    try {
      const nodesArray = nodes.split(',').map(node => node.trim());
      
      // Register Node 2 with Node 1
      const response1 = await axios.post('/api/node1/nodes/register', {
        nodes: ['http://192.168.29.193:10001']
      });
      
      // Register Node 1 with Node 2
      const response2 = await axios.post('/api/node2/nodes/register', {
        nodes: ['http://192.168.29.193:10000']
      });
      
      setNodeMessage('Nodes registered successfully with both nodes.');
      setRegisteredNodes(response1.data.total_nodes || []);
    } catch (error) {
      console.error('Node registration failed:', error);
      setNodeMessage('Node registration failed. Ensure both backends are running.');
    }
  };

  const resolveConflicts = async () => {
    try {
      console.log('Resolving conflicts...');
      let node1Synced = false;
      let node2Synced = false;
      
      // Try resolving on Node 1
      try {
        console.log('Attempting to resolve conflicts on Node 1...');
        const response1 = await axios.get('/api/node1/nodes/resolve');
        console.log('Node 1 response:', response1.data);
        node1Synced = response1.data.message.includes('chain was replaced') || 
                      response1.data.message.includes('chain is authoritative');
      } catch (error1) {
        console.error('Error resolving conflicts on Node 1:', error1.message);
      }
      
      // Try resolving on Node 2
      try {
        console.log('Attempting to resolve conflicts on Node 2...');
        const response2 = await axios.get('/api/node2/nodes/resolve');
        console.log('Node 2 response:', response2.data);
        node2Synced = response2.data.message.includes('chain was replaced') || 
                      response2.data.message.includes('chain is authoritative');
      } catch (error2) {
        console.error('Error resolving conflicts on Node 2:', error2.message);
        if (error2.response) {
          console.error('Response data:', error2.response.data);
          console.error('Response status:', error2.response.status);
          console.error('Response headers:', error2.response.headers);
        }
      }
      
      // Fetch the updated blockchain
      await fetchBlockchain();
      
      if (node1Synced && node2Synced) {
        setMessage('✅ Both nodes are now synchronized!');
      } else if (node1Synced || node2Synced) {
        setMessage('⚠️ Partial synchronization: One node was updated');
      } else {
        setMessage('ℹ️ Nodes are already synchronized');
      }
    } catch (error) {
      console.error('Conflict resolution failed:', error);
      setMessage(`❌ Conflict resolution failed: ${error.message}`);
    }
  };

  return (
    <div className="p-8 font-sans bg-gray-100 min-h-screen">
      <h1 className="text-4xl font-bold mb-8 text-gray-800">DifferenceCoin Blockchain</h1>

      <div className="mb-8 p-6 bg-white rounded-2xl shadow-lg">
        <h2 className="text-2xl font-semibold mb-4">Create Transaction</h2>
        <input
          type="text"
          placeholder="Sender"
          value={sender}
          onChange={(e) => setSender(e.target.value)}
          className="p-2 border rounded-lg mr-2"
        />
        <input
          type="text"
          placeholder="Recipient"
          value={recipient}
          onChange={(e) => setRecipient(e.target.value)}
          className="p-2 border rounded-lg mr-2"
        />
        <input
          type="number"
          placeholder="Amount"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="p-2 border rounded-lg mr-2"
        />
        <button
          onClick={handleTransaction}
          className="p-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
        >
          Send Transaction
        </button>
        <button
          onClick={mineBlock}
          className="p-2 bg-green-500 text-white rounded-lg hover:bg-green-600 ml-4"
        >
          Mine Block
        </button>

        {message && <p className="mt-4 text-lg text-gray-700">{message}</p>}
      </div>

      <div className="mb-8 p-6 bg-white rounded-2xl shadow-lg">
        <h2 className="text-2xl font-semibold mb-4">Register Nodes</h2>
        <input
          type="text"
          placeholder="Comma-separated node URLs"
          value={nodes}
          onChange={(e) => setNodes(e.target.value)}
          className="p-2 border rounded-lg mr-2"
        />
        <button
          onClick={registerNodes}
          className="p-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600"
        >
          Register Nodes
        </button>
        <button
          onClick={resolveConflicts}
          className="p-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 ml-4"
        >
          Resolve Conflicts
        </button>

        {nodeMessage && <p className="mt-4 text-lg text-gray-700">{nodeMessage}</p>}

        <div className="mt-6">
          <h3 className="text-xl font-semibold mb-2">Registered Nodes</h3>
          {registeredNodes.length === 0 ? (
            <p>No nodes registered yet</p>
          ) : (
            <ul className="list-disc ml-6">
              {registeredNodes.map((node, index) => (
                <li key={index} className="text-gray-700">{node}</li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <h2 className="text-3xl font-semibold mb-4">Blockchain Explorer</h2>
      <button
        onClick={() => {
          if (!showChain) fetchBlockchain();
          setShowChain(!showChain);
        }}
        className="mb-6 p-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
      >
        {showChain ? 'Hide Blockchain' : 'View Blockchain'}
      </button>
      
      {blockchain.length > 0 && showChain && (
        <div className="space-y-6">
          {blockchain.map((block) => (
            <div key={block.index} className="p-6 bg-white rounded-2xl shadow-md">
              <p><strong className="text-xl">Block #{block.index}</strong></p>
              <p><strong>Timestamp:</strong> {block.timestamp}</p>
              <p><strong>Proof:</strong> {block.proof}</p>
              <p><strong>Previous Hash:</strong> {block.previous_hash}</p>

              <div className="mt-4">
                <p className="font-semibold">Transactions:</p>
                {block.transactions.length === 0 ? (
                  <p>No transactions</p>
                ) : (
                  <ul className="list-disc ml-6">
                    {block.transactions.map((tx, idx) => (
                      <li key={idx}>
                        {tx.sender} → {tx.recipient}: {tx.amount}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

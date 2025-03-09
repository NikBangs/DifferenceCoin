import { useState } from 'react';
import axios from 'axios';

const API_URL = 'http://127.0.0.1:10000'; // Or 'http://192.168.x.x:10000' for external devices

function App() {
  const [sender, setSender] = useState('');
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');
  const [message, setMessage] = useState('');

  const handleTransaction = async () => {
    try {
      const response = await axios.post(`${API_URL}/transaction`, {
        sender,
        recipient,
        amount: parseFloat(amount),
      });
      setMessage(response.data.message);
    } catch (error) {
      setMessage('Transaction failed. Ensure the backend is running.');
    }
  };

  const handleMine = async () => {
    try {
      const response = await axios.get(`${API_URL}/mine`);
      setMessage(`Block Mined: ${response.data.index}`);
    } catch (error) {
      setMessage('Mining failed. Ensure the backend is running.');
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-4 flex flex-col items-center">
      <h1 className="text-4xl font-bold mb-8 text-center">DifferenceCoin Blockchain</h1>

      <div className="bg-white shadow-xl rounded-2xl p-8 max-w-lg w-full">
        <h2 className="text-2xl font-semibold mb-6">Create Transaction</h2>

        <input
          type="text"
          placeholder="Sender Address"
          value={sender}
          onChange={(e) => setSender(e.target.value)}
          className="w-full p-2 mb-4 border rounded-lg"
        />
        <input
          type="text"
          placeholder="Recipient Address"
          value={recipient}
          onChange={(e) => setRecipient(e.target.value)}
          className="w-full p-2 mb-4 border rounded-lg"
        />
        <input
          type="number"
          placeholder="Amount"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="w-full p-2 mb-6 border rounded-lg"
        />

        <button
          onClick={handleTransaction}
          className="bg-blue-500 text-white py-2 px-6 rounded-lg hover:bg-blue-600 w-full"
        >
          Send Transaction
        </button>

        <button
          onClick={handleMine}
          className="mt-4 bg-green-500 text-white py-2 px-6 rounded-lg hover:bg-green-600 w-full"
        >
          Mine Block
        </button>

        {message && <p className="mt-6 text-lg text-gray-700">{message}</p>}
      </div>
    </div>
  );
}

export default App;
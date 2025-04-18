import hashlib
import json
import time
import requests
from flask_cors import CORS
from flask import Flask, jsonify, request
from uuid import uuid4
from urllib.parse import urlparse

class DifferenceCoinBlockchain:
    def __init__(self):
        self.chain = []
        self.current_transactions = []
        self.nodes = set()

        # Load blockchain from JSON if available
        self.load_chain()

        # Create the genesis block if no chain exists
        if not self.chain:
            genesis_block = {
                'index': 1,
                'timestamp': time.time(),
                'transactions': [],
                'proof': 1,
                'previous_hash': '0'
            }
            self.chain.append(genesis_block)
            self.save_chain()

    def create_block(self, proof, previous_hash):
        block = {
            'index': len(self.chain) + 1,
            'timestamp': time.time(),
            'transactions': self.current_transactions,
            'proof': proof,
            'previous_hash': previous_hash,
        }
        
        # Calculate and add the hash
        block['hash'] = self.hash(block)
        
        self.current_transactions = []
        self.chain.append(block)

        # Save updated blockchain to JSON
        self.save_chain()

        return block

    def new_transaction(self, sender, recipient, amount):
        transaction = {
            'sender': sender,
            'recipient': recipient,
            'amount': amount,
        }
        self.current_transactions.append(transaction)
        return self.last_block['index'] + 1

    def proof_of_work(self, last_proof):
        proof = 0
        while not self.valid_proof(last_proof, proof):
            proof += 1
        return proof

    def valid_proof(self, last_proof, proof):
        guess = f'{last_proof}{proof}'.encode()
        guess_hash = hashlib.sha256(guess).hexdigest()
        return guess_hash[:4] == '0000'

    @staticmethod
    def hash(block):
        block_string = json.dumps(block, sort_keys=True).encode()
        return hashlib.sha256(block_string).hexdigest()

    @property
    def last_block(self):
        return self.chain[-1]

    def register_node(self, address):
        """
        Add a new node to the list of nodes
        :param address: Address of node. Eg. 'http://192.168.0.5:5000'
        """
        parsed_url = urlparse(address)
        if parsed_url.netloc:
            self.nodes.add(parsed_url.netloc)
        elif parsed_url.path:
            # Accepts an URL without scheme like '192.168.0.5:5000'.
            self.nodes.add(parsed_url.path)
        else:
            raise ValueError('Invalid URL')

    def valid_chain(self, chain):
        """
        Determine if a given blockchain is valid
        :param chain: A blockchain
        :return: True if valid, False if not
        """
        print("\n=== Validating Chain ===")
        print(f"Chain length: {len(chain)}")
        
        last_block = chain[0]
        current_index = 1

        while current_index < len(chain):
            block = chain[current_index]
            print(f"\nValidating block {current_index}")
            print(f"Previous hash: {block['previous_hash']}")
            print(f"Calculated hash: {self.hash(last_block)}")

            # Check that the hash of the block is correct
            if block['previous_hash'] != self.hash(last_block):
                print("Invalid previous hash")
                return False

            # Check that the Proof of Work is correct
            if not self.valid_proof(last_block['proof'], block['proof']):
                print("Invalid proof of work")
                return False

            last_block = block
            current_index += 1

        print("Chain is valid")
        return True

    def resolve_conflicts(self):
        """
        This is our consensus algorithm, it resolves conflicts
        by replacing our chain with the longest one in the network.
        :return: True if our chain was replaced, False if not
        """
        neighbours = self.nodes
        new_chain = None

        # We're only looking for chains longer than ours
        max_length = len(self.chain)
        print(f"\n=== Starting Consensus Process on Node 1 ===")
        print(f"Current chain length: {max_length}")
        print(f"Current chain: {json.dumps(self.chain, indent=2)}")
        print(f"Registered nodes: {neighbours}")

        # Grab and verify the chains from all the nodes in our network
        for node in neighbours:
            print(f"\nChecking node: {node}")
            try:
                print(f"Requesting chain from http://{node}/chain")
                response = requests.get(f'http://{node}/chain')
                if response.status_code == 200:
                    length = response.json()['length']
                    chain = response.json()['chain']
                    print(f"Node {node} chain length: {length}")
                    print(f"Node {node} chain: {json.dumps(chain, indent=2)}")

                    # Check if the length is longer and the chain is valid
                    if length > max_length:
                        print(f"Found longer chain from {node}")
                        if self.valid_chain(chain):
                            print(f"Chain from {node} is valid")
                            max_length = length
                            new_chain = chain
                        else:
                            print(f"Chain from {node} is not valid")
                    else:
                        print(f"Chain from {node} is not longer")
                else:
                    print(f"Failed to get chain from {node}, status code: {response.status_code}")
            except requests.RequestException as e:
                print(f"Error connecting to node {node}: {e}")
                continue

        # Replace our chain if we discovered a new, valid chain longer than ours
        if new_chain:
            print("\nReplacing chain with longer valid chain")
            self.chain = new_chain
            self.save_chain()
            return True

        print("\nNo longer valid chain found")
        return False

    def save_chain(self):
        with open('differencecoin.json', 'w') as f:
            json.dump(self.chain, f, indent=4)

    def load_chain(self):
        try:
            with open('differencecoin.json', 'r') as f:
                self.chain = json.load(f)
        except (FileNotFoundError, json.JSONDecodeError):
            self.chain = []

# Initialize Flask app
app = Flask(__name__)
CORS(app, resources={
    r"/*": {
        "origins": ["http://localhost:3000"],
        "methods": ["GET", "POST", "OPTIONS"],
        "allow_headers": ["Content-Type"],
        "supports_credentials": False
    }
})

print("\n=== Starting Node 1 ===")
print("Version: 1.0.3")
print("Node ID: NODE_1_DEBUG")
print("Debug logging enabled")

# Generate a unique identifier for this node
node_identifier = str(uuid4()).replace('-', '')

# Initialize blockchain
blockchain = DifferenceCoinBlockchain()

# Route: Create a new transaction
@app.route('/transaction', methods=['POST'])
def create_transaction():
    values = request.get_json()

    required = ['sender', 'recipient', 'amount']
    if not all(k in values for k in required):
        return 'Missing values', 400

    index = blockchain.new_transaction(values['sender'], values['recipient'], values['amount'])

    return jsonify({'message': f'Transaction will be added to Block {index}'}), 201

# Route: Mine a new block
@app.route('/mine', methods=['GET'])
def mine():
    last_block = blockchain.last_block
    last_proof = last_block['proof']
    proof = blockchain.proof_of_work(last_proof)

    blockchain.new_transaction(sender="0", recipient=node_identifier, amount=1)

    previous_hash = blockchain.hash(last_block)
    block = blockchain.create_block(proof, previous_hash)

    response = {
        'message': 'New Block Forged',
        'index': block['index'],
        'transactions': block['transactions'],
        'proof': block['proof'],
        'previous_hash': block['previous_hash'],
    }

    return jsonify(response), 200

# Route: Get the full blockchain
@app.route('/chain', methods=['GET'])
def full_chain():
    response = {
        'chain': blockchain.chain,
        'length': len(blockchain.chain),
    }
    return jsonify(response), 200

# Route: Register new nodes
@app.route('/nodes/register', methods=['POST'])
def register_nodes():
    values = request.get_json()

    nodes = values.get('nodes')
    if nodes is None:
        return "Error: Please supply a valid list of nodes", 400

    for node in nodes:
        blockchain.register_node(node)

    return jsonify({'message': 'New nodes have been added', 'total_nodes': list(blockchain.nodes)}), 201

# Route: Resolve conflicts
@app.route('/nodes/resolve', methods=['GET'])
def consensus():
    print("\n=== Consensus Endpoint Called ===")
    print(f"Current nodes: {list(blockchain.nodes)}")
    replaced = blockchain.resolve_conflicts()

    if replaced:
        print("Chain was replaced")
        return jsonify({'message': 'Our chain was replaced', 'new_chain': blockchain.chain}), 200
    else:
        print("Chain is authoritative")
        return jsonify({'message': 'Our chain is authoritative', 'chain': blockchain.chain}), 200

@app.route('/nodes', methods=['GET'])
def get_nodes():
    response = {
        'nodes': list(blockchain.nodes)
    }
    return jsonify(response), 200

@app.route('/health', methods=['GET'])
def health():
    return jsonify({
        "status": "healthy",
        "version": "1.0.3",
        "node_id": "NODE_1_DEBUG",
        "chain_length": len(blockchain.chain),
        "nodes": list(blockchain.nodes)
    })

@app.route('/')
def home():
    return jsonify({
        "message": "Welcome to DifferenceCoin Blockchain!",
        "version": "1.0.3",
        "node_id": "NODE_1_DEBUG"
    })

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=10000)
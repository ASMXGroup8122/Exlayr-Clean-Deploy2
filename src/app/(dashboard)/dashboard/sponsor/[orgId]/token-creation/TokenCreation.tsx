'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import ContractViewer from './ContractViewer';

const BLOCKCHAINS = [
    { id: 'bsc', name: 'BNB Smart Chain', icon: '🔸' },
    { id: 'eth', name: 'Ethereum', icon: '⟠' },
    { id: 'polygon', name: 'Polygon', icon: '⬡' }
];

const MOCK_CONTRACT = `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract SecurityToken is ERC20, Ownable {
    // Token details
    string private _name;
    string private _symbol;
    uint8 private _decimals;
    uint256 private _totalSupply;

    // Compliance
    mapping(address => bool) private _whitelist;
    bool private _transfersEnabled;

    constructor(
        string memory name_,
        string memory symbol_,
        uint8 decimals_,
        uint256 initialSupply_
    ) ERC20(name_, symbol_) {
        _name = name_;
        _symbol = symbol_;
        _decimals = decimals_;
        _mint(msg.sender, initialSupply_);
        _transfersEnabled = false;
    }

    // ... More contract code would go here ...
}`;

export default function TokenCreation() {
    const router = useRouter();
    const params = useParams();
    const orgId = params?.orgId as string;

    const [selectedBlockchain, setSelectedBlockchain] = useState('');
    const [contractCode, setContractCode] = useState(MOCK_CONTRACT);
    const [deployedContract, setDeployedContract] = useState<string>();
    const [view, setView] = useState<'create' | 'view'>('create');

    const handleDeploy = async () => {
        // Mock deployment - in real implementation this would deploy to blockchain
        const mockAddress = '0x' + Array(40).fill(0).map(() => 
            Math.floor(Math.random() * 16).toString(16)).join('');
        setDeployedContract(mockAddress);
        setView('view');
    };

    if (view === 'view' && deployedContract) {
        return <ContractViewer contractAddress={deployedContract} />;
    }

    return (
        <div className="max-w-6xl mx-auto py-8 px-4">
            <div className="mb-8">
                <Link 
                    href={`/dashboard/sponsor/${orgId}/listings`}
                    className="text-blue-600 hover:text-blue-800 flex items-center gap-2 mb-4"
                >
                    <ArrowLeft className="h-4 w-4" />
                    Back to Listings
                </Link>
                <h1 className="text-2xl font-bold text-gray-900">Smart Contract for Security</h1>
                <p className="mt-1 text-sm text-gray-500">
                    Select the blockchain and review the smart contract for your security token.
                </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Blockchain Selection */}
                <div className="lg:col-span-1">
                    <div className="bg-white shadow rounded-lg p-6">
                        <h2 className="text-lg font-medium text-gray-900 mb-4">Select Blockchain</h2>
                        <div className="space-y-4">
                            {BLOCKCHAINS.map((blockchain) => (
                                <div
                                    key={blockchain.id}
                                    className={`relative flex items-center space-x-3 rounded-lg border p-4 cursor-pointer hover:border-blue-500 ${
                                        selectedBlockchain === blockchain.id ? 'border-blue-500 bg-blue-50' : 'border-gray-300'
                                    }`}
                                    onClick={() => setSelectedBlockchain(blockchain.id)}
                                >
                                    <div className="flex-shrink-0 text-2xl">
                                        {blockchain.icon}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <div className="text-sm font-medium text-gray-900">
                                            {blockchain.name}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Contract Editor */}
                <div className="lg:col-span-2">
                    <div className="bg-white shadow rounded-lg p-6">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-lg font-medium text-gray-900">Smart Contract</h2>
                            <div className="flex space-x-2">
                                <button
                                    type="button"
                                    className="inline-flex items-center px-3 py-1.5 border border-gray-300 shadow-sm text-sm font-medium rounded text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                                    onClick={() => setContractCode(MOCK_CONTRACT)}
                                >
                                    Reset
                                </button>
                                <button
                                    type="button"
                                    className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                                    disabled={!selectedBlockchain}
                                    onClick={handleDeploy}
                                >
                                    Deploy Contract
                                </button>
                            </div>
                        </div>
                        <div className="relative">
                            <textarea
                                value={contractCode}
                                onChange={(e) => setContractCode(e.target.value)}
                                className="block w-full h-[600px] rounded-md border-gray-300 shadow-sm font-mono text-sm focus:border-blue-500 focus:ring-blue-500"
                                style={{ 
                                    backgroundColor: '#1e1e1e',
                                    color: '#d4d4d4',
                                    padding: '1rem',
                                    lineHeight: '1.5'
                                }}
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
} 
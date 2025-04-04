'use client';

import { useState, useEffect } from 'react';
import { ArrowLeft, Copy, ExternalLink } from 'lucide-react';

interface ContractViewerProps {
    contractAddress?: string;
}

export default function ContractViewer({ contractAddress }: ContractViewerProps) {
    const [copied, setCopied] = useState(false);
    const [contractCode, setContractCode] = useState<string>('');

    useEffect(() => {
        // Mock contract code - in real implementation this would fetch from blockchain
        setContractCode(`// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract MyToken is ERC20, Ownable {
    constructor() ERC20("MyToken", "MTK") {
        _mint(msg.sender, 1000000 * 10 ** decimals());
    }
}`);
    }, []);

    const copyToClipboard = async () => {
        try {
            await navigator.clipboard.writeText(contractAddress || '');
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error('Failed to copy:', err);
        }
    };

    const viewOnExplorer = () => {
        if (contractAddress) {
            window.open(`https://bscscan.com/address/${contractAddress}`, '_blank');
        }
    };

    return (
        <div className="max-w-4xl mx-auto py-8 px-4">
            <div className="bg-white shadow rounded-lg p-6">
                <div className="flex items-center justify-between mb-6">
                    <h1 className="text-2xl font-bold">Contract Details</h1>
                    <button
                        onClick={() => window.history.back()}
                        className="flex items-center text-gray-600 hover:text-gray-900"
                    >
                        <ArrowLeft className="h-5 w-5 mr-2" />
                        Back
                    </button>
                </div>

                {contractAddress && (
                    <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                        <div className="flex items-center justify-between">
                            <div>
                                <label className="block text-sm font-medium text-gray-700">
                                    Contract Address
                                </label>
                                <div className="mt-1 text-sm text-gray-900 font-mono">
                                    {contractAddress}
                                </div>
                            </div>
                            <div className="flex space-x-2">
                                <button
                                    onClick={copyToClipboard}
                                    className="p-2 text-gray-500 hover:text-gray-700"
                                    title="Copy address"
                                >
                                    <Copy className="h-5 w-5" />
                                </button>
                                <button
                                    onClick={viewOnExplorer}
                                    className="p-2 text-gray-500 hover:text-gray-700"
                                    title="View on BSCScan"
                                >
                                    <ExternalLink className="h-5 w-5" />
                                </button>
                            </div>
                        </div>
                        {copied && (
                            <div className="mt-2 text-sm text-green-600">
                                Address copied to clipboard!
                            </div>
                        )}
                    </div>
                )}

                <div>
                    <h2 className="text-lg font-medium mb-4">Contract Code</h2>
                    <pre className="p-4 bg-gray-50 rounded-lg overflow-x-auto">
                        <code className="text-sm font-mono whitespace-pre">
                            {contractCode}
                        </code>
                    </pre>
                </div>
            </div>
        </div>
    );
} 
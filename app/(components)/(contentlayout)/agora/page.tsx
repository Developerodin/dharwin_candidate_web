"use client";
import React, { useState } from 'react';
import { generateAgoraToken, generateMultipleAgoraTokens, getAgoraConfig } from '@/shared/lib/candidates';

interface AgoraTokenResponse {
  token: string;
  channelName: string;
  uid: string;
  expireTime: number;
}

interface AgoraConfigResponse {
  appId: string;
  appCertificate: string;
  serverUrl: string;
}

interface MultipleTokensResponse {
  tokens: AgoraTokenResponse[];
}

const AgoraPage = () => {
  const [singleTokenResponse, setSingleTokenResponse] = useState<AgoraTokenResponse | null>(null);
  const [multipleTokensResponse, setMultipleTokensResponse] = useState<MultipleTokensResponse | null>(null);
  const [configResponse, setConfigResponse] = useState<AgoraConfigResponse | null>(null);
  const [loading, setLoading] = useState<{[key: string]: boolean}>({});
  const [error, setError] = useState<string>('');

  const [formData, setFormData] = useState({
    channelName: 'test-channel',
    uid: '12345',
    role: 1 as 1 | 2,
    expirationTimeInSeconds: 3600,
    multipleTokens: [
      { channelName: 'channel-1', uid: 1, role: 1 as 1 | 2 },
      { channelName: 'channel-2', uid: 2, role: 1 as 1 | 2 }
    ]
  });

  const handleGenerateToken = async () => {
    setLoading(prev => ({ ...prev, singleToken: true }));
    setError('');
    try {
      const response = await generateAgoraToken({
        channelName: formData.channelName,
        uid: formData.uid,
        role: formData.role,
        expirationTimeInSeconds: formData.expirationTimeInSeconds
      });
      setSingleTokenResponse(response);
    } catch (err: any) {
      setError(`Error generating single token: ${err.message}`);
    } finally {
      setLoading(prev => ({ ...prev, singleToken: false }));
    }
  };

  const handleGenerateMultipleTokens = async () => {
    setLoading(prev => ({ ...prev, multipleTokens: true }));
    setError('');
    try {
      const response = await generateMultipleAgoraTokens({
        users: formData.multipleTokens,
        expirationTimeInSeconds: formData.expirationTimeInSeconds
      });
      setMultipleTokensResponse(response);
    } catch (err: any) {
      setError(`Error generating multiple tokens: ${err.message}`);
    } finally {
      setLoading(prev => ({ ...prev, multipleTokens: false }));
    }
  };

  const handleGetConfig = async () => {
    setLoading(prev => ({ ...prev, config: true }));
    setError('');
    try {
      const response = await getAgoraConfig();
      setConfigResponse(response);
    } catch (err: any) {
      setError(`Error fetching config: ${err.message}`);
    } finally {
      setLoading(prev => ({ ...prev, config: false }));
    }
  };

  const updateMultipleToken = (index: number, field: 'channelName' | 'uid' | 'role', value: string | number) => {
    const updated = [...formData.multipleTokens];
    updated[index] = { ...updated[index], [field]: value };
    setFormData(prev => ({ ...prev, multipleTokens: updated }));
  };

  const addMultipleToken = () => {
    setFormData(prev => ({
      ...prev,
      multipleTokens: [...prev.multipleTokens, { channelName: '', uid: 0, role: 1 as 1 | 2 }]
    }));
  };

  const removeMultipleToken = (index: number) => {
    setFormData(prev => ({
      ...prev,
      multipleTokens: prev.multipleTokens.filter((_, i) => i !== index)
    }));
  };

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-8 text-center">Agora API Testing</h1>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Single Token Generation */}
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4">Generate Single Token</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Channel Name
              </label>
              <input
                type="text"
                value={formData.channelName}
                onChange={(e) => setFormData(prev => ({ ...prev, channelName: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter channel name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                User ID
              </label>
              <input
                type="text"
                value={formData.uid}
                onChange={(e) => setFormData(prev => ({ ...prev, uid: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter user ID"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Role
              </label>
              <select
                value={formData.role}
                onChange={(e) => setFormData(prev => ({ ...prev, role: parseInt(e.target.value) as 1 | 2 }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value={1}>Publisher (1)</option>
                <option value={2}>Subscriber (2)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Expiration Time (seconds)
              </label>
              <input
                type="number"
                value={formData.expirationTimeInSeconds}
                onChange={(e) => setFormData(prev => ({ ...prev, expirationTimeInSeconds: parseInt(e.target.value) }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="3600"
              />
            </div>
            <button
              onClick={handleGenerateToken}
              disabled={loading.singleToken}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading.singleToken ? 'Generating...' : 'Generate Token'}
            </button>
          </div>
          
          {singleTokenResponse && (
            <div className="mt-6 p-4 bg-gray-50 rounded-md">
              <h3 className="font-semibold mb-2">Response:</h3>
              <pre className="text-sm text-gray-700 whitespace-pre-wrap">
                {JSON.stringify(singleTokenResponse, null, 2)}
              </pre>
            </div>
          )}
        </div>

        {/* Multiple Tokens Generation */}
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4">Generate Multiple Tokens</h2>
          <div className="space-y-4">
            {formData.multipleTokens.map((token, index) => (
              <div key={index} className="border border-gray-200 p-4 rounded-md">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium">Token {index + 1}</span>
                  {formData.multipleTokens.length > 1 && (
                    <button
                      onClick={() => removeMultipleToken(index)}
                      className="text-red-600 hover:text-red-800 text-sm"
                    >
                      Remove
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <input
                    type="text"
                    value={token.channelName}
                    onChange={(e) => updateMultipleToken(index, 'channelName', e.target.value)}
                    className="px-2 py-1 border border-gray-300 rounded text-sm"
                    placeholder="Channel name"
                  />
                  <input
                    type="number"
                    value={token.uid}
                    onChange={(e) => updateMultipleToken(index, 'uid', parseInt(e.target.value))}
                    className="px-2 py-1 border border-gray-300 rounded text-sm"
                    placeholder="User ID"
                  />
                  <select
                    value={token.role}
                    onChange={(e) => updateMultipleToken(index, 'role', parseInt(e.target.value))}
                    className="px-2 py-1 border border-gray-300 rounded text-sm"
                  >
                    <option value={1}>Publisher</option>
                    <option value={2}>Subscriber</option>
                  </select>
                </div>
              </div>
            ))}
            <button
              onClick={addMultipleToken}
              className="w-full bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700"
            >
              Add Token
            </button>
            <button
              onClick={handleGenerateMultipleTokens}
              disabled={loading.multipleTokens}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading.multipleTokens ? 'Generating...' : 'Generate Multiple Tokens'}
            </button>
          </div>
          
          {multipleTokensResponse && (
            <div className="mt-6 p-4 bg-gray-50 rounded-md">
              <h3 className="font-semibold mb-2">Response:</h3>
              <pre className="text-sm text-gray-700 whitespace-pre-wrap">
                {JSON.stringify(multipleTokensResponse, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </div>

      {/* Agora Config */}
      <div className="mt-8 bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-xl font-semibold mb-4">Get Agora Configuration</h2>
        <button
          onClick={handleGetConfig}
          disabled={loading.config}
          className="bg-purple-600 text-white py-2 px-4 rounded-md hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading.config ? 'Loading...' : 'Get Config'}
        </button>
        
        {configResponse && (
          <div className="mt-6 p-4 bg-gray-50 rounded-md">
            <h3 className="font-semibold mb-2">Response:</h3>
            <pre className="text-sm text-gray-700 whitespace-pre-wrap">
              {JSON.stringify(configResponse, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
};

export default AgoraPage;

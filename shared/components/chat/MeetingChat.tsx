'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useChat } from '@/shared/hooks/useChat';

interface MeetingChatProps {
  meetingId: string;
  userEmail: string;
  userName: string;
  enabled?: boolean;
  className?: string;
  onClose?: () => void;
}

export default function MeetingChat({
  meetingId,
  userEmail,
  userName,
  enabled = true,
  className = '',
  onClose,
}: MeetingChatProps) {
  const [inputMessage, setInputMessage] = useState('');
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  const {
    messages,
    typingUsers,
    loading,
    hasMore,
    connected,
    error,
    sendMessage,
    loadMoreMessages,
    handleInputChange,
  } = useChat({
    meetingId,
    userEmail,
    userName,
    enabled: enabled,
  });

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim()) return;

    sendMessage(inputMessage);
    setInputMessage('');
  };

  const handleInputChangeLocal = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputMessage(e.target.value);
    handleInputChange();
  };

  const formatTime = (date: Date) => {
    return new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className={`flex flex-col h-full bg-white border border-gray-200 rounded-lg shadow-lg ${className}`}>
      {/* Chat Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50 rounded-t-lg">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${connected ? 'bg-green-500' : 'bg-red-500'}`}></div>
          <h3 className="font-semibold text-gray-900">Chat</h3>
          {!connected && (
            <span className="text-xs text-red-600">Disconnected</span>
          )}
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 transition p-1 rounded hover:bg-gray-200"
            title="Close chat"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div className="p-2 bg-red-100 border-b border-red-200 text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* Messages Container */}
      <div
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50"
        style={{ maxHeight: '400px' }}
      >
        {loading && messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-gray-500">Loading chat...</div>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-gray-500 text-center">
              <p>No messages yet</p>
              <p className="text-sm mt-1">Start the conversation!</p>
            </div>
          </div>
        ) : (
          <>
            {hasMore && (
              <button
                onClick={loadMoreMessages}
                disabled={loading}
                className="w-full py-2 text-sm text-blue-600 hover:text-blue-700 disabled:opacity-50"
              >
                {loading ? 'Loading...' : 'Load older messages'}
              </button>
            )}
            {messages
              .filter((msg) => {
                // Filter out system messages (join/leave notifications)
                return msg.messageType !== 'system';
              })
              .map((msg) => {
              const isOwnMessage = msg.senderEmail === userEmail;

              if (msg.isDeleted) {
                return (
                  <div key={msg.id} className="text-center text-gray-400 text-sm italic py-2">
                    Message deleted
                  </div>
                );
              }

              return (
                <div
                  key={msg.id}
                  className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[75%] rounded-lg px-3 py-2 ${
                      isOwnMessage
                        ? 'bg-blue-600 text-white'
                        : 'bg-white text-gray-900 border border-gray-200'
                    }`}
                  >
                    {!isOwnMessage && (
                      <div className="text-xs font-semibold mb-1 opacity-90">
                        {msg.senderName}
                      </div>
                    )}
                    <div className="text-sm break-words">{msg.message}</div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`text-xs ${isOwnMessage ? 'text-blue-100' : 'text-gray-500'}`}>
                        {formatTime(msg.timestamp)}
                      </span>
                      {msg.editedAt && (
                        <span className={`text-xs ${isOwnMessage ? 'text-blue-100' : 'text-gray-500'}`}>
                          (edited)
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
            {typingUsers.size > 0 && (
              <div className="text-sm text-gray-500 italic">
                {Array.from(typingUsers).join(', ')} {typingUsers.size === 1 ? 'is' : 'are'} typing...
              </div>
            )}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Input Form */}
      <form onSubmit={handleSendMessage} className="p-4 border-t border-gray-200 bg-white rounded-b-lg">
        <div className="flex gap-2">
          <input
            type="text"
            value={inputMessage}
            onChange={handleInputChangeLocal}
            placeholder="Type a message..."
            maxLength={1000}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
            disabled={!connected}
          />
          <button
            type="submit"
            disabled={!inputMessage.trim() || !connected}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </div>
        <div className="text-xs text-gray-500 mt-1">
          {inputMessage.length}/1000 characters
        </div>
      </form>
    </div>
  );
}


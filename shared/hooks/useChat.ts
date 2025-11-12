'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { chatConfig } from '@/shared/lib/chatConfig';
import { Chat_History_API, Chat_Message_API } from '@/shared/lib/constants';
import api from '@/shared/lib/api';

export interface ChatMessage {
  id: string;
  meetingId: string;
  senderEmail: string;
  senderName: string;
  message: string;
  messageType: 'text' | 'system' | 'file';
  timestamp: Date;
  editedAt: Date | null;
  isDeleted: boolean;
}

interface UseChatOptions {
  meetingId: string;
  userEmail: string;
  userName: string;
  enabled?: boolean;
}

interface UseChatReturn {
  socket: Socket | null;
  messages: ChatMessage[];
  typingUsers: Set<string>;
  loading: boolean;
  hasMore: boolean;
  connected: boolean;
  error: string | null;
  sendMessage: (message: string) => void;
  editMessage: (messageId: string, newMessage: string) => Promise<boolean>;
  deleteMessage: (messageId: string) => Promise<boolean>;
  loadMoreMessages: () => Promise<void>;
  handleInputChange: () => void;
}

export function useChat({
  meetingId,
  userEmail,
  userName,
  enabled = true,
}: UseChatOptions): UseChatReturn {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(false);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [oldestTimestamp, setOldestTimestamp] = useState<Date | null>(null);
  
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const emailToNameMapRef = useRef<Map<string, string>>(new Map());

  // Load chat history
  const loadChatHistory = useCallback(async (limit = 50, before?: Date) => {
    try {
      const beforeParam = before ? before.toISOString() : undefined;
      const url = Chat_History_API(meetingId, limit, beforeParam);
      const response = await api.get(url);
      
      if (response.data.success) {
        const chatMessages: ChatMessage[] = response.data.data.messages.map((msg: any) => ({
          ...msg,
          timestamp: new Date(msg.timestamp),
          editedAt: msg.editedAt ? new Date(msg.editedAt) : null,
        }));
        
        // Store email to name mapping
        chatMessages.forEach((msg) => {
          if (msg.senderEmail && msg.senderName) {
            emailToNameMapRef.current.set(msg.senderEmail, msg.senderName);
          }
        });
        
        if (before) {
          // Loading more messages - prepend
          setMessages((prev) => [...chatMessages, ...prev]);
        } else {
          // Initial load - replace
          setMessages(chatMessages);
        }
        
        setHasMore(response.data.data.hasMore);
        if (chatMessages.length > 0) {
          setOldestTimestamp(new Date(chatMessages[0].timestamp));
        }
      }
    } catch (err: any) {
      console.error('Error loading chat history:', err);
      setError(err.response?.data?.message || 'Failed to load chat history');
    } finally {
      setLoading(false);
    }
  }, [meetingId]);

  // Initialize socket connection
  useEffect(() => {
    if (!enabled || !meetingId || !userEmail || !userName) {
      return;
    }

    // Load chat history first
    loadChatHistory();

    // Initialize socket
    const socketUrl = chatConfig.socketUrl;
    console.log('Connecting to Socket.io server at:', socketUrl);
    
    const newSocket = io(socketUrl, {
      ...chatConfig.socketOptions,
      transports: ['websocket', 'polling'],
    });

    // Connection event handlers
    newSocket.on('connect', () => {
      console.log('Connected to chat server');
      setConnected(true);
      setError(null);
      
      // Join meeting chat
      newSocket.emit('join-meeting', {
        meetingId,
        email: userEmail,
        name: userName,
      });
    });

    newSocket.on('disconnect', () => {
      console.log('Disconnected from chat server');
      setConnected(false);
    });

    newSocket.on('connect_error', (err) => {
      console.error('Connection error:', err);
      setError('Failed to connect to chat server');
      setConnected(false);
    });

    // Chat event handlers
    newSocket.on('joined-meeting', (data) => {
      console.log('Successfully joined chat:', data);
    });

    newSocket.on('message-received', (messageData: ChatMessage) => {
      const message: ChatMessage = {
        ...messageData,
        timestamp: new Date(messageData.timestamp),
        editedAt: messageData.editedAt ? new Date(messageData.editedAt) : null,
      };
      
      // Store email to name mapping
      if (message.senderEmail && message.senderName) {
        emailToNameMapRef.current.set(message.senderEmail, message.senderName);
      }
      
      setMessages((prev) => [...prev, message]);
    });

    newSocket.on('message-edited', (data: { messageId: string; newMessage: string; editedAt: Date }) => {
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === data.messageId
            ? { ...msg, message: data.newMessage, editedAt: new Date(data.editedAt) }
            : msg
        )
      );
    });

    newSocket.on('message-deleted', (data: { messageId: string }) => {
      setMessages((prev) => prev.filter((msg) => msg.id !== data.messageId));
    });

    newSocket.on('user-typing', (data: { email: string; name: string; meetingId: string }) => {
      // Store email to name mapping
      if (data.email && data.name) {
        emailToNameMapRef.current.set(data.email, data.name);
      }
      
      setTypingUsers((prev) => {
        const next = new Set(prev);
        next.add(data.name);
        return next;
      });
    });

    newSocket.on('user-stopped-typing', (data: { email: string; meetingId: string }) => {
      const name = emailToNameMapRef.current.get(data.email);
      if (name) {
        setTypingUsers((prev) => {
          const next = new Set(prev);
          next.delete(name);
          return next;
        });
      }
    });

    newSocket.on('user-joined', (data: { email: string; name: string; meetingId: string }) => {
      console.log(`${data.name} joined the chat`);
      if (data.email && data.name) {
        emailToNameMapRef.current.set(data.email, data.name);
      }
    });

    newSocket.on('user-left', (data: { email: string; name: string; meetingId: string }) => {
      console.log(`${data.name} left the chat`);
    });

    newSocket.on('error', (error: { message: string; code: string }) => {
      console.error('Chat error:', error);
      setError(error.message);
    });

    setSocket(newSocket);

    // Cleanup
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      
      newSocket.emit('leave-meeting', { meetingId });
      newSocket.disconnect();
      setSocket(null);
      setConnected(false);
    };
  }, [enabled, meetingId, userEmail, userName, loadChatHistory]);

  // Send message
  const sendMessage = useCallback((message: string) => {
    if (!socket || !message.trim()) return;
    
    socket.emit('send-message', {
      meetingId,
      message: message.trim(),
      email: userEmail,
      name: userName,
    });
  }, [socket, meetingId, userEmail, userName]);

  // Handle typing indicator
  const handleInputChange = useCallback(() => {
    if (!socket) return;
    
    socket.emit('typing', {
      meetingId,
      email: userEmail,
      name: userName,
    });

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Auto-stop typing after 3 seconds
    typingTimeoutRef.current = setTimeout(() => {
      socket.emit('stop-typing', {
        meetingId,
        email: userEmail,
      });
    }, 3000);
  }, [socket, meetingId, userEmail, userName]);

  // Edit message
  const editMessage = useCallback(async (messageId: string, newMessage: string): Promise<boolean> => {
    try {
      const response = await api.patch(Chat_Message_API(meetingId, messageId), {
        message: newMessage,
        email: userEmail,
      });
      return response.status === 200;
    } catch (err: any) {
      console.error('Error editing message:', err);
      setError(err.response?.data?.message || 'Failed to edit message');
      return false;
    }
  }, [meetingId, userEmail]);

  // Delete message
  const deleteMessage = useCallback(async (messageId: string): Promise<boolean> => {
    try {
      const response = await api.delete(Chat_Message_API(meetingId, messageId), {
        data: { email: userEmail },
      });
      return response.status === 204;
    } catch (err: any) {
      console.error('Error deleting message:', err);
      setError(err.response?.data?.message || 'Failed to delete message');
      return false;
    }
  }, [meetingId, userEmail]);

  // Load more messages
  const loadMoreMessages = useCallback(async () => {
    if (!hasMore || !oldestTimestamp || loading) return;
    
    setLoading(true);
    await loadChatHistory(50, oldestTimestamp);
  }, [hasMore, oldestTimestamp, loading, loadChatHistory]);

  return {
    socket,
    messages,
    typingUsers,
    loading,
    hasMore,
    connected,
    error,
    sendMessage,
    editMessage,
    deleteMessage,
    loadMoreMessages,
    handleInputChange,
  };
}


import { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react'
import { useAuth } from './AuthContext'

const ChatContext = createContext(null)

export function ChatProvider({ children }) {
  const { user } = useAuth()
  
  // Chat state
  const [channels, setChannels] = useState([])
  const [selectedChannel, setSelectedChannel] = useState(null)
  const [messages, setMessages] = useState([])
  const [typingUsers, setTypingUsers] = useState({}) // { channelId: [userId1, userId2, ...] }
  
  // UI state
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  
  // SignalR connection ref
  const hubConnectionRef = useRef(null)
  const typingTimeoutRef = useRef({})

  // Initialize SignalR connection
  useEffect(() => {
    if (!user) return

    const initSignalR = async () => {
      try {
        // Dynamically import signalr
        const signalR = await import('@microsoft/signalr')
        
        const connection = new signalR.HubConnectionBuilder()
          .withUrl('http://localhost:5184/hub/chat')
          .withAutomaticReconnect()
          .build()

        // Register listeners
        connection.on('ReceiveMessage', (message) => {
          setMessages(prev => [...prev, message])
        })

        connection.on('UserTyping', (userId, channelId) => {
          setTypingUsers(prev => ({
            ...prev,
            [channelId]: [...(prev[channelId] || []), userId].filter(
              (id, idx, arr) => arr.indexOf(id) === idx // dedupe
            )
          }))
        })

        connection.on('UserStoppedTyping', (userId, channelId) => {
          setTypingUsers(prev => ({
            ...prev,
            [channelId]: (prev[channelId] || []).filter(id => id !== userId)
          }))
        })

        await connection.start()
        hubConnectionRef.current = connection
      } catch (err) {
        console.error('Failed to initialize SignalR:', err)
        setError('Failed to connect to chat service')
      }
    }

    initSignalR()

    return () => {
      if (hubConnectionRef.current) {
        hubConnectionRef.current.stop()
      }
    }
  }, [user])

  // Select a channel
  const selectChannel = useCallback((channel) => {
    setSelectedChannel(channel)
    setMessages([])
    setTypingUsers({})
    setError(null)
  }, [])

  // Add a new message to the list
  const addMessage = useCallback((message) => {
    setMessages(prev => [...prev, message])
  }, [])

  // Send a message through SignalR
  const sendMessage = useCallback(async (channelId, content) => {
    if (!hubConnectionRef.current || !user) return

    try {
      await hubConnectionRef.current.invoke('SendMessage', channelId, content)
    } catch (err) {
      console.error('Failed to send message:', err)
      setError('Failed to send message')
    }
  }, [user])

  // Join a channel
  const joinChannel = useCallback(async (channelId) => {
    if (!hubConnectionRef.current) return

    try {
      await hubConnectionRef.current.invoke('JoinChannel', channelId)
    } catch (err) {
      console.error('Failed to join channel:', err)
      setError('Failed to join channel')
    }
  }, [])

  // Leave a channel
  const leaveChannel = useCallback(async (channelId) => {
    if (!hubConnectionRef.current) return

    try {
      await hubConnectionRef.current.invoke('LeaveChannel', channelId)
    } catch (err) {
      console.error('Failed to leave channel:', err)
      setError('Failed to leave channel')
    }
  }, [])

  // Send typing indicator
  const sendTypingIndicator = useCallback((channelId) => {
    if (!hubConnectionRef.current) return

    try {
      hubConnectionRef.current.invoke('UserTyping', channelId)
      
      // Clear existing timeout for this channel
      if (typingTimeoutRef.current[channelId]) {
        clearTimeout(typingTimeoutRef.current[channelId])
      }
      
      // Set new timeout to stop typing after 2 seconds of inactivity
      typingTimeoutRef.current[channelId] = setTimeout(() => {
        hubConnectionRef.current?.invoke('UserStoppedTyping', channelId)
      }, 2000)
    } catch (err) {
      console.error('Failed to send typing indicator:', err)
    }
  }, [])

  // Update channels list
  const updateChannels = useCallback((newChannels) => {
    setChannels(newChannels)
  }, [])

  // Update messages for current channel
  const updateMessages = useCallback((newMessages) => {
    setMessages(newMessages)
  }, [])

  // Clear error
  const clearError = useCallback(() => {
    setError(null)
  }, [])

  return (
    <ChatContext.Provider
      value={{
        // State
        channels,
        selectedChannel,
        messages,
        typingUsers,
        loading,
        error,
        
        // Actions
        selectChannel,
        addMessage,
        sendMessage,
        joinChannel,
        leaveChannel,
        sendTypingIndicator,
        updateChannels,
        updateMessages,
        clearError,
        
        // Connection ref (for direct access if needed)
        hubConnectionRef
      }}
    >
      {children}
    </ChatContext.Provider>
  )
}

export const useChat = () => {
  const context = useContext(ChatContext)
  if (!context) {
    throw new Error('useChat must be used within ChatProvider')
  }
  return context
}

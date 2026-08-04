import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../context/AuthContext'
import { useChat } from '../context/ChatContext'
import axiosInstance from '../api/axiosInstance'

export default function TeamChat() {
  const { user } = useAuth()
  const {
    channels,
    selectedChannel,
    messages,
    typingUsers,
    selectChannel,
    addMessage,
    sendMessage,
    joinChannel,
    leaveChannel,
    sendTypingIndicator,
    updateChannels,
    updateMessages,
    error
  } = useChat()

  const [searchTerm, setSearchTerm] = useState('')
  const [newMessage, setNewMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState('department') // 'department' or 'direct'
  const [directChannels, setDirectChannels] = useState([])
  const [employeeSearch, setEmployeeSearch] = useState([])
  const messagesEndRef = useRef(null)
  const typingTimeoutRef = useRef(null)

  // Load channels on mount
  useEffect(() => {
    if (!user) return
    loadChannels()
  }, [user])

  // Scroll to bottom when messages update
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const loadChannels = async () => {
    try {
      setLoading(true)
      const res = await axiosInstance.get('/api/chat/my-channels')
      const allChannels = res.data?.data || []
      
      // Separate into department and direct channels
      const deptChannels = allChannels.filter(ch => ch.type === 'Group')
      const directChs = allChannels.filter(ch => ch.type === 'Direct')
      
      updateChannels(deptChannels)
      setDirectChannels(directChs)
    } catch (err) {
      console.error('Failed to load channels:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleSelectChannel = async (channel) => {
    selectChannel(channel)
    setActiveTab(channel.type === 'Direct' ? 'direct' : 'department')
    
    try {
      // Load messages for this channel
      const res = await axiosInstance.get(`/api/chat/${channel.id}/messages`)
      updateMessages(res.data?.data || [])
      
      // Join the channel via SignalR
      await joinChannel(channel.id)
    } catch (err) {
      console.error('Failed to load channel messages:', err)
    }
  }

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedChannel) return

    try {
      const msg = newMessage
      setNewMessage('')
      await sendMessage(selectedChannel.id, msg)
    } catch (err) {
      console.error('Failed to send message:', err)
      setNewMessage(newMessage)
    }
  }

  const handleStartDirectMessage = async (employeeId) => {
    try {
      const res = await axiosInstance.post(`/api/chat/direct/with/${employeeId}`)
      const channel = res.data?.data
      if (channel) {
        handleSelectChannel(channel)
      }
    } catch (err) {
      console.error('Failed to start direct message:', err)
    }
  }

  const handleSearchEmployees = async (term) => {
    if (!term.trim()) {
      setEmployeeSearch([])
      return
    }

    try {
      const res = await axiosInstance.get(`/api/chat/employees/search?searchTerm=${encodeURIComponent(term)}`)
      setEmployeeSearch(res.data?.data || [])
    } catch (err) {
      console.error('Failed to search employees:', err)
    }
  }

  const handleTyping = () => {
    if (!selectedChannel) return
    
    sendTypingIndicator(selectedChannel.id)
    
    // Debounce typing indicator
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current)
    typingTimeoutRef.current = setTimeout(() => {
      // Stop typing after 2 seconds of no activity
    }, 2000)
  }

  const filteredChannels = channels.filter(ch =>
    ch.name?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const filteredDirectChannels = directChannels.filter(ch =>
    ch.name?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const isAdmin = user?.role === 'Admin'

  return (
    <div className="flex-1 flex overflow-hidden bg-background">
      {/* Left Pane: Channel List */}
      <aside className="w-full md:w-[360px] flex flex-col border-r border-outline-variant bg-surface shrink-0 h-full">
        {/* Chat Header */}
        <div className="p-4 flex flex-col gap-4 border-b border-outline-variant/30">
          <h3 className="font-headline-md text-headline-md font-bold text-on-surface">Chat</h3>
          <div className="relative">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant">
              search
            </span>
            <input
              className="w-full pl-10 pr-4 py-2 bg-surface-container rounded-full border-none focus:ring-2 focus:ring-primary-container text-body-md outline-none"
              placeholder="Search conversations..."
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {/* Tabs for Admin (direct only) or HR/Manager/Employee (dept + direct) */}
        {!isAdmin && (
          <div className="flex border-b border-outline-variant/30">
            <button
              onClick={() => setActiveTab('department')}
              className={`flex-1 py-3 px-4 font-label-lg text-center border-b-2 transition-colors ${
                activeTab === 'department'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-on-surface-variant hover:text-on-surface'
              }`}
            >
              Department
            </button>
            <button
              onClick={() => setActiveTab('direct')}
              className={`flex-1 py-3 px-4 font-label-lg text-center border-b-2 transition-colors ${
                activeTab === 'direct'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-on-surface-variant hover:text-on-surface'
              }`}
            >
              Direct
            </button>
          </div>
        )}

        {/* Chat List */}
        <div className="flex-1 overflow-y-auto p-2">
          {isAdmin ? (
            // Admin: Only Direct Messages
            <>
              <h4 className="px-4 py-2 font-label-md text-label-md text-on-surface-variant uppercase tracking-wider">
                Direct Messages
              </h4>
              {filteredDirectChannels.length > 0 ? (
                filteredDirectChannels.map((ch) => (
                  <ChatChannelButton
                    key={ch.id}
                    channel={ch}
                    isSelected={selectedChannel?.id === ch.id}
                    onClick={() => handleSelectChannel(ch)}
                  />
                ))
              ) : (
                <div className="p-4 text-center text-on-surface-variant">
                  <p className="font-body-md">No direct messages yet</p>
                </div>
              )}
            </>
          ) : (
            // HR/Manager/Employee: Department + Direct tabs
            <>
              {activeTab === 'department' && (
                <>
                  <h4 className="px-4 py-2 font-label-md text-label-md text-on-surface-variant uppercase tracking-wider">
                    Department
                  </h4>
                  {filteredChannels.length > 0 ? (
                    filteredChannels.map((ch) => (
                      <ChatChannelButton
                        key={ch.id}
                        channel={ch}
                        isSelected={selectedChannel?.id === ch.id}
                        onClick={() => handleSelectChannel(ch)}
                      />
                    ))
                  ) : (
                    <div className="p-4 text-center text-on-surface-variant">
                      <p className="font-body-md">No department chat yet</p>
                    </div>
                  )}
                </>
              )}

              {activeTab === 'direct' && (
                <>
                  <h4 className="px-4 py-2 font-label-md text-label-md text-on-surface-variant uppercase tracking-wider">
                    Direct Messages
                  </h4>
                  {filteredDirectChannels.length > 0 ? (
                    filteredDirectChannels.map((ch) => (
                      <ChatChannelButton
                        key={ch.id}
                        channel={ch}
                        isSelected={selectedChannel?.id === ch.id}
                        onClick={() => handleSelectChannel(ch)}
                      />
                    ))
                  ) : (
                    <div className="p-4 text-center text-on-surface-variant">
                      <p className="font-body-md">No direct messages yet</p>
                    </div>
                  )}

                  {/* Start new direct message */}
                  <div className="p-4 border-t border-outline-variant/30 bg-surface-container rounded-lg mx-2 my-2">
                    <label className="font-label-md text-on-surface-variant block mb-2">
                      New Message
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="Search employee..."
                        onChange={(e) => handleSearchEmployees(e.target.value)}
                        className="w-full px-3 py-2 bg-surface-container rounded border border-outline-variant focus:ring-2 focus:ring-primary-container outline-none text-body-md"
                      />
                      {employeeSearch.length > 0 && (
                        <div className="absolute top-full left-0 right-0 mt-1 bg-surface-container border border-outline-variant rounded shadow-lg z-10 max-h-40 overflow-y-auto">
                          {employeeSearch.map((emp) => (
                            <button
                              key={emp.id}
                              onClick={() => handleStartDirectMessage(emp.id)}
                              className="w-full text-left px-3 py-2 hover:bg-primary-container hover:text-on-primary transition-colors"
                            >
                              {emp.fullName}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}
            </>
          )}
        </div>

        {/* New Message Button - for admin */}
        {isAdmin && (
          <div className="p-4 border-t border-outline-variant/30 bg-surface">
            <button className="w-full bg-transparent border border-outline text-on-surface py-2 rounded-lg font-label-lg font-bold flex justify-center items-center gap-2 hover:bg-surface-variant transition-colors">
              <span className="material-symbols-outlined">add</span>
              New Message
            </button>
          </div>
        )}
      </aside>

      {/* Right Pane: Conversation Area */}
      <section className="hidden md:flex flex-1 flex-col bg-surface">
        {selectedChannel ? (
          <>
            {/* Chat Header */}
            <div className="flex justify-between items-center h-16 px-6 border-b border-outline-variant bg-surface sticky top-0 z-10">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-primary-container text-on-primary flex items-center justify-center">
                  <span className="material-symbols-outlined">
                    {selectedChannel.type === 'Direct' ? 'person' : 'groups'}
                  </span>
                </div>
                <div>
                  <h2 className="font-title-lg text-title-lg font-bold text-on-surface">
                    {selectedChannel.name}
                  </h2>
                  <p className="font-label-md text-label-md text-on-surface-variant">
                    {selectedChannel.members?.length || 0} members
                  </p>
                </div>
              </div>
              <div className="flex gap-2 text-on-surface-variant">
                <button className="p-2 rounded-full hover:bg-surface-variant transition-colors">
                  <span className="material-symbols-outlined">call</span>
                </button>
                <button className="p-2 rounded-full hover:bg-surface-variant transition-colors">
                  <span className="material-symbols-outlined">videocam</span>
                </button>
                <button className="p-2 rounded-full hover:bg-surface-variant transition-colors">
                  <span className="material-symbols-outlined">info</span>
                </button>
              </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-surface-container-low">
              {messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <div className="w-24 h-24 bg-surface-variant rounded-full flex items-center justify-center mb-6">
                    <span className="material-symbols-outlined text-[48px] text-on-surface-variant">
                      chat
                    </span>
                  </div>
                  <h3 className="font-headline-md text-headline-md text-on-surface font-semibold mb-2">
                    Start a conversation
                  </h3>
                  <p className="font-body-lg text-body-lg text-on-surface-variant max-w-md">
                    Send a message to begin chatting in {selectedChannel.name}
                  </p>
                </div>
              ) : (
                <>
                  {messages.map((msg) => (
                    <MessageBubble key={msg.id} message={msg} currentUserId={user?.id} />
                  ))}

                  {/* Typing Indicator */}
                  {typingUsers[selectedChannel.id]?.length > 0 && (
                    <div className="flex gap-2 items-end">
                      <div className="w-8 h-8 rounded-full bg-surface-variant flex items-center justify-center">
                        <span className="text-xs">·</span>
                      </div>
                      <div className="text-label-sm text-on-surface-variant">
                        {typingUsers[selectedChannel.id].length} typing...
                      </div>
                    </div>
                  )}

                  <div ref={messagesEndRef} />
                </>
              )}
            </div>

            {/* Message Input */}
            <div className="p-4 border-t border-outline-variant bg-surface flex gap-3 items-center">
              <button className="p-2 rounded-full hover:bg-surface-variant text-on-surface-variant transition-colors">
                <span className="material-symbols-outlined">mood</span>
              </button>
              <button className="p-2 rounded-full hover:bg-surface-variant text-on-surface-variant transition-colors">
                <span className="material-symbols-outlined">attach_file</span>
              </button>
              <input
                type="text"
                placeholder="Type a message..."
                value={newMessage}
                onChange={(e) => {
                  setNewMessage(e.target.value)
                  handleTyping()
                }}
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    handleSendMessage()
                  }
                }}
                className="flex-1 px-4 py-2 bg-surface-container rounded-full border border-outline-variant focus:ring-2 focus:ring-primary-container outline-none text-body-md"
              />
              <button
                onClick={handleSendMessage}
                disabled={!newMessage.trim()}
                className="p-2 bg-primary text-on-primary rounded-full hover:bg-primary-container disabled:opacity-50 transition-colors"
              >
                <span className="material-symbols-outlined">send</span>
              </button>
            </div>
          </>
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center bg-surface-container-low p-8">
            <div className="w-24 h-24 bg-surface-variant rounded-full flex items-center justify-center mb-6">
              <span className="material-symbols-outlined text-[48px] text-on-surface-variant">
                forum
              </span>
            </div>
            <h3 className="font-headline-md text-headline-md text-on-surface font-semibold mb-2">
              Your Messages
            </h3>
            <p className="font-body-lg text-body-lg text-on-surface-variant text-center max-w-md">
              Select a conversation from the sidebar to start chatting.
            </p>
          </div>
        )}
      </section>
    </div>
  )
}

// Helper component for chat channel button
function ChatChannelButton({ channel, isSelected, onClick }) {
  const lastMessage = channel.messages?.[channel.messages.length - 1]

  return (
    <button
      onClick={onClick}
      className={`w-full text-left p-3 rounded-lg transition-colors mx-2 mb-1 ${
        isSelected ? 'bg-primary-container/20' : 'hover:bg-surface-variant'
      }`}
    >
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-full bg-primary-container text-on-primary flex items-center justify-center shrink-0 font-label-lg">
          <span className="material-symbols-outlined text-lg">
            {channel.type === 'Direct' ? 'person' : 'groups'}
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex justify-between items-center mb-1">
            <span className="font-title-sm text-title-sm text-on-surface truncate font-bold">
              {channel.name}
            </span>
            <span className="font-label-sm text-label-sm text-on-surface-variant">
              {lastMessage?.sentAt ? new Date(lastMessage.sentAt).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit'
              }) : ''}
            </span>
          </div>
          {lastMessage && (
            <div className="font-body-sm text-body-sm text-on-surface-variant truncate">
              <span className="font-semibold">{lastMessage.senderName}:</span> {lastMessage.content}
            </div>
          )}
        </div>
      </div>
    </button>
  )
}

// Helper component for message bubble
function MessageBubble({ message, currentUserId }) {
  const isOwn = message.senderId === currentUserId

  return (
    <div className={`flex gap-3 ${isOwn ? 'justify-end' : 'justify-start'}`}>
      {!isOwn && (
        <div className="w-8 h-8 rounded-full bg-primary-container text-on-primary flex items-center justify-center shrink-0 font-label-lg font-bold text-xs">
          {message.senderName?.split(' ').map(n => n[0]).join('') || '?'}
        </div>
      )}
      <div className={`max-w-xs ${isOwn ? '' : 'flex flex-col'}`}>
        {!isOwn && (
          <span className="font-label-md text-on-surface font-bold mb-1">
            {message.senderName}
          </span>
        )}
        <div
          className={`px-4 py-2 rounded-lg ${
            isOwn
              ? 'bg-primary text-on-primary rounded-br-none'
              : 'bg-surface text-on-surface rounded-bl-none border border-outline-variant'
          }`}
        >
          <p className="font-body-md text-body-md break-words">{message.content}</p>
        </div>
        {isOwn && (
          <span className="text-label-sm text-on-surface-variant mt-1 text-right">
            {new Date(message.sentAt).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit'
            })}
          </span>
        )}
      </div>
    </div>
  )
}

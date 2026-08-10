import { useState, useEffect, useRef, useCallback } from 'react'
import { useAuth } from '../context/AuthContext'
import { useChat } from '../context/ChatContext'
import axiosInstance from '../api/axiosInstance'

/* ─────────────────────────────────────────────────────────────────── */
/*  Helpers                                                             */
/* ─────────────────────────────────────────────────────────────────── */
function formatTime(dateStr) {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function getInitials(name) {
  if (!name) return '?'
  return name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase()
}

/* ─────────────────────────────────────────────────────────────────── */
/*  Avatar – initials fallback                                          */
/* ─────────────────────────────────────────────────────────────────── */
function Avatar({ name, size = 10, className = '' }) {
  const colors = [
    'bg-blue-500', 'bg-indigo-500', 'bg-violet-500', 'bg-emerald-500',
    'bg-amber-500', 'bg-rose-500', 'bg-cyan-500', 'bg-teal-500',
  ]
  const idx = (name || '').split('').reduce((acc, c) => acc + c.charCodeAt(0), 0) % colors.length
  return (
    <div
      className={`w-${size} h-${size} rounded-full ${colors[idx]} text-white flex items-center justify-center font-bold text-xs shrink-0 ${className}`}
    >
      {getInitials(name)}
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────────── */
/*  Online indicator dot                                                */
/* ─────────────────────────────────────────────────────────────────── */
function OnlineDot({ online }) {
  return (
    <span
      className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white ${
        online ? 'bg-green-500' : 'bg-gray-300'
      }`}
    />
  )
}

/* ─────────────────────────────────────────────────────────────────── */
/*  Channel list item — Department / Group                              */
/* ─────────────────────────────────────────────────────────────────── */
function DeptChannelItem({ channel, isSelected, onClick }) {
  const lastMsg = channel.messages?.[channel.messages.length - 1]
  return (
    <button
      onClick={onClick}
      className={`w-full text-left p-3 rounded-xl transition-colors ${
        isSelected
          ? 'bg-[rgba(0,82,204,0.12)] border border-[rgba(0,82,204,0.3)]'
          : 'hover:bg-surface-container-low'
      }`}
    >
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center shrink-0">
          <span className="material-symbols-outlined">groups</span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex justify-between items-baseline mb-0.5">
            <h4 className="font-semibold text-sm text-on-surface truncate">{channel.name}</h4>
            {lastMsg && (
              <span className={`text-[11px] ${isSelected ? 'text-primary font-bold' : 'text-on-surface-variant'}`}>
                {formatTime(lastMsg.sentAt)}
              </span>
            )}
          </div>
          {lastMsg ? (
            <p className="text-xs text-on-surface-variant truncate">
              <span className="font-semibold">{lastMsg.senderName}:</span> {lastMsg.content}
            </p>
          ) : (
            <p className="text-xs text-on-surface-variant italic">No messages yet</p>
          )}
        </div>
      </div>
    </button>
  )
}

/* ─────────────────────────────────────────────────────────────────── */
/*  Channel list item — Direct Message                                  */
/* ─────────────────────────────────────────────────────────────────── */
function DirectChannelItem({ channel, isSelected, onClick, currentUserId }) {
  const lastMsg = channel.messages?.[channel.messages.length - 1]
  const otherMember = channel.members?.find((m) => m.userId !== currentUserId)
  const displayName = otherMember?.userName || channel.name || 'Unknown'

  return (
    <button
      onClick={onClick}
      className={`w-full text-left flex items-center gap-3 p-2 rounded-lg transition-colors relative ${
        isSelected
          ? 'bg-[rgba(0,82,204,0.12)] border border-[rgba(0,82,204,0.3)] after:absolute after:left-0 after:top-1/2 after:-translate-y-1/2 after:h-2/3 after:w-1 after:bg-primary after:rounded-r-full'
          : 'hover:bg-surface-container-low'
      }`}
    >
      <div className="relative">
        <Avatar name={displayName} size={10} />
        <OnlineDot online={false} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-baseline mb-0.5">
          <h4 className={`text-sm truncate ${isSelected ? 'font-bold text-on-surface' : 'font-medium text-on-surface'}`}>
            {displayName}
          </h4>
          {lastMsg && (
            <span className="text-[11px] text-on-surface-variant">
              {formatTime(lastMsg.sentAt)}
            </span>
          )}
        </div>
        <p className="text-xs text-on-surface-variant truncate">
          {lastMsg ? lastMsg.content : 'No messages yet'}
        </p>
      </div>
    </button>
  )
}

/* ─────────────────────────────────────────────────────────────────── */
/*  Message Bubble                                                       */
/* ─────────────────────────────────────────────────────────────────── */
function MessageBubble({ message, currentUserId, isGroup, prevMessage }) {
  const isOwn = message.senderId === currentUserId
  const showSenderInfo =
    !isOwn && isGroup && (!prevMessage || prevMessage.senderId !== message.senderId)

  return (
    <div className={`flex gap-2.5 ${isOwn ? 'justify-end' : 'justify-start'} max-w-[85%] ${isOwn ? 'self-end' : 'self-start'}`}>
      {/* Incoming avatar */}
      {!isOwn && (
        <div className="w-8 h-8 shrink-0 mt-1">
          {showSenderInfo ? (
            <Avatar name={message.senderName} size={8} />
          ) : (
            <div className="w-8 h-8" />
          )}
        </div>
      )}

      <div className={`flex flex-col gap-0.5 ${isOwn ? 'items-end' : 'items-start'}`}>
        {/* Sender name + role badge (group only) */}
        {showSenderInfo && (
          <div className="flex items-baseline gap-2 px-1">
            <span className="text-sm font-semibold text-on-surface">{message.senderName}</span>
            {message.senderRole && (
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide ${
                message.senderRole === 'Manager'
                  ? 'bg-blue-100 text-blue-800'
                  : message.senderRole === 'HR'
                  ? 'bg-purple-100 text-purple-800'
                  : 'bg-gray-200 text-gray-700'
              }`}>
                {message.senderRole}
              </span>
            )}
            <span className="text-[11px] text-on-surface-variant ml-1">{formatTime(message.sentAt)}</span>
          </div>
        )}

        {/* Bubble */}
        <div
          className={`px-4 py-2.5 shadow-sm ${
            isOwn
              ? 'bg-primary-container text-on-primary rounded-2xl rounded-tr-sm shadow-[0_4px_12px_rgba(0,82,204,0.15)]'
              : 'bg-[#F1F3F5] text-on-surface rounded-2xl rounded-tl-sm border border-[rgba(0,0,0,0.06)]'
          }`}
        >
          <p className="text-sm leading-5 break-words">{message.content}</p>
        </div>

        {/* Timestamp for outgoing or when no sender header */}
        {(isOwn || (!isGroup && !isOwn)) && (
          <span className="text-[10px] text-on-surface-variant px-1 opacity-0 group-hover:opacity-100 transition-opacity">
            {formatTime(message.sentAt)}
          </span>
        )}
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────────── */
/*  Typing indicator                                                     */
/* ─────────────────────────────────────────────────────────────────── */
function TypingIndicator({ count }) {
  if (!count) return null
  return (
    <div className="flex items-center gap-2 self-start">
      <div className="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center shrink-0">
        <span className="text-on-surface-variant text-xs">…</span>
      </div>
      <div className="bg-[#F1F3F5] border border-[rgba(0,0,0,0.06)] rounded-2xl rounded-tl-sm px-4 py-2.5 flex gap-1 items-center">
        <span className="w-2 h-2 bg-on-surface-variant rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
        <span className="w-2 h-2 bg-on-surface-variant rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
        <span className="w-2 h-2 bg-on-surface-variant rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
      </div>
      <span className="text-xs text-on-surface-variant">{count} typing…</span>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────────── */
/*  Empty state                                                          */
/* ─────────────────────────────────────────────────────────────────── */
function EmptyConversation({ channelName }) {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center px-8">
      <div className="w-20 h-20 rounded-full bg-surface-container-low flex items-center justify-center mb-5">
        <span className="material-symbols-outlined text-[40px] text-on-surface-variant">chat</span>
      </div>
      <h3 className="text-lg font-semibold text-on-surface mb-1">Start the conversation</h3>
      <p className="text-sm text-on-surface-variant max-w-xs">
        Send a message to begin chatting in{' '}
        <span className="font-semibold text-primary">{channelName}</span>.
      </p>
    </div>
  )
}

function NoChannelSelected({ isAdmin }) {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center px-8">
      <div className="w-20 h-20 rounded-full bg-surface-container-low flex items-center justify-center mb-5">
        <span className="material-symbols-outlined text-[40px] text-on-surface-variant">
          {isAdmin ? 'mark_chat_unread' : 'forum'}
        </span>
      </div>
      <h3 className="text-lg font-semibold text-on-surface mb-1">Your Messages</h3>
      <p className="text-sm text-on-surface-variant max-w-xs">
        Select a conversation from the sidebar to start chatting.
      </p>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────────── */
/*  Main TeamChat Component                                              */
/* ─────────────────────────────────────────────────────────────────── */
export default function TeamChat() {
  const { user } = useAuth()
  const {
    channels,
    selectedChannel,
    messages,
    typingUsers,
    selectChannel,
    sendMessage,
    joinChannel,
    sendTypingIndicator,
    updateChannels,
    updateMessages,
    error,
  } = useChat()

  const isAdmin = user?.role === 'Admin'

  /* local state */
  const [searchTerm, setSearchTerm] = useState('')
  const [newMessage, setNewMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState('department') // 'department' | 'direct'
  const [directChannels, setDirectChannels] = useState([])
  const [employeeSearch, setEmployeeSearch] = useState([])
  const [empSearchQuery, setEmpSearchQuery] = useState('')
  const [showNewDM, setShowNewDM] = useState(false)

  const messagesEndRef = useRef(null)
  const typingTimeoutRef = useRef(null)
  const empSearchRef = useRef(null)

  /* ── Load channels on mount ── */
  useEffect(() => {
    if (!user) return
    loadChannels()
  }, [user])

  /* ── Auto-scroll to newest message ── */
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  /* ── Close employee search dropdown on outside click ── */
  useEffect(() => {
    const handler = (e) => {
      if (empSearchRef.current && !empSearchRef.current.contains(e.target)) {
        setEmployeeSearch([])
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  /* ── Load channels ── */
  const loadChannels = async () => {
    try {
      setLoading(true)
      const res = await axiosInstance.get('/api/chat/my-channels')
      const all = res.data?.data || []
      const groups = all.filter((ch) => ch.type === 'Group')
      const directs = all.filter((ch) => ch.type === 'Direct')

      updateChannels(groups)
      setDirectChannels(directs)

      // Auto select department channel if none selected yet
      if (groups.length > 0 && !selectedChannel) {
        handleSelectChannel(groups[0])
      } else if (directs.length > 0 && !selectedChannel) {
        handleSelectChannel(directs[0])
      }
    } catch (err) {
      console.error('Failed to load channels:', err)
    } finally {
      setLoading(false)
    }
  }

  /* ── Select / open a channel ── */
  const handleSelectChannel = async (channel) => {
    selectChannel(channel)
    setActiveTab(channel.type === 'Direct' ? 'direct' : 'department')
    try {
      const res = await axiosInstance.get(`/api/chat/${channel.id}/messages`)
      updateMessages(res.data?.data || [])
      await joinChannel(channel.id)
    } catch (err) {
      console.error('Failed to load channel messages:', err)
    }
  }

  /* ── Send message ── */
  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedChannel) return
    const msg = newMessage
    setNewMessage('')
    try {
      await sendMessage(selectedChannel.id, msg)
    } catch {
      setNewMessage(msg)
    }
  }

  /* ── Start a direct message ── */
  const handleStartDirectMessage = async (employeeId) => {
    try {
      const res = await axiosInstance.post(`/api/chat/direct/with/${employeeId}`)
      const channel = res.data?.data
      if (channel) {
        // Add to list if not present
        setDirectChannels((prev) =>
          prev.find((c) => c.id === channel.id) ? prev : [channel, ...prev]
        )
        handleSelectChannel(channel)
        setShowNewDM(false)
        setEmpSearchQuery('')
        setEmployeeSearch([])
      }
    } catch (err) {
      console.error('Failed to start direct message:', err)
    }
  }

  /* ── Employee search ── */
  const handleSearchEmployees = async (term = '') => {
    setEmpSearchQuery(term)
    try {
      const res = await axiosInstance.get(`/api/chat/employees/search?searchTerm=${encodeURIComponent(term)}`)
      setEmployeeSearch(res.data?.data || [])
    } catch (err) {
      console.error('Failed to search employees:', err)
    }
  }

  /* ── Typing indicator ── */
  const handleTyping = () => {
    if (!selectedChannel) return
    sendTypingIndicator(selectedChannel.id)
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current)
    typingTimeoutRef.current = setTimeout(() => {}, 2000)
  }

  /* ── Keyboard send ── */
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  /* ── Filtered lists ── */
  const filteredChannels = channels.filter((ch) =>
    ch.name?.toLowerCase().includes(searchTerm.toLowerCase())
  )
  const filteredDirectChannels = directChannels.filter((ch) =>
    ch.name?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  /* ── Selected channel helpers ── */
  const isGroupChannel = selectedChannel?.type === 'Group'
  const otherMember = !isGroupChannel && selectedChannel
    ? selectedChannel.members?.find((m) => m.userId !== user?.id)
    : null
  const chatTitle = isGroupChannel
    ? selectedChannel?.name
    : otherMember?.userName || selectedChannel?.name || ''
  const memberCount = selectedChannel?.members?.length || 0
  const typingCount = typingUsers[selectedChannel?.id]?.length || 0

  /* ════════════════════════════════════════════════════════════════ */
  /*  RENDER                                                           */
  /* ════════════════════════════════════════════════════════════════ */
  return (
    <div className="h-full flex overflow-hidden bg-background">

      {/* ══════════════════════════════════════════════════════ */}
      {/*  LEFT PANEL — channel / DM list                        */}
      {/* ══════════════════════════════════════════════════════ */}
      <aside className="w-full md:w-[320px] lg:w-[360px] border-r border-outline-variant flex flex-col bg-surface-container-lowest shrink-0 h-full">

        {/* ── Panel header ── */}
        <div className="p-6 border-b border-outline-variant">
          <h2 className="text-2xl font-bold text-on-surface mb-4">
            {isAdmin ? 'Direct Messages' : 'Chat'}
          </h2>
          <div className="relative">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[20px]">
              search
            </span>
            <input
              className="w-full pl-10 pr-4 py-2 bg-surface rounded-lg border border-outline-variant focus:border-primary focus:ring-2 focus:ring-blue-100 transition-shadow text-sm text-on-surface placeholder:text-on-surface-variant outline-none"
              placeholder={isAdmin ? 'Find people...' : 'Search people or messages...'}
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {/* ── Tab bar (non-admin only) ── */}
        {!isAdmin && (
          <div className="flex border-b border-outline-variant">
            <button
              onClick={() => setActiveTab('department')}
              className={`flex-1 py-3 px-4 text-sm font-medium text-center border-b-2 transition-colors ${
                activeTab === 'department'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-on-surface-variant hover:text-on-surface'
              }`}
            >
              Department
            </button>
            <button
              onClick={() => {
                setActiveTab('direct')
                handleSearchEmployees('')
              }}
              className={`flex-1 py-3 px-4 text-sm font-medium text-center border-b-2 transition-colors ${
                activeTab === 'direct'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-on-surface-variant hover:text-on-surface'
              }`}
            >
              Direct
            </button>
          </div>
        )}

        {/* ── Scrollable list ── */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6">

          {/* ─ Admin: only DMs ─ */}
          {isAdmin && (
            <div className="space-y-1">
              {filteredDirectChannels.length > 0 ? (
                filteredDirectChannels.map((ch) => (
                  <DirectChannelItem
                    key={ch.id}
                    channel={ch}
                    isSelected={selectedChannel?.id === ch.id}
                    onClick={() => handleSelectChannel(ch)}
                    currentUserId={user?.id}
                  />
                ))
              ) : (
                <div className="py-8 text-center">
                  <span className="material-symbols-outlined text-[40px] text-on-surface-variant block mb-2">
                    chat_bubble_outline
                  </span>
                  <p className="text-sm text-on-surface-variant">No direct messages yet</p>
                </div>
              )}
            </div>
          )}

          {/* ─ Non-admin: Department tab ─ */}
          {!isAdmin && activeTab === 'department' && (
            <div>
              <h3 className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-2 px-1">
                Department
              </h3>
              {loading ? (
                <div className="py-6 text-center text-sm text-on-surface-variant">Loading…</div>
              ) : filteredChannels.length > 0 ? (
                filteredChannels.map((ch) => (
                  <DeptChannelItem
                    key={ch.id}
                    channel={ch}
                    isSelected={selectedChannel?.id === ch.id}
                    onClick={() => handleSelectChannel(ch)}
                  />
                ))
              ) : (
                <div className="py-6 text-center text-sm text-on-surface-variant">
                  No department chats found
                </div>
              )}
            </div>
          )}

          {/* ─ Non-admin: Direct tab ─ */}
          {!isAdmin && activeTab === 'direct' && (
            <div>
              <div className="flex justify-between items-center mb-2 px-1">
                <h3 className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider">
                  Direct Messages
                </h3>
                <button
                  onClick={() => {
                    const next = !showNewDM
                    setShowNewDM(next)
                    if (next) handleSearchEmployees('')
                  }}
                  className="text-on-surface-variant hover:text-primary transition-colors"
                  title="New Direct Message"
                >
                  <span className="material-symbols-outlined text-xl">add</span>
                </button>
              </div>

              {/* New DM search */}
              {showNewDM && (
                <div ref={empSearchRef} className="relative mb-3">
                  <input
                    type="text"
                    placeholder="Search employee..."
                    value={empSearchQuery}
                    onFocus={() => handleSearchEmployees(empSearchQuery)}
                    onChange={(e) => handleSearchEmployees(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-surface rounded-lg border border-outline-variant focus:border-primary focus:ring-2 focus:ring-blue-100 outline-none"
                  />
                  {employeeSearch.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-surface-container-lowest border border-outline-variant rounded-lg shadow-lg z-20 max-h-40 overflow-y-auto">
                      {employeeSearch.map((emp) => (
                        <button
                          key={emp.id}
                          onClick={() => handleStartDirectMessage(emp.id)}
                          className="w-full text-left flex items-center gap-2 px-3 py-2 hover:bg-surface-container-low text-sm text-on-surface transition-colors"
                        >
                          <Avatar name={emp.fullName} size={7} />
                          <div className="flex flex-col min-w-0">
                            <span className="font-medium text-sm truncate">{emp.fullName}</span>
                            <span className="text-xs text-on-surface-variant truncate">{emp.role} {emp.email ? `• ${emp.email}` : ''}</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div className="space-y-1">
                {filteredDirectChannels.length > 0 ? (
                  filteredDirectChannels.map((ch) => (
                    <DirectChannelItem
                      key={ch.id}
                      channel={ch}
                      isSelected={selectedChannel?.id === ch.id}
                      onClick={() => handleSelectChannel(ch)}
                      currentUserId={user?.id}
                    />
                  ))
                ) : (
                  <div className="py-6 text-center text-sm text-on-surface-variant">
                    No direct messages yet
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* ── Admin: New message button ── */}
        {isAdmin && (
          <div className="p-4 border-t border-outline-variant">
            <div ref={empSearchRef} className="relative">
              <input
                type="text"
                placeholder="New message — search employee..."
                value={empSearchQuery}
                onFocus={() => handleSearchEmployees(empSearchQuery)}
                onChange={(e) => handleSearchEmployees(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-surface rounded-lg border border-outline-variant focus:border-primary focus:ring-2 focus:ring-blue-100 outline-none"
              />
              {employeeSearch.length > 0 && (
                <div className="absolute bottom-full left-0 right-0 mb-1 bg-surface-container-lowest border border-outline-variant rounded-lg shadow-lg z-20 max-h-40 overflow-y-auto">
                  {employeeSearch.map((emp) => (
                    <button
                      key={emp.id}
                      onClick={() => handleStartDirectMessage(emp.id)}
                      className="w-full text-left flex items-center gap-2 px-3 py-2 hover:bg-surface-container-low text-sm text-on-surface transition-colors"
                    >
                      <Avatar name={emp.fullName} size={7} />
                      <div className="flex flex-col min-w-0">
                        <span className="font-medium text-sm truncate">{emp.fullName}</span>
                        <span className="text-xs text-on-surface-variant truncate">{emp.role} {emp.email ? `• ${emp.email}` : ''}</span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </aside>

      {/* ══════════════════════════════════════════════════════ */}
      {/*  RIGHT PANEL — active conversation                     */}
      {/* ══════════════════════════════════════════════════════ */}
      <section className="hidden md:flex flex-1 flex-col bg-surface-container-lowest relative z-0 h-full overflow-hidden">
        {selectedChannel ? (
          <>
            {/* ── Chat header ── */}
            <div className="h-20 px-6 border-b border-outline-variant flex items-center justify-between bg-white/80 backdrop-blur-md sticky top-0 z-10 shadow-[0_4px_4px_rgba(0,0,0,0.02)] shrink-0">
              <div className="flex items-center gap-4">
                {/* Icon / avatar */}
                {isGroupChannel ? (
                  <div className="w-12 h-12 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center shadow-[0_4px_12px_rgba(0,82,204,0.2)]">
                    <span className="material-symbols-outlined">groups</span>
                  </div>
                ) : (
                  <div className="relative">
                    <Avatar name={chatTitle} size={12} />
                    <span className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 border-2 border-white rounded-full shadow-sm" />
                  </div>
                )}

                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-bold text-on-surface leading-tight">{chatTitle}</h2>
                    {!isGroupChannel && otherMember?.role && (
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        otherMember.role === 'HR'
                          ? 'bg-purple-100 text-purple-800 border border-purple-200'
                          : otherMember.role === 'Manager'
                          ? 'bg-amber-100 text-amber-800 border border-amber-200'
                          : 'bg-gray-100 text-gray-700 border border-gray-200'
                      }`}>
                        {otherMember.role}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-on-surface-variant flex items-center gap-1">
                    {isGroupChannel ? (
                      <>
                        {memberCount} Members{' '}
                        <span className="material-symbols-outlined text-[14px]">info</span>
                      </>
                    ) : (
                      <>
                        <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" />
                        Active Now
                      </>
                    )}
                  </p>
                </div>
              </div>

              <div className="flex gap-1">
                <button className="p-2 rounded-full hover:bg-surface-container-low text-on-surface-variant transition-colors" title="Call">
                  <span className="material-symbols-outlined">call</span>
                </button>
                <button className="p-2 rounded-full hover:bg-surface-container-low text-on-surface-variant transition-colors" title="Video Call">
                  <span className="material-symbols-outlined">videocam</span>
                </button>
                {!isGroupChannel && (
                  <button className="p-2 rounded-full hover:bg-surface-container-low text-on-surface-variant transition-colors" title="Info">
                    <span className="material-symbols-outlined">info</span>
                  </button>
                )}
              </div>
            </div>

            {/* ── Messages area ── */}
            <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-4 bg-surface-bright relative">
              {/* Subtle dot pattern for admin */}
              {isAdmin && (
                <div
                  className="absolute inset-0 opacity-[0.03] pointer-events-none"
                  style={{
                    backgroundImage: 'radial-gradient(#0052cc 1px, transparent 1px)',
                    backgroundSize: '20px 20px',
                  }}
                />
              )}

              {/* Date divider */}
              <div className="flex items-center justify-center">
                <div className="bg-surface-container-low px-4 py-1 rounded-full text-xs font-medium text-on-surface-variant">
                  Today
                </div>
              </div>

              {messages.length === 0 ? (
                <EmptyConversation channelName={chatTitle} />
              ) : (
                <>
                  {messages.map((msg, idx) => (
                    <MessageBubble
                      key={msg.id}
                      message={msg}
                      currentUserId={user?.id}
                      isGroup={isGroupChannel}
                      prevMessage={idx > 0 ? messages[idx - 1] : null}
                    />
                  ))}
                  <TypingIndicator count={typingCount} />
                  <div ref={messagesEndRef} />
                </>
              )}
            </div>

            {/* ── Message input ── */}
            <div className="p-4 border-t border-outline-variant bg-surface-container-lowest shrink-0">
              {error && (
                <p className="text-xs text-error mb-2 px-1">{error}</p>
              )}
              <div className="flex items-end gap-2 bg-surface p-2 rounded-2xl border border-outline-variant focus-within:border-primary focus-within:ring-2 focus-within:ring-blue-100 transition-all shadow-[0_4px_12px_rgba(0,0,0,0.04)]">
                {/* Left actions */}
                <div className="flex gap-1 mb-1">
                  <button
                    className="p-2 text-on-surface-variant hover:text-primary hover:bg-surface-container-low rounded-lg transition-colors"
                    title="Attach file"
                  >
                    <span className="material-symbols-outlined text-[20px]">attach_file</span>
                  </button>
                  {!isGroupChannel && (
                    <button
                      className="p-2 text-on-surface-variant hover:text-primary hover:bg-surface-container-low rounded-lg transition-colors hidden sm:block"
                      title="Format text"
                    >
                      <span className="material-symbols-outlined text-[20px]">format_bold</span>
                    </button>
                  )}
                </div>

                {/* Text area */}
                <textarea
                  className="flex-1 bg-transparent border-none focus:ring-0 resize-none max-h-32 py-2 text-sm text-on-surface placeholder:text-on-surface-variant outline-none"
                  placeholder={`${isGroupChannel ? 'Type a message...' : `Reply to ${chatTitle}...`}`}
                  rows={1}
                  value={newMessage}
                  onChange={(e) => {
                    setNewMessage(e.target.value)
                    handleTyping()
                  }}
                  onKeyDown={handleKeyDown}
                />

                {/* Right actions */}
                <div className="flex gap-1 mb-1">
                  <button
                    className="p-2 text-on-surface-variant hover:text-primary hover:bg-surface-container-low rounded-lg transition-colors hidden sm:block"
                    title="Emoji"
                  >
                    <span className="material-symbols-outlined text-[20px]">mood</span>
                  </button>
                  <button
                    onClick={handleSendMessage}
                    disabled={!newMessage.trim()}
                    className="w-10 h-10 rounded-full bg-primary-container text-on-primary flex items-center justify-center shrink-0 hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
                    title="Send message"
                  >
                    <span className="material-symbols-outlined text-[20px]">send</span>
                  </button>
                </div>
              </div>
            </div>
          </>
        ) : (
          <NoChannelSelected isAdmin={isAdmin} />
        )}
      </section>
    </div>
  )
}

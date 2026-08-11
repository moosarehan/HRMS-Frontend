import { useState, useEffect, useMemo } from 'react'
import { getAllAnnouncements } from '../api/hrmsApi'

export default function CompanyAnnouncementsView({ variant = 'full', onViewAll }) {
  const [announcements, setAnnouncements] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedAnnouncement, setSelectedAnnouncement] = useState(null)

  useEffect(() => {
    const fetchAnnouncements = async () => {
      try {
        const res = await getAllAnnouncements()
        setAnnouncements(res.data.data || [])
      } catch (error) {
        console.error('Error fetching announcements:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchAnnouncements()
  }, [])

  const sortedAnnouncements = useMemo(() => {
    return [...announcements].sort((a, b) => {
      if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1
      return new Date(b.createdAt) - new Date(a.createdAt)
    })
  }, [announcements])

  const filteredAnnouncements = useMemo(() => {
    return sortedAnnouncements.filter((announcement) => {
      if (!searchQuery) return true
      const query = searchQuery.toLowerCase()
      return (
        announcement.title.toLowerCase().includes(query) ||
        announcement.content.toLowerCase().includes(query) ||
        (announcement.postedByName && announcement.postedByName.toLowerCase().includes(query))
      )
    })
  }, [sortedAnnouncements, searchQuery])

  const formatTimeAgo = (dateString) => {
    if (!dateString) return ''
    const date = new Date(dateString)
    const now = new Date()
    const diffInSeconds = Math.floor((now - date) / 1000)
    
    if (diffInSeconds < 60) return 'Just now'
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`
    if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)}d ago`
    return date.toLocaleDateString()
  }

  const getAuthorInitials = (name) => {
    if (!name) return '?'
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2)
  }

  /* ───────────────────────────────────────────────────────────── */
  /* COMPACT WIDGET VARIANT FOR TOP OF DASHBOARDS                  */
  /* ───────────────────────────────────────────────────────────── */
  if (variant === 'compact') {
    if (loading) {
      return (
        <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-4 shadow-xs animate-pulse mb-6">
          <div className="h-5 w-48 bg-surface-container-highest rounded mb-3"></div>
          <div className="h-12 bg-surface-container-low rounded"></div>
        </div>
      )
    }

    const recentAnnouncements = sortedAnnouncements.slice(0, 3)

    return (
      <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-5 shadow-xs mb-6">
        {/* Compact Widget Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
              <span className="material-symbols-outlined text-[20px]">campaign</span>
            </div>
            <div>
              <h3 className="font-title-lg text-on-surface text-base font-bold">Company Announcements</h3>
              <p className="font-body-md text-xs text-on-surface-variant">Latest updates & policy broadcasts</p>
            </div>
          </div>
          {onViewAll && announcements.length > 0 && (
            <button
              onClick={onViewAll}
              className="flex items-center gap-1 font-label-lg text-xs text-primary hover:underline font-semibold"
            >
              View All ({announcements.length})
              <span className="material-symbols-outlined text-[16px]">chevron_right</span>
            </button>
          )}
        </div>

        {/* Compact List */}
        {recentAnnouncements.length === 0 ? (
          <div className="text-center py-4 bg-surface-bright rounded-xl border border-dashed border-outline-variant">
            <p className="font-body-md text-xs text-on-surface-variant">No company announcements posted yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {recentAnnouncements.map((announcement) => (
              <div
                key={announcement.id}
                onClick={() => setSelectedAnnouncement(announcement)}
                className="group relative bg-surface-bright border border-outline-variant hover:border-primary/40 rounded-xl p-3.5 transition-all hover:shadow-xs cursor-pointer flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-1">
                    {announcement.isPinned ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-md">
                        📌 Pinned
                      </span>
                    ) : (
                      <span className="text-[10px] text-on-surface-variant">Update</span>
                    )}
                    <span className="text-[10px] text-on-surface-variant">{formatTimeAgo(announcement.createdAt)}</span>
                  </div>
                  <h4 className="font-title-md text-sm font-bold text-on-surface group-hover:text-primary transition-colors line-clamp-1">
                    {announcement.title}
                  </h4>
                  <p className="font-body-md text-xs text-on-surface-variant line-clamp-2 mt-1">
                    {announcement.content}
                  </p>
                </div>
                <div className="mt-3 pt-2 border-t border-outline-variant/60 flex items-center justify-between text-[11px] text-on-surface-variant">
                  <span className="truncate">By {announcement.postedByName}</span>
                  <span className="text-primary font-medium group-hover:translate-x-0.5 transition-transform">Read →</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Detail Modal */}
        {selectedAnnouncement && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-[1px]">
            <div className="bg-surface-container-lowest rounded-3xl w-full max-w-2xl shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
              <div className="px-6 py-4 border-b border-outline-variant flex justify-between items-center bg-surface-container-lowest sticky top-0 z-10">
                <div className="flex items-center gap-3">
                  {selectedAnnouncement.isPinned && (
                    <span className="flex items-center gap-1 bg-amber-100 text-amber-700 px-2.5 py-0.5 rounded text-xs font-semibold">
                      📌 Pinned
                    </span>
                  )}
                  <span className="text-xs text-on-surface-variant">
                    {new Date(selectedAnnouncement.createdAt).toLocaleDateString(undefined, { 
                      weekday: 'long', 
                      year: 'numeric', 
                      month: 'long', 
                      day: 'numeric' 
                    })}
                  </span>
                </div>
                <button
                  onClick={() => setSelectedAnnouncement(null)}
                  className="p-2 text-on-surface-variant hover:bg-surface-container-low rounded-full transition-colors flex items-center"
                >
                  <span className="material-symbols-outlined text-[20px]">close</span>
                </button>
              </div>
              
              <div className="p-6 overflow-y-auto">
                <h2 className="font-headline-md text-xl text-on-surface font-bold mb-4">
                  {selectedAnnouncement.title}
                </h2>
                <div className="font-body-md text-sm text-on-surface whitespace-pre-line leading-relaxed">
                  {selectedAnnouncement.content}
                </div>
              </div>

              <div className="px-6 py-4 border-t border-outline-variant flex justify-between items-center bg-surface-container-lowest sticky bottom-0 z-10">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-surface-container-highest flex items-center justify-center text-on-surface font-label-lg text-xs font-bold">
                    {getAuthorInitials(selectedAnnouncement.postedByName)}
                  </div>
                  <div>
                    <div className="font-medium text-xs text-on-surface">
                      {selectedAnnouncement.postedByName}
                    </div>
                    <div className="text-[11px] text-on-surface-variant">
                      Author
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedAnnouncement(null)}
                  className="px-5 py-2 rounded-full font-label-lg text-sm text-on-surface hover:bg-surface-container-low transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  /* ───────────────────────────────────────────────────────────── */
  /* FULL PAGE VARIANT FOR NAV TAB                                 */
  /* ───────────────────────────────────────────────────────────── */
  return (
    <div className="space-y-6">
      {/* Search Header */}
      <div className="flex justify-end items-center">
        <div className="relative w-full md:w-64">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-on-surface-variant">
            <span className="material-symbols-outlined text-[20px]">search</span>
          </div>
          <input
            type="text"
            placeholder="Search announcements..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-outline-variant rounded-full bg-surface-container-lowest text-on-surface focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent font-body-md text-sm"
          />
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : filteredAnnouncements.length === 0 ? (
        <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-12 text-center">
          <div className="w-16 h-16 bg-surface-container-highest rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="material-symbols-outlined text-3xl text-on-surface-variant">campaign</span>
          </div>
          <h3 className="font-title-lg text-on-surface text-lg font-bold mb-2">No announcements yet</h3>
          <p className="font-body-md text-on-surface-variant text-sm">
            {searchQuery ? 'No announcements matched your search.' : 'Check back later for company updates.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filteredAnnouncements.map((announcement) => (
            <div
              key={announcement.id}
              onClick={() => setSelectedAnnouncement(announcement)}
              className="group relative bg-surface-container-lowest border border-outline-variant rounded-2xl p-5 pl-6 overflow-hidden transition-all hover:shadow-xs cursor-pointer"
            >
              {/* Accent Bar */}
              <div
                className={`absolute left-0 top-0 bottom-0 w-1 ${
                  announcement.isPinned 
                    ? 'bg-amber-500' 
                    : 'bg-transparent group-hover:bg-primary/50'
                } transition-colors`}
              />

              <div className="flex flex-col h-full">
                {announcement.isPinned && (
                  <div className="flex items-center gap-1.5 text-amber-600 font-label-md mb-2 text-xs font-semibold">
                    <span className="material-symbols-outlined text-[16px]">push_pin</span>
                    Pinned
                  </div>
                )}
                
                <h3 className="font-headline-md text-lg text-on-surface font-bold mb-2 group-hover:text-primary transition-colors">
                  {announcement.title}
                </h3>
                
                <p className="font-body-md text-sm text-on-surface-variant whitespace-pre-line mb-4 line-clamp-3">
                  {announcement.content}
                </p>

                <div className="mt-auto flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-surface-container-highest flex items-center justify-center text-on-surface font-label-md text-xs font-bold">
                    {getAuthorInitials(announcement.postedByName)}
                  </div>
                  <div className="text-xs text-on-surface-variant">
                    Posted by <span className="font-medium text-on-surface">{announcement.postedByName}</span> • {formatTimeAgo(announcement.createdAt)}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Detail Modal */}
      {selectedAnnouncement && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-[1px]">
          <div className="bg-surface-container-lowest rounded-3xl w-full max-w-2xl shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-outline-variant flex justify-between items-center bg-surface-container-lowest sticky top-0 z-10">
              <div className="flex items-center gap-3">
                {selectedAnnouncement.isPinned && (
                  <span className="flex items-center gap-1 bg-amber-100 text-amber-700 px-2.5 py-0.5 rounded text-xs font-semibold">
                    📌 Pinned
                  </span>
                )}
                <span className="text-xs text-on-surface-variant">
                  {new Date(selectedAnnouncement.createdAt).toLocaleDateString(undefined, { 
                    weekday: 'long', 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}
                </span>
              </div>
              <button
                onClick={() => setSelectedAnnouncement(null)}
                className="p-2 text-on-surface-variant hover:bg-surface-container-low rounded-full transition-colors flex items-center"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto">
              <h2 className="font-headline-md text-xl text-on-surface font-bold mb-4">
                {selectedAnnouncement.title}
              </h2>
              <div className="font-body-md text-sm text-on-surface whitespace-pre-line leading-relaxed">
                {selectedAnnouncement.content}
              </div>
            </div>

            <div className="px-6 py-4 border-t border-outline-variant flex justify-between items-center bg-surface-container-lowest sticky bottom-0 z-10">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-surface-container-highest flex items-center justify-center text-on-surface font-label-lg text-xs font-bold">
                  {getAuthorInitials(selectedAnnouncement.postedByName)}
                </div>
                <div>
                  <div className="font-medium text-xs text-on-surface">
                    {selectedAnnouncement.postedByName}
                  </div>
                  <div className="text-[11px] text-on-surface-variant">
                    Author
                  </div>
                </div>
              </div>
              <button
                onClick={() => setSelectedAnnouncement(null)}
                className="px-5 py-2 rounded-full font-label-lg text-sm text-on-surface hover:bg-surface-container-low transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

import { useState, useEffect } from 'react'
import { 
  getAllAnnouncements, 
  createAnnouncement, 
  updateAnnouncement, 
  deleteAnnouncement 
} from '../../api/hrmsApi'

export default function AdminAnnouncementsPanel() {
  const [announcements, setAnnouncements] = useState([])
  const [loading, setLoading] = useState(true)
  
  // Modals
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [deletingAnnouncement, setDeletingAnnouncement] = useState(null)
  
  // Form State
  const [editingAnnouncement, setEditingAnnouncement] = useState(null)
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [isPinned, setIsPinned] = useState(false)

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

  useEffect(() => {
    fetchAnnouncements()
  }, [])

  const handleOpenModal = (announcement = null) => {
    if (announcement) {
      setEditingAnnouncement(announcement)
      setTitle(announcement.title)
      setContent(announcement.content)
      setIsPinned(announcement.isPinned)
    } else {
      setEditingAnnouncement(null)
      setTitle('')
      setContent('')
      setIsPinned(false)
    }
    setIsModalOpen(true)
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
    setEditingAnnouncement(null)
    setTitle('')
    setContent('')
    setIsPinned(false)
  }

  const handleSaveAnnouncement = async (e) => {
    e.preventDefault()
    try {
      if (editingAnnouncement) {
        await updateAnnouncement(editingAnnouncement.id, { title, content, isPinned })
      } else {
        await createAnnouncement({ title, content, isPinned })
      }
      await fetchAnnouncements()
      handleCloseModal()
    } catch (error) {
      console.error('Error saving announcement:', error)
      alert('Failed to save announcement.')
    }
  }

  const handleDeleteConfirm = async () => {
    if (!deletingAnnouncement) return
    try {
      await deleteAnnouncement(deletingAnnouncement.id)
      await fetchAnnouncements()
      setDeletingAnnouncement(null)
    } catch (error) {
      console.error('Error deleting announcement:', error)
      alert('Failed to delete announcement.')
    }
  }

  const sortedAnnouncements = [...announcements].sort((a, b) => {
    if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1
    return new Date(b.createdAt) - new Date(a.createdAt)
  })

  const formatTimeAgo = (dateString) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInSeconds = Math.floor((now - date) / 1000)
    
    if (diffInSeconds < 60) return 'Just now'
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`
    if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)}d ago`
    return date.toLocaleDateString()
  }

  const getInitials = (name) => {
    if (!name) return '?'
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2)
  }

  return (
    <div className="space-y-6">
      {/* Header Action */}
      <div className="flex justify-end items-center">
        <button
          onClick={() => handleOpenModal()}
          className="flex items-center gap-2 bg-[#0f172a] text-white px-4 py-2 rounded-full font-label-lg hover:bg-slate-800 transition-colors shadow-xs active:scale-[0.98]"
        >
          <span className="material-symbols-outlined text-[20px]">add</span>
          New Announcement
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : sortedAnnouncements.length === 0 ? (
        <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-12 text-center">
          <div className="w-16 h-16 bg-surface-container-highest rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="material-symbols-outlined text-3xl text-on-surface-variant">campaign</span>
          </div>
          <h3 className="font-title-lg text-on-surface text-lg font-bold mb-2">No announcements yet</h3>
          <p className="font-body-md text-on-surface-variant mb-6">
            Post your first company-wide update
          </p>
          <button
            onClick={() => handleOpenModal()}
            className="inline-flex items-center gap-2 bg-primary text-on-primary px-5 py-2.5 rounded-full font-label-lg hover:bg-primary/90 transition-colors shadow-xs"
          >
            <span className="material-symbols-outlined text-[20px]">add</span>
            New Announcement
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {sortedAnnouncements.map((announcement) => (
            <div
              key={announcement.id}
              className="group relative bg-surface-container-lowest border border-outline-variant rounded-2xl p-5 pl-6 overflow-hidden transition-all hover:shadow-xs"
            >
              {/* Accent Bar */}
              <div
                className={`absolute left-0 top-0 bottom-0 w-1 ${
                  announcement.isPinned 
                    ? 'bg-amber-500' 
                    : 'bg-transparent group-hover:bg-primary/50'
                } transition-colors`}
              />

              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  {announcement.isPinned && (
                    <div className="flex items-center gap-1.5 text-amber-600 font-label-md mb-2 text-xs font-semibold">
                      <span className="material-symbols-outlined text-[16px]">push_pin</span>
                      Pinned
                    </div>
                  )}
                  
                  <h3 className="font-title-lg text-on-surface font-bold text-lg mb-2">
                    {announcement.title}
                  </h3>
                  
                  <p className="font-body-md text-on-surface-variant whitespace-pre-line mb-4 text-sm">
                    {announcement.content}
                  </p>

                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-surface-container-highest flex items-center justify-center text-on-surface font-label-md text-xs font-bold">
                      {getInitials(announcement.postedByName)}
                    </div>
                    <div className="text-xs text-on-surface-variant">
                      Posted by <span className="font-medium text-on-surface">{announcement.postedByName}</span> • {formatTimeAgo(announcement.createdAt)}
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => handleOpenModal(announcement)}
                    className="p-2 text-on-surface-variant hover:text-primary hover:bg-surface-container-low rounded-full transition-colors"
                    title="Edit announcement"
                  >
                    <span className="material-symbols-outlined text-[20px]">edit</span>
                  </button>
                  <button
                    onClick={() => setDeletingAnnouncement(announcement)}
                    className="p-2 text-on-surface-variant hover:text-error hover:bg-error-container rounded-full transition-colors"
                    title="Delete announcement"
                  >
                    <span className="material-symbols-outlined text-[20px]">delete</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-[1px]">
          <div className="bg-surface-container-lowest rounded-3xl w-full max-w-lg shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-outline-variant flex justify-between items-center bg-surface-container-lowest sticky top-0 z-10">
              <h2 className="font-title-lg text-on-surface font-bold text-lg">
                {editingAnnouncement ? 'Edit Announcement' : 'New Announcement'}
              </h2>
              <button
                onClick={handleCloseModal}
                className="p-2 text-on-surface-variant hover:bg-surface-container-low rounded-full transition-colors flex items-center"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>
            
            <form onSubmit={handleSaveAnnouncement} className="p-6 overflow-y-auto">
              <div className="space-y-6">
                <div>
                  <div className="flex justify-between mb-2">
                    <label className="font-label-md text-on-surface-variant text-xs font-semibold">Title</label>
                    <span className={`text-xs ${title.length > 100 ? 'text-error' : 'text-on-surface-variant'}`}>
                      {title.length}/100
                    </span>
                  </div>
                  <input
                    type="text"
                    required
                    maxLength={100}
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-outline-variant bg-surface-bright text-on-surface focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all font-body-md text-sm"
                    placeholder="E.g., Q3 All Hands Meeting"
                  />
                </div>

                <div>
                  <div className="flex justify-between mb-2">
                    <label className="font-label-md text-on-surface-variant text-xs font-semibold">Content</label>
                    <span className={`text-xs ${content.length > 1000 ? 'text-error' : 'text-on-surface-variant'}`}>
                      {content.length}/1000
                    </span>
                  </div>
                  <textarea
                    required
                    maxLength={1000}
                    rows={6}
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-outline-variant bg-surface-bright text-on-surface focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all font-body-md text-sm resize-none"
                    placeholder="Write your announcement here..."
                  />
                </div>

                <div className="flex items-center justify-between p-4 rounded-xl border border-outline-variant bg-surface-container-lowest">
                  <div>
                    <h4 className="font-label-lg text-on-surface text-sm font-semibold">Pin Announcement</h4>
                    <p className="text-xs text-on-surface-variant">Keep this at the top of the feed</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsPinned(!isPinned)}
                    className={`relative inline-flex h-7 w-12 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      isPinned ? 'bg-primary' : 'bg-surface-container-highest'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                        isPinned ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                <div className="bg-blue-50 text-blue-800 p-4 rounded-xl flex gap-3 items-start">
                  <span className="material-symbols-outlined text-blue-600 text-[20px] shrink-0 mt-0.5">campaign</span>
                  <p className="text-xs font-medium leading-relaxed">
                    This announcement will be immediately visible to all employees, HR, and managers company-wide.
                  </p>
                </div>
              </div>
            </form>

            <div className="px-6 py-4 border-t border-outline-variant flex justify-end gap-3 bg-surface-container-lowest sticky bottom-0 z-10">
              <button
                type="button"
                onClick={handleCloseModal}
                className="px-5 py-2 rounded-full font-label-lg text-sm text-on-surface hover:bg-surface-container-low transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveAnnouncement}
                disabled={!title.trim() || !content.trim() || title.length > 100 || content.length > 1000}
                className="px-5 py-2 rounded-full font-label-lg text-sm bg-primary text-on-primary hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {editingAnnouncement ? 'Save Changes' : 'Post Announcement'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingAnnouncement && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-[1px]">
          <div className="bg-surface-container-lowest rounded-3xl w-full max-w-sm shadow-xl overflow-hidden p-6 text-center border border-outline-variant">
            <div className="w-14 h-14 bg-error-container text-on-error-container rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="material-symbols-outlined text-[28px]">warning</span>
            </div>
            <h3 className="font-title-lg text-on-surface text-base font-bold mb-2">
              Delete this announcement?
            </h3>
            <p className="font-body-md text-on-surface-variant text-xs mb-6">
              This action cannot be undone. The announcement will be removed from all employee dashboards immediately.
            </p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => setDeletingAnnouncement(null)}
                className="px-5 py-2 rounded-full font-label-lg text-sm text-on-surface border border-outline-variant hover:bg-surface-container-low transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteConfirm}
                className="px-5 py-2 rounded-full font-label-lg text-sm bg-error text-on-error hover:bg-error/90 transition-colors shadow-xs"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

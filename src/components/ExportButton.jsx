import { useState } from "react";
import { useAuth } from "../context/AuthContext";

function ExportButton({ branch, department, search, date, activeView }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const { token } = useAuth();

  // Use environment variable for API base URL (configured in .env.local or vite.config.js)
  // Falls back to localhost:5184 if not specified
  const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5184'

  const handleExport = async (format) => {
    setOpen(false);
    setLoading(true);

    try {
      const params = new URLSearchParams({
        format,
        branch: branch || "",
        department: department || "",
        search: search || "",
        date: date || "",
        status: activeView || "all"
      });

      const res = await fetch(`${API_BASE}/api/attendance/export?${params.toString()}`, {
        method: "GET",
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!res.ok) {
        if (res.status === 401) {
          alert("Session expired. Please log in again.");
          return;
        }
        const errorData = await res.json().catch(() => ({ message: 'Export failed' }));
        alert(errorData.message || "Export failed. Please try again.");
        return;
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `attendance_${new Date().toISOString().slice(0, 10)}.${format}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Export error:", err);
      alert("Something went wrong while exporting.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative inline-block">
      <button 
        onClick={() => setOpen(!open)} 
        disabled={loading}
        className="px-md py-sm border border-outline-variant rounded-lg text-label-md font-bold text-on-surface-variant hover:bg-surface-container-low transition-colors flex items-center gap-sm disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <span className="material-symbols-outlined text-[18px]">
          {loading ? "hourglass_empty" : "file_download"}
        </span>
        {loading ? "Preparing..." : "Export"}
      </button>

      {open && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-40"
            onClick={() => setOpen(false)}
          />
          
          {/* Dropdown */}
          <div className="absolute top-full right-0 mt-1 bg-surface-container-lowest border border-outline-variant rounded-lg shadow-lg z-50 min-w-48 overflow-hidden">
            <div 
              className="px-md py-sm hover:bg-surface-container-low cursor-pointer flex items-center gap-sm text-body-md text-on-surface transition-colors"
              onClick={() => handleExport("pdf")}
            >
              <span className="material-symbols-outlined text-[20px] text-red-500">picture_as_pdf</span>
              Download as PDF
            </div>
            <div 
              className="px-md py-sm hover:bg-surface-container-low cursor-pointer flex items-center gap-sm text-body-md text-on-surface transition-colors"
              onClick={() => handleExport("docx")}
            >
              <span className="material-symbols-outlined text-[20px] text-blue-500">description</span>
              Download as DOCX
            </div>
            <div 
              className="px-md py-sm hover:bg-surface-container-low cursor-pointer flex items-center gap-sm text-body-md text-on-surface transition-colors"
              onClick={() => handleExport("txt")}
            >
              <span className="material-symbols-outlined text-[20px] text-gray-500">text_snippet</span>
              Download as TXT
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default ExportButton;
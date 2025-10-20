import React, { useState } from 'react'
import { useAuth } from '@/Auth/hooks/useAuth'
import { apiClient } from '@/lib/apiClient'
import { X, Upload, FileText } from 'lucide-react'

const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024
const ALLOWED_FILE_TYPES: Record<string, string> = {
  'application/pdf': 'PDF',
  'application/vnd.ms-powerpoint': 'PowerPoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'PowerPoint',
}

interface FileUploadProps {
  onUploadSuccess: () => void
  onClose: () => void
}

const FileUpload: React.FC<FileUploadProps> = ({ onUploadSuccess, onClose }) => {
  const [file, setFile] = useState<File | null>(null)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [currentTag, setCurrentTag] = useState('')
  const [isPublic, setIsPublic] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const { user, loading: authLoading } = useAuth()

  const clearSelectedFile = () => {
    setFile(null)
    if (typeof document !== 'undefined') {
      const input = document.getElementById('file-upload') as HTMLInputElement | null
      if (input) {
        input.value = ''
      }
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0]
      setErrorMessage('')

      const fileExtension = selectedFile.name.split('.').pop()?.toLowerCase()
      const isAllowedType = Boolean(ALLOWED_FILE_TYPES[selectedFile.type])
      const isAllowedExtension = Boolean(fileExtension && ['pdf', 'ppt', 'pptx'].includes(fileExtension))

      if (!isAllowedType && !isAllowedExtension) {
        e.target.value = ''
        clearSelectedFile()
        setErrorMessage('Only PDF or PowerPoint files are supported.')
        return
      }

      if (selectedFile.size > MAX_FILE_SIZE_BYTES) {
        e.target.value = ''
        clearSelectedFile()
        setErrorMessage('File size must be 50MB or less.')
        return
      }

      setFile(selectedFile)
      if (!title) {
        setTitle(selectedFile.name.replace(/\.[^/.]+$/, ''))
      }
    }
  }

  const addTag = () => {
    if (currentTag.trim() && !tags.includes(currentTag.trim())) {
      setTags([...tags, currentTag.trim()])
      setCurrentTag('')
    }
  }

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter((t) => t !== tagToRemove))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (authLoading) {
      setErrorMessage('Checking your session. Please try again in a moment.')
      return
    }

    if (!user?.id) {
      setErrorMessage('You must be signed in to upload materials.')
      return
    }

    if (!file) {
      setErrorMessage('Please choose a file before submitting.')
      return
    }

    if (!title.trim()) {
      setErrorMessage('Title is required.')
      return
    }

    setErrorMessage('')
    setIsUploading(true)

    const formData = new FormData()
    formData.append('file', file)
    formData.append('title', title)
    formData.append('description', description)
    formData.append('category', category)
    formData.append('tags', JSON.stringify(tags))
    formData.append('is_public', isPublic.toString())
    formData.append('user_id', user.id)

    try {
      // apiClient will attach the authorization header automatically using the supabase session
      await apiClient.post('/api/learning-materials', formData)

      alert('File uploaded successfully!')
      clearSelectedFile()
      setTitle('')
      setDescription('')
      setCategory('')
      setTags([])
      setCurrentTag('')
      setIsPublic(false)
      onUploadSuccess()
      onClose()
    } catch (err) {
      console.error('Upload error:', err)
      const message = err instanceof Error ? err.message : 'Upload failed. Please try again.'
      setErrorMessage(message)
    } finally {
      setIsUploading(false)
    }
  }

  return (
    
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-slate-900 max-w-2xl w-full max-h-[90vh] overflow-y-auto rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700">
        <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800">
          <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Upload Learning Material</h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors text-slate-600 dark:text-slate-300">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6 bg-white dark:bg-slate-900">
          <div>
            <label className="block text-sm font-medium text-slate-900 dark:text-slate-100 mb-3">File *</label>
            <div className="border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-2xl p-6 text-center hover:border-slate-400 dark:hover:border-slate-500 transition-colors bg-slate-50 dark:bg-slate-800/50">
              <input type="file" accept=".pdf,.ppt,.pptx" onChange={handleFileChange} className="hidden" id="file-upload" required />
              <label htmlFor="file-upload" className="cursor-pointer">
                <div className="space-y-3">
                  <div className="mx-auto h-12 w-12 bg-slate-200 dark:bg-slate-700 rounded-2xl flex items-center justify-center">
                    <Upload className="h-6 w-6 text-slate-600 dark:text-slate-300" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-900 dark:text-white">Click to upload or drag and drop</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">PDF or PPT files up to 50MB</p>
                  </div>
                </div>
              </label>
            </div>
            {file && (
              <div className="mt-3 flex items-center gap-3 p-3 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                <div className="h-10 w-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
                  <FileText className="h-5 w-5 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-900 dark:text-white truncate">{file.name}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{(file.size / (1024 * 1024)).toFixed(2)} MB</p>
                </div>
                <button type="button" onClick={clearSelectedFile} className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg">
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>

          {errorMessage && (
            <div className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-xl px-4 py-3">
              {errorMessage}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Title *</label>
            <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" placeholder="Enter material title" required />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Description</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" placeholder="Enter material description" />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Category</label>
            <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent">
              <option value="">Select a category</option>
              <option value="Health sciences">Health sciences</option>
              <option value="Built environment">Built environment</option>
              <option value="Creative studios">Creative studios</option>
              <option value="Data & analytics">Data & analytics</option>
              <option value="Computer science">Computer science</option>
              <option value="Nursing">Nursing</option>
              <option value="Calculus">Calculus</option>
              <option value="Architecture">Architecture</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Tags</label>
            <div className="space-y-2">
              <div className="flex gap-2">
                <input type="text" value={currentTag} onChange={(e) => setCurrentTag(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())} className="flex-1 px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" placeholder="Add a tag and press Enter" />
                <button type="button" onClick={addTag} className="px-4 py-3 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors">Add</button>
              </div>
              {tags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {tags.map((tag) => (
                    <span key={tag} className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-full text-sm">
                      {tag}
                      <button type="button" onClick={() => removeTag(tag)} className="hover:text-blue-600 dark:hover:text-blue-400">
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3 p-4 bg-slate-50 dark:bg-slate-800 rounded-xl">
            <input type="checkbox" id="isPublic" checked={isPublic} onChange={(e) => setIsPublic(e.target.checked)} className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-slate-300 rounded" />
            <label htmlFor="isPublic" className="text-sm text-slate-700 dark:text-slate-300">Make this material public (visible in community library)</label>
          </div>

          <button type="submit" disabled={isUploading || !file} className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 px-4 rounded-xl font-medium hover:from-blue-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all">
            {isUploading ? (
              <div className="flex items-center justify-center gap-2">
                <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Uploading...
              </div>
            ) : (
              'Upload Material'
            )}
          </button>
        </form>
        </div>
      </div>
    
  )
}

export default FileUpload

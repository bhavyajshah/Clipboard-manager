import { useEffect, useState, useCallback } from 'react'
import './index.css'
import { Copy, Star, Trash2, FolderPlus, X, Search, Moon, Sun, Plus } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from './lib/supabase'
import { v4 as uuidv4 } from 'uuid'

interface ClipboardItem {
  id: string
  device_id: string
  content: string
  created_at: string
  favorite: boolean
  category: string
  tags: string[]
}

declare global {
  interface Window {
    clipboardAPI: {
      setClipboard: (content: string) => Promise<void>
      pasteContent: (content: string) => Promise<void>
      onClipboardUpdate: (callback: (content: string) => void) => () => void
    }
  }
}

// Generate a unique device ID if not exists
const getDeviceId = () => {
  const storedDeviceId = localStorage.getItem('deviceId')
  if (storedDeviceId) return storedDeviceId
  
  const newDeviceId = uuidv4()
  localStorage.setItem('deviceId', newDeviceId)
  return newDeviceId
}

function App() {
  const [items, setItems] = useState<ClipboardItem[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [darkMode, setDarkMode] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [newCategory, setNewCategory] = useState('')
  const [showAddCategory, setShowAddCategory] = useState(false)
  const [newTag, setNewTag] = useState('')
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null)
  const deviceId = getDeviceId()

  // Load items from Supabase
  useEffect(() => {
    const loadItems = async () => {
      try {
        const { data, error } = await supabase
          .from('clipboard_items')
          .select('*')
          .order('created_at', { ascending: false })
        
        if (error) throw error
        setItems(data || [])
      } catch (error) {
        console.error('Error loading items:', error)
      }
    }

    loadItems()
  }, [])

  // Load dark mode preference
  useEffect(() => {
    const darkModePref = localStorage.getItem('darkMode')
    setDarkMode(darkModePref === 'true')
  }, [])

  // Save dark mode preference
  useEffect(() => {
    localStorage.setItem('darkMode', darkMode.toString())
  }, [darkMode])

  // Handle clipboard updates
  const handleClipboardUpdate = useCallback(async (content: string) => {
    if (!content.trim()) return

    try {
      const newItem = {
        device_id: deviceId,
        content,
        favorite: false,
        category: 'uncategorized',
        tags: []
      }

      const { data, error } = await supabase
        .from('clipboard_items')
        .insert([newItem])
        .select()
        .single()

      if (error) throw error

      setItems(prev => [data, ...prev])
    } catch (error) {
      console.error('Error saving clipboard item:', error)
    }
  }, [deviceId])

  // Set up clipboard monitoring
  useEffect(() => {
    if (!window.clipboardAPI?.onClipboardUpdate) {
      console.error('Clipboard API not available')
      return
    }

    const cleanup = window.clipboardAPI.onClipboardUpdate(handleClipboardUpdate)
    return cleanup
  }, [handleClipboardUpdate])

  const filteredItems = items.filter(item =>
    (selectedCategory === 'all' || item.category === selectedCategory) &&
    (item.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase())))
  )

  const sortedItems = [...filteredItems].sort((a, b) => {
    if (a.favorite && !b.favorite) return -1
    if (!a.favorite && b.favorite) return 1
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  })

  const handleCopy = async (content: string) => {
    try {
      if (window.clipboardAPI?.pasteContent) {
        await window.clipboardAPI.pasteContent(content)
      }
    } catch (error) {
      console.error('Failed to copy:', error)
    }
  }

  const handleFavorite = async (id: string) => {
    try {
      const item = items.find(i => i.id === id)
      if (!item) return

      const { error } = await supabase
        .from('clipboard_items')
        .update({ favorite: !item.favorite })
        .eq('id', id)

      if (error) throw error

      setItems(prev => prev.map(item =>
        item.id === id ? { ...item, favorite: !item.favorite } : item
      ))
    } catch (error) {
      console.error('Error updating favorite status:', error)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from('clipboard_items')
        .delete()
        .eq('id', id)

      if (error) throw error

      setItems(prev => prev.filter(item => item.id !== id))
    } catch (error) {
      console.error('Error deleting item:', error)
    }
  }

  const handleClearHistory = async () => {
    if (window.confirm('Are you sure you want to clear all non-favorite items?')) {
      try {
        const { error } = await supabase
          .from('clipboard_items')
          .delete()
          .eq('favorite', false)

        if (error) throw error

        setItems(prev => prev.filter(item => item.favorite))
      } catch (error) {
        console.error('Error clearing history:', error)
      }
    }
  }

  const handleAddCategory = async () => {
    if (newCategory.trim() && selectedItemId) {
      try {
        const { error } = await supabase
          .from('clipboard_items')
          .update({ category: newCategory.trim() })
          .eq('id', selectedItemId)

        if (error) throw error

        setItems(prev => prev.map(item =>
          item.id === selectedItemId ? { ...item, category: newCategory.trim() } : item
        ))
        setNewCategory('')
        setShowAddCategory(false)
      } catch (error) {
        console.error('Error updating category:', error)
      }
    }
  }

  const handleAddTag = async (itemId: string) => {
    if (newTag.trim()) {
      try {
        const item = items.find(i => i.id === itemId)
        if (!item) return

        const updatedTags = [...new Set([...item.tags, newTag.trim()])]
        
        const { error } = await supabase
          .from('clipboard_items')
          .update({ tags: updatedTags })
          .eq('id', itemId)

        if (error) throw error

        setItems(prev => prev.map(item =>
          item.id === itemId ? { ...item, tags: updatedTags } : item
        ))
        setNewTag('')
      } catch (error) {
        console.error('Error adding tag:', error)
      }
    }
  }

  const handleRemoveTag = async (itemId: string, tagToRemove: string) => {
    try {
      const item = items.find(i => i.id === itemId)
      if (!item) return

      const updatedTags = item.tags.filter(tag => tag !== tagToRemove)
      
      const { error } = await supabase
        .from('clipboard_items')
        .update({ tags: updatedTags })
        .eq('id', itemId)

      if (error) throw error

      setItems(prev => prev.map(item =>
        item.id === itemId ? { ...item, tags: updatedTags } : item
      ))
    } catch (error) {
      console.error('Error removing tag:', error)
    }
  }

  const categories = ['all', ...new Set(items.map(item => item.category).filter(Boolean))]

  return (
    <div className={`min-h-screen ${darkMode ? 'dark bg-gray-900' : 'bg-gray-100'}`}>
      <div className="container mx-auto p-2 sm:p-4 max-w-4xl">
        <div className="flex flex-col sm:flex-row justify-between items-center mb-4 gap-2">
          <h1 className={`text-lg sm:text-xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            Clipboard History
          </h1>
          <div className="flex gap-2">
            <button
              onClick={() => setDarkMode(!darkMode)}
              className="p-2 rounded bg-blue-500 text-white hover:bg-blue-600 transition-colors"
            >
              {darkMode ? <Sun size={16} /> : <Moon size={16} />}
            </button>
            <button
              onClick={handleClearHistory}
              className="p-2 rounded bg-red-500 text-white hover:bg-red-600 transition-colors"
            >
              <Trash2 size={16} />
            </button>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-2 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
            <input
              type="text"
              placeholder="Search clips or tags..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={`w-full pl-8 p-2 text-sm rounded border ${darkMode ? 'bg-gray-800 text-white border-gray-700' : 'bg-white border-gray-300'}`}
            />
          </div>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className={`p-2 text-sm rounded border ${darkMode ? 'bg-gray-800 text-white border-gray-700' : 'bg-white border-gray-300'}`}
          >
            {categories.map(category => (
              <option key={category} value={category}>
                {category.charAt(0).toUpperCase() + category.slice(1)}
              </option>
            ))}
          </select>
        </div>

        <AnimatePresence>
          <div className="space-y-2">
            {sortedItems.length === 0 ? (
              <div className={`p-4 text-center ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                No clipboard items yet. Copy something to get started!
              </div>
            ) : (
              sortedItems.map((item) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className={`p-3 rounded-lg ${darkMode ? 'bg-gray-800 text-white' : 'bg-white shadow'} ${item.favorite ? 'border-2 border-yellow-500' : ''}`}
                >
                  <div className="flex justify-between items-start gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <p className={`${darkMode ? 'text-gray-300' : 'text-gray-600'} text-xs`}>
                          {new Date(item.created_at).toLocaleString()}
                        </p>
                        <span className={`px-2 py-0.5 rounded text-xs ${darkMode ? 'bg-gray-700' : 'bg-gray-200'}`}>
                          {item.category}
                        </span>
                      </div>
                      <p className="break-words mb-2 text-sm">{item.content}</p>
                      <div className="flex flex-wrap gap-1">
                        {item.tags.map(tag => (
                          <span
                            key={tag}
                            className={`px-2 py-0.5 rounded-full text-xs flex items-center gap-1 ${darkMode ? 'bg-gray-700' : 'bg-gray-200'}`}
                          >
                            #{tag}
                            <button
                              onClick={() => handleRemoveTag(item.id, tag)}
                              className="hover:text-red-500 transition-colors"
                            >
                              <X size={12} />
                            </button>
                          </span>
                        ))}
                        <div className="flex items-center gap-1">
                          <input
                            type="text"
                            placeholder="Add tag"
                            value={newTag}
                            onChange={(e) => setNewTag(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && handleAddTag(item.id)}
                            className={`px-2 py-0.5 rounded text-xs w-20 ${darkMode ? 'bg-gray-700' : 'bg-gray-200'}`}
                          />
                          <button
                            onClick={() => handleAddTag(item.id)}
                            className="p-1 rounded bg-blue-500 text-white text-xs hover:bg-blue-600 transition-colors"
                          >
                            <Plus size={12} />
                          </button>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <button
                        onClick={() => {
                          setSelectedItemId(item.id)
                          setShowAddCategory(true)
                        }}
                        className={`p-1.5 rounded ${darkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-200 text-gray-700'} hover:bg-opacity-80 transition-colors`}
                      >
                        <FolderPlus size={14} />
                      </button>
                      <button
                        onClick={() => handleFavorite(item.id)}
                        className={`p-1.5 rounded ${item.favorite ? 'bg-yellow-500 text-white' : darkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-200 text-gray-700'} hover:bg-opacity-80 transition-colors`}
                      >
                        <Star size={14} />
                      </button>
                      <button
                        onClick={() => handleCopy(item.content)}
                        className={`p-1.5 rounded ${darkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-200 text-gray-700'} hover:bg-opacity-80 transition-colors`}
                      >
                        <Copy size={14} />
                      </button>
                      <button
                        onClick={() => handleDelete(item.id)}
                        className="p-1.5 rounded bg-red-500 text-white hover:bg-red-600 transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        </AnimatePresence>

        {showAddCategory && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className={`p-4 rounded-lg max-w-sm w-full ${darkMode ? 'bg-gray-800' : 'bg-white'}`}
            >
              <h2 className={`text-lg font-bold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                Add Category
              </h2>
              <input
                type="text"
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                className={`w-full p-2 text-sm rounded border mb-4 ${darkMode ? 'bg-gray-700 text-white border-gray-600' : 'bg-white border-gray-300'}`}
                placeholder="Enter category name"
              />
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setShowAddCategory(false)}
                  className="px-3 py-1.5 text-sm rounded bg-gray-500 text-white hover:bg-gray-600 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddCategory}
                  className="px-3 py-1.5 text-sm rounded bg-blue-500 text-white hover:bg-blue-600 transition-colors"
                >
                  Add
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </div>
    </div>
  )
}

export default App
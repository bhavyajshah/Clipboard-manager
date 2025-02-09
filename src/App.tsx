import { useEffect, useState, useCallback } from 'react'
import './index.css'
import { Copy, Star, Trash2, FolderPlus, X, Search, Moon, Sun, Plus } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

interface ClipboardItem {
  id: number
  content: string
  timestamp: string
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

function App() {
  const [items, setItems] = useState<ClipboardItem[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [darkMode, setDarkMode] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [newCategory, setNewCategory] = useState('')
  const [showAddCategory, setShowAddCategory] = useState(false)
  const [newTag, setNewTag] = useState('')
  const [selectedItemId, setSelectedItemId] = useState<number | null>(null)

  const categories = ['all', ...new Set(items.map(item => item.category).filter(Boolean))]

  // Load saved items and preferences
  useEffect(() => {
    const savedItems = localStorage.getItem('clipboardItems')
    if (savedItems) {
      try {
        const parsedItems = JSON.parse(savedItems)
        setItems(parsedItems)
        console.log('Loaded saved items:', parsedItems)
      } catch (e) {
        console.error('Error loading saved items:', e)
        setItems([])
      }
    }

    const darkModePref = localStorage.getItem('darkMode')
    setDarkMode(darkModePref === 'true')
  }, [])

  // Save items when they change
  useEffect(() => {
    if (items.length >= 0) {
      localStorage.setItem('clipboardItems', JSON.stringify(items))
      console.log('Saved items to localStorage:', items)
    }
  }, [items])

  // Save dark mode preference
  useEffect(() => {
    localStorage.setItem('darkMode', darkMode.toString())
  }, [darkMode])

  // Handle clipboard updates
  const handleClipboardUpdate = useCallback((content: string) => {
    console.log('Received clipboard update:', content)

    if (!content.trim()) {
      console.log('Empty content, skipping')
      return
    }

    setItems(prevItems => {
      // Check if content already exists
      if (prevItems.some(item => item.content === content)) {
        console.log('Content already exists, skipping')
        return prevItems
      }

      const newItem: ClipboardItem = {
        id: Date.now(),
        content,
        timestamp: new Date().toISOString(),
        favorite: false,
        category: 'uncategorized',
        tags: []
      }

      console.log('Adding new item:', newItem)
      const newItems = [newItem, ...prevItems].slice(0, 200)
      return newItems
    })
  }, [])

  // Set up clipboard monitoring
  useEffect(() => {
    if (!window.clipboardAPI?.onClipboardUpdate) {
      console.error('Clipboard API not available')
      return
    }

    console.log('Setting up clipboard monitoring')
    const cleanup = window.clipboardAPI.onClipboardUpdate((content: string) => {
      console.log('Clipboard update received in component:', content)
      handleClipboardUpdate(content)
    })

    return () => {
      console.log('Cleaning up clipboard monitoring')
      cleanup()
    }
  }, [handleClipboardUpdate])

  const filteredItems = items.filter(item =>
    (selectedCategory === 'all' || item.category === selectedCategory) &&
    (item.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase())))
  )

  const sortedItems = [...filteredItems].sort((a, b) => {
    if (a.favorite && !b.favorite) return -1
    if (!a.favorite && b.favorite) return 1
    return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
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

  const handleFavorite = (id: number) => {
    setItems(prevItems => prevItems.map(item =>
      item.id === id ? { ...item, favorite: !item.favorite } : item
    ))
  }

  const handleDelete = (id: number) => {
    setItems(prevItems => prevItems.filter(item => item.id !== id))
  }

  const handleClearHistory = () => {
    if (window.confirm('Are you sure you want to clear all non-favorite items?')) {
      setItems(prevItems => prevItems.filter(item => item.favorite))
    }
  }

  const handleAddCategory = () => {
    if (newCategory.trim() && selectedItemId) {
      setItems(prevItems => prevItems.map(item =>
        item.id === selectedItemId ? { ...item, category: newCategory.trim() } : item
      ))
      setNewCategory('')
      setShowAddCategory(false)
    }
  }

  const handleAddTag = (itemId: number) => {
    if (newTag.trim()) {
      setItems(prevItems => prevItems.map(item =>
        item.id === itemId
          ? { ...item, tags: [...new Set([...item.tags, newTag.trim()])] }
          : item
      ))
      setNewTag('')
    }
  }

  const handleRemoveTag = (itemId: number, tagToRemove: string) => {
    setItems(prevItems => prevItems.map(item =>
      item.id === itemId
        ? { ...item, tags: item.tags.filter(tag => tag !== tagToRemove) }
        : item
    ))
  }

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
              className={`w-full pl-8 p-2 text-sm rounded border ${darkMode ? 'bg-gray-800 text-white border-gray-700' : 'bg-white border-gray-300'
                }`}
            />
          </div>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className={`p-2 text-sm rounded border ${darkMode ? 'bg-gray-800 text-white border-gray-700' : 'bg-white border-gray-300'
              }`}
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
                  className={`p-3 rounded-lg ${darkMode ? 'bg-gray-800 text-white' : 'bg-white shadow'
                    } ${item.favorite ? 'border-2 border-yellow-500' : ''}`}
                >
                  <div className="flex justify-between items-start gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <p className={`${darkMode ? 'text-gray-300' : 'text-gray-600'} text-xs`}>
                          {new Date(item.timestamp).toLocaleString()}
                        </p>
                        <span className={`px-2 py-0.5 rounded text-xs ${darkMode ? 'bg-gray-700' : 'bg-gray-200'
                          }`}>
                          {item.category}
                        </span>
                      </div>
                      <p className="break-words mb-2 text-sm">{item.content}</p>
                      <div className="flex flex-wrap gap-1">
                        {item.tags.map(tag => (
                          <span
                            key={tag}
                            className={`px-2 py-0.5 rounded-full text-xs flex items-center gap-1 ${darkMode ? 'bg-gray-700' : 'bg-gray-200'
                              }`}
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
                            className={`px-2 py-0.5 rounded text-xs w-20 ${darkMode ? 'bg-gray-700' : 'bg-gray-200'
                              }`}
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
                        className={`p-1.5 rounded ${darkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-200 text-gray-700'
                          } hover:bg-opacity-80 transition-colors`}
                      >
                        <FolderPlus size={14} />
                      </button>
                      <button
                        onClick={() => handleFavorite(item.id)}
                        className={`p-1.5 rounded ${item.favorite
                            ? 'bg-yellow-500 text-white'
                            : darkMode
                              ? 'bg-gray-700 text-gray-300'
                              : 'bg-gray-200 text-gray-700'
                          } hover:bg-opacity-80 transition-colors`}
                      >
                        <Star size={14} />
                      </button>
                      <button
                        onClick={() => handleCopy(item.content)}
                        className={`p-1.5 rounded ${darkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-200 text-gray-700'
                          } hover:bg-opacity-80 transition-colors`}
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
                className={`w-full p-2 text-sm rounded border mb-4 ${darkMode ? 'bg-gray-700 text-white border-gray-600' : 'bg-white border-gray-300'
                  }`}
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
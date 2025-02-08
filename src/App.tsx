import { useEffect, useState } from 'react'
import './index.css'

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

  // Initialize categories with a default value to prevent undefined
  const categories = ['all', ...new Set(items?.map(item => item.category).filter(Boolean) || [])]

  useEffect(() => {
    const savedItems = localStorage.getItem('clipboardItems')
    if (savedItems) {
      try {
        setItems(JSON.parse(savedItems))
      } catch (e) {
        console.error('Error loading saved items:', e)
        setItems([])
      }
    }
  }, [])

  useEffect(() => {
    if (items.length > 0) {
      localStorage.setItem('clipboardItems', JSON.stringify(items))
    }
  }, [items])

  useEffect(() => {
    if (window.clipboardAPI?.onClipboardUpdate) {
      const cleanup = window.clipboardAPI.onClipboardUpdate((content) => {
        setItems(prevItems => {
          const newItem: ClipboardItem = {
            id: Date.now(),
            content,
            timestamp: new Date().toISOString(),
            favorite: false,
            category: 'uncategorized',
            tags: []
          }
          return [newItem, ...prevItems].slice(0, 200)
        })
      })
      return cleanup
    }
  }, [])

  const filteredItems = items?.filter(item =>
    (selectedCategory === 'all' || item.category === selectedCategory) &&
    (item.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase())))
  ) || []

  const sortedItems = [...filteredItems].sort((a, b) => {
    if (a.favorite && !b.favorite) return -1
    if (!a.favorite && b.favorite) return 1
    return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  })

  const handleCopy = async (content: string) => {
    if (window.clipboardAPI?.setClipboard) {
      await window.clipboardAPI.setClipboard(content)
    }
  }

  const handleFavorite = (id: number) => {
    setItems(prevItems => prevItems?.map(item =>
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
      setItems(prevItems => prevItems?.map(item =>
        item.id === selectedItemId ? { ...item, category: newCategory.trim() } : item
      ))
      setNewCategory('')
      setShowAddCategory(false)
    }
  }

  const handleAddTag = (itemId: number) => {
    if (newTag.trim()) {
      setItems(prevItems => prevItems?.map(item =>
        item.id === itemId
          ? { ...item, tags: [...new Set([...item.tags, newTag.trim()])] }
          : item
      ))
      setNewTag('')
    }
  }

  const handleRemoveTag = (itemId: number, tagToRemove: string) => {
    setItems(prevItems => prevItems?.map(item =>
      item.id === itemId
        ? { ...item, tags: item.tags.filter(tag => tag !== tagToRemove) }
        : item
    ))
  }

  return (
    <div className={`min-h-screen ${darkMode ? 'dark bg-gray-900' : 'bg-gray-100'}`}>
      <div className="container mx-auto p-4">
        <div className="flex justify-between items-center mb-4">
          <h1 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            Clipboard History (Alt + Space to toggle)
          </h1>
          <div className="flex gap-4">
            <button
              onClick={() => setDarkMode(!darkMode)}
              className="px-4 py-2 rounded bg-blue-500 text-white hover:bg-blue-600"
            >
              {darkMode ? '☀️ Light' : '🌙 Dark'}
            </button>
            <button
              onClick={handleClearHistory}
              className="px-4 py-2 rounded bg-red-500 text-white hover:bg-red-600"
            >
              Clear History
            </button>
          </div>
        </div>

        <div className="flex gap-4 mb-4">
          <input
            type="text"
            placeholder="Search clips or tags..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={`flex-1 p-2 rounded border ${darkMode ? 'bg-gray-800 text-white border-gray-700' : 'bg-white border-gray-300'}`}
          />
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className={`p-2 rounded border ${darkMode ? 'bg-gray-800 text-white border-gray-700' : 'bg-white border-gray-300'}`}
          >
            {categories?.map(category => (
              <option key={category} value={category}>
                {category.charAt(0).toUpperCase() + category.slice(1)}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          {sortedItems?.map((item) => (
            <div
              key={item.id}
              className={`p-4 rounded-lg ${darkMode ? 'bg-gray-800 text-white' : 'bg-white shadow'} ${item.favorite ? 'border-2 border-yellow-500' : ''}`}
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <p className={`${darkMode ? 'text-gray-300' : 'text-gray-600'} text-sm`}>
                      {new Date(item.timestamp).toLocaleString()}
                    </p>
                    <span className={`px-2 py-1 rounded text-sm ${darkMode ? 'bg-gray-700' : 'bg-gray-200'}`}>
                      {item.category}
                    </span>
                  </div>
                  <p className="break-words mb-2">{item.content}</p>
                  <div className="flex flex-wrap gap-2">
                    {item?.tags?.map(tag => (
                      <span
                        key={tag}
                        className={`px-2 py-1 rounded-full text-sm flex items-center gap-1 ${darkMode ? 'bg-gray-700' : 'bg-gray-200'}`}
                      >
                        #{tag}
                        <button
                          onClick={() => handleRemoveTag(item.id, tag)}
                          className="ml-1 text-red-500 hover:text-red-700"
                        >
                          ×
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
                        className={`px-2 py-1 rounded text-sm ${darkMode ? 'bg-gray-700' : 'bg-gray-200'}`}
                      />
                      <button
                        onClick={() => handleAddTag(item.id)}
                        className="px-2 py-1 rounded bg-blue-500 text-white text-sm"
                      >
                        Add
                      </button>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2 ml-4">
                  <button
                    onClick={() => {
                      setSelectedItemId(item.id)
                      setShowAddCategory(true)
                    }}
                    className={`p-2 rounded ${darkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-200 text-gray-700'}`}
                  >
                    📁
                  </button>
                  <button
                    onClick={() => handleFavorite(item.id)}
                    className={`p-2 rounded ${item.favorite ? 'bg-yellow-500 text-white' : darkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-200 text-gray-700'}`}
                  >
                    ⭐
                  </button>
                  <button
                    onClick={() => handleCopy(item.content)}
                    className={`p-2 rounded ${darkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-200 text-gray-700'}`}
                  >
                    📋
                  </button>
                  <button
                    onClick={() => handleDelete(item.id)}
                    className="p-2 rounded bg-red-500 text-white"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {showAddCategory && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
            <div className={`p-4 rounded-lg ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
              <h2 className={`text-lg font-bold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                Add Category
              </h2>
              <input
                type="text"
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                className={`p-2 rounded border mb-4 ${darkMode ? 'bg-gray-700 text-white border-gray-600' : 'bg-white border-gray-300'}`}
                placeholder="Enter category name"
              />
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setShowAddCategory(false)}
                  className="px-4 py-2 rounded bg-gray-500 text-white"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddCategory}
                  className="px-4 py-2 rounded bg-blue-500 text-white"
                >
                  Add
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default App
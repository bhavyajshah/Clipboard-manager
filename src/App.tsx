import { useEffect, useState } from 'react'
import './App.css'

interface ClipboardItem {
  id: number
  content: string
  timestamp: string
  pinned: boolean
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
  const [items, setItems] = useState<ClipboardItem[]>(() => {
    const saved = localStorage.getItem('clipboardItems')
    return saved ? JSON.parse(saved) : []
  })
  const [searchTerm, setSearchTerm] = useState('')
  const [darkMode, setDarkMode] = useState(false)

  useEffect(() => {
    localStorage.setItem('clipboardItems', JSON.stringify(items))
  }, [items])

  useEffect(() => {
    const cleanup = window.clipboardAPI.onClipboardUpdate((content) => {
      setItems(prevItems => {
        const newItem: ClipboardItem = {
          id: Date.now(),
          content,
          timestamp: new Date().toISOString(),
          pinned: false
        }
        return [newItem, ...prevItems].slice(0, 100) // Keep only last 100 items
      })
    })
    return cleanup
  }, [])

  const filteredItems = items.filter(item =>
    item.content.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const handleCopy = async (content: string) => {
    await window.clipboardAPI.setClipboard(content)
  }

  const handlePin = (id: number) => {
    setItems(prevItems => prevItems.map(item =>
      item.id === id ? { ...item, pinned: !item.pinned } : item
    ))
  }

  const handleDelete = (id: number) => {
    setItems(prevItems => prevItems.filter(item => item.id !== id))
  }

  const handleClearHistory = () => {
    if (window.confirm('Are you sure you want to clear all unpinned items?')) {
      setItems(prevItems => prevItems.filter(item => item.pinned))
    }
  }

  return (
    <div className={`min-h-screen ${darkMode ? 'dark bg-gray-900' : 'bg-gray-100'}`}>
      <div className="container mx-auto p-4">
        <div className="flex justify-between items-center mb-4">
          <h1 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            Clipboard History
          </h1>
          <div className="flex gap-4">
            <button
              onClick={() => setDarkMode(!darkMode)}
              className="px-4 py-2 rounded bg-blue-500 text-white hover:bg-blue-600"
            >
              {darkMode ? '🌞 Light' : '🌙 Dark'}
            </button>
            <button
              onClick={handleClearHistory}
              className="px-4 py-2 rounded bg-red-500 text-white hover:bg-red-600"
            >
              Clear History
            </button>
          </div>
        </div>

        <input
          type="text"
          placeholder="Search clipboard history..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className={`w-full p-2 mb-4 rounded border ${darkMode
              ? 'bg-gray-800 text-white border-gray-700'
              : 'bg-white border-gray-300'
            }`}
        />

        <div className="space-y-2">
          {filteredItems.map((item) => (
            <div
              key={item.id}
              className={`p-4 rounded-lg ${darkMode
                  ? 'bg-gray-800 text-white'
                  : 'bg-white shadow'
                } ${item.pinned ? 'border-2 border-blue-500' : ''}`}
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <p className={`${darkMode ? 'text-gray-300' : 'text-gray-600'} text-sm mb-1`}>
                    {new Date(item.timestamp).toLocaleString()}
                  </p>
                  <p className="break-words">{item.content}</p>
                </div>
                <div className="flex gap-2 ml-4">
                  <button
                    onClick={() => handlePin(item.id)}
                    className={`p-2 rounded ${item.pinned
                        ? 'bg-blue-500 text-white'
                        : darkMode
                          ? 'bg-gray-700 text-gray-300'
                          : 'bg-gray-200 text-gray-700'
                      }`}
                  >
                    📌
                  </button>
                  <button
                    onClick={() => handleCopy(item.content)}
                    className={`p-2 rounded ${darkMode
                        ? 'bg-gray-700 text-gray-300'
                        : 'bg-gray-200 text-gray-700'
                      }`}
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
      </div>
    </div>
  )
}

export default App
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { callChatGPT } from '../utils/api'
import Logo from '../components/Logo'

function BookList() {
  const navigate = useNavigate()
  const [books, setBooks] = useState([])
  const [loading, setLoading] = useState(true)
  const [category, setCategory] = useState('all') // 'all', 'economics', 'policy'

  useEffect(() => {
    // Check if books are stored in localStorage
    const storedBooks = localStorage.getItem('bookList')
    
    // If books exist, use stored books (they were generated during this login session)
    if (storedBooks) {
      try {
        const parsedBooks = JSON.parse(storedBooks)
        setBooks(parsedBooks)
        setLoading(false)
        return
      } catch (e) {
        console.error('Failed to parse stored books:', e)
        // If parsing fails, load new books
        loadBooks()
      }
    } else {
      // No stored books, load new ones
      loadBooks()
    }
  }, [])

  // Filter books by category when category changes
  useEffect(() => {
    const storedBooks = localStorage.getItem('bookList')
    if (storedBooks) {
      try {
        const allBooks = JSON.parse(storedBooks)
        if (category === 'all') {
          setBooks(allBooks)
        } else if (category === 'economics') {
          setBooks(allBooks.filter(book => 
            book.category && book.category.toLowerCase().includes('economic')
          ))
        } else if (category === 'policy') {
          setBooks(allBooks.filter(book => 
            book.category && (book.category.toLowerCase().includes('policy') || book.category.toLowerCase().includes('public'))
          ))
        }
      } catch (e) {
        console.error('Failed to filter books:', e)
      }
    }
  }, [category])

  const loadBooks = async () => {
    setLoading(true)
    try {
      const categoryText = category === 'all' 
        ? 'economics and public policy' 
        : category === 'economics' 
        ? 'economics' 
        : 'public policy'

      const prompt = `Provide a list of exactly 8 recommended books in ${categoryText} that are frequently recommended by professors and researchers. Include:

For each book:
1. Title
2. Author(s)
3. Publication year (prefer recent books, but include classics if highly recommended)
4. Brief description (2-3 sentences)
5. Why it's recommended (what makes it valuable)
6. Category/topic area

Format as a JSON array with objects containing: title, author, year, description, whyRecommended, category.

Return exactly 8 books, prioritizing recent publications (2020-2024) but also including essential classics that are still widely recommended.`

      const systemMessage = `You are an expert in economics and public policy literature. You know the most important and recommended books in these fields, including both recent publications and classic texts that remain essential reading. Provide accurate, up-to-date information about books that professors commonly recommend to students and researchers.`

      const response = await callChatGPT(prompt, systemMessage)
      
      // Try to parse JSON response
      let bookList = []
      try {
        const content = response.content || ''
        // Try to extract JSON array
        const jsonMatch = content.match(/\[[\s\S]*\]/)
        if (jsonMatch) {
          bookList = JSON.parse(jsonMatch[0])
        } else {
          // Try parsing entire content
          bookList = JSON.parse(content)
        }
        
        // Ensure it's an array
        if (!Array.isArray(bookList)) {
          bookList = [bookList]
        }
      } catch (e) {
        console.error('Failed to parse JSON, creating fallback:', e)
        // Create a fallback list
        bookList = [
          {
            title: 'Economics in One Lesson',
            author: 'Henry Hazlitt',
            year: 1946,
            description: 'A classic introduction to economic thinking and common fallacies.',
            whyRecommended: 'Essential for understanding basic economic principles',
            category: 'Economics'
          }
        ]
      }

      setBooks(bookList)
      // Store books in localStorage (will be cleared on next login)
      localStorage.setItem('bookList', JSON.stringify(bookList))
    } catch (error) {
      console.error('Error loading books:', error)
      alert('Error loading book list. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleRefresh = () => {
    // Clear stored books and reload
    localStorage.removeItem('bookList')
    loadBooks()
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/dashboard')}
              className="text-gray-600 hover:text-gray-900"
            >
              ← Back to Dashboard
            </button>
            <Logo className="w-8 h-8" />
            <h1 className="text-2xl font-bold text-gray-800">Book List</h1>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header Section */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h2 className="text-2xl font-bold text-gray-800 mb-2">
                Recommended Books in Economics & Public Policy
              </h2>
              <p className="text-gray-600">
                Curated list of 8 books frequently recommended by professors and researchers
              </p>
            </div>
            <button
              onClick={handleRefresh}
              disabled={loading}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Loading...' : '🔄 Refresh'}
            </button>
          </div>

          {/* Category Filter */}
          <div className="flex gap-4">
            <button
              onClick={() => setCategory('all')}
              className={`px-4 py-2 rounded-lg font-semibold transition ${
                category === 'all'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              All Books
            </button>
            <button
              onClick={() => setCategory('economics')}
              className={`px-4 py-2 rounded-lg font-semibold transition ${
                category === 'economics'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Economics
            </button>
            <button
              onClick={() => setCategory('policy')}
              className={`px-4 py-2 rounded-lg font-semibold transition ${
                category === 'policy'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Public Policy
            </button>
          </div>
        </div>

        {/* Books List */}
        {loading ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mb-4"></div>
            <p className="text-gray-600">Loading recommended books...</p>
          </div>
        ) : books.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {books.map((book, idx) => (
              <div key={idx} className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition">
                <div className="mb-3">
                  <h3 className="text-lg font-bold text-gray-800 mb-1 line-clamp-2">
                    {book.title || 'Untitled'}
                  </h3>
                  <p className="text-gray-600 text-sm">
                    {book.author || 'Author unknown'}
                    {book.year && ` • ${book.year}`}
                  </p>
                  {book.category && (
                    <span className="inline-block mt-2 px-2 py-1 bg-indigo-100 text-indigo-700 rounded text-xs font-semibold">
                      {book.category}
                    </span>
                  )}
                </div>

                {book.description && (
                  <p className="text-gray-700 text-sm mb-3 line-clamp-3">
                    {book.description}
                  </p>
                )}

                {book.whyRecommended && (
                  <div className="mt-3 pt-3 border-t border-gray-200">
                    <p className="text-xs font-semibold text-gray-500 mb-1">Why Recommended:</p>
                    <p className="text-gray-600 text-sm line-clamp-2">
                      {book.whyRecommended}
                    </p>
                  </div>
                )}

                {/* Search link */}
                <div className="mt-4">
                  <a
                    href={`https://www.google.com/search?q=${encodeURIComponent(book.title + ' ' + (book.author || ''))}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block w-full text-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm"
                  >
                    Search ↗
                  </a>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <p className="text-gray-500">No books found. Please try refreshing.</p>
          </div>
        )}
      </main>
    </div>
  )
}

export default BookList


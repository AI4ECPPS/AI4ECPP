import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { callChatGPT } from '../utils/api'
import Logo from '../components/Logo'
import { validateAndSanitizeText, limitInputLength } from '../utils/security'

function FindProfessors() {
  const navigate = useNavigate()
  const [searchQuery, setSearchQuery] = useState('')
  const [searchType, setSearchType] = useState('name') // 'name' or 'field'
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [hasSearched, setHasSearched] = useState(false) // Track if a search has been performed

  const handleSearchQueryChange = (e) => {
    const value = limitInputLength(e.target.value, 500)
    setSearchQuery(value)
  }

  const handleSearch = async () => {
    // 验证输入 - 拒绝包含脏话的输入
    // 禁用 SQL injection 和 XSS 检查，因为搜索查询会发送到 ChatGPT API，不会直接进入数据库
    const validation = validateAndSanitizeText(searchQuery, {
      maxLength: 500,
      minLength: 2,
      required: true,
      filterProfanity: false, // 直接拒绝脏话而不是过滤
      checkSQLInjection: false, // 禁用 SQL 注入检查
      checkXSS: false // 禁用 XSS 检查
    })

    if (!validation.valid) {
      alert(validation.message || 'Please check your input')
      return
    }

    if (!searchQuery.trim()) {
      alert('Please enter a search query')
      return
    }

    setLoading(true)
    setResults([])
    setHasSearched(true) // Mark that a search has been performed

    try {
      // 使用清理后的输入
      const cleanedQuery = validation.cleaned
      let prompt = ''
      
      if (searchType === 'name') {
        // Search by professor name (case-insensitive)
        prompt = `Find information about the economics or public policy professor named "${cleanedQuery}" (search is case-insensitive, so "steven durlauf" matches "Steven Durlauf").

CRITICAL REQUIREMENTS - VERIFY ALL INFORMATION:
1. ACCURACY IS PARAMOUNT: Only return information you can verify is correct
2. VERIFY all URLs - only include website URLs if you are CERTAIN they are correct and accessible
3. Do NOT guess or make up URLs - if you cannot verify a URL, leave it as an empty string ""
4. Personal website URLs must be the actual, current website for this professor
5. Department URLs must be the actual department page for this professor
6. Better to return incomplete but accurate information than incorrect URLs

Provide ACCURATE and VERIFIED information:
1. Full name (must be correct)
2. Current affiliation (university/institution - must be accurate)
3. Research interests/fields (must be accurate)
4. Personal website URL (ONLY if you can verify it is correct, current, and accessible - otherwise use empty string "")
5. Department website URL (ONLY if you can verify it is correct - otherwise use empty string "")
6. Email (ONLY if publicly available and you can verify it is correct - otherwise use empty string "")
7. Brief description of their research

IMPORTANT: 
- If you cannot verify a URL is correct and accessible, do NOT include it - use empty string "" instead
- Do NOT construct URLs by guessing the format
- Only include URLs you know are the actual, working websites for this professor

Format the response as a JSON array with objects containing: name, affiliation, researchInterests (array), website, departmentUrl, email, description.

If you find multiple professors with similar names, include all of them. If the professor is not found, return an empty array [].`
      } else {
        // Search by field + school (fallback if no + in query)
        const field = searchQuery.split('+')[0]?.trim() || searchQuery
        const school = searchQuery.split('+')[1]?.trim() || 'any university'
        
        prompt = `Find economics or public policy professors who specialize in "${field}"${school !== 'any university' ? ` and are CURRENTLY AFFILIATED with "${school}"` : ''}.

${school !== 'any university' ? `CRITICAL: The professor MUST be currently affiliated with "${school}". If you cannot find professors at "${school}", return an empty array [].` : ''}

Provide a list of professors with:
1. Full name
2. Current affiliation (university/institution)
3. Research interests/fields
4. Personal website URL (if available)
5. Department website URL (if available)
6. Email (if publicly available)
7. Brief description of their research

Format the response as a JSON array with objects containing: name, affiliation, researchInterests (array), website, departmentUrl, email, description.

Return up to 10 relevant professors. If no professors are found, return an empty array [].`

        // If user provided field + school format
        if (searchQuery.includes('+')) {
          const parts = searchQuery.split('+').map(s => s.trim())
          const field = parts[0]
          const school = parts[1]
          
          prompt = `Find economics or public policy professors who specialize in "${field}" and are CURRENTLY AFFILIATED with "${school}".

CRITICAL REQUIREMENTS - VERIFY ALL INFORMATION:
1. ACCURACY IS PARAMOUNT: Only return professors if you are CERTAIN they are currently affiliated with "${school}". Do NOT guess or assume.
2. The professor MUST be currently affiliated with "${school}" (exact match or very close match like "University of Chicago Harris School of Public Policy" for "Harris School of Public Policy")
3. The professor MUST specialize in or have research interests in "${field}"
4. Only return professors who meet BOTH criteria above
5. If you cannot find professors at "${school}" who specialize in "${field}", return an empty array []
6. Do NOT return professors from other universities, even if they specialize in "${field}"
7. Do NOT return professors if you are unsure about their current affiliation
8. VERIFY all URLs and contact information - only include information you can verify is correct

For each professor found, provide ACCURATE and VERIFIED information:
1. Full name (must be correct)
2. Current affiliation (MUST be "${school}" - verify this is accurate)
3. Research interests/fields (must include "${field}" or related areas)
4. Personal website URL (ONLY if you can verify it is correct and belongs to this professor)
5. Department website URL (ONLY if you can verify it is correct)
6. Email (ONLY if publicly available and you can verify it is correct)
7. Brief description of their research

IMPORTANT: 
- If you are not certain about a professor's current affiliation with "${school}", do NOT include them
- If you cannot verify a website URL or email, leave it as an empty string ""
- Better to return fewer accurate results than incorrect information

Format the response as a JSON array with objects containing: name, affiliation, researchInterests (array), website, departmentUrl, email, description.

Return up to 10 relevant professors. If no professors matching both the field and school are found, return an empty array [].`
        }
      }

      const systemMessage = `You are an expert research assistant specializing in finding information about economics and public policy professors. You have knowledge of major universities, their faculty, and their research areas. 

CRITICAL: When searching for professors:
- ONLY provide information you can verify is accurate and current
- Do NOT guess or assume affiliations, websites, or contact information
- Do NOT construct URLs by guessing - only include URLs you know are correct and accessible
- If you are uncertain about any information, leave it blank (use empty string "" for URLs and email)
- Verify that professors are actually affiliated with the specified institution
- Better to return incomplete but accurate information than incorrect URLs or information
- Search is case-insensitive (e.g., "steven durlauf" matches "Steven Durlauf")
- Always return valid JSON format`

      const response = await callChatGPT(prompt, systemMessage)
      
      // Try to parse JSON response
      let professors = []
      try {
        const content = response.content || ''
        // Try to extract JSON from response
        const jsonMatch = content.match(/\[[\s\S]*\]/) || content.match(/\{[\s\S]*\}/)
        if (jsonMatch) {
          professors = JSON.parse(jsonMatch[0])
          // If it's a single object, wrap it in an array
          if (!Array.isArray(professors)) {
            professors = [professors]
          }
        } else {
          // Fallback: try to parse the entire content
          professors = JSON.parse(content)
          if (!Array.isArray(professors)) {
            professors = [professors]
          }
        }
      } catch (e) {
        // If JSON parsing fails, try to extract information from text
        console.error('Failed to parse JSON, trying text extraction:', e)
        // Create a fallback result
        professors = [{
          name: searchQuery,
          affiliation: 'Information not found in structured format',
          researchInterests: [],
          website: '',
          departmentUrl: '',
          email: '',
          description: response.content || 'Could not parse response. Please try a more specific search.'
        }]
      }

      setResults(professors)
    } catch (error) {
      console.error('Search error:', error)
      alert('Error searching for professors. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !loading) {
      handleSearch()
    }
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
            <h1 className="text-2xl font-bold text-gray-800">Find Professors</h1>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Search Section */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-bold mb-4">Search for Professors</h2>
          
          {/* Search Type Selection */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Search Type
            </label>
            <div className="flex gap-4">
              <label className="flex items-center">
                <input
                  type="radio"
                  name="searchType"
                  value="name"
                  checked={searchType === 'name'}
                  onChange={(e) => setSearchType(e.target.value)}
                  className="mr-2"
                />
                <span>By Professor Name</span>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name="searchType"
                  value="field"
                  checked={searchType === 'field'}
                  onChange={(e) => setSearchType(e.target.value)}
                  className="mr-2"
                />
                <span>By Field + School (e.g., "Labor Economics + MIT")</span>
              </label>
            </div>
          </div>

          {/* Search Input */}
          <div className="flex gap-4">
            <input
              type="text"
              value={searchQuery}
              onChange={handleSearchQueryChange}
              onKeyPress={handleKeyPress}
              maxLength={500}
              placeholder={
                searchType === 'name'
                  ? 'Enter professor name (e.g., "David Autor")'
                  : 'Enter field + school (e.g., "Labor Economics + MIT" or "Development Economics + Harvard")'
              }
              className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
            />
            <button
              onClick={handleSearch}
              disabled={loading || !searchQuery.trim()}
              className="px-6 py-3 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Searching...' : 'Search'}
            </button>
          </div>

          <p className="mt-3 text-sm text-gray-500">
            {searchType === 'name'
              ? 'Enter the full name or last name of the professor you are looking for.'
              : 'Enter the research field followed by "+" and the school name. Example: "Labor Economics + MIT"'}
          </p>
        </div>

        {/* Results */}
        {results.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-gray-800">
              Found {results.length} Professor{results.length !== 1 ? 's' : ''}
            </h2>
            {results.map((professor, idx) => (
              <div key={idx} className="bg-white rounded-lg shadow p-6">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="text-xl font-bold text-gray-800 mb-1">
                      {professor.name || 'Name not available'}
                    </h3>
                    <p className="text-gray-600 font-medium">
                      {professor.affiliation || 'Affiliation not available'}
                    </p>
                  </div>
                </div>

                {professor.researchInterests && professor.researchInterests.length > 0 && (
                  <div className="mb-3">
                    <p className="text-sm font-semibold text-gray-700 mb-1">Research Interests:</p>
                    <div className="flex flex-wrap gap-2">
                      {Array.isArray(professor.researchInterests) ? (
                        professor.researchInterests.map((interest, i) => (
                          <span
                            key={i}
                            className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full text-sm"
                          >
                            {interest}
                          </span>
                        ))
                      ) : (
                        <span className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full text-sm">
                          {professor.researchInterests}
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {professor.description && (
                  <p className="text-gray-700 mb-3">{professor.description}</p>
                )}

                <div className="flex flex-wrap gap-3 mt-4">
                  {professor.website && (
                    <a
                      href={professor.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm"
                    >
                      Personal Website ↗
                    </a>
                  )}
                  {professor.departmentUrl && (
                    <a
                      href={professor.departmentUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition text-sm"
                    >
                      Department Page ↗
                    </a>
                  )}
                  {professor.email && (
                    <a
                      href={`mailto:${professor.email}`}
                      className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition text-sm"
                    >
                      Email: {professor.email}
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && hasSearched && results.length === 0 && (
          <div className="bg-white rounded-lg shadow p-6 text-center">
            <p className="text-gray-500">No professors found. Try a different search query.</p>
          </div>
        )}
      </main>
    </div>
  )
}

export default FindProfessors


function Logo({ className = "w-8 h-8" }) {
  return (
    <img 
      src="/dog-logo.png" 
      alt="Logo" 
      className={`object-contain ${className}`}
      onError={(e) => {
        // Fallback to try other common image names
        if (e.target.src.includes('dog-logo.png')) {
          e.target.src = '/logo.png'
        } else if (e.target.src.includes('logo.png')) {
          e.target.src = '/dog-logo.svg'
        } else if (e.target.src.includes('dog-logo.svg')) {
          e.target.src = '/logo.svg'
        }
      }}
    />
  )
}

export default Logo


import { useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'

function App() {
  const [count, setCount] = useState(0)

  return (
    <div className="container-fluid bg-gray-50">
      {/* Header */}
      <header className="w-full max-w-7xl mx-auto px-4 py-8">
        <div className="flex justify-center space-x-8">
          <a href="https://vitejs.dev" target="_blank">
            <img src={viteLogo} className="logo" alt="Vite logo" />
          </a>
          <a href="https://react.dev" target="_blank">
            <img src={reactLogo} className="logo react" alt="React logo" />
          </a>
        </div>
        <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-blue-600 text-center my-6">
          Vite + React
        </h1>
      </header>

      {/* Main Content */}
      <main className="w-full max-w-7xl mx-auto px-4 flex-grow flex flex-col items-center">
        <div className="card mb-8">
          <button
            onClick={() => setCount((count) => count + 1)}
            className="btn"
          >
            count is {count}
          </button>
          <p className="mt-4 text-gray-700">
            Edit <code className="bg-gray-100 px-2 py-1 rounded font-mono">src/App.tsx</code> and save to test HMR
          </p>
        </div>
        
        {/* Grid Example */}
        <div className="w-full mt-8 mb-12">
          <h2 className="text-2xl font-bold mb-4">Grid Layout Example</h2>
          <div className="grid-layout">
            <div className="bg-blue-100 p-4 rounded-lg shadow-sm">Panel 1</div>
            <div className="bg-green-100 p-4 rounded-lg shadow-sm">Panel 2</div>
            <div className="bg-yellow-100 p-4 rounded-lg shadow-sm">Panel 3</div>
            <div className="bg-purple-100 p-4 rounded-lg shadow-sm">Panel 4</div>
            <div className="bg-red-100 p-4 rounded-lg shadow-sm">Panel 5</div>
            <div className="bg-pink-100 p-4 rounded-lg shadow-sm">Panel 6</div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full max-w-7xl mx-auto px-4 py-6 mt-auto">
        <p className="text-secondary text-center">
          Click on the Vite and React logos to learn more
        </p>
      </footer>
    </div>
  )
}

export default App
import React, { useState } from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import Landing from './Landing.jsx'

function Root() {
  const [entered, setEntered] = useState(false);
  if (entered) return <App />;
  return <Landing onEnter={() => setEntered(true)} />;
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>
)

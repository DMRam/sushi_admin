import React from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { IngredientsProvider } from './context/IngredientsContext'
import { ProductsProvider } from './context/ProductsContext'
import App from './App'
import './i18n';
import './index.css'

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <IngredientsProvider>
      <ProductsProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/*" element={<App />} />
          </Routes>
        </BrowserRouter>
      </ProductsProvider>
    </IngredientsProvider>
  </React.StrictMode>
)
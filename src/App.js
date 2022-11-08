import React, { Suspense } from 'react';
import {
  BrowserRouter,
  Route,
  Routes,
} from "react-router-dom";
import GlobalStyle from './GlobalStyle';
import Header from './Components/Header'
import Home from './Views/Home'
import './App.css';

function App() {
  return (
    <>
      <BrowserRouter>
        <GlobalStyle />
        <Header />
        <Suspense>
          <Routes>
            <Route path="/" element={<Home />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </>
  );
}

export default App;

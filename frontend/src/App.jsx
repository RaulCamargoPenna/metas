import React from "react"
import './global.css'
import { AppRoutes } from "./routes/AppRoutes"
import { Link } from "react-router"
import { Header } from "./components/Header"
import { Navbar } from "./components/Navbar"

export function App() {

  return (
    <div className="bg-mist-900 h-screen">
      <Header />
      <Navbar />
      <AppRoutes />
    </div>
  )
}
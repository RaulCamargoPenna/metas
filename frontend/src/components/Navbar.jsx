import React from "react";
import { Link } from "react-router";

export function Navbar() {
    return (
      <nav className="flex justify-between items-center p-4 bg-mist-800 rounded-b-2xl mb-10">
        <div>
            <span className="font-bold text-white">Metas.com</span>
        </div>
        <div className="gap-4 flex">
            <Link to={'/'} className="font-semibold text-gray-500 text-lg hover:text-gray-400">Home</Link>
            <Link to={'/about'} className="font-semibold text-gray-500 text-lg hover:text-gray-400">Sobre</Link>
        </div>
        <div className="justify-end">
            <Link to={'/'} className="font-bold rounded-lg bg-green-500 px-5 py-1.5">Login</Link>
        </div>
      </nav>
    )
}
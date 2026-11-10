import React from "react";
import { Routes, Route } from 'react-router'
import { Home } from "../pages/Home";
import { About } from "../pages/About";
import { NotFound } from "../pages/NotFound";

export function AppRoutes() {

    return (
        <Routes>
            <Route path="/" element={<Home/>} index></Route>
            <Route path="/about" element={<About/>}></Route>


            <Route path={'/*'} element={<NotFound/>}/>
        </Routes>
    )
}
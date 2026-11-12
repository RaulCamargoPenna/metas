import { Route, Routes } from 'react-router'
import { About } from '../pages/About'
import { Home } from '../pages/Home'
import { Login } from '../pages/Login'
import { NotFound } from '../pages/NotFound'
import { Profile } from '../pages/Profile'
import { Goals, NewGoal } from '../pages/Goals'
import { GoalDetail } from '../pages/GoalDetail'
import { Register } from '../pages/Register'

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/login" element={<Login />} />
      <Route path="/cadastro" element={<Register />} />
      <Route path="/perfil" element={<Profile />} />
      <Route path="/metas" element={<Goals />} />
      <Route path="/metas/nova" element={<NewGoal />} />
      <Route path="/metas/:goalId" element={<GoalDetail />} />
      <Route path="/about" element={<About />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  )
}

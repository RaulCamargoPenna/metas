import React from "react";
import { Link } from "react-router";

export function NotFound() {
    return (
        <div>
            <h1>404 - Página não encontrada</h1>
            <p>Ops, parace que essa página não existe.</p>

            <Link to='/'>Voltar para Home</Link>
        </div>
    )
}
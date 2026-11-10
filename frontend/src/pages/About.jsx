import React from "react";
import imagem from '../assets/raul.jpeg'

export function About() {
    return (
        <div className="grid grid-cols-3 text-center text-white gap-2 p-2">
            <div className="col-span-2 border-white border rounded-lg">
                Aqui vai ficar a descrição do projeto com as features e coisas que vão ser implementadas para
                aprendizado.
            </div>
            <div className="col-span-1 border-white border rounded-lg p-2">
                <img src={imagem} className="w-full rounded-lg"/>
            </div>
        </div>
    )
}
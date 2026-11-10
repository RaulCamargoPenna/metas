import React from "react";
import { Meta } from "../components/Meta";

export function Home() {
    return (
        <div className="justfy-center text-center gap-2">
            <h1 className="font-bold text-4xl text-white">Seja bem vindo à rede de Metas!</h1>

            <div className='text-white mt-10 flex flex-col gap-10'>
                <p>
                    Aqui você poderá cadastrar suas metas com tarefas que precisam ser realizadas para alcança-las e também compartilhar
                    publicamente com a rede!
                </p>
            </div>
        </div>
    )
}
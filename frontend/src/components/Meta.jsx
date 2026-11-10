import React from "react";

export function Meta() {
    return (
        <div class="flex flex-col bg-card border border-card-line shadow-2xs rounded-xl w-50">
            <div class="bg-surface border-b border-card-line rounded-t-xl py-3 px-4">
                <p class="text-sm text-muted-foreground-1">
                    Goal
                </p>
            </div>
            <div class="p-4  ">
                <p class="mt-1 text-muted-foreground-1">
                    The description of the goal and other thing that you want to put here.
                </p>
                <a class="mt-3 inline-flex items-center gap-x-1 text-sm font-semibold rounded-lg border border-transparent text-primary decoration-2 hover:text-primary-hover hover:underline focus:underline focus:outline-hidden focus:text-primary-focus disabled:opacity-50 disabled:pointer-events-none" href="#">
                Link to the tasks
                <svg class="shrink-0 size-4" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"></path></svg>
                </a>
            </div>
        </div>

    )
}
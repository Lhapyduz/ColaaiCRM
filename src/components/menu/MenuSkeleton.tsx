'use client';

import React from 'react';

export default function MenuSkeleton() {
    return (
        <div className="min-h-screen bg-[#121212] animate-pulse">
            {/* Header Skeleton */}
            <header className="max-w-4xl mx-auto px-4 py-16 flex flex-col items-center">
                <div className="w-32 h-32 rounded-full bg-white/5 mb-6 shadow-2xl" />
                <div className="w-64 h-10 bg-white/5 rounded-2xl mb-3" />
                <div className="w-80 h-6 bg-white/5/50 rounded-xl mb-8" />
                <div className="flex gap-3 justify-center">
                    <div className="w-32 h-10 bg-white/5 rounded-full" />
                    <div className="w-24 h-10 bg-white/5 rounded-full" />
                    <div className="w-24 h-10 bg-white/5 rounded-full" />
                </div>
            </header>

            {/* Categories Skeleton */}
            <div className="sticky top-0 z-40 bg-[#121212]/80 backdrop-blur-md border-b border-white/5 py-4">
                <div className="max-w-7xl mx-auto px-4 flex gap-4 overflow-hidden">
                    {[1, 2, 3, 4, 5].map((i) => (
                        <div key={i} className="min-w-32 h-10 bg-white/5 rounded-full shrink-0" />
                    ))}
                </div>
            </div>

            {/* Products Grid Skeleton */}
            <div className="max-w-7xl mx-auto px-4 py-8 space-y-12">
                {[1, 2].map((section) => (
                    <section key={section} className="space-y-6">
                        <div className="w-48 h-8 bg-white/5 rounded-xl" />
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {[1, 2, 3, 4].map((item) => (
                                <div key={item} className="bg-[#1E1E1E] border border-white/5 rounded-3xl p-5 flex flex-col sm:flex-row gap-5">
                                    <div className="flex-1 space-y-4">
                                        <div className="w-3/4 h-6 bg-white/5 rounded-lg" />
                                        <div className="w-full h-12 bg-white/5/50 rounded-lg" />
                                        <div className="w-1/4 h-6 bg-white/5 rounded-lg" />
                                    </div>
                                    <div className="w-full sm:w-32 h-32 bg-white/5 rounded-2xl shrink-0" />
                                </div>
                            ))}
                        </div>
                    </section>
                ))}
            </div>
        </div>
    );
}

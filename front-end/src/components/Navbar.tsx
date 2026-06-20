"use client";


import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { PlayCircle, Menu, X, Sparkles } from "lucide-react";
import Link from "next/link";

export default function Navbar() {
    const [scrolled, setScrolled] = useState(false);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    useEffect(() => {
        const handleScroll = () => setScrolled(window.scrollY > 20);
        window.addEventListener("scroll", handleScroll);
        return () => window.removeEventListener("scroll", handleScroll);
    }, []);

    return (
        <motion.nav
            initial={{ y: -100 }}
            animate={{ y: 0 }}
            transition={{ duration: 0.5 }}
            className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled
                ? "bg-black/80 backdrop-blur-xl border-b border-white/10 shadow-2xl"
                : "bg-transparent"
                }`}
        >
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-16">
                    {/* Logo */}
                    <Link href="/" className="flex items-center gap-2 group">
                        <div className="relative">
                            <PlayCircle className="w-8 h-8 text-red-500 group-hover:scale-110 transition-transform duration-300" />
                            <motion.div
                                animate={{ scale: [1, 1.2, 1] }}
                                transition={{ repeat: Infinity, duration: 2 }}
                                className="absolute -inset-1 bg-red-500/20 rounded-full blur-xl"
                            />
                        </div>
                        <span className="text-white font-bold text-xl bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
                            VidIQ<span className="text-red-500">AI</span>
                        </span>
                    </Link>

                    {/* Desktop Menu */}
                    <div className="hidden md:flex items-center gap-8">
                        <NavLink href="/chatbot">chatbot</NavLink>
                        <NavLink href="#how-it-works">How It Works</NavLink>
                        <NavLink href="#pricing">Pricing</NavLink>
                        <NavLink href="/about">About</NavLink>
                    </div>

                    {/* Buttons */}
                    <div className="flex items-center gap-4">
                        <Link href="/sign-in">
                            <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                className="hidden md:block px-5 py-2 text-gray-300 hover:text-white transition-colors"
                            >
                                Sign In
                            </motion.button>
                        </Link>
                        <Link href="/sign-up">
                            <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                className="relative px-6 py-2 rounded-full bg-gradient-to-r from-red-600 to-red-700 text-white font-medium overflow-hidden group"
                            >
                                <span className="relative z-10">
                                    Get Started Free
                                </span>

                                <motion.div
                                    initial={{ x: "100%" }}
                                    whileHover={{ x: 0 }}
                                    transition={{ duration: 0.3 }}
                                    className="absolute inset-0 bg-gradient-to-r from-red-700 to-red-800"
                                />
                            </motion.button>
                        </Link>

                        {/* Mobile Menu Button */}
                        <button
                            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                            className="md:hidden text-white p-2"
                        >
                            {mobileMenuOpen ? <X /> : <Menu />}
                        </button>
                    </div>
                </div>
            </div>

            {/* Mobile Menu */}
            {mobileMenuOpen && (
                <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="md:hidden bg-black/95 backdrop-blur-xl border-t border-white/10"
                >
                    <div className="px-4 py-4 space-y-4">
                        <MobileNavLink href="/chatbot">chatbot</MobileNavLink>
                        <MobileNavLink href="#how-it-works">How It Works</MobileNavLink>
                        <MobileNavLink href="#pricing">Pricing</MobileNavLink>
                        <MobileNavLink href="/about">About</MobileNavLink>
                        <div className="pt-4">
                            <button className="w-full px-6 py-3 rounded-full bg-gradient-to-r from-red-600 to-red-700 text-white font-medium">
                                Get Started
                            </button>
                        </div>
                    </div>
                </motion.div>
            )}
        </motion.nav>
    );
}

function NavLink({ href, children }: { href: string; children: string }) {
    return (
        <Link
            href={href}
            className="text-gray-300 hover:text-white transition-colors duration-200 font-medium"
        >
            {children}
        </Link>
    );
}

function MobileNavLink({ href, children }: { href: string; children: string }) {
    return (
        <Link
            href={href}
            className="block text-gray-300 hover:text-white transition-colors py-2"
        >
            {children}
        </Link>
    );
}
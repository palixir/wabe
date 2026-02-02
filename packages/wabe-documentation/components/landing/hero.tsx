import { Image } from '@heroui/image'
import { computePublicPath } from '../utils'
import { Button } from '@heroui/react'
import { Link } from 'rspress/theme'
import { BookOpen, Github } from 'lucide-react'

export default function Hero() {
  return (
    <>
      {/* Hero Section */}
      <section id="hero" className="my-24">
        <div className="flex flex-col justify-center items-center mx-auto gap-16">
          {/* Tagline */}
          <div className="px-4 py-1 rounded-full bg-gradient-to-r from-blue-500 to-teal-500 text-white text-sm font-medium shadow-lg animate-pulse">
            🔥 Open Source Backend-as-a-Service
          </div>

          {/* Title */}
          <div className="flex flex-col gap-6 justify-center items-center max-w-5xl mx-auto text-center w-full">
            <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight leading-tight">
              Build your
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 mx-2">
                backend
              </span>
              in minutes
              <br className="hidden md:block" />
              <span className="text-gray-800 font-medium">
                not days — with
              </span>
              <span className="relative inline-block mx-2">
                <span className="absolute inset-0 bg-gradient-to-r from-blue-500 to-teal-500 opacity-30 rounded-md -rotate-2 transform-gpu" />
                <span className="relative font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-teal-600">
                  everything included
                </span>
              </span>
              <span className="text-gray-800 font-medium">🚀</span>
            </h1>

            {/* Subtitle */}
            <p className="text-lg md:text-xl text-gray-600 max-w-2xl mx-auto font-medium">
              Stop wasting time on boilerplate. Wabe gives you a production-ready backend
              with database, auth, storage, emails, GraphQL API, and security — all in one place.
            </p>

            {/* CTA Buttons */}
            <div className="flex items-center justify-center flex-col sm:flex-row gap-4 mt-6">
              <Button
                as={Link}
                color="primary"
                size="lg"
                href="/documentation/wabe/start"
                className="font-bold px-8 py-4 shadow-lg hover:shadow-xl transition-transform transform hover:-translate-y-1 bg-gradient-to-r from-blue-600 to-teal-600 text-white"
                startContent={<BookOpen className="w-5 h-5" />}
              >
                🚀 Get Started Now
              </Button>

              <Button
                as="a"
                color="default"
                variant="bordered"
                size="lg"
                href="https://github.com/palixir/wabe"
                target="_blank"
                className="font-bold px-8 py-4 shadow-lg hover:shadow-xl transition-transform transform hover:-translate-y-1 border-2 border-gray-300 hover:border-blue-500"
                startContent={<Github className="w-5 h-5" />}
              >
                ⭐ Star on GitHub
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Schema Section */}
      <section id="schema" className="my-24">
        <div className="flex flex-col gap-8 mx-auto max-w-6xl justify-center items-center text-center">
          <h4 className="text-3xl md:text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-teal-600">
            Your backend, instantly generated ✨
          </h4>
          <p className="text-lg text-gray-600 max-w-2xl font-medium">
            Define your schema, connect your database, and Wabe magically generates
            a complete, fully-typed GraphQL API with auth, security, and all the features you need.
          </p>
          <div className="transition-transform duration-500 hover:scale-105 w-full">
            <Image
              alt="Wabe schema"
              className="w-full object-cover rounded-2xl shadow-xl border border-gray-200 hover:shadow-2xl transition-shadow"
              src={computePublicPath('/assets/schema.webp')}
            />
          </div>
        </div>
      </section>

      {/* Why Wabe Section */}
      <section id="why-wabe" className="py-20 bg-white">
        <div className="max-w-screen-xl mx-auto px-6">
          <div className="text-center mb-14">
            <h2 className="text-4xl md:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-teal-600 mb-6">
              Why Developers Love Wabe 💙
            </h2>
            <p className="text-lg text-gray-600 max-w-3xl mx-auto font-medium">
              Wabe isn't just another backend framework. It's a complete solution designed to make developers' lives easier,
              faster, and more productive. Here's why teams are switching to Wabe:
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Time Savings */}
            <div className="bg-gray-50 p-8 rounded-2xl border border-gray-200 hover:shadow-xl transition-all">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                  <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-gray-900">⏱️ Save Weeks of Development</h3>
              </div>
              <p className="text-gray-600 mb-4">
                Wabe eliminates 80% of backend boilerplate. What used to take weeks now takes minutes.
              </p>
              <p className="text-sm text-gray-500">
                No more writing CRUD operations, auth systems, or API endpoints from scratch.
              </p>
            </div>

            {/* Type Safety */}
            <div className="bg-gray-50 p-8 rounded-2xl border border-gray-200 hover:shadow-xl transition-all">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                  <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-gray-900">🔒 Type-Safe by Default</h3>
              </div>
              <p className="text-gray-600 mb-4">
                Built with TypeScript from the ground up. Get autocomplete, type checking, and confidence.
              </p>
              <p className="text-sm text-gray-500">
                Generated types for your entire schema, queries, and mutations.
              </p>
            </div>

            {/* Production Ready */}
            <div className="bg-gray-50 p-8 rounded-2xl border border-gray-200 hover:shadow-xl transition-all">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                  <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-gray-900">🚀 Production-Ready</h3>
              </div>
              <p className="text-gray-600 mb-4">
                Battle-tested security, performance, and scalability built-in.
              </p>
              <p className="text-sm text-gray-500">
                Used by startups and enterprises alike for mission-critical applications.
              </p>
            </div>
          </div>
        </div>
      </section>
    </>
  )
}

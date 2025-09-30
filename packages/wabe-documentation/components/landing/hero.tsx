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
          <div className="px-4 py-1 rounded-full bg-blue-50 text-blue-600 text-sm font-medium shadow-sm">
            Open Source Backend-as-a-Service
          </div>

          {/* Title */}
          <div className="flex flex-col gap-6 justify-center items-center max-w-5xl mx-auto text-center w-full">
            <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight leading-tight">
              Create your
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-teal-400 to-green-400 mx-2">
                backend
              </span>
              faster
              <br className="hidden md:block" />
              <span className="text-gray-800 font-medium">
                with everything you need to build
              </span>
              <span className="relative inline-block mx-2">
                <span className="absolute inset-0 bg-blue-500 opacity-20 rounded-md -rotate-1" />
                <span className="relative font-semibold text-blue-400">
                  robust
                </span>
              </span>
              and
              <span className="relative inline-block mx-2">
                <span className="absolute inset-0 bg-green-500 opacity-20 rounded-md rotate-1" />
                <span className="relative font-semibold text-green-400">
                  secure
                </span>
              </span>
              <span className="text-gray-800 font-medium">applications 🚀</span>
            </h1>

            {/* Subtitle */}
            <p className="text-lg md:text-xl text-gray-600 max-w-2xl mx-auto">
              Wabe handles the boring parts — database, auth, storage, emails,
              GraphQL API, permissions — so you can focus on building amazing
              products.
            </p>

            {/* CTA Buttons */}
            <div className="flex items-center justify-center flex-col sm:flex-row gap-4 mt-6">
              <Button
                as={Link}
                color="primary"
                size="lg"
                href="/documentation/wabe/start"
                className="font-semibold px-8 py-4 shadow-md hover:shadow-lg transition"
                startContent={<BookOpen className="w-5 h-5" />}
              >
                Get Started
              </Button>

              <Button
                as="a"
                color="default"
                variant="bordered"
                size="lg"
                href="https://github.com/palixir/wabe"
                target="_blank"
                className="font-semibold px-8 py-4 shadow-md hover:shadow-lg transition"
                startContent={<Github className="w-5 h-5" />}
              >
                GitHub
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Schema Section */}
      <section id="schema" className="my-24">
        <div className="flex flex-col gap-8 mx-auto max-w-6xl justify-center items-center text-center">
          <h4 className="text-3xl md:text-4xl font-bold text-gray-900">
            Build a robust backend easily ✨
          </h4>
          <p className="text-lg text-gray-600 max-w-2xl">
            Define your schema, configure your database, and Wabe instantly
            generates a fully typed GraphQL API with authentication, security,
            and more.
          </p>
          <div className="transition-transform duration-500 hover:scale-105 w-full">
            <Image
              alt="Wabe schema"
              className="w-full object-cover rounded-2xl shadow-xl border border-gray-200"
              src={computePublicPath('/assets/schema.webp')}
            />
          </div>
        </div>
      </section>
    </>
  )
}

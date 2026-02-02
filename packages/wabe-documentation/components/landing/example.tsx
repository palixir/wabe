import { Image } from '@heroui/image'
import { computePublicPath } from '../utils'
import { Card, CardBody, Button } from '@heroui/react'
import { Link } from 'rspress/theme'

const features = [
  {
    emoji: '⚡',
    title: 'Instant Database',
    desc: 'Connect any database and get a fully-typed GraphQL API instantly.',
  },
  {
    emoji: '🔐',
    title: 'Enterprise Auth',
    desc: 'Built-in authentication with Google, GitHub, email/password and more.',
  },
  {
    emoji: '💾',
    title: 'Flexible Storage',
    desc: 'Upload and manage files effortlessly with S3, Google Cloud, and more.',
  },
  {
    emoji: '🤖',
    title: 'Auto-Generated API',
    desc: 'Define schemas and get a complete, fully-typed CRUD API automatically.',
  },
  {
    emoji: '🧠',
    title: 'AI Integration',
    desc: 'Seamlessly integrate AI models while Wabe handles the complexity.',
  },
]

const view = () => (
  <section id="example" className="py-20 bg-gray-50">
    <div className="max-w-screen-xl mx-auto px-6">
      <div className="text-center mb-12">
        <h2 className="text-4xl md:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-teal-600">
          🚀 Launch in minutes, not days
        </h2>
        <p className="mt-4 text-lg text-gray-600 max-w-2xl mx-auto font-medium">
          Wabe lets you spin up a secure, scalable backend in minutes — so you can focus
          on building your product, not your infrastructure. No boilerplate, just results.
        </p>
      </div>

      <Card shadow="md" radius="lg">
        <CardBody>
          <div className="flex flex-col lg:flex-row items-center gap-10">
            {/* Code Image */}
            <div className="w-full lg:w-1/2">
              <Image
                src={computePublicPath('/assets/code.webp')}
                alt="Example"
                className="rounded-lg shadow"
              />
            </div>

            {/* Features */}
            <div className="w-full lg:w-1/2 flex flex-col justify-center p-4">
              <h3 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-teal-600 mb-4">
                🚀 Launch Your Backend in Minutes
              </h3>
              <ul className="space-y-4">
                {features.map((f, index) => (
                  <li key={index} className="flex items-start gap-3">
                    <span className="text-2xl">{f.emoji}</span>
                    <div>
                      <p className="font-semibold text-gray-900">{f.title}</p>
                      <p className="text-gray-600 text-sm">{f.desc}</p>
                    </div>
                  </li>
                ))}
              </ul>
              <div className="mt-6">
                <Button
                  as="a"
                  href="https://palixir.github.io/wabe"
                  color="primary"
                  size="lg"
                  className="font-bold bg-gradient-to-r from-blue-600 to-teal-600 text-white shadow-lg hover:shadow-xl transition-transform transform hover:-translate-y-1"
                >
                  🚀 Get Started Now →
                </Button>
              </div>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Community & Open Source Section */}
      <section id="community" className="py-20 bg-gray-50">
        <div className="max-w-screen-xl mx-auto px-6">
          <div className="text-center mb-14">
            <h2 className="text-4xl md:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-teal-600 mb-6">
              🌍 Open Source & Community Driven
            </h2>
            <p className="text-lg text-gray-600 max-w-3xl mx-auto font-medium">
              Wabe is 100% open source and built by developers for developers. Join our growing community!
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* GitHub Stats */}
            <div className="bg-white p-8 rounded-2xl border border-gray-200 text-center">
              <div className="w-16 h-16 bg-gray-900 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Star on GitHub</h3>
              <p className="text-gray-600 mb-4">
                Check out our repository, contribute, and star the project to show your support!
              </p>
              <Button
                as="a"
                href="https://github.com/palixir/wabe"
                color="default"
                variant="bordered"
                size="lg"
                target="_blank"
                className="font-bold border-2 border-gray-300 hover:border-blue-500"
              >
                ⭐ Star on GitHub
              </Button>
            </div>

            {/* Documentation */}
            <div className="bg-white p-8 rounded-2xl border border-gray-200 text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Comprehensive Docs</h3>
              <p className="text-gray-600 mb-4">
                Explore our detailed documentation with examples, guides, and API references.
              </p>
              <Button
                as={Link}
                href="/documentation/wabe/start"
                color="primary"
                size="lg"
                className="font-bold bg-gradient-to-r from-blue-600 to-teal-600 text-white"
              >
                📚 Read Documentation
              </Button>
            </div>

            {/* Community */}
            <div className="bg-white p-8 rounded-2xl border border-gray-200 text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Join the Community</h3>
              <p className="text-gray-600 mb-4">
                Connect with other developers, ask questions, and share your experiences.
              </p>
              <Button
                as="a"
                href="https://github.com/palixir/wabe/discussions"
                color="default"
                variant="bordered"
                size="lg"
                target="_blank"
                className="font-bold border-2 border-gray-300 hover:border-green-500"
              >
                💬 Join Discussion
              </Button>
            </div>
          </div>
        </div>
      </section>
    </div>
  </section>
)

export const Example = () => view()

import { Image } from '@heroui/image'
import { computePublicPath } from '../utils'
import { Card, CardBody, Button } from '@heroui/react'
import { Database, Lock, Upload, Code2, Bot } from 'lucide-react'

const features = [
  {
    icon: <Database className="w-5 h-5 text-blue-600" />,
    title: 'Database Integration',
    desc: 'Seamlessly connect to your database with a fully typed GraphQL API.',
  },
  {
    icon: <Lock className="w-5 h-5 text-green-600" />,
    title: 'Authentication & Security',
    desc: 'Built-in auth (Google, GitHub, email/password) + role-based permissions.',
  },
  {
    icon: <Upload className="w-5 h-5 text-yellow-600" />,
    title: 'File Storage',
    desc: 'Upload and manage files effortlessly with flexible adapters.',
  },
  {
    icon: <Code2 className="w-5 h-5 text-purple-600" />,
    title: 'Auto-Generated GraphQL API',
    desc: 'Define schemas and instantly get a powerful API with CRUD operations.',
  },
  {
    icon: <Bot className="w-5 h-5 text-pink-600" />,
    title: 'AI Integration',
    desc: 'Interact with AI models easily while Wabe handles the complexity.',
  },
]

const view = () => (
  <section id="example" className="py-20 bg-gray-50">
    <div className="max-w-screen-xl mx-auto px-6">
      <div className="text-center mb-12">
        <h2 className="text-4xl md:text-5xl font-extrabold text-gray-900">
          Start in just a few lines of code
        </h2>
        <p className="mt-4 text-lg text-gray-600 max-w-2xl mx-auto">
          Wabe lets you spin up a secure, scalable backend in minutes — so you
          can focus on building your product, not your infrastructure.
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
              <h3 className="text-2xl font-bold text-gray-900 mb-4">
                Launch Your Backend in Minutes 🚀
              </h3>
              <ul className="space-y-4">
                {features.map((f, index) => (
                  <li key={index} className="flex items-start gap-3">
                    {f.icon}
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
                  href="https://palixir.github.io/wabe/index"
                  color="primary"
                  size="lg"
                  className="font-semibold"
                >
                  Get Started →
                </Button>
              </div>
            </div>
          </div>
        </CardBody>
      </Card>
    </div>
  </section>
)

export const Example = () => view()

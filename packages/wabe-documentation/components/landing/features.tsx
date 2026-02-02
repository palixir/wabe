import {
  Database,
  Beaker,
  ShieldCheck,
  Mail,
  FileText,
  Lock,
} from 'lucide-react'
import { Button, Card, CardBody, CardHeader, Link } from '@heroui/react'

const features = [
  {
    title: '⚡ Instant Database Setup',
    description:
      'Connect any database and get a fully-typed GraphQL API instantly. No boilerplate, just power.',
    docLink: '/documentation/database/index',
    icon: <Database className="w-7 h-7 text-indigo-600" />,
  },
  {
    title: '🔐 Enterprise-Grade Auth',
    description:
      'Built-in authentication with email/password, Google, GitHub, and more. Secure by default.',
    docLink: '/documentation/authentication',
    icon: <Lock className="w-7 h-7 text-blue-600" />,
  },
  {
    title: '🛡️ Military-Grade Security',
    description:
      'Role-based permissions, object-level security, and comprehensive protection for your data.',
    docLink: '/documentation/security',
    icon: <ShieldCheck className="w-7 h-7 text-green-600" />,
  },
  {
    title: '📧 Powerful Email System',
    description:
      'Seamless email integration with SendGrid, Mailgun, Resend, and more. Built for scale.',
    docLink: '/documentation/email/index',
    icon: <Mail className="w-7 h-7 text-yellow-600" />,
  },
  {
    title: '💾 Flexible File Storage',
    description:
      'Effortless file management with S3, Google Cloud, or custom adapters. Upload, store, retrieve.',
    docLink: '/documentation/file/index',
    icon: <FileText className="w-7 h-7 text-purple-600" />,
  },
  {
    title: '🤖 Auto-Generated GraphQL',
    description:
      'Define your schema and get a complete, fully-typed CRUD API automatically. Magic at work.',
    icon: <Beaker className="w-7 h-7 text-pink-600" />,
  },
]

const view = () => (
  <section id="features" className="py-20 bg-gray-50">
    <div className="max-w-screen-xl mx-auto px-6">
      {/* Title Section */}
      <div className="text-center space-y-4 mb-14">
        <h2 className="text-4xl md:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-teal-600">
          🚀 All-in-One Backend Solution
        </h2>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto font-medium">
          No more boilerplate. Wabe delivers a complete, production-ready backend
          with everything built-in — so you can launch faster than ever.
        </p>
      </div>

      {/* Features Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-10">
        {features.map(({ title, description, docLink, icon }) => (
          <Card
            key={title}
            shadow="md"
            className="rounded-2xl border border-gray-200 hover:shadow-xl transition-all duration-300 group"
          >
            <CardHeader className="flex items-center gap-4 p-6">
              <div className="flex items-center justify-center w-14 h-14 rounded-full bg-gray-100 group-hover:scale-110 group-hover:bg-gray-200 transition-transform duration-300">
                {icon}
              </div>
              <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
            </CardHeader>
            <CardBody className="px-6 pb-6 flex flex-col justify-between">
              <p className="text-gray-600 text-sm leading-relaxed">
                {description}
              </p>
              {docLink && (
                <div className="mt-5">
                  <Button
                    as={Link}
                    href={docLink}
                    size="sm"
                    color="primary"
                    variant="flat"
                    target="_blank"
                    className="font-medium"
                  >
                    Read Docs →
                  </Button>
                </div>
              )}
            </CardBody>
          </Card>
        ))}
      </div>

      {/* Additional Features Section */}
      <div className="mt-16 text-center">
        <h3 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-teal-600 mb-4">
          And So Much More... ✨
        </h3>
        <p className="text-gray-600 max-w-2xl mx-auto">
          Wabe comes packed with additional features like hooks system, cron jobs, REST routes,
          custom resolvers, and seamless integration with modern frontend frameworks.
        </p>
      </div>
    </div>
  </section>
)

export const Features = () => view()

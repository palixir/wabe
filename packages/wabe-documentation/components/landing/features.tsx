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
    title: 'Database Integration',
    description:
      'Connect to your preferred database and execute queries with a smooth, fully typed GraphQL interface.',
    docLink: '/documentation/database/index',
    icon: <Database className="w-7 h-7 text-indigo-600" />,
  },
  {
    title: 'Seamless Authentication',
    description:
      'Integrated authentication system with multiple providers (email/password, Google, GitHub, etc.) — ready to secure your app.',
    docLink: '/documentation/authentication',
    icon: <Lock className="w-7 h-7 text-blue-600" />,
  },
  {
    title: 'Role-Based Permissions & Security',
    description:
      'Fine-grained role-based permissions, object-level access control, and backend security to protect your data.',
    docLink: '/documentation/security',
    icon: <ShieldCheck className="w-7 h-7 text-green-600" />,
  },
  {
    title: 'Email Sending',
    description:
      'Easily send emails via your preferred provider (SendGrid, Mailgun, Resend, etc.) with built-in integration.',
    docLink: '/documentation/email/index',
    icon: <Mail className="w-7 h-7 text-yellow-600" />,
  },
  {
    title: 'File Storage',
    description:
      'Store and manage files in AWS S3, Google Cloud Storage, or any custom adapter effortlessly.',
    docLink: '/documentation/file/index',
    icon: <FileText className="w-7 h-7 text-purple-600" />,
  },
  {
    title: 'Schema & Auto-Generated API',
    description:
      'Create advanced schemas (relations, scalars, enums) while Wabe generates a complete, fully typed CRUD API for you.',
    icon: <Beaker className="w-7 h-7 text-pink-600" />,
  },
]

const view = () => (
  <section id="features" className="py-20 bg-gray-50">
    <div className="max-w-screen-xl mx-auto px-6">
      {/* Title Section */}
      <div className="text-center space-y-4 mb-14">
        <h2 className="text-4xl md:text-5xl font-extrabold text-gray-900">
          Everything you need in one place
        </h2>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
          Skip the boilerplate. Wabe gives you a complete, production-ready
          backend out of the box — so you can build faster.
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
    </div>
  </section>
)

export const Features = () => view()

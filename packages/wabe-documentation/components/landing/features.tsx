import { CircleStackIcon } from '@heroicons/react/24/outline'
import { BeakerIcon } from '@heroicons/react/24/outline'
import {
  ShieldCheckIcon,
  EnvelopeIcon,
  DocumentIcon,
  CpuChipIcon,
  LockClosedIcon,
} from '@heroicons/react/24/outline'
import { Button, Card, CardBody, CardHeader, Link } from '@heroui/react'

const hours = [
  {
    title: 'Database integration',
    description:
      'Connect to your preferred database and execute queries with a smooth and fully typed interface.',
    docLink: '/documentation/database/index',
    icon: <CircleStackIcon width={28} className="text-indigo-500" />,
  },
  {
    title: 'Seamless Authentication',
    description:
      'A fully integrated authentication system with multiple providers (email/password, Google, GitHub etc.), ready to secure access to your application.',
    docLink: '/documentation/authentication',
    icon: <LockClosedIcon width={28} className="text-blue-500" />,
  },
  {
    title: 'Role-Based Permissions & Backend Security',
    description:
      'Role-based permissions, object-level access control, and backend security features to protect your data and users.',
    docLink: '/documentation/security',
    icon: <ShieldCheckIcon width={28} className="text-green-500" />,
  },
  {
    title: 'Email Sending',
    description:
      'Send emails with your preferred email provider (SendGrid, Mailgun, etc.).',
    docLink: '/documentation/email/index',
    icon: <EnvelopeIcon width={28} className="text-yellow-500" />,
  },
  {
    title: 'File storage ',
    description:
      'Store files in your preferred cloud provider (AWS S3, Google Cloud Storage, etc.) easily.',
    docLink: '/documentation/file/index',
    icon: <DocumentIcon width={28} className="text-indigo-500" />,
  },
  {
    title: 'Schema Creation & Auto-generated CRUD API',
    description:
      'Create fully typed schemas with advanced features like relations and custom scalars, while we generate a complete, fully typed CRUD API for you.',

    icon: <BeakerIcon width={28} className="text-pink-500" />,
  },
  {
    title: 'AI integration',
    description:
      'Interact with your AI models with a simple and powerful interface, while we handle the complexity of the underlying APIs.',
    icon: <CpuChipIcon width={28} className="text-pink-500" />,
    docLink: '/documentation/ai/index',
  },
]

const view = () => (
  <section id="features" className="py-16 ">
    <div className="max-w-screen-xl mx-auto px-6">
      <div className="text-center space-y-4">
        <h2 className="text-4xl md:text-5xl font-extrabold">
          Everything in a single place
        </h2>
        <p className="text-lg text-gray-600">
          Focus on what matters. Let us handle the essentials.
        </p>
      </div>

      <div className="mt-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
        {hours.map(({ title, description, docLink, icon }) => (
          <Card
            key={title}
            className="border border-gray-700 rounded-xl hover:shadow-2xl transform hover:scale-105 transition-transform duration-300"
          >
            <CardHeader className="flex items-center gap-3 p-5">
              <div className="flex items-center justify-center w-12 h-12 border-1 border-gray-700 rounded-full">
                {icon}
              </div>
              <h3 className="text-lg font-semibold">{title}</h3>
            </CardHeader>
            <CardBody className="p-5 flex flex-col justify-between">
              <p className="text-gray-600 text-sm">{description}</p>
              <div className="flex mt-4">
                {docLink && (
                  <Button
                    as={Link}
                    variant="flat"
                    size="sm"
                    href={docLink}
                    target="_blank"
                  >
                    Docs
                  </Button>
                )}
              </div>
            </CardBody>
          </Card>
        ))}
      </div>
    </div>
  </section>
)

export const Features = () => view()

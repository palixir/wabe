import { Image } from '@heroui/image'
import { computePublicPath } from '../utils'
import { Card, CardBody } from '@heroui/react'

const view = () => (
  <section id="example" className="py-16">
    <div className="max-w-screen-xl mx-auto">
      <div className="text-center space-y-4">
        <h2 className="text-4xl md:text-5xl font-extrabold">
          Start in just a few lines of code
        </h2>
      </div>

      <Card className="mt-10">
        <CardBody>
          <div className="flex flex-col sm:flex-row justify-between w-full gap-10">
            <Image src={computePublicPath('/assets/code.webp')} alt="Example" />

            <div className="flex flex-col justify-center p-6 rounded-lg ">
              <h2 className="text-2xl font-bold text-gray-900">
                Launch Your Backend in Minutes 🚀
              </h2>
              <p className="text-gray-700 mt-3">
                Skip the hassle of backend development and focus on what truly
                matters your product. With just a few lines of code, get instant
                access to a <strong>powerful, scalable, and secure</strong>{' '}
                backend.
              </p>
              <ul className="mt-4 text-gray-600 space-y-2">
                <li>
                  ✅ <strong>Database Integration</strong> – Connect seamlessly
                  to your preferred database with a fully typed GraphQL API.
                </li>
                <li>
                  ✅ <strong>Authentication & Security</strong> – Built-in
                  authentication (Google, GitHub, email/password) with
                  role-based permissions.
                </li>
                <li>
                  ✅ <strong>File Storage</strong> – Store files effortlessly
                </li>
                <li>
                  ✅ <strong>Auto-Generated GraphQL API</strong> – Define your
                  schemas, and we’ll generate a fully functional API for you.
                </li>
                <li>
                  ✅ <strong>AI Integration</strong> – Easily interact with AI
                  models while we handle API complexities.
                </li>
              </ul>
              <p className="mt-4 text-lg font-semibold text-gray-900">
                💡 Stop wasting time. Get started in seconds and scale
                effortlessly!
              </p>
            </div>
          </div>
        </CardBody>
      </Card>
    </div>
  </section>
)

export const Example = () => view()

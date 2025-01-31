import { computePublicPath } from '../utils'
import { Divider } from '@heroui/divider'
import { Image } from '@heroui/image'

const view = () => {
  return (
    <footer className="mt-8">
      <Divider />

      <div className="mx-auto w-full max-w-screen-xl p-4 my-5">
        <div className="md:flex md:justify-between">
          <div className="mb-6 md:mb-0">
            <div className="flex items-center">
              <Image
                className="h-8 me-3"
                src={computePublicPath('/assets/logo.png')}
                alt="Wabe Logo"
              />
              <span className="self-center text-2xl font-semibold whitespace-nowrap dark:text-white">
                Wabe
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-8 sm:gap-6 sm:grid-cols-3">
            <div>
              <h2 className="mb-6 text-sm font-semibold text-gray-900 uppercase dark:text-white">
                Resources
              </h2>
              <ul className="text-gray-500 dark:text-gray-400 font-medium">
                <li className="mb-4">
                  <a
                    href="/documentation/wabe/motivations"
                    className="hover:underline"
                  >
                    Documentation
                  </a>
                </li>
                <li className="mb-4">
                  <a
                    href="https://github.com/palixir/wabe"
                    className="hover:underline"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Wabe
                  </a>
                </li>
              </ul>
            </div>

            <div>
              <h2 className="mb-6 text-sm font-semibold text-gray-900 uppercase dark:text-white">
                Follow us
              </h2>
              <ul className="text-gray-500 dark:text-gray-400 font-medium">
                <li className="mb-4">
                  <a
                    href="https://github.com/palixir/wabe"
                    className="hover:underline"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Github
                  </a>
                </li>

                <li>
                  <a
                    href="https://x.com/coratgerl"
                    className="text-gray-500 hover:text-gray-900 dark:hover:text-white"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <svg
                      className="w-4 h-4"
                      aria-hidden="true"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="currentColor"
                      viewBox="0 0 20 17"
                    >
                      <path d="M20 1.892a8.178 8.178 0 0 1-2.355.635 4.074 4.074 0 0 0 1.8-2.235 8.344 8.344 0 0 1-2.605.98A4.13 4.13 0 0 0 13.85 0a4.068 4.068 0 0 0-4.1 4.038 4 4 0 0 0 .105.919A11.705 11.705 0 0 1 1.4.734a4.006 4.006 0 0 0 1.268 5.392 4.165 4.165 0 0 1-1.859-.5v.05A4.057 4.057 0 0 0 4.1 9.635a4.19 4.19 0 0 1-1.856.07 4.108 4.108 0 0 0 3.831 2.807A8.36 8.36 0 0 1 0 14.184 11.732 11.732 0 0 0 6.291 16 11.502 11.502 0 0 0 17.964 4.5c0-.177 0-.35-.012-.523A8.143 8.143 0 0 0 20 1.892Z" />
                    </svg>
                    <span className="sr-only">Twitter page</span>
                  </a>
                </li>
              </ul>
            </div>
          </div>
        </div>

        <div className="sm:flex sm:items-center sm:justify-between">
          <span className="text-sm text-gray-500 sm:text-center dark:text-gray-400">
            © 2025{' '}
            <a href="https://shipmysaas.com" className="hover:underline">
              Wabe
            </a>
            . All Rights Reserved.
          </span>
        </div>
      </div>
    </footer>
  )
}

export const Footer = () => view()

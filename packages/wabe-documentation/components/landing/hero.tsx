import { Image } from '@heroui/image'
import { CallToAction } from './callToAction'
import { computePublicPath } from '../utils'
import { Button, Link } from '@heroui/react'
import InformationCircleIcon from '@heroicons/react/24/outline/InformationCircleIcon'

export default function Hero() {
  return (
    <>
      <section id="hero" className="my-20">
        <div className="flex flex-col justify-center items-center mx-auto gap-20">
          <div className="flex flex-col gap-8 justify-center items-center max-w-5xl mx-auto text-center w-full">
            {/* Titre Principal Amélioré */}
            <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight text-center leading-tight">
              Create your &nbsp;
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-teal-400 to-green-400">
                backend
              </span>
              &nbsp;faster
              <br className="hidden md:block" />
              <span className="text-gray-800 font-medium">
                with all you need to build
              </span>
              &nbsp;
              <span className="relative inline-block">
                <span className="absolute inset-0 bg-blue-500 opacity-20 rounded-md -rotate-1" />
                <span className="relative font-semibold text-blue-300">
                  robust
                </span>
              </span>
              &nbsp;and&nbsp;
              <span className="relative inline-block">
                <span className="absolute inset-0 bg-green-500 opacity-20 rounded-md rotate-1" />
                <span className="relative font-semibold text-green-300">
                  secure
                </span>
              </span>
              <span className="text-gray-800 font-medium">applications !</span>
            </h1>

            <div className="flex items-center justify-center flex-col sm:flex-row gap-2 w-full max-w-5xl">
              <Button
                as={Link}
                color="default"
                variant="bordered"
                size="lg"
                href="/documentation/wabe/motivations"
                target="_blank"
                className="relative overflow-hidden px-8 py-4 rounded-xl shadow-md transition-transform transform hover:-translate-y-1 hover:scale-105 hover:shadow-lg focus:ring-2 focus:ring-blue-500"
                startContent={<InformationCircleIcon className="w-8 h-8" />}
              >
                Read the docs
              </Button>

              <CallToAction />
            </div>
          </div>
        </div>
      </section>

      <section id="schema">
        <div className="flex flex-col gap-6 mx-auto max-w-7xl justify-center items-center my-10">
          <h4 className="text-4xl font-light text-center">
            All you need to build a robust backend easily !
          </h4>

          <div className="transition-transform duration-500 hover:scale-105">
            <Image
              alt="Wabe schema"
              className="w-full object-cover rounded-lg shadow-lg"
              src={computePublicPath('/assets/schema.png')}
            />
          </div>
        </div>
      </section>
    </>
  )
}

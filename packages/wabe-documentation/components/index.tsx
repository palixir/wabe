import { Divider } from '@heroui/divider'
import { Features } from '../components/landing/features'
import { Footer } from '../components/landing/footer'
import Hero from '../components/landing/hero'
import { HeroUIProvider } from '@heroui/react'
import { Example } from './landing/example'

const view = () => (
  <HeroUIProvider>
    <main className="flex flex-col min-h-dv p-4 sm:p-0 light">
      <Hero />

      <div className="flex justify-center items-center flex-col gap-24">
        <Divider />

        <Features />

        <Divider />

        <Example />
      </div>

      <Footer />
    </main>
  </HeroUIProvider>
)

export const Landing = () => view()

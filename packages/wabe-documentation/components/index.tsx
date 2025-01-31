import { Divider } from '@heroui/divider'
import { Features } from '../components/landing/features'
import { Footer } from '../components/landing/footer'
import Hero from '../components/landing/hero'
import { Presentation } from '../components/landing/presentation'
import { BlogHeader } from './blog/header'
import { ListBlogArticles } from './blog/listBlogArticles'
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

        <Presentation />

        <Divider />

        <div className="text-center text-gray-600 flex flex-col gap-1">
          <p>
            Wabe powered{' '}
            <strong>
              <a href="https://shipmysaas.com">ShipMySaaS</a>
            </strong>{' '}
            !
          </p>
          <p>
            Wabe is powered by{' '}
            <strong>
              <a href="https://bun.sh">Bun</a>
            </strong>{' '}
            !
          </p>
        </div>
      </div>

      <Footer />
    </main>
  </HeroUIProvider>
)

const view2 = () => (
  <main className="flex flex-col min-h-dv p-4 sm:p-0">
    <BlogHeader />

    <Divider />

    <ListBlogArticles />
  </main>
)

export const Landing = () => view()
export const Blog = () => view2()

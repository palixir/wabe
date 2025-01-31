const view = () => (
  <section id="presentation" className="w-full py-16">
    <div className="flex flex-col gap-12 mx-auto justify-center items-center max-w-7xl px-6">
      <div className="flex flex-col items-center gap-6 text-center">
        <h2 className="text-5xl font-extrabold">Hi, I'm Lucas! 👋</h2>

        <p className="text-lg text-gray-600 max-w-3xl">
          I’m a passionate software developer with over 5 years of experience in
          crafting scalable, high-quality applications. My career has spanned
          various projects, from building SaaS platforms serving 50,000+ monthly
          users to making meaningful contributions to open-source projects with
          60,000+ GitHub stars. I also enjoy creating my own open-source tools
          to help developers build faster and smarter. Here are some of my key
          achievements:
        </p>
      </div>

      {/* Liste des projets */}
      <div className="flex flex-col items-center gap-6 text-center">
        <ul className="list-inside space-y-4 text-left text-lg text-gray-500 max-w-4xl">
          <li className="flex items-start gap-4">
            <span className="text-xl font-semibold">🚀</span>
            <div>
              <strong>Wabe:</strong> An open-source Backend-as-a-Service (BaaS)
              written in TypeScript, featuring authentication, database
              management, payment integration, email services, file storage,
              GraphQL APIs, hooks, and more. This project includes over 37,000
              lines of code and years of dedication.
            </div>
          </li>
          <li className="flex items-start gap-4">
            <span className="text-xl font-semibold">⚡</span>
            <div>
              <strong>Wobe:</strong> A modern, developer-friendly web framework
              that serves as an alternative to Express.js, offering advanced
              features like plugins, middleware, and clean, modern interfaces.
            </div>
          </li>
          <li className="flex items-start gap-4">
            <span className="text-xl font-semibold">📦</span>
            <div>
              <strong>
                <a href="https://shipmysaas.com">ShipMySaaS:</a>
              </strong>{' '}
              A comprehensive SaaS boilerplate that combines my expertise and
              knowledge, enabling developers to build robust SaaS applications
              with tools like Next.js, Wabe, Stripe, and HeroUI (previously
              NextUI).
            </div>
          </li>
          <li className="flex items-start gap-4">
            <span className="text-xl font-semibold">🎉</span>
            <div>
              Contributions to renowned open-source projects, including{' '}
              <strong>Bun</strong>, <strong>Parse Server</strong>,{' '}
              <strong>Rspress</strong>, and others.
            </div>
          </li>
        </ul>

        <p className="text-lg text-gray-600 max-w-3xl">
          Feel free to check out my{' '}
          <a
            href="https://github.com/coratgerl"
            target="_blank"
            rel="noreferrer"
            className="text-blue-500 font-bold hover:underline"
          >
            GitHub profile here
          </a>{' '}
          for more projects and contributions!
        </p>
      </div>
    </div>
  </section>
)

export const Presentation = () => view()

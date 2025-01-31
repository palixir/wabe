const view = () => (
  <section id="hero">
    <div className="relative justify-center items-center">
      <div className="max-w-screen-xl mx-auto px-4 py-6 gap-12 md:px-8 flex flex-col justify-center items-center">
        <div className="flex flex-col gap-6 justify-center items-center max-w-5xl mx-auto text-center w-full">
          <h1 className="text-4xl font-medium tracking-tighter mx-auto md:text-6xl text-pretty ">
            Blog
          </h1>

          <p className="max-w-2xl text-lg mx-auto text-muted-foreground text-balance">
            Read the latest news and updates from the team.
          </p>
        </div>
      </div>
    </div>
  </section>
)

export const BlogHeader = () => view()

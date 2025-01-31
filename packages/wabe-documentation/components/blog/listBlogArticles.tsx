import { Card, CardHeader, Image, Link, User } from "@heroui/react"
import { computePublicPath } from '../utils'

const useController = () => {
  const articles: Array<{
    title?: string
    date: string
    author: string
    authorIcon: string
    authorJob: string
    articleLink: string
    backgroundImage: string
  }> = [
    {
      date: '12/01/2025',
      author: 'coratgerl',
      authorIcon:
        'https://pbs.twimg.com/profile_images/1872299095831851008/AbdVwJEJ_400x400.jpg',
      authorJob: 'Creator of ShipMySaaS and Wabe',
      articleLink: '/blog/articles/2',
      backgroundImage: computePublicPath('/assets/blogs/2.png'),
    },
    {
      date: '31/12/2024',
      author: 'coratgerl',
      authorIcon:
        'https://pbs.twimg.com/profile_images/1872299095831851008/AbdVwJEJ_400x400.jpg',
      authorJob: 'Creator of ShipMySaaS and Wabe',
      articleLink: '/blog/articles/1',
      backgroundImage: computePublicPath('/assets/blogs/1.png'),
    },
  ]

  return { articles }
}

const view = ({ articles }: ReturnType<typeof useController>) => (
  <section id="blog">
    <div className="relative justify-center items-center">
      <div className="max-w-screen-lg mx-auto px-4 py-12 gap-12 md:px-8 flex flex-col justify-center items-center">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {articles.map((article) => (
            <div key={article.title} className="flex flex-col gap-4">
              <Card as={Link} href={article.articleLink}>
                <CardHeader className="absolute z-10 top-1 flex-col !items-start">
                  <p className="text-tiny text-white/60 uppercase font-bold">
                    ShipMySaaS
                  </p>
                  <h4 className="text-white font-medium text-large">
                    {article.title && article.title}
                  </h4>
                </CardHeader>
                <Image
                  removeWrapper
                  alt="Card background"
                  className="z-0 w-full h-full object-cover"
                  src={article.backgroundImage}
                  width={600}
                  height={300}
                />
              </Card>

              <div className="flex flex-row justify-between">
                <User
                  avatarProps={{
                    src: article.authorIcon,
                    size: 'sm',
                  }}
                  description={article.authorJob}
                  name={article.author}
                />

                <p className="text-base text-gray-500 font-medium">
                  {article.date}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  </section>
)

export const ListBlogArticles = () => view(useController())

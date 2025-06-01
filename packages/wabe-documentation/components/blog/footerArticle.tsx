import { Card, CardBody } from "@heroui/react"
import { CallToAction } from '../landing/callToAction'

const view = () => (
  <>
    <div className="relative justify-center items-center">
      <div className="py-20">
        <Card>
          <CardBody className="py-8 flex flex-col gap-6 justify-center items-center text-center w-full ">
            <h1 className="text-2xl font-medium tracking-tighter mx-auto md:text-4xl text-pretty ">
              ShipMySaaS
            </h1>

            <p className="text-lg mx-auto text-muted-foreground text-balance">
              The SaaS boilerplate with NextJS focus on quality, efficiency and
              security to build powerful SaaS applications.
            </p>

            <CallToAction />
          </CardBody>
        </Card>
      </div>
    </div>
  </>
)

export const FooterArticle = () => view()

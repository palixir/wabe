import { Button } from '@heroui/button'
import { Link } from '@heroui/link'
import { Image } from '@heroui/image'

interface Props {
  fullWidth?: boolean
}

const view = ({ fullWidth }: Props) => (
  <Button
    as={Link}
    color="default"
    variant="bordered"
    href="https://github.com/palixir/wabe"
    fullWidth={fullWidth}
    size="lg"
    target="_blank"
    className="relative overflow-hidden px-8 py-4 rounded-xl shadow-md transition-transform transform hover:-translate-y-1 hover:scale-105 hover:shadow-lg focus:ring-2 focus:ring-blue-500"
    startContent={
      <Image src="/assets/github.svg" alt="Rocket" className="w-8 h-8" />
    }
  >
    Support us on GitHub
  </Button>
)

export const CallToAction = (props: Props) => view(props)

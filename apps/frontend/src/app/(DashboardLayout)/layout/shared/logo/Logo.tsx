import Link from 'next/link';

const Logo = () => {
  return (
    <Link href={'/'}>
      <span className="text-xl font-bold text-link dark:text-white">CA</span>
    </Link>
  )
}

export default Logo

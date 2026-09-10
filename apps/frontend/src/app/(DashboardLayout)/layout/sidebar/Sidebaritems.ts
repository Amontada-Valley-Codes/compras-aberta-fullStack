import { uniqueId } from 'lodash'

export interface MenuItem {
  id?: string
  heading?: string
  name?: string
  icon?: string
  url?: string
  children?: MenuItem[]
  disabled?: boolean
}

const item = (
  name: string,
  url: string,
  icon?: string,
): MenuItem => ({ id: uniqueId(), name, url, icon })

const SidebarContent: MenuItem[] = [
  {
    heading: 'Principal',
    children: [
      item('Dashboard', '/', 'solar:widget-add-line-duotone'),
      item('Perfil', '/user-profile', 'solar:user-circle-linear'),
      item('Página de exemplo', '/sample-page', 'solar:notes-minimalistic-outline'),
    ],
  },
  {
    heading: 'Interface',
    children: [
      item('Formulários', '/utilities/form', 'solar:document-add-linear'),
      item('Sombras', '/utilities/shadow', 'solar:layers-linear'),
      item('Tabelas', '/utilities/table', 'solar:table-2-linear'),
      item('Tipografia', '/utilities/typography', 'solar:text-field-focus-linear'),
      item('Ícones', '/icons/tabler', 'solar:sticker-smile-circle-outline'),
    ],
  },
  {
    heading: 'Conta',
    children: [
      item('Entrar', '/auth/login', 'solar:login-2-linear'),
    ],
  },
]

export default SidebarContent

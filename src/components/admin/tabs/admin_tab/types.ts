import type { WebProduct } from '../../../../types/types'

export interface PageContent {
  id?: string
  pageId: string
  title: string
  description?: string
  content: string
  lastUpdated: Date
  isActive: boolean
}

export interface SiteConfig {
  id?: string
  siteTitle: string
  siteDescription: string
  maintenanceMode: boolean
  contactEmail: string
}

export type FirestoreData = {
  [key: string]: any
}

export type AdminSection = 'products' | 'settings'

export type ProductFormProps = {
  product: WebProduct
  onChange: (product: WebProduct) => void
  onSave: () => void
  onCancel: () => void
  loading: boolean
}

export type ProductListProps = {
  products: WebProduct[]
  onEdit: (product: WebProduct) => void
  onDelete: (id: string) => void
  formatPrice: (price: number | undefined) => string
  search: string
  setSearch: (v: string) => void
}

export type PagesManagerProps = {
  pages: PageContent[]
  editingPage: PageContent | null
  setEditingPage: (page: PageContent | null) => void
  savePage: (page: PageContent) => Promise<void>
  loading: boolean
  getPageName: (pageId: string) => string
}

export type SiteSettingsProps = {
  config: SiteConfig
  onChange: (config: SiteConfig) => void
  onSave: () => void
  loading: boolean
}
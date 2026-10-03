import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, Pencil } from 'lucide-react'
import { useState } from 'react'

import { ErrorState } from '@/app/components/ErrorState'
import { LoadingSkeleton } from '@/app/components/LoadingSkeleton'
import { PageHeader } from '@/app/components/PageHeader'
import { Button } from '@/app/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card'
import { useProductQuery } from '@/app/hooks/queries/useInventoryQuery'
import { ProductFormSheet } from '@/app/screens/inventory/ProductFormSheet'
import { formatINR } from '@/app/utils'

export function ProductDetailScreen() {
  const { id } = useParams<{ id: string }>()
  const productQuery = useProductQuery(id)
  const [sheetOpen, setSheetOpen] = useState(false)

  if (productQuery.isLoading) return <LoadingSkeleton rows={4} />
  if (productQuery.isError || !productQuery.data) {
    return (
      <ErrorState
        error={productQuery.error}
        title="Product not found"
        onRetry={() => void productQuery.refetch()}
      />
    )
  }

  const product = productQuery.data

  return (
    <div className="min-w-0 space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Button asChild size="sm" variant="outline" className="h-8">
          <Link to="/inventory">
            <ArrowLeft className="size-4" strokeWidth={1.75} />
            Products
          </Link>
        </Button>
        <Button
          type="button"
          size="sm"
          className="h-8"
          onClick={() => setSheetOpen(true)}
        >
          <Pencil className="size-4" strokeWidth={1.75} />
          Edit
        </Button>
      </div>

      <PageHeader description="Catalog product · name and price." />

      <Card>
        <CardHeader className="pb-1">
          <CardTitle>{product.name}</CardTitle>
        </CardHeader>
        <CardContent className="text-sm">
          <p className="tabular-nums text-lg font-semibold">{formatINR(product.price)}</p>
        </CardContent>
      </Card>

      <ProductFormSheet open={sheetOpen} onOpenChange={setSheetOpen} product={product} />
    </div>
  )
}

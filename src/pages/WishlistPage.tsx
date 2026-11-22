import { Heart, ShoppingBag, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { SEED_PRODUCTS } from '../data/seedData';
import { useBag } from '../hooks/useBag';
import { useDocumentMeta } from '../hooks/useDocumentMeta';
import type { Product } from '../types';

export function WishlistPage() {
  const { wishlistIds, toggleWishlist, addToBag } = useBag();
  const [products, setProducts] = useState<Product[]>(SEED_PRODUCTS);
  const [selectedSizes, setSelectedSizes] = useState<Record<string, string>>({});

  useDocumentMeta({
    title: 'Saved Wishlist — Wicked',
    description: 'View your saved Wicked garments, select sizes, and add them directly to your shopping bag.',
  });

  useEffect(() => {
    import('../lib/staticStore').then(({ getStaticProducts, tryApiJson }) => {
      tryApiJson<{ products?: Product[] }>('/api/products').then((api) => {
        if (api.available && api.ok && api.data?.products) {
          setProducts(api.data.products);
        } else {
          setProducts(getStaticProducts());
        }
      });
    });
  }, []);

  const wishedProducts = products.filter((p) => wishlistIds.includes(p.id));
  const totalSavedValue = wishedProducts.reduce((sum, p) => sum + p.price, 0);

  const getDefaultSize = (product: Product): string => {
    if (selectedSizes[product.id]) return selectedSizes[product.id];
    const color = product.colors[0]?.name;
    const inStock = product.variants.find((v) => v.color === color && v.stock > 0);
    return inStock?.size || product.variants[0]?.size || 'M';
  };

  const handleAddSingle = (e: React.MouseEvent<HTMLButtonElement>, product: Product) => {
    const color = product.colors[0];
    const size = getDefaultSize(product);
    const variant = product.variants.find((v) => v.color === color.name && v.size === size);
    if (!variant || variant.stock <= 0) return;

    addToBag(
      {
        productId: product.id,
        slug: product.slug,
        name: product.name,
        category: product.category,
        color: color.name,
        size: variant.size,
        unitPrice: product.price + (color.priceDelta || 0),
        quantity: 1,
        image: color.images[0],
      },
      { sourceRect: e.currentTarget.getBoundingClientRect() }
    );
  };

  const handleMoveAllToBag = () => {
    wishedProducts.forEach((product, idx) => {
      const color = product.colors[0];
      const size = getDefaultSize(product);
      const variant = product.variants.find((v) => v.color === color.name && v.size === size);
      if (!variant || variant.stock <= 0) return;
      addToBag(
        {
          productId: product.id,
          slug: product.slug,
          name: product.name,
          category: product.category,
          color: color.name,
          size: variant.size,
          unitPrice: product.price + (color.priceDelta || 0),
          quantity: 1,
          image: color.images[0],
        },
        { openDrawer: idx === wishedProducts.length - 1 }
      );
    });
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-6 border-b border-[#C5D1B8] mb-8">
        <div>
          <p className="text-xs font-medium text-[#4D5A48]">
            Saved Pieces · <span className="tabular-nums">{wishedProducts.length}</span> garments
            {wishedProducts.length > 0 && (
              <>
                {' '}
                · Total Value <span className="tabular-nums">₹{totalSavedValue.toLocaleString('en-IN')}</span>
              </>
            )}
          </p>
          <h1 className="font-display text-3xl sm:text-4xl font-bold mt-1">Your Wishlist</h1>
        </div>

        {wishedProducts.length > 0 && (
          <button
            type="button"
            onClick={handleMoveAllToBag}
            className="px-5 py-2.5 rounded-md bg-[#9CAF88] text-[#1F2A1C] text-sm font-bold hover:bg-[#8EA379] transition-colors inline-flex items-center gap-2 self-start sm:self-auto"
          >
            <ShoppingBag className="w-4 h-4" />
            <span>Move All to Bag</span>
          </button>
        )}
      </div>

      {wishedProducts.length === 0 ? (
        <div className="py-16 px-6 text-center rounded-lg bg-[#FCFBF7] border border-[#C5D1B8] max-w-xl mx-auto">
          <Heart className="w-8 h-8 mx-auto text-[#1F2A1C] mb-3" />
          <h2 className="font-display text-2xl font-bold">Nothing saved yet</h2>
          <p className="text-sm text-[#4D5A48] mt-2">
            Tap the heart icon on any Wicked tee, kurta, hoodie, or bottom to keep your shortlist ready across sessions.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link
              to="/collections/all"
              className="px-6 py-3 rounded-md bg-[#9CAF88] text-[#1F2A1C] font-bold text-sm hover:bg-[#8EA379]"
            >
              Browse All Apparel
            </Link>
            <Link
              to="/showcase"
              className="px-6 py-3 rounded-md bg-[#F7F5EF] border border-[#C5D1B8] text-[#1F2A1C] font-semibold text-sm hover:bg-[#E7ECE0]"
            >
              Open Interactive Studio
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
          {wishedProducts.map((product) => {
            const activeColor = product.colors[0];
            const size = getDefaultSize(product);
            const sizesForColor = product.variants.filter((v) => v.color === activeColor.name);
            const activeVariant = sizesForColor.find((v) => v.size === size);
            const inStock = Boolean(activeVariant && activeVariant.stock > 0);

            return (
              <article
                key={product.id}
                className="bg-[#FCFBF7] border border-[#C5D1B8] rounded-lg overflow-hidden flex flex-col"
              >
                <div className="relative aspect-[3/4] bg-[#F7F5EF] overflow-hidden">
                  <Link to={`/product/${product.slug}`} className="block w-full h-full">
                    <img
                      src={activeColor.images[0]}
                      alt={product.name}
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  </Link>
                  <button
                    type="button"
                    onClick={() => toggleWishlist(product.id)}
                    aria-label={`Remove ${product.name} from wishlist`}
                    className="absolute top-3 right-3 w-10 h-10 rounded-full bg-[#F7F5EF]/90 border border-[#C5D1B8] flex items-center justify-center text-[#1F2A1C] hover:bg-[#9CAF88]"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="p-4 space-y-3 flex-1 flex flex-col justify-between">
                  <div>
                    <p className="text-xs text-[#4D5A48]">
                      {product.category} · {product.gsm} GSM · {activeColor.name}
                    </p>
                    <Link to={`/product/${product.slug}`} className="block mt-1">
                      <h2 className="font-display text-base font-bold text-[#1F2A1C] hover:underline">
                        {product.name}
                      </h2>
                    </Link>
                    <p className="text-sm font-bold tabular-nums mt-1">
                      ₹{(product.price + (activeColor.priceDelta || 0)).toLocaleString('en-IN')}
                    </p>
                  </div>

                  <div className="space-y-2.5 pt-2 border-t border-[#CFD9C3]">
                    <div className="flex items-center justify-between gap-2">
                      <label htmlFor={`wl-size-${product.id}`} className="text-xs font-semibold">
                        Size
                      </label>
                      <select
                        id={`wl-size-${product.id}`}
                        value={size}
                        onChange={(e) =>
                          setSelectedSizes((prev) => ({ ...prev, [product.id]: e.target.value }))
                        }
                        className="px-2.5 py-1.5 text-xs font-semibold bg-[#F7F5EF] border border-[#C5D1B8] rounded-md"
                      >
                        {sizesForColor.map((v) => (
                          <option key={v.sku} value={v.size} disabled={v.stock <= 0}>
                            {v.size} {v.stock <= 0 ? '(Out of stock)' : ''}
                          </option>
                        ))}
                      </select>
                    </div>

                    <button
                      type="button"
                      disabled={!inStock}
                      onClick={(e) => handleAddSingle(e, product)}
                      className="w-full py-2.5 px-4 rounded-md btn-tomato text-center"
                    >
                      Add to bag
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}

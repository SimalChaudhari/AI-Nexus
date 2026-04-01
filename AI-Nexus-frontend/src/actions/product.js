import { useState, useEffect } from 'react';
import { productService } from 'src/services/product.service';

// Product hooks
export function useGetProduct(productId) {
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!productId) {
      setLoading(false);
      return;
    }

    const fetchProduct = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await productService.getProductById(productId);
        setProduct(data);
      } catch (err) {
        setError(err.message || 'Failed to fetch product');
        console.error('Error fetching product:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchProduct();
  }, [productId]);

  return { product, productLoading: loading, productError: error };
}

export function useGetProducts() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setLoading(true);
        const data = await productService.getAllProducts();
        setProducts(data);
      } catch (err) {
        console.error('Error fetching products:', err);
        setProducts([]);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, []);

  return { products, productsLoading: loading };
}

export function useSearchProducts(query) {
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);

  useEffect(() => {
    if (!query || query.trim() === '') {
      setSearchResults([]);
      return;
    }

    const searchProducts = async () => {
      try {
        setSearchLoading(true);
        const allProducts = await productService.getAllProducts();
        const filtered = allProducts.filter((product) =>
          product.title?.toLowerCase().includes(query.toLowerCase())
        );
        setSearchResults(filtered);
      } catch (err) {
        console.error('Error searching products:', err);
        setSearchResults([]);
      } finally {
        setSearchLoading(false);
      }
    };

    searchProducts();
  }, [query]);

  return { searchResults, searchLoading };
}

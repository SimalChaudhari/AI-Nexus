import axios from 'src/utils/axios';

// Transform backend product data to frontend format
const transformProduct = (product) => ({
  id: product._id || product.id,
  title: product.title || '',
  description: product.description || '',
  actualPrice: product.actualPrice || 0,
  discountPrice: product.discountPrice || null,
  isSale: product.isSale || false,
  inStock: product.inStock || true,
  categories: product.categories || [],
  images: product.images || [],
  createdAt: product.createdAt || new Date(),
  updatedAt: product.updatedAt || new Date(),
});

export const productService = {
  async getAllProducts() {
    try {
      const response = await axios.get('/products');
      const products = response.data?.data || response.data || [];
      return products.map(transformProduct);
    } catch (error) {
      if (error?.response?.status === 404) {
        return [];
      }
      console.error('Error fetching products:', error);
      throw error;
    }
  },

  async getProductById(id) {
    try {
      const response = await axios.get(`/products/${id}`);
      const product = response.data?.data || response.data;
      return transformProduct(product);
    } catch (error) {
      console.error('Error fetching product:', error);
      throw error;
    }
  },

  async createProduct(productData) {
    try {
      const response = await axios.post('/products', productData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      const product = response.data?.data || response.data;
      return transformProduct(product);
    } catch (error) {
      console.error('Error creating product:', error);
      throw error;
    }
  },

  async updateProduct(id, productData) {
    try {
      const response = await axios.put(`/products/${id}`, productData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      const product = response.data?.data || response.data;
      return transformProduct(product);
    } catch (error) {
      console.error('Error updating product:', error);
      throw error;
    }
  },

  async deleteProduct(id) {
    try {
      const response = await axios.delete(`/products/${id}`);
      return response.data;
    } catch (error) {
      console.error('Error deleting product:', error);
      throw error;
    }
  },

  async addProductImages(productId, images) {
    try {
      const formData = new FormData();
      images.forEach((image) => {
        formData.append('images', image);
      });
      const response = await axios.post(`/products/${productId}/images`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data?.data || response.data;
    } catch (error) {
      console.error('Error adding product images:', error);
      throw error;
    }
  },

  async deleteProductImage(imageId) {
    try {
      const response = await axios.delete(`/products/images/${imageId}`);
      return response.data;
    } catch (error) {
      console.error('Error deleting product image:', error);
      throw error;
    }
  },
};


import { useState, useEffect } from 'react';
import { categoryService } from 'src/services/category.service';

export function useGetCategory(categoryId) {
  const [category, setCategory] = useState(null);
  const [categoryLoading, setCategoryLoading] = useState(true);
  const [categoryError, setCategoryError] = useState(null);

  useEffect(() => {
    if (!categoryId) {
      setCategoryLoading(false);
      return;
    }

    const fetchCategory = async () => {
      try {
        setCategoryLoading(true);
        setCategoryError(null);
        const data = await categoryService.getCategoryById(categoryId);
        setCategory(data);
      } catch (error) {
        setCategoryError(error?.message || 'Failed to fetch category');
        setCategory(null);
      } finally {
        setCategoryLoading(false);
      }
    };

    fetchCategory();
  }, [categoryId]);

  return { category, categoryLoading, categoryError };
}


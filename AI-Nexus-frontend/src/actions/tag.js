import { useState, useEffect } from 'react';
import { categoryService } from 'src/services/category.service';

export function useGetTag(categoryId) {
  const [tag, setTag] = useState(null);
  const [tagLoading, setTagLoading] = useState(true);
  const [tagError, setTagError] = useState(null);

  useEffect(() => {
    if (!categoryId) {
      setTagLoading(false);
      return;
    }

    const fetchCategory = async () => {
      try {
        setTagLoading(true);
        setTagError(null);
        const data = await categoryService.getCategoryById(categoryId);
        setTag(data);
      } catch (error) {
        setTagError(error?.message || 'Failed to fetch category');
        setTag(null);
      } finally {
        setTagLoading(false);
      }
    };

    fetchCategory();
  }, [categoryId]);

  return { tag, tagLoading, tagError };
}


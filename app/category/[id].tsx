import { useLocalSearchParams } from 'expo-router';

import { CategoryFormScreen } from '@/src/features/categories/category-form-screen';

export default function EditCategoryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const categoryId = Number(id);
  return <CategoryFormScreen categoryId={Number.isInteger(categoryId) ? categoryId : Number.NaN} />;
}

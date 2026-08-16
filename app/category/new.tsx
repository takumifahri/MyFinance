import { useLocalSearchParams } from 'expo-router';

import { CategoryFormScreen } from '@/src/features/categories/category-form-screen';

export default function NewCategoryScreen() {
  const { type } = useLocalSearchParams<{ type?: string }>();
  return <CategoryFormScreen initialType={type === 'income' ? 'income' : 'expense'} />;
}

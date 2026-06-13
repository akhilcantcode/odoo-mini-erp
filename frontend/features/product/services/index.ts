import { fetchApi } from '../../../services/api';
import { Product } from '../types';

export async function getProducts(): Promise<Product[]> {
  return fetchApi('/products');
}

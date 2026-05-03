import axios from 'axios';

export interface LoyverseItem {
  id: string;
  item_name: string;
  image_url: string | null;
  sku: string | null;
  handle: string | null;
}

export interface LoyverseResponse {
  items: LoyverseItem[];
  cursor?: string;
}

export const fetchAllLoyverseItems = async (token: string): Promise<LoyverseItem[]> => {
  let allItems: LoyverseItem[] = [];
  let cursor: string | undefined = undefined;
  
  try {
    do {
      const authHeader = token.startsWith('Bearer ') ? token : `Bearer ${token}`;
      const response = await axios.get<LoyverseResponse>('/api/loyverse/items', {
        headers: {
          'Authorization': authHeader
        },
        params: {
          cursor: cursor
        }
      });
      
      if (response.data.items) {
        allItems = [...allItems, ...response.data.items];
      }
      cursor = response.data.cursor;
    } while (cursor);
    
    return allItems;
  } catch (error) {
    console.error('Error fetching Loyverse items:', error);
    throw error;
  }
};

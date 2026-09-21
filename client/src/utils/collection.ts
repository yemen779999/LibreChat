import { InfiniteData, QueryClient } from '@tanstack/react-query';

/**
 * Optimized collection manipulation utilities for TanStack Query InfiniteData cache updates.
 * Replaces expensive JSON serialization (JSON.parse(JSON.stringify)) with shallow structural sharing
 * to avoid unnecessary garbage collection overhead and object allocations during cache updates.
 */

function getCollection<TData>(page: unknown, collectionName: string): TData[] {
  return ((page as Record<string, unknown>)?.[collectionName] as TData[]) || [];
}

export const addData = <TCollection, TData>(
  data: InfiniteData<TCollection>,
  collectionName: string,
  newData: TData,
  findIndex: (page: TCollection) => number,
): InfiniteData<TCollection> => {
  const { pageIndex, index } = findPage<TCollection>(data, findIndex);

  if (pageIndex !== -1 && index !== -1) {
    return updateData(data, collectionName, newData, findIndex);
  }

  if (!data?.pages || data.pages.length === 0) {
    return data;
  }

  const newPages = [...data.pages];
  const page0 = newPages[0];
  const collection = getCollection<TData>(page0, collectionName);

  const itemToAdd = {
    ...newData,
    updatedAt: new Date().toISOString(),
  };

  newPages[0] = {
    ...page0,
    [collectionName]: [itemToAdd, ...collection],
  };

  return {
    ...data,
    pages: newPages,
  };
};

export const getRecordByProperty = <TCollection, TData>(
  data: InfiniteData<TCollection>,
  collectionName: string,
  findProperty: (item: TData) => boolean,
): TData | undefined => {
  // Find the page and the index of the record in that page
  const { pageIndex, index } = findPage<TCollection>(data, (page) =>
    getCollection<TData>(page, collectionName).findIndex(findProperty),
  );

  // If found, return the record
  if (pageIndex !== -1 && index !== -1) {
    return getCollection<TData>(data.pages[pageIndex], collectionName)[index];
  }

  // Return undefined if the record is not found
  return undefined;
};

export function findPage<TData>(data: InfiniteData<TData>, findIndex: (page: TData) => number) {
  if (!data?.pages) {
    return { pageIndex: -1, index: -1 };
  }
  for (let pageIndex = 0; pageIndex < data.pages.length; pageIndex++) {
    const page = data.pages[pageIndex];
    const index = findIndex(page);
    if (index !== -1) {
      return { pageIndex, index };
    }
  }
  return { pageIndex: -1, index: -1 }; // Not found
}

export const updateData = <TCollection, TData>(
  data: InfiniteData<TCollection>,
  collectionName: string,
  updatedData: TData,
  findIndex: (page: TCollection) => number,
): InfiniteData<TCollection> => {
  const { pageIndex, index } = findPage<TCollection>(data, findIndex);

  if (pageIndex === -1 || index === -1 || !data?.pages || data.pages.length === 0) {
    return data;
  }

  const newPages = [...data.pages];
  const itemToUpdate = {
    ...updatedData,
    updatedAt: new Date().toISOString(),
  };

  if (pageIndex === 0) {
    const page0 = newPages[0];
    const collection = [...getCollection<TData>(page0, collectionName)];
    collection.splice(index, 1);
    collection.unshift(itemToUpdate);

    newPages[0] = {
      ...page0,
      [collectionName]: collection,
    };
  } else {
    const targetPage = newPages[pageIndex];
    const targetCollection = [...getCollection<TData>(targetPage, collectionName)];
    targetCollection.splice(index, 1);
    newPages[pageIndex] = {
      ...targetPage,
      [collectionName]: targetCollection,
    };

    const page0 = newPages[0];
    const page0Collection = [...getCollection<TData>(page0, collectionName)];
    page0Collection.unshift(itemToUpdate);
    newPages[0] = {
      ...page0,
      [collectionName]: page0Collection,
    };
  }

  return {
    ...data,
    pages: newPages,
  };
};

export const deleteData = <TCollection, TData>(
  data: TData,
  collectionName: string,
  findIndex: (page: TCollection) => number,
): TData => {
  const infiniteData = data as unknown as InfiniteData<TCollection>;
  if (!infiniteData?.pages) {
    return data;
  }

  const { pageIndex, index } = findPage<TCollection>(infiniteData, findIndex);

  if (pageIndex === -1 || index === -1) {
    return data;
  }

  const newPages = [...infiniteData.pages];
  const targetPage = newPages[pageIndex];
  const collection = [...getCollection<TData>(targetPage, collectionName)];
  collection.splice(index, 1);

  newPages[pageIndex] = {
    ...targetPage,
    [collectionName]: collection,
  };

  return {
    ...infiniteData,
    pages: newPages,
  } as unknown as TData;
};

/**
 * Normalize the data so that the number of data on each page is within pageSize
 */
export const normalizeData = <TCollection, TData>(
  data: InfiniteData<TCollection>,
  collectionName: string,
  pageSize: number,
  uniqueProperty?: keyof TData,
): InfiniteData<TCollection> => {
  if (!data?.pages || data.pages.length === 0) {
    return data;
  }

  const pageCount = data.pages.length;
  const pageParams = data.pageParams;

  // Combine all items of all pages into one array
  let collection = data.pages.flatMap((page) => getCollection<TData>(page, collectionName));

  if (collection.length === 0) {
    return data;
  }

  if (uniqueProperty) {
    const seen = new Set<unknown>();
    collection = collection.filter((item) => {
      const value = item[uniqueProperty];
      if (seen.has(value)) {
        return false;
      }
      seen.add(value);
      return true;
    });
  }

  // Create the restructured pages
  const restructuredPages = Array.from({ length: pageCount }, (_, i) => ({
    ...data.pages[i],
    [collectionName]: collection.slice(i * pageSize, (i + 1) * pageSize),
  })).filter((page) => getCollection<TData>(page, collectionName).length > 0);

  return {
    ...data,
    pageParams: pageParams.slice(0, restructuredPages.length),
    pages: restructuredPages,
  };
};

export const updateFields = <TCollection, TData>(
  data: InfiniteData<TCollection>,
  updatedItem: Partial<TData>,
  collectionName: string,
  identifierField: keyof TData,
  callback?: (newItem: TData) => void,
): InfiniteData<TCollection> => {
  if (!data?.pages || data.pages.length === 0) {
    return data;
  }

  const { pageIndex, index } = findPage<TCollection>(data, (page) =>
    getCollection<TData>(page, collectionName).findIndex(
      (item: TData) => item[identifierField] === updatedItem[identifierField],
    ),
  );

  if (pageIndex === -1 || index === -1) {
    return data;
  }

  const newPages = [...data.pages];

  if (pageIndex === 0) {
    const page0 = newPages[0];
    const collection = [...getCollection<TData>(page0, collectionName)];
    const oldItem = collection[index];
    const newItem = {
      ...oldItem,
      ...updatedItem,
      updatedAt: new Date().toISOString(),
    };
    if (callback) {
      callback(newItem);
    }
    collection.splice(index, 1);
    collection.unshift(newItem);

    newPages[0] = {
      ...page0,
      [collectionName]: collection,
    };
  } else {
    const targetPage = newPages[pageIndex];
    const targetCollection = [...getCollection<TData>(targetPage, collectionName)];
    const oldItem = targetCollection[index];
    const newItem = {
      ...oldItem,
      ...updatedItem,
      updatedAt: new Date().toISOString(),
    };
    if (callback) {
      callback(newItem);
    }
    targetCollection.splice(index, 1);
    newPages[pageIndex] = {
      ...targetPage,
      [collectionName]: targetCollection,
    };

    const page0 = newPages[0];
    const page0Collection = [...getCollection<TData>(page0, collectionName)];
    page0Collection.unshift(newItem);
    newPages[0] = {
      ...page0,
      [collectionName]: page0Collection,
    };
  }

  return {
    ...data,
    pages: newPages,
  };
};

export const updateFieldsInPlace = <TCollection, TData>(
  data: InfiniteData<TCollection>,
  updatedItem: Partial<TData>,
  collectionName: string,
  identifierField: keyof TData,
): InfiniteData<TCollection> => {
  const identifierValue = updatedItem[identifierField];
  if (identifierValue == null) {
    return data;
  }

  const { pageIndex, index } = findPage<TCollection>(data, (page) =>
    page[collectionName].findIndex((item: TData) => item[identifierField] === identifierValue),
  );

  if (pageIndex === -1 || index === -1) {
    return data;
  }

  const oldItem = data.pages[pageIndex][collectionName][index];
  const newItem = { ...oldItem, ...updatedItem };

  const newCollection = [...data.pages[pageIndex][collectionName]];
  newCollection[index] = newItem;

  const newPage = { ...data.pages[pageIndex], [collectionName]: newCollection };
  const newPages = [...data.pages];
  newPages[pageIndex] = newPage;

  return { ...data, pages: newPages };
};

type UpdateCacheListOptions<TData> = {
  queryClient: QueryClient;
  queryKey: unknown[];
  searchProperty: keyof TData;
  updateData: Partial<TData>;
  searchValue: unknown;
};

export function updateCacheList<TData>({
  queryClient,
  queryKey,
  searchProperty,
  updateData,
  searchValue,
}: UpdateCacheListOptions<TData>) {
  queryClient.setQueryData<TData[]>(queryKey, (oldData) => {
    if (!oldData) {
      return oldData;
    }

    return oldData.map((item) =>
      item[searchProperty] === searchValue ? { ...item, ...updateData } : item,
    );
  });
}

export function addToCacheList<TData>(
  queryClient: QueryClient,
  queryKey: unknown[],
  newItem: TData,
) {
  queryClient.setQueryData<TData[]>(queryKey, (oldData) => {
    if (!oldData) {
      return [newItem];
    }
    return [...oldData, newItem];
  });
}

export function removeFromCacheList<TData>(
  queryClient: QueryClient,
  queryKey: unknown[],
  searchProperty: keyof TData,
  searchValue: unknown,
) {
  queryClient.setQueryData<TData[]>(queryKey, (oldData) => {
    if (!oldData) {
      return oldData;
    }
    return oldData.filter((item) => item[searchProperty] !== searchValue);
  });
}

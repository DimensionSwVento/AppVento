"use client";

import { useCallback, useRef } from "react";

const CACHE_NAME = "vento-map-snapshots";

export function useCachedImage() {
  const urlRef = useRef<string | null>(null);

  // guarda un base64 data URI en Cache API y retorna una URL de objeto
  const saveToCache = useCallback(async (dataUri: string, key: string): Promise<string> => {
    // convertir data URI a blob
    const res = await fetch(dataUri);
    const blob = await res.blob();

    // guardar en Cache API
    const cache = await caches.open(CACHE_NAME);
    const cacheKey = `/${CACHE_NAME}/${key}`;
    await cache.put(cacheKey, new Response(blob, { headers: { "Content-Type": blob.type } }));

    // revocar URL anterior si existe
    if (urlRef.current) {
      URL.revokeObjectURL(urlRef.current);
    }

    // crear object URL para usar en <img src>
    const objectUrl = URL.createObjectURL(blob);
    urlRef.current = objectUrl;
    return objectUrl;
  }, []);

  // recupera una imagen del cache y retorna una URL de objeto
  const loadFromCache = useCallback(async (key: string): Promise<string | null> => {
    const cache = await caches.open(CACHE_NAME);
    const cacheKey = `/${CACHE_NAME}/${key}`;
    const response = await cache.match(cacheKey);
    if (!response) return null;

    const blob = await response.blob();
    if (urlRef.current) {
      URL.revokeObjectURL(urlRef.current);
    }
    const objectUrl = URL.createObjectURL(blob);
    urlRef.current = objectUrl;
    return objectUrl;
  }, []);

  // limpia la entrada del cache y revoca la URL
  const clearCache = useCallback(async (key: string) => {
    const cache = await caches.open(CACHE_NAME);
    await cache.delete(`/${CACHE_NAME}/${key}`);
    if (urlRef.current) {
      URL.revokeObjectURL(urlRef.current);
      urlRef.current = null;
    }
  }, []);

  return { saveToCache, loadFromCache, clearCache };
}

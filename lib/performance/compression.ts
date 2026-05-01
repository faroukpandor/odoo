/**
 * Compression Utilities
 * Reduces payload size for APIs and responses
 */

export function shouldCompress(data: any, threshold: number = 1024): boolean {
  const size = JSON.stringify(data).length
  return size > threshold
}

export function compressData(data: any): string {
  // For production, use gzip compression via middleware
  // This is a placeholder for client-side compression
  return JSON.stringify(data)
}

export function decompressData(compressed: string): any {
  return JSON.parse(compressed)
}

// Database query optimization hints
export const QUERY_OPTIMIZATION = {
  // Always select specific columns, not *
  selectSpecific: true,
  // Use pagination to limit results
  usePagination: true,
  // Cache frequently accessed data
  enableCaching: true,
  // Use indexes for filtering
  useIndexes: true,
  // Limit nested queries
  limitJoins: 3,
}

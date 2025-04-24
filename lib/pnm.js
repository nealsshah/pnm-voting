/**
 * Utility functions for PNM management
 */

/**
 * Generates a CSV template for PNM data
 * @returns {string} The CSV content with headers
 */
export function generateCsvTemplate() {
  // Header row
  const header = 'email,first_name,last_name,major,year,gpa'
  
  // Example row
  const exampleRow = 'example@university.edu,John,Doe,Computer Science,Junior,3.8'
  
  return `${header}\n${exampleRow}`
}

/**
 * Downloads a CSV template for PNM data
 */
export function downloadCsvTemplate() {
  const csvContent = generateCsvTemplate()
  const encodedUri = `data:text/csv;charset=utf-8,${encodeURIComponent(csvContent)}`
  
  const link = document.createElement('a')
  link.setAttribute('href', encodedUri)
  link.setAttribute('download', 'pnm_template.csv')
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

/**
 * Uploads a CSV file with PNM data
 * @param {File} file - The CSV file to upload
 * @returns {Promise<Object>} The response data
 */
export async function uploadPnmCsv(file) {
  if (!file) {
    throw new Error('No file provided')
  }
  
  const formData = new FormData()
  formData.append('file', file)
  
  const response = await fetch('/api/csv-import', {
    method: 'POST',
    body: formData,
  })
  
  if (!response.ok) {
    const errorData = await response.json()
    throw new Error(errorData.error || 'Failed to import CSV')
  }
  
  return response.json()
} 
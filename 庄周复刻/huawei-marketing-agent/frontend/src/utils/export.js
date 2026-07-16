/**
 * 导出功能工具函数
 */

/**
 * 导出 Markdown 文件
 * @param {string} content - Markdown 内容
 * @param {string} filename - 文件名
 */
export function exportMarkdown(content, filename = 'report.md') {
  const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

/**
 * 导出 PDF（使用 window.print 方式）
 * @param {string} elementId - 要打印的 DOM 元素 ID
 * @param {string} title - 打印标题
 */
export function exportPDF(elementId, title = '报告') {
  const element = document.getElementById(elementId)
  if (!element) {
    console.error('Element not found:', elementId)
    return
  }

  // 创建打印窗口
  const printWindow = window.open('', '_blank')
  if (!printWindow) {
    alert('请允许弹出窗口以导出 PDF')
    return
  }

  const htmlContent = element.innerHTML

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>${title}</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans SC", sans-serif;
          padding: 40px;
          max-width: 800px;
          margin: 0 auto;
          color: #333;
          line-height: 1.7;
        }
        h1 {
          font-size: 1.5rem;
          font-weight: 700;
          margin: 1rem 0 0.75rem;
          color: #333;
          border-bottom: 2px solid #CF0A2C;
          padding-bottom: 0.5rem;
        }
        h2 {
          font-size: 1.25rem;
          font-weight: 600;
          margin: 0.875rem 0 0.625rem;
          color: #333;
          border-bottom: 1px solid #E8E8E8;
          padding-bottom: 0.375rem;
        }
        h3 {
          font-size: 1.1rem;
          font-weight: 600;
          margin: 0.75rem 0 0.5rem;
          color: #333;
        }
        p { margin: 0.5rem 0; }
        ul, ol { margin: 0.5rem 0; padding-left: 1.5rem; }
        li { margin: 0.25rem 0; }
        table {
          width: 100%;
          border-collapse: collapse;
          margin: 0.75rem 0;
          font-size: 0.875rem;
        }
        th {
          background-color: #CF0A2C;
          color: white;
          padding: 0.625rem 0.75rem;
          text-align: left;
          font-weight: 600;
        }
        td {
          padding: 0.5rem 0.75rem;
          border-bottom: 1px solid #E8E8E8;
        }
        tr:nth-child(even) { background-color: #F5F5F5; }
        code {
          background-color: #F0F0F0;
          padding: 0.125rem 0.375rem;
          border-radius: 0.25rem;
          font-size: 0.875rem;
        }
        pre {
          background-color: #1E1E1E;
          color: #D4D4D4;
          padding: 1rem;
          border-radius: 0.5rem;
          overflow-x: auto;
        }
        blockquote {
          border-left: 4px solid #CF0A2C;
          margin: 0.75rem 0;
          padding: 0.5rem 1rem;
          background-color: #FFF1F0;
          border-radius: 0 0.375rem 0.375rem 0;
        }
        @media print {
          body { padding: 0; }
        }
      </style>
    </head>
    <body>
      ${htmlContent}
    </body>
    </html>
  `)

  printWindow.document.close()

  // 等待样式加载完成后打印
  setTimeout(() => {
    printWindow.print()
    // printWindow.close() // 用户手动关闭
  }, 500)
}

/**
 * 导出 JSON 文件
 * @param {object} data - JSON 数据
 * @param {string} filename - 文件名
 */
export function exportJSON(data, filename = 'data.json') {
  const content = JSON.stringify(data, null, 2)
  const blob = new Blob([content], { type: 'application/json;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

/**
 * 生成文件名（带时间戳）
 * @param {string} prefix - 文件名前缀
 * @param {string} extension - 文件扩展名
 * @returns {string}
 */
export function generateFilename(prefix = 'report', extension = 'md') {
  const now = new Date()
  const timestamp = now.toISOString().slice(0, 10)
  return `${prefix}_${timestamp}.${extension}`
}

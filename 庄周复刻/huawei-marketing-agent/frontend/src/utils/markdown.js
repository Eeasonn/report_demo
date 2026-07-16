import { marked } from 'marked'
import DOMPurify from 'dompurify'

// 配置 marked 选项
marked.setOptions({
  breaks: true,
  gfm: true,
  headerIds: false,
  mangle: false,
  sanitize: false
})

/**
 * 渲染 Markdown 为 HTML 字符串
 * @param {string} markdown - Markdown 文本
 * @returns {string} - 净化后的 HTML 字符串
 */
export function renderMarkdown(markdown) {
  if (!markdown) return ''
  try {
    const html = marked.parse(markdown)
    return DOMPurify.sanitize(html)
  } catch (error) {
    console.error('Markdown render error:', error)
    return DOMPurify.sanitize(markdown)
  }
}

/**
 * 渲染 Markdown 为 HTML 元素（用于插入到 DOM）
 * @param {string} markdown - Markdown 文本
 * @returns {string} - 净化后的 HTML
 */
export function markdownToHtml(markdown) {
  return renderMarkdown(markdown)
}

/**
 * 截断文本到指定长度
 * @param {string} text - 原始文本
 * @param {number} maxLength - 最大长度
 * @returns {string}
 */
export function truncateText(text, maxLength = 200) {
  if (!text || text.length <= maxLength) return text
  return text.slice(0, maxLength) + '...'
}

/**
 * 从 Markdown 中提取纯文本
 * @param {string} markdown - Markdown 文本
 * @returns {string}
 */
export function extractPlainText(markdown) {
  if (!markdown) return ''
  // 移除 Markdown 语法
  return markdown
    .replace(/#{1,6}\s/g, '')
    .replace(/\*\*/g, '')
    .replace(/\*/g, '')
    .replace(/`/g, '')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, '')
    .replace(/>\s/g, '')
    .replace(/\n+/g, ' ')
    .trim()
}

/**
 * 提取 Markdown 标题
 * @param {string} markdown - Markdown 文本
 * @returns {string|null}
 */
export function extractTitle(markdown) {
  if (!markdown) return null
  const match = markdown.match(/^#\s+(.+)$/m)
  return match ? match[1].trim() : null
}

/**
 * 获取 Markdown 预览（前 N 行）
 * @param {string} markdown - Markdown 文本
 * @param {number} lines - 行数
 * @returns {string}
 */
export function getMarkdownPreview(markdown, lines = 5) {
  if (!markdown) return ''
  const allLines = markdown.split('\n')
  const previewLines = allLines.slice(0, lines)
  return previewLines.join('\n')
}

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import MarkdownIt from 'markdown-it';
import hljs from 'highlight.js';
import 'highlight.js/styles/github-dark.css';

interface Props {
  content: string;
}

const props = defineProps<Props>();

// Initialize markdown-it with GitHub Flavored Markdown support
const md = new MarkdownIt({
  html: false, // Disable HTML for security
  linkify: true, // Auto-convert URLs to links
  typographer: true, // Enable smart quotes and other typographic replacements
  breaks: true, // Convert \n to <br>
  highlight: (str: string, lang: string) => {
    // Syntax highlighting with highlight.js
    if (lang && hljs.getLanguage(lang)) {
      try {
        const highlighted = hljs.highlight(str, { 
          language: lang,
          ignoreIllegals: true 
        }).value;
        return `<pre class="hljs"><code class="language-${lang}">${highlighted}</code></pre>`;
      } catch (err) {
        console.error('Highlight error:', err);
      }
    }
    // Fallback for unknown languages
    return `<pre class="hljs"><code>${md.utils.escapeHtml(str)}</code></pre>`;
  }
});

// Render markdown to HTML
const renderedHtml = computed(() => {
  try {
    return md.render(props.content);
  } catch (error) {
    console.error('Markdown rendering error:', error);
    return `<p>Error rendering markdown</p>`;
  }
});

// Handle copy code block
async function handleCopyCode(code: string) {
  try {
    await navigator.clipboard.writeText(code);
    // TODO: Show success notification
    console.log('Code copied to clipboard');
  } catch (error) {
    console.error('Failed to copy code:', error);
    // TODO: Show error notification
  }
}

// Handle insert to file
async function handleInsertToFile(code: string, language: string) {
  try {
    // TODO: Implement file insertion dialog
    // This will be implemented with file system integration
    console.log('Insert to file:', { code, language });
    alert('Insert to file feature will be implemented with file system integration');
  } catch (error) {
    console.error('Failed to insert to file:', error);
  }
}

// Add copy and insert buttons to code blocks after rendering
const contentRef = ref<HTMLElement | null>(null);

onMounted(() => {
  addCodeBlockButtons();
});

// Watch for content changes and re-add buttons
const observer = ref<MutationObserver | null>(null);

onMounted(() => {
  if (contentRef.value) {
    observer.value = new MutationObserver(() => {
      addCodeBlockButtons();
    });
    
    observer.value.observe(contentRef.value, {
      childList: true,
      subtree: true
    });
  }
});

function addCodeBlockButtons() {
  if (!contentRef.value) return;

  const codeBlocks = contentRef.value.querySelectorAll('pre.hljs');
  
  codeBlocks.forEach((block) => {
    // Skip if buttons already added
    if (block.querySelector('.code-block-actions')) return;

    const codeElement = block.querySelector('code');
    if (!codeElement) return;

    const code = codeElement.textContent || '';
    const languageMatch = codeElement.className.match(/language-(\w+)/);
    const language = languageMatch ? languageMatch[1] : 'text';

    // Create actions container
    const actionsDiv = document.createElement('div');
    actionsDiv.className = 'code-block-actions';

    // Create copy button
    const copyButton = document.createElement('button');
    copyButton.className = 'code-action-btn';
    copyButton.title = 'Copy code';
    copyButton.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
      </svg>
      <span>Copy</span>
    `;
    copyButton.addEventListener('click', () => handleCopyCode(code));

    // Create insert to file button
    const insertButton = document.createElement('button');
    insertButton.className = 'code-action-btn';
    insertButton.title = 'Insert to file';
    insertButton.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
        <polyline points="14 2 14 8 20 8"/>
        <line x1="12" y1="18" x2="12" y2="12"/>
        <line x1="9" y1="15" x2="15" y2="15"/>
      </svg>
      <span>Insert to File</span>
    `;
    insertButton.addEventListener('click', () => handleInsertToFile(code, language));

    // Add language label
    const languageLabel = document.createElement('span');
    languageLabel.className = 'code-language-label';
    languageLabel.textContent = language;

    // Append buttons to actions container
    actionsDiv.appendChild(languageLabel);
    actionsDiv.appendChild(copyButton);
    actionsDiv.appendChild(insertButton);

    // Insert actions at the top of the code block
    block.style.position = 'relative';
    block.insertBefore(actionsDiv, block.firstChild);
  });
}
</script>

<template>
  <div 
    ref="contentRef"
    class="markdown-renderer" 
    v-html="renderedHtml"
  />
</template>

<style scoped>
.markdown-renderer {
  font-size: 14px;
  line-height: 1.6;
  color: #111827;
}

.dark .markdown-renderer {
  color: #f9fafb;
}

/* Typography */
.markdown-renderer :deep(h1),
.markdown-renderer :deep(h2),
.markdown-renderer :deep(h3),
.markdown-renderer :deep(h4),
.markdown-renderer :deep(h5),
.markdown-renderer :deep(h6) {
  margin-top: 24px;
  margin-bottom: 16px;
  font-weight: 600;
  line-height: 1.25;
  color: #111827;
}

.dark .markdown-renderer :deep(h1),
.dark .markdown-renderer :deep(h2),
.dark .markdown-renderer :deep(h3),
.dark .markdown-renderer :deep(h4),
.dark .markdown-renderer :deep(h5),
.dark .markdown-renderer :deep(h6) {
  color: #f9fafb;
}

.markdown-renderer :deep(h1) {
  font-size: 2em;
  border-bottom: 1px solid #e5e7eb;
  padding-bottom: 0.3em;
}

.dark .markdown-renderer :deep(h1) {
  border-bottom-color: #374151;
}

.markdown-renderer :deep(h2) {
  font-size: 1.5em;
  border-bottom: 1px solid #e5e7eb;
  padding-bottom: 0.3em;
}

.dark .markdown-renderer :deep(h2) {
  border-bottom-color: #374151;
}

.markdown-renderer :deep(h3) {
  font-size: 1.25em;
}

.markdown-renderer :deep(h4) {
  font-size: 1em;
}

.markdown-renderer :deep(h5) {
  font-size: 0.875em;
}

.markdown-renderer :deep(h6) {
  font-size: 0.85em;
  color: #6b7280;
}

.dark .markdown-renderer :deep(h6) {
  color: #9ca3af;
}

/* Paragraphs */
.markdown-renderer :deep(p) {
  margin-top: 0;
  margin-bottom: 16px;
}

/* Links */
.markdown-renderer :deep(a) {
  color: #2563eb;
  text-decoration: none;
}

.markdown-renderer :deep(a:hover) {
  text-decoration: underline;
}

.dark .markdown-renderer :deep(a) {
  color: #60a5fa;
}

/* Lists */
.markdown-renderer :deep(ul),
.markdown-renderer :deep(ol) {
  margin-top: 0;
  margin-bottom: 16px;
  padding-left: 2em;
}

.markdown-renderer :deep(li) {
  margin-bottom: 4px;
}

.markdown-renderer :deep(li > p) {
  margin-bottom: 8px;
}

/* Inline code */
.markdown-renderer :deep(code:not(.hljs code)) {
  padding: 0.2em 0.4em;
  margin: 0;
  font-size: 85%;
  background-color: rgba(175, 184, 193, 0.2);
  border-radius: 6px;
  font-family: ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Consolas, 'Liberation Mono', monospace;
}

.dark .markdown-renderer :deep(code:not(.hljs code)) {
  background-color: rgba(110, 118, 129, 0.4);
}

/* Code blocks */
.markdown-renderer :deep(pre.hljs) {
  position: relative;
  padding: 16px;
  padding-top: 48px;
  margin-bottom: 16px;
  overflow: auto;
  font-size: 85%;
  line-height: 1.45;
  background-color: #0d1117;
  border-radius: 6px;
}

.markdown-renderer :deep(pre.hljs code) {
  display: block;
  padding: 0;
  margin: 0;
  overflow: visible;
  line-height: inherit;
  word-wrap: normal;
  background-color: transparent;
  border: 0;
  font-family: ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Consolas, 'Liberation Mono', monospace;
}

/* Code block actions */
.markdown-renderer :deep(.code-block-actions) {
  position: absolute;
  top: 8px;
  right: 8px;
  left: 8px;
  display: flex;
  align-items: center;
  gap: 8px;
  z-index: 1;
}

.markdown-renderer :deep(.code-language-label) {
  flex: 1;
  font-size: 12px;
  font-weight: 600;
  color: #8b949e;
  text-transform: uppercase;
  font-family: ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Consolas, 'Liberation Mono', monospace;
}

.markdown-renderer :deep(.code-action-btn) {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  border: 1px solid #30363d;
  background: #161b22;
  color: #c9d1d9;
  font-size: 12px;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
}

.markdown-renderer :deep(.code-action-btn:hover) {
  background: #21262d;
  border-color: #8b949e;
}

.markdown-renderer :deep(.code-action-btn svg) {
  flex-shrink: 0;
}

/* Blockquotes */
.markdown-renderer :deep(blockquote) {
  margin: 0 0 16px 0;
  padding: 0 1em;
  color: #6b7280;
  border-left: 0.25em solid #d1d5db;
}

.dark .markdown-renderer :deep(blockquote) {
  color: #9ca3af;
  border-left-color: #4b5563;
}

/* Tables */
.markdown-renderer :deep(table) {
  border-spacing: 0;
  border-collapse: collapse;
  margin-bottom: 16px;
  width: 100%;
  overflow: auto;
}

.markdown-renderer :deep(table th),
.markdown-renderer :deep(table td) {
  padding: 6px 13px;
  border: 1px solid #d1d5db;
}

.dark .markdown-renderer :deep(table th),
.dark .markdown-renderer :deep(table td) {
  border-color: #374151;
}

.markdown-renderer :deep(table th) {
  font-weight: 600;
  background-color: #f3f4f6;
}

.dark .markdown-renderer :deep(table th) {
  background-color: #1f2937;
}

.markdown-renderer :deep(table tr) {
  background-color: white;
  border-top: 1px solid #d1d5db;
}

.dark .markdown-renderer :deep(table tr) {
  background-color: #111827;
  border-top-color: #374151;
}

.markdown-renderer :deep(table tr:nth-child(2n)) {
  background-color: #f9fafb;
}

.dark .markdown-renderer :deep(table tr:nth-child(2n)) {
  background-color: #1f2937;
}

/* Horizontal rule */
.markdown-renderer :deep(hr) {
  height: 0.25em;
  padding: 0;
  margin: 24px 0;
  background-color: #e5e7eb;
  border: 0;
}

.dark .markdown-renderer :deep(hr) {
  background-color: #374151;
}

/* Images */
.markdown-renderer :deep(img) {
  max-width: 100%;
  height: auto;
  border-radius: 6px;
}

/* Task lists */
.markdown-renderer :deep(input[type="checkbox"]) {
  margin-right: 0.5em;
}

/* Scrollbar for code blocks */
.markdown-renderer :deep(pre.hljs::-webkit-scrollbar) {
  height: 8px;
}

.markdown-renderer :deep(pre.hljs::-webkit-scrollbar-track) {
  background: #0d1117;
}

.markdown-renderer :deep(pre.hljs::-webkit-scrollbar-thumb) {
  background: #30363d;
  border-radius: 4px;
}

.markdown-renderer :deep(pre.hljs::-webkit-scrollbar-thumb:hover) {
  background: #484f58;
}
</style>

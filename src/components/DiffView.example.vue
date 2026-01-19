<script setup lang="ts">
import { ref } from 'vue';
import DiffView from './DiffView.vue';

// Example 1: Modified file
const example1Original = `function calculateSum(a, b) {
  return a + b;
}

console.log(calculateSum(1, 2));`;

const example1Modified = `function calculateSum(a, b) {
  // Added input validation
  if (typeof a !== 'number' || typeof b !== 'number') {
    throw new Error('Both arguments must be numbers');
  }
  return a + b;
}

// Added test cases
console.log(calculateSum(1, 2)); // 3
console.log(calculateSum(5, 10)); // 15`;

// Example 2: Created file
const example2Original = '';
const example2Modified = `export interface User {
  id: string;
  name: string;
  email: string;
  createdAt: Date;
}`;

// Example 3: Deleted file
const example3Original = `// This file is no longer needed
const deprecatedFunction = () => {
  console.log('deprecated');
};`;
const example3Modified = '';

// View mode toggle
const viewMode = ref<'side-by-side' | 'unified'>('side-by-side');

// Event handlers
function handleApprove(exampleName: string) {
  console.log(`Approved changes for ${exampleName}`);
  alert(`Changes approved for ${exampleName}`);
}

function handleReject(exampleName: string) {
  console.log(`Rejected changes for ${exampleName}`);
  alert(`Changes rejected for ${exampleName}`);
}

function handleEdit(exampleName: string, content: string) {
  console.log(`Edited content for ${exampleName}:`, content);
  alert(`Changes edited and saved for ${exampleName}`);
}
</script>

<template>
  <div class="example-container">
    <h1 class="title">DiffView Component Examples</h1>
    
    <!-- View Mode Toggle -->
    <div class="view-mode-toggle">
      <label class="toggle-label">View Mode:</label>
      <button
        @click="viewMode = 'side-by-side'"
        :class="['toggle-btn', { active: viewMode === 'side-by-side' }]"
      >
        Side-by-Side
      </button>
      <button
        @click="viewMode = 'unified'"
        :class="['toggle-btn', { active: viewMode === 'unified' }]"
      >
        Unified
      </button>
    </div>

    <!-- Example 1: Modified File -->
    <section class="example-section">
      <h2 class="section-title">Example 1: Modified File</h2>
      <p class="section-description">
        Shows a file that has been modified with added comments and test cases.
      </p>
      <DiffView
        file-path="src/utils/calculator.js"
        :original-content="example1Original"
        :modified-content="example1Modified"
        :mode="viewMode"
        change-type="modify"
        @approve="handleApprove('Example 1')"
        @reject="handleReject('Example 1')"
        @edit="(content) => handleEdit('Example 1', content)"
      />
    </section>

    <!-- Example 2: Created File -->
    <section class="example-section">
      <h2 class="section-title">Example 2: Created File</h2>
      <p class="section-description">
        Shows a newly created file with TypeScript interface definition.
      </p>
      <DiffView
        file-path="src/types/User.ts"
        :original-content="example2Original"
        :modified-content="example2Modified"
        :mode="viewMode"
        change-type="create"
        @approve="handleApprove('Example 2')"
        @reject="handleReject('Example 2')"
        @edit="(content) => handleEdit('Example 2', content)"
      />
    </section>

    <!-- Example 3: Deleted File -->
    <section class="example-section">
      <h2 class="section-title">Example 3: Deleted File</h2>
      <p class="section-description">
        Shows a file that is being deleted.
      </p>
      <DiffView
        file-path="src/deprecated/oldFunction.js"
        :original-content="example3Original"
        :modified-content="example3Modified"
        :mode="viewMode"
        change-type="delete"
        @approve="handleApprove('Example 3')"
        @reject="handleReject('Example 3')"
        @edit="(content) => handleEdit('Example 3', content)"
      />
    </section>

    <!-- Usage Instructions -->
    <section class="usage-section">
      <h2 class="section-title">Usage</h2>
      <pre class="code-block"><code>&lt;script setup lang="ts"&gt;
import DiffView from './DiffView.vue';

const originalContent = 'const x = 1;';
const modifiedContent = 'const x = 2;';

function handleApprove() {
  // Apply the changes to the file system
  console.log('Changes approved');
}

function handleReject() {
  // Discard the changes
  console.log('Changes rejected');
}

function handleEdit(content: string) {
  // Save the edited content
  console.log('Edited content:', content);
}
&lt;/script&gt;

&lt;template&gt;
  &lt;DiffView
    file-path="src/example.ts"
    :original-content="originalContent"
    :modified-content="modifiedContent"
    mode="side-by-side"
    change-type="modify"
    @approve="handleApprove"
    @reject="handleReject"
    @edit="handleEdit"
  /&gt;
&lt;/template&gt;</code></pre>
    </section>

    <!-- Props Documentation -->
    <section class="props-section">
      <h2 class="section-title">Props</h2>
      <table class="props-table">
        <thead>
          <tr>
            <th>Prop</th>
            <th>Type</th>
            <th>Default</th>
            <th>Description</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><code>filePath</code></td>
            <td><code>string</code></td>
            <td>required</td>
            <td>The path of the file being compared</td>
          </tr>
          <tr>
            <td><code>originalContent</code></td>
            <td><code>string</code></td>
            <td>required</td>
            <td>The original file content</td>
          </tr>
          <tr>
            <td><code>modifiedContent</code></td>
            <td><code>string</code></td>
            <td>required</td>
            <td>The modified file content</td>
          </tr>
          <tr>
            <td><code>mode</code></td>
            <td><code>'side-by-side' | 'unified'</code></td>
            <td><code>'side-by-side'</code></td>
            <td>The diff view mode</td>
          </tr>
          <tr>
            <td><code>changeType</code></td>
            <td><code>'create' | 'modify' | 'delete'</code></td>
            <td><code>'modify'</code></td>
            <td>The type of change being made</td>
          </tr>
        </tbody>
      </table>
    </section>

    <!-- Events Documentation -->
    <section class="events-section">
      <h2 class="section-title">Events</h2>
      <table class="props-table">
        <thead>
          <tr>
            <th>Event</th>
            <th>Payload</th>
            <th>Description</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><code>approve</code></td>
            <td>none</td>
            <td>Emitted when the user approves the changes</td>
          </tr>
          <tr>
            <td><code>reject</code></td>
            <td>none</td>
            <td>Emitted when the user rejects the changes</td>
          </tr>
          <tr>
            <td><code>edit</code></td>
            <td><code>content: string</code></td>
            <td>Emitted when the user edits and saves the content</td>
          </tr>
        </tbody>
      </table>
    </section>
  </div>
</template>

<style scoped>
.example-container {
  max-width: 1400px;
  margin: 0 auto;
  padding: 32px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
}

.title {
  font-size: 32px;
  font-weight: 700;
  margin-bottom: 24px;
  color: #111827;
}

.dark .title {
  color: #f9fafb;
}

.view-mode-toggle {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 32px;
  padding: 16px;
  background: #f9fafb;
  border-radius: 8px;
}

.dark .view-mode-toggle {
  background: #1f2937;
}

.toggle-label {
  font-weight: 600;
  color: #374151;
}

.dark .toggle-label {
  color: #d1d5db;
}

.toggle-btn {
  padding: 8px 16px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  background: white;
  color: #374151;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.dark .toggle-btn {
  border-color: #4b5563;
  background: #374151;
  color: #f9fafb;
}

.toggle-btn:hover {
  background: #f3f4f6;
  border-color: #9ca3af;
}

.dark .toggle-btn:hover {
  background: #4b5563;
  border-color: #6b7280;
}

.toggle-btn.active {
  background: #3b82f6;
  border-color: #3b82f6;
  color: white;
}

.dark .toggle-btn.active {
  background: #2563eb;
  border-color: #2563eb;
}

.example-section,
.usage-section,
.props-section,
.events-section {
  margin-bottom: 48px;
}

.section-title {
  font-size: 24px;
  font-weight: 600;
  margin-bottom: 12px;
  color: #111827;
}

.dark .section-title {
  color: #f9fafb;
}

.section-description {
  margin-bottom: 16px;
  color: #6b7280;
  line-height: 1.6;
}

.dark .section-description {
  color: #9ca3af;
}

.code-block {
  padding: 16px;
  background: #1f2937;
  border-radius: 8px;
  overflow-x: auto;
  font-family: ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Consolas, 'Liberation Mono', monospace;
  font-size: 14px;
  line-height: 1.6;
}

.code-block code {
  color: #e5e7eb;
}

.props-table {
  width: 100%;
  border-collapse: collapse;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  overflow: hidden;
}

.dark .props-table {
  border-color: #374151;
}

.props-table th,
.props-table td {
  padding: 12px;
  text-align: left;
  border-bottom: 1px solid #e5e7eb;
}

.dark .props-table th,
.dark .props-table td {
  border-bottom-color: #374151;
}

.props-table th {
  background: #f9fafb;
  font-weight: 600;
  color: #111827;
}

.dark .props-table th {
  background: #1f2937;
  color: #f9fafb;
}

.props-table td {
  color: #374151;
}

.dark .props-table td {
  color: #d1d5db;
}

.props-table code {
  padding: 2px 6px;
  background: #f3f4f6;
  border-radius: 4px;
  font-family: ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Consolas, 'Liberation Mono', monospace;
  font-size: 13px;
  color: #dc2626;
}

.dark .props-table code {
  background: #374151;
  color: #fca5a5;
}

.props-table tbody tr:last-child td {
  border-bottom: none;
}
</style>

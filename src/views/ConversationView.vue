<script setup lang="ts">
import { ref, computed, watch, nextTick, onMounted } from 'vue';
import { useSessionStore } from '@/stores/session';
import { useProjectStore } from '@/stores/project';
import MarkdownRenderer from '@/components/MarkdownRenderer.vue';

const sessionStore = useSessionStore();
const projectStore = useProjectStore();

const messageInput = ref('');
const messagesContainer = ref<HTMLElement | null>(null);
const isSending = ref(false);

// Computed properties
const currentSession = computed(() => sessionStore.currentSession);
const currentConversation = computed(() => sessionStore.currentConversation);
const sessionTabs = computed(() => sessionStore.sessionList);

// Auto-scroll to bottom when new messages arrive
watch(() => currentConversation.value?.messages.length, async () => {
  await nextTick();
  scrollToBottom();
});

// Scroll to bottom helper
function scrollToBottom() {
  if (messagesContainer.value) {
    messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight;
  }
}

// Handle send message
async function handleSendMessage() {
  if (!messageInput.value.trim() || !currentSession.value || isSending.value) {
    return;
  }

  const content = messageInput.value.trim();
  messageInput.value = '';
  isSending.value = true;

  try {
    // Add user message
    await sessionStore.addMessage(currentSession.value.id, {
      role: 'user',
      content,
    });

    // TODO: In future tasks, this will call the AI CLI adapter
    // For now, just add a placeholder assistant response
    await sessionStore.addMessage(currentSession.value.id, {
      role: 'assistant',
      content: 'AI response will be implemented in task 11.3',
    });
  } catch (error) {
    console.error('Failed to send message:', error);
    // TODO: Show error notification
  } finally {
    isSending.value = false;
  }
}

// Handle session tab click
function handleTabClick(sessionId: string) {
  sessionStore.setCurrentSession(sessionId);
}

// Handle create new session
async function handleCreateSession() {
  if (!projectStore.currentProject) {
    // TODO: Show notification to open a project first
    console.warn('Please open a project first');
    return;
  }

  try {
    // For now, use a placeholder runtime ID
    // TODO: In future tasks, this will use the selected runtime from RuntimeStore
    await sessionStore.createSession(projectStore.currentProject.id, 'placeholder-runtime');
  } catch (error) {
    console.error('Failed to create session:', error);
    // TODO: Show error notification
  }
}

// Handle close session tab
async function handleCloseTab(sessionId: string, event: Event) {
  event.stopPropagation();
  
  if (confirm('Are you sure you want to close this session?')) {
    try {
      await sessionStore.deleteSession(sessionId);
    } catch (error) {
      console.error('Failed to close session:', error);
      // TODO: Show error notification
    }
  }
}

// Format timestamp
function formatTime(timestamp: number): string {
  const date = new Date(timestamp);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  
  if (isToday) {
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  }
  
  return date.toLocaleString('en-US', { 
    month: 'short', 
    day: 'numeric',
    hour: '2-digit', 
    minute: '2-digit' 
  });
}

// Get role display name
function getRoleDisplay(role: string): string {
  switch (role) {
    case 'user':
      return 'You';
    case 'assistant':
      return 'AI';
    case 'system':
      return 'System';
    default:
      return role;
  }
}

// Handle keyboard shortcuts
function handleKeyDown(event: KeyboardEvent) {
  // Send message on Enter (without Shift)
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault();
    handleSendMessage();
  }
}

// Initialize
onMounted(async () => {
  try {
    await sessionStore.loadSessions();
  } catch (error) {
    console.error('Failed to load sessions:', error);
  }
});
</script>

<template>
  <div class="conversation-view">
    <!-- Session Tabs Navigation -->
    <div class="session-tabs">
      <div class="tabs-container">
        <button
          v-for="session in sessionTabs"
          :key="session.id"
          :class="['tab', { active: currentSession?.id === session.id }]"
          @click="handleTabClick(session.id)"
        >
          <span class="tab-title">{{ session.title }}</span>
          <button
            class="tab-close"
            @click="(e) => handleCloseTab(session.id, e)"
            title="Close session"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </button>
        
        <button class="tab-new" @click="handleCreateSession" title="New session">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="12" y1="5" x2="12" y2="19"/>
            <line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
        </button>
      </div>
    </div>

    <!-- No Session State -->
    <div v-if="!currentSession" class="no-session-state">
      <div class="no-session-content">
        <div class="no-session-icon">
          <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
          </svg>
        </div>
        <h2 class="no-session-title">No Active Session</h2>
        <p class="no-session-description">
          Create a new session to start a conversation with AI
        </p>
        <button class="btn-create-session" @click="handleCreateSession">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="12" y1="5" x2="12" y2="19"/>
            <line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          <span>New Session</span>
        </button>
      </div>
    </div>

    <!-- Conversation Content -->
    <div v-else class="conversation-content">
      <!-- Messages List -->
      <div ref="messagesContainer" class="messages-container">
        <div v-if="!currentConversation?.messages.length" class="empty-conversation">
          <p>Start a conversation by sending a message below</p>
        </div>

        <div
          v-for="message in currentConversation?.messages"
          :key="message.id"
          :class="['message', `message-${message.role}`]"
        >
          <div class="message-header">
            <span class="message-role">{{ getRoleDisplay(message.role) }}</span>
            <span class="message-time">{{ formatTime(message.timestamp) }}</span>
          </div>
          <div class="message-content">
            <MarkdownRenderer 
              v-if="message.role === 'assistant' || message.role === 'system'"
              :content="message.content"
            />
            <div v-else class="message-text">
              {{ message.content }}
            </div>
          </div>
        </div>
      </div>

      <!-- Message Input -->
      <div class="message-input-container">
        <div class="input-wrapper">
          <textarea
            v-model="messageInput"
            class="message-input"
            placeholder="Type your message... (Enter to send, Shift+Enter for new line)"
            rows="3"
            :disabled="isSending"
            @keydown="handleKeyDown"
          />
          <button
            class="btn-send"
            :disabled="!messageInput.trim() || isSending"
            @click="handleSendMessage"
            title="Send message"
          >
            <svg v-if="!isSending" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="22" y1="2" x2="11" y2="13"/>
              <polygon points="22 2 15 22 11 13 2 9 22 2"/>
            </svg>
            <div v-else class="spinner-small"></div>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.conversation-view {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: #f9fafb;
}

.dark .conversation-view {
  background: #111827;
}

/* Session Tabs */
.session-tabs {
  background: white;
  border-bottom: 1px solid #e5e7eb;
  overflow-x: auto;
  flex-shrink: 0;
}

.dark .session-tabs {
  background: #1f2937;
  border-bottom-color: #374151;
}

.tabs-container {
  display: flex;
  align-items: center;
  min-height: 48px;
  padding: 0 8px;
  gap: 4px;
}

.tab {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border: none;
  background: transparent;
  color: #6b7280;
  font-size: 14px;
  cursor: pointer;
  border-radius: 6px;
  transition: all 0.2s;
  white-space: nowrap;
  position: relative;
}

.tab:hover {
  background: #f3f4f6;
  color: #111827;
}

.dark .tab {
  color: #9ca3af;
}

.dark .tab:hover {
  background: #374151;
  color: #f9fafb;
}

.tab.active {
  background: #eff6ff;
  color: #2563eb;
  font-weight: 500;
}

.dark .tab.active {
  background: #1e3a8a;
  color: #93c5fd;
}

.tab-title {
  max-width: 150px;
  overflow: hidden;
  text-overflow: ellipsis;
}

.tab-close {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2px;
  border: none;
  background: transparent;
  color: inherit;
  cursor: pointer;
  border-radius: 3px;
  opacity: 0.6;
  transition: all 0.2s;
}

.tab-close:hover {
  opacity: 1;
  background: rgba(0, 0, 0, 0.1);
}

.dark .tab-close:hover {
  background: rgba(255, 255, 255, 0.1);
}

.tab-new {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 8px;
  border: none;
  background: transparent;
  color: #6b7280;
  cursor: pointer;
  border-radius: 6px;
  transition: all 0.2s;
  margin-left: 4px;
}

.tab-new:hover {
  background: #f3f4f6;
  color: #2563eb;
}

.dark .tab-new {
  color: #9ca3af;
}

.dark .tab-new:hover {
  background: #374151;
  color: #60a5fa;
}

/* No Session State */
.no-session-state {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 48px;
}

.no-session-content {
  max-width: 400px;
  text-align: center;
}

.no-session-icon {
  display: flex;
  justify-content: center;
  margin-bottom: 24px;
  color: #9ca3af;
}

.dark .no-session-icon {
  color: #6b7280;
}

.no-session-title {
  font-size: 24px;
  font-weight: 600;
  color: #111827;
  margin: 0 0 12px 0;
}

.dark .no-session-title {
  color: #f9fafb;
}

.no-session-description {
  font-size: 14px;
  color: #6b7280;
  margin: 0 0 32px 0;
}

.dark .no-session-description {
  color: #9ca3af;
}

.btn-create-session {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 12px 24px;
  border: none;
  background: #2563eb;
  color: white;
  font-size: 14px;
  font-weight: 500;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-create-session:hover {
  background: #1d4ed8;
}

.btn-create-session:active {
  transform: scale(0.98);
}

/* Conversation Content */
.conversation-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* Messages Container */
.messages-container {
  flex: 1;
  overflow-y: auto;
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.empty-conversation {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #9ca3af;
  font-size: 14px;
}

.dark .empty-conversation {
  color: #6b7280;
}

/* Message */
.message {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-width: 80%;
  animation: fadeIn 0.3s ease-in;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.message-user {
  align-self: flex-end;
}

.message-assistant,
.message-system {
  align-self: flex-start;
}

.message-header {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
}

.message-user .message-header {
  justify-content: flex-end;
}

.message-role {
  font-weight: 600;
  color: #374151;
}

.dark .message-role {
  color: #d1d5db;
}

.message-user .message-role {
  color: #2563eb;
}

.dark .message-user .message-role {
  color: #60a5fa;
}

.message-assistant .message-role {
  color: #059669;
}

.dark .message-assistant .message-role {
  color: #34d399;
}

.message-time {
  color: #9ca3af;
  font-size: 11px;
}

.dark .message-time {
  color: #6b7280;
}

.message-content {
  padding: 12px 16px;
  border-radius: 12px;
  font-size: 14px;
  line-height: 1.6;
  word-wrap: break-word;
}

.message-text {
  white-space: pre-wrap;
}

.message-user .message-content {
  background: #2563eb;
  color: white;
  border-bottom-right-radius: 4px;
}

.message-assistant .message-content {
  background: white;
  color: #111827;
  border: 1px solid #e5e7eb;
  border-bottom-left-radius: 4px;
}

.dark .message-assistant .message-content {
  background: #1f2937;
  color: #f9fafb;
  border-color: #374151;
}

.message-system .message-content {
  background: #f3f4f6;
  color: #6b7280;
  border: 1px solid #e5e7eb;
  font-size: 13px;
  font-style: italic;
}

.dark .message-system .message-content {
  background: #374151;
  color: #9ca3af;
  border-color: #4b5563;
}

/* Message Input */
.message-input-container {
  flex-shrink: 0;
  padding: 16px 24px;
  background: white;
  border-top: 1px solid #e5e7eb;
}

.dark .message-input-container {
  background: #1f2937;
  border-top-color: #374151;
}

.input-wrapper {
  display: flex;
  gap: 12px;
  align-items: flex-end;
}

.message-input {
  flex: 1;
  padding: 12px 16px;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  font-size: 14px;
  font-family: inherit;
  line-height: 1.5;
  resize: none;
  background: white;
  color: #111827;
  transition: all 0.2s;
}

.message-input:focus {
  outline: none;
  border-color: #2563eb;
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
}

.message-input:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.dark .message-input {
  background: #111827;
  color: #f9fafb;
  border-color: #4b5563;
}

.dark .message-input:focus {
  border-color: #60a5fa;
  box-shadow: 0 0 0 3px rgba(96, 165, 250, 0.1);
}

.btn-send {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  border: none;
  background: #2563eb;
  color: white;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-send:hover:not(:disabled) {
  background: #1d4ed8;
}

.btn-send:active:not(:disabled) {
  transform: scale(0.95);
}

.btn-send:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.spinner-small {
  width: 20px;
  height: 20px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: white;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* Scrollbar styling */
.messages-container::-webkit-scrollbar {
  width: 8px;
}

.messages-container::-webkit-scrollbar-track {
  background: transparent;
}

.messages-container::-webkit-scrollbar-thumb {
  background: #d1d5db;
  border-radius: 4px;
}

.messages-container::-webkit-scrollbar-thumb:hover {
  background: #9ca3af;
}

.dark .messages-container::-webkit-scrollbar-thumb {
  background: #4b5563;
}

.dark .messages-container::-webkit-scrollbar-thumb:hover {
  background: #6b7280;
}

.session-tabs::-webkit-scrollbar {
  height: 4px;
}

.session-tabs::-webkit-scrollbar-track {
  background: transparent;
}

.session-tabs::-webkit-scrollbar-thumb {
  background: #d1d5db;
  border-radius: 2px;
}

.dark .session-tabs::-webkit-scrollbar-thumb {
  background: #4b5563;
}
</style>

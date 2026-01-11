import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { Session, Conversation, Message } from '@/types';

export const useSessionStore = defineStore('session', () => {
  // State
  const sessions = ref<Map<string, Session>>(new Map());
  const currentSessionId = ref<string | null>(null);
  const conversations = ref<Map<string, Conversation>>(new Map());

  // Getters
  const currentSession = computed(() => 
    currentSessionId.value ? sessions.value.get(currentSessionId.value) : null
  );

  const currentConversation = computed(() =>
    currentSessionId.value ? conversations.value.get(currentSessionId.value) : null
  );

  const sessionList = computed(() => Array.from(sessions.value.values()));

  const sessionsByProject = computed(() => {
    const grouped = new Map<string, Session[]>();
    for (const session of sessions.value.values()) {
      const projectSessions = grouped.get(session.projectId) || [];
      projectSessions.push(session);
      grouped.set(session.projectId, projectSessions);
    }
    return grouped;
  });

  // Actions
  function createSession(projectId: string, toolId: string): Session {
    const id = generateId();
    const now = Date.now();
    
    const session: Session = {
      id,
      projectId,
      toolId,
      createdAt: now,
      updatedAt: now,
      title: `Session ${sessions.value.size + 1}`,
    };

    sessions.value.set(id, session);
    
    // Create empty conversation
    conversations.value.set(id, {
      id,
      sessionId: id,
      messages: [],
    });

    currentSessionId.value = id;
    return session;
  }

  function setCurrentSession(sessionId: string | null): void {
    currentSessionId.value = sessionId;
  }

  function addMessage(
    sessionId: string,
    message: Omit<Message, 'id' | 'timestamp'>
  ): Message {
    const conversation = conversations.value.get(sessionId);
    if (!conversation) {
      throw new Error(`Conversation not found for session: ${sessionId}`);
    }

    const newMessage: Message = {
      ...message,
      id: generateId(),
      timestamp: Date.now(),
    };

    conversation.messages.push(newMessage);

    // Update session timestamp
    const session = sessions.value.get(sessionId);
    if (session) {
      session.updatedAt = Date.now();
    }

    return newMessage;
  }

  function searchSessions(query: string): Session[] {
    const lowerQuery = query.toLowerCase();
    const results: Session[] = [];

    for (const session of sessions.value.values()) {
      // Search in session title
      if (session.title.toLowerCase().includes(lowerQuery)) {
        results.push(session);
        continue;
      }

      // Search in conversation messages
      const conversation = conversations.value.get(session.id);
      if (conversation) {
        const hasMatch = conversation.messages.some(msg =>
          msg.content.toLowerCase().includes(lowerQuery)
        );
        if (hasMatch) {
          results.push(session);
        }
      }
    }

    return results;
  }

  function filterSessions(filters: {
    projectId?: string;
    toolId?: string;
  }): Session[] {
    return Array.from(sessions.value.values()).filter(session => {
      if (filters.projectId && session.projectId !== filters.projectId) {
        return false;
      }
      if (filters.toolId && session.toolId !== filters.toolId) {
        return false;
      }
      return true;
    });
  }

  function deleteSession(sessionId: string): void {
    sessions.value.delete(sessionId);
    conversations.value.delete(sessionId);
    
    if (currentSessionId.value === sessionId) {
      currentSessionId.value = null;
    }
  }

  function exportSession(sessionId: string): string {
    const session = sessions.value.get(sessionId);
    const conversation = conversations.value.get(sessionId);

    if (!session || !conversation) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    const lines: string[] = [
      `# ${session.title}`,
      '',
      `- **Project ID:** ${session.projectId}`,
      `- **Tool:** ${session.toolId}`,
      `- **Created:** ${new Date(session.createdAt).toLocaleString()}`,
      `- **Updated:** ${new Date(session.updatedAt).toLocaleString()}`,
      '',
      '---',
      '',
    ];

    for (const message of conversation.messages) {
      const role = message.role === 'user' ? '👤 User' : 
                   message.role === 'assistant' ? '🤖 Assistant' : '⚙️ System';
      const time = new Date(message.timestamp).toLocaleTimeString();
      
      lines.push(`### ${role} (${time})`);
      lines.push('');
      lines.push(message.content);
      lines.push('');
    }

    return lines.join('\n');
  }

  // Persistence
  function loadFromStorage(data: {
    sessions?: Array<[string, Session]>;
    conversations?: Array<[string, Conversation]>;
  }): void {
    if (data.sessions) {
      sessions.value = new Map(data.sessions);
    }
    if (data.conversations) {
      conversations.value = new Map(data.conversations);
    }
  }

  function toStorageData(): {
    sessions: Array<[string, Session]>;
    conversations: Array<[string, Conversation]>;
  } {
    return {
      sessions: Array.from(sessions.value.entries()),
      conversations: Array.from(conversations.value.entries()),
    };
  }

  // Helper
  function generateId(): string {
    return `sess-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  return {
    // State
    sessions,
    currentSessionId,
    conversations,
    // Getters
    currentSession,
    currentConversation,
    sessionList,
    sessionsByProject,
    // Actions
    createSession,
    setCurrentSession,
    addMessage,
    searchSessions,
    filterSessions,
    deleteSession,
    exportSession,
    loadFromStorage,
    toStorageData,
  };
});

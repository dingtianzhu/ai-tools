import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { invoke } from '@tauri-apps/api/core';
import { appDataDir } from '@tauri-apps/api/path';
import type { Session, Conversation, Message, SearchResult } from '@/types';

// Database types matching Rust backend
interface DbSession {
  id: string;
  project_id: string;
  runtime_id: string;
  title: string;
  created_at: number;
  updated_at: number;
  tags: string[] | null;
}

interface DbMessage {
  id: string;
  session_id: string;
  role: string;
  content: string;
  timestamp: number;
  metadata: string | null;
}

interface DbSearchResult {
  session_id: string;
  message_id: string;
  content: string;
  timestamp: number;
  highlight: string;
}

export const useSessionStore = defineStore('session', () => {
  // State
  const sessions = ref<Map<string, Session>>(new Map());
  const currentSessionId = ref<string | null>(null);
  const conversations = ref<Map<string, Conversation>>(new Map());
  const searchResults = ref<SearchResult[]>([]);
  const dbPath = ref<string>('');
  const isInitialized = ref<boolean>(false);

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

  // Initialize database
  async function initDatabase(): Promise<void> {
    if (isInitialized.value) {
      return;
    }

    try {
      const appDataPath = await appDataDir();
      dbPath.value = `${appDataPath}/omniai-studio/conversations.db`;
      
      await invoke('init_database', { dbPath: dbPath.value });
      isInitialized.value = true;
    } catch (error) {
      console.error('Failed to initialize database:', error);
      throw new Error(`Database initialization failed: ${error}`);
    }
  }

  // Convert between frontend and database types
  function toDbSession(session: Session): DbSession {
    return {
      id: session.id,
      project_id: session.projectId,
      runtime_id: session.toolId,
      title: session.title,
      created_at: session.createdAt,
      updated_at: session.updatedAt,
      tags: null,
    };
  }

  function fromDbSession(dbSession: DbSession): Session {
    return {
      id: dbSession.id,
      projectId: dbSession.project_id,
      toolId: dbSession.runtime_id,
      title: dbSession.title,
      createdAt: dbSession.created_at,
      updatedAt: dbSession.updated_at,
    };
  }

  function toDbMessage(message: Message, sessionId: string): DbMessage {
    return {
      id: message.id,
      session_id: sessionId,
      role: message.role,
      content: message.content,
      timestamp: message.timestamp,
      metadata: message.metadata ? JSON.stringify(message.metadata) : null,
    };
  }

  function fromDbMessage(dbMessage: DbMessage): Message {
    return {
      id: dbMessage.id,
      role: dbMessage.role as 'user' | 'assistant' | 'system',
      content: dbMessage.content,
      timestamp: dbMessage.timestamp,
      metadata: dbMessage.metadata ? JSON.parse(dbMessage.metadata) : undefined,
    };
  }

  // Actions
  async function createSession(projectId: string, runtimeId: string): Promise<Session> {
    await initDatabase();

    const id = generateId();
    const now = Date.now();
    
    const session: Session = {
      id,
      projectId,
      toolId: runtimeId,
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

    // Persist to database
    try {
      await invoke('save_session', {
        dbPath: dbPath.value,
        session: toDbSession(session),
      });
    } catch (error) {
      console.error('Failed to save session to database:', error);
      // Rollback in-memory state
      sessions.value.delete(id);
      conversations.value.delete(id);
      throw new Error(`Failed to create session: ${error}`);
    }

    return session;
  }

  async function loadSessions(): Promise<void> {
    await initDatabase();

    try {
      const dbSessions = await invoke<DbSession[]>('load_sessions', {
        dbPath: dbPath.value,
      });

      // Clear existing sessions
      sessions.value.clear();
      conversations.value.clear();

      // Load sessions and their messages
      for (const dbSession of dbSessions) {
        const session = fromDbSession(dbSession);
        sessions.value.set(session.id, session);

        // Load messages for this session
        const dbMessages = await invoke<DbMessage[]>('load_messages', {
          dbPath: dbPath.value,
          sessionId: session.id,
        });

        const messages = dbMessages.map(fromDbMessage);
        conversations.value.set(session.id, {
          id: session.id,
          sessionId: session.id,
          messages,
        });
      }
    } catch (error) {
      console.error('Failed to load sessions from database:', error);
      throw new Error(`Failed to load sessions: ${error}`);
    }
  }

  async function saveSessions(): Promise<void> {
    await initDatabase();

    try {
      // Save all sessions
      for (const session of sessions.value.values()) {
        await invoke('save_session', {
          dbPath: dbPath.value,
          session: toDbSession(session),
        });
      }

      // Save all messages
      for (const conversation of conversations.value.values()) {
        for (const message of conversation.messages) {
          await invoke('save_message', {
            dbPath: dbPath.value,
            message: toDbMessage(message, conversation.sessionId),
          });
        }
      }
    } catch (error) {
      console.error('Failed to save sessions to database:', error);
      throw new Error(`Failed to save sessions: ${error}`);
    }
  }

  function setCurrentSession(sessionId: string | null): void {
    currentSessionId.value = sessionId;
  }

  async function addMessage(
    sessionId: string,
    message: Omit<Message, 'id' | 'timestamp'>
  ): Promise<Message> {
    await initDatabase();

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
      
      // Persist session update
      try {
        await invoke('save_session', {
          dbPath: dbPath.value,
          session: toDbSession(session),
        });
      } catch (error) {
        console.error('Failed to update session timestamp:', error);
      }
    }

    // Persist message to database
    try {
      await invoke('save_message', {
        dbPath: dbPath.value,
        message: toDbMessage(newMessage, sessionId),
      });
    } catch (error) {
      console.error('Failed to save message to database:', error);
      // Rollback in-memory state
      conversation.messages.pop();
      throw new Error(`Failed to add message: ${error}`);
    }

    return newMessage;
  }

  async function renameSession(sessionId: string, title: string): Promise<void> {
    await initDatabase();

    const session = sessions.value.get(sessionId);
    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    const oldTitle = session.title;
    session.title = title;
    session.updatedAt = Date.now();

    // Persist to database
    try {
      await invoke('save_session', {
        dbPath: dbPath.value,
        session: toDbSession(session),
      });
    } catch (error) {
      console.error('Failed to rename session in database:', error);
      // Rollback in-memory state
      session.title = oldTitle;
      throw new Error(`Failed to rename session: ${error}`);
    }
  }

  function groupByProject(): Map<string, Session[]> {
    return sessionsByProject.value;
  }

  async function searchSessions(query: string): Promise<SearchResult[]> {
    await initDatabase();

    if (!query || query.trim() === '') {
      searchResults.value = [];
      return [];
    }

    try {
      // Call backend full-text search
      const dbResults = await invoke<DbSearchResult[]>('search_messages', {
        dbPath: dbPath.value,
        query: query.trim(),
      });

      // Convert database results to SearchResult objects with session info
      const results: SearchResult[] = dbResults.map(dbResult => {
        const session = sessions.value.get(dbResult.session_id);
        
        return {
          sessionId: dbResult.session_id,
          messageId: dbResult.message_id,
          content: dbResult.content,
          timestamp: dbResult.timestamp,
          highlight: dbResult.highlight,
          session: session,
        };
      });

      // Also search in session titles (in-memory search)
      const lowerQuery = query.toLowerCase();
      const sessionIdsInResults = new Set(results.map(r => r.sessionId));
      
      for (const session of sessions.value.values()) {
        if (session.title.toLowerCase().includes(lowerQuery) && 
            !sessionIdsInResults.has(session.id)) {
          // Add a synthetic search result for title matches
          results.push({
            sessionId: session.id,
            messageId: '', // No specific message
            content: session.title,
            timestamp: session.updatedAt,
            highlight: highlightText(session.title, query),
            session: session,
          });
        }
      }

      // Sort by timestamp (most recent first)
      results.sort((a, b) => b.timestamp - a.timestamp);

      searchResults.value = results;
      return results;
    } catch (error) {
      console.error('Failed to search sessions:', error);
      throw new Error(`Failed to search sessions: ${error}`);
    }
  }

  // Helper function to highlight search terms in text
  function highlightText(text: string, query: string): string {
    if (!query || !text) {
      return text;
    }

    const lowerText = text.toLowerCase();
    const lowerQuery = query.toLowerCase();
    const index = lowerText.indexOf(lowerQuery);

    if (index === -1) {
      return text;
    }

    // Extract context around the match (up to 64 characters on each side)
    const contextLength = 64;
    const start = Math.max(0, index - contextLength);
    const end = Math.min(text.length, index + query.length + contextLength);
    
    let snippet = text.substring(start, end);
    
    // Add ellipsis if truncated
    if (start > 0) {
      snippet = '...' + snippet;
    }
    if (end < text.length) {
      snippet = snippet + '...';
    }

    // Highlight the search term
    const matchStart = snippet.toLowerCase().indexOf(lowerQuery);
    if (matchStart !== -1) {
      const before = snippet.substring(0, matchStart);
      const match = snippet.substring(matchStart, matchStart + query.length);
      const after = snippet.substring(matchStart + query.length);
      snippet = `${before}<mark>${match}</mark>${after}`;
    }

    return snippet;
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

  async function deleteSession(sessionId: string): Promise<void> {
    await initDatabase();

    // Delete from database first
    try {
      await invoke('delete_session', {
        dbPath: dbPath.value,
        sessionId,
      });
    } catch (error) {
      console.error('Failed to delete session from database:', error);
      throw new Error(`Failed to delete session: ${error}`);
    }

    // Delete from in-memory state
    sessions.value.delete(sessionId);
    conversations.value.delete(sessionId);
    
    if (currentSessionId.value === sessionId) {
      currentSessionId.value = null;
    }
  }

  async function exportSession(
    sessionId: string, 
    format: 'markdown' | 'json' | 'pdf' = 'markdown'
  ): Promise<string> {
    await initDatabase();

    // Get session info for filename
    const session = sessions.value.get(sessionId);
    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    try {
      // Call backend to generate export content
      const exportedContent = await invoke<string>('export_session', {
        dbPath: dbPath.value,
        sessionId,
        format,
      });

      return exportedContent;
    } catch (error) {
      console.error('Failed to export session:', error);
      
      // Fallback to in-memory export for markdown and json
      if (format === 'markdown') {
        return exportToMarkdownFallback(sessionId);
      } else if (format === 'json') {
        return exportToJsonFallback(sessionId);
      }
      
      throw new Error(`Failed to export session: ${error}`);
    }
  }

  // Fallback export to Markdown (in-memory)
  function exportToMarkdownFallback(sessionId: string): string {
    const session = sessions.value.get(sessionId);
    const conversation = conversations.value.get(sessionId);

    if (!session || !conversation) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    const lines: string[] = [
      `# ${session.title}`,
      '',
      `**Session ID:** ${session.id}`,
      `**Project ID:** ${session.projectId}`,
      `**Runtime ID:** ${session.toolId}`,
      `**Created:** ${new Date(session.createdAt).toLocaleString()}`,
      `**Updated:** ${new Date(session.updatedAt).toLocaleString()}`,
      '',
      '---',
      '',
    ];

    for (const message of conversation.messages) {
      const role = message.role === 'user' ? '👤 User' : 
                   message.role === 'assistant' ? '🤖 Assistant' : '⚙️ System';
      const timestamp = new Date(message.timestamp).toLocaleString();
      
      lines.push(`## ${role} - ${timestamp}`);
      lines.push('');
      lines.push(message.content);
      lines.push('');
      lines.push('---');
      lines.push('');
    }

    return lines.join('\n');
  }

  // Fallback export to JSON (in-memory)
  function exportToJsonFallback(sessionId: string): string {
    const session = sessions.value.get(sessionId);
    const conversation = conversations.value.get(sessionId);

    if (!session || !conversation) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    const exportData = {
      session: {
        id: session.id,
        project_id: session.projectId,
        runtime_id: session.toolId,
        title: session.title,
        created_at: session.createdAt,
        updated_at: session.updatedAt,
      },
      messages: conversation.messages.map(msg => ({
        id: msg.id,
        role: msg.role,
        content: msg.content,
        timestamp: msg.timestamp,
        metadata: msg.metadata,
      })),
    };

    return JSON.stringify(exportData, null, 2);
  }

  // Persistence (legacy methods for compatibility)
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
    return `sess-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
  }

  return {
    // State
    sessions,
    currentSessionId,
    conversations,
    searchResults,
    // Getters
    currentSession,
    currentConversation,
    sessionList,
    sessionsByProject,
    // Actions
    initDatabase,
    createSession,
    loadSessions,
    saveSessions,
    setCurrentSession,
    addMessage,
    renameSession,
    groupByProject,
    searchSessions,
    filterSessions,
    deleteSession,
    exportSession,
    loadFromStorage,
    toStorageData,
  };
});

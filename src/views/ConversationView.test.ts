import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { setActivePinia, createPinia } from 'pinia';
import ConversationView from './ConversationView.vue';
import { useSessionStore } from '@/stores/session';
import { useProjectStore } from '@/stores/project';

// Mock Tauri APIs
vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn(),
}));

vi.mock('@tauri-apps/api/path', () => ({
  appDataDir: vi.fn(() => Promise.resolve('/mock/app/data')),
}));

import { invoke } from '@tauri-apps/api/core';
const mockInvoke = invoke as ReturnType<typeof vi.fn>;

describe('ConversationView', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
    
    // Default mock for init_database
    mockInvoke.mockImplementation((cmd: string) => {
      if (cmd === 'init_database') {
        return Promise.resolve();
      }
      if (cmd === 'load_sessions') {
        return Promise.resolve([]);
      }
      return Promise.reject(new Error(`Unexpected command: ${cmd}`));
    });
  });

  describe('Component Rendering', () => {
    it('should render no session state when no session is active', async () => {
      const wrapper = mount(ConversationView);
      
      await wrapper.vm.$nextTick();
      
      expect(wrapper.find('.no-session-state').exists()).toBe(true);
      expect(wrapper.text()).toContain('No Active Session');
    });

    it('should render session tabs when sessions exist', async () => {
      const sessionStore = useSessionStore();
      const projectStore = useProjectStore();
      
      // Mock project
      projectStore.currentProject = {
        id: 'project-1',
        name: 'Test Project',
        path: '/test/path',
        lastOpened: Date.now(),
        aiToolsUsed: [],
      };
      
      mockInvoke.mockImplementation((cmd: string) => {
        if (cmd === 'init_database') return Promise.resolve();
        if (cmd === 'save_session') return Promise.resolve();
        if (cmd === 'load_sessions') return Promise.resolve([]);
        return Promise.reject(new Error(`Unexpected command: ${cmd}`));
      });
      
      // Create a session
      await sessionStore.createSession('project-1', 'runtime-1');
      
      const wrapper = mount(ConversationView);
      await wrapper.vm.$nextTick();
      
      expect(wrapper.find('.session-tabs').exists()).toBe(true);
      expect(wrapper.findAll('.tab').length).toBeGreaterThan(0);
    });

    it('should render message input when session is active', async () => {
      const sessionStore = useSessionStore();
      const projectStore = useProjectStore();
      
      // Mock project
      projectStore.currentProject = {
        id: 'project-1',
        name: 'Test Project',
        path: '/test/path',
        lastOpened: Date.now(),
        aiToolsUsed: [],
      };
      
      mockInvoke.mockImplementation((cmd: string) => {
        if (cmd === 'init_database') return Promise.resolve();
        if (cmd === 'save_session') return Promise.resolve();
        if (cmd === 'load_sessions') return Promise.resolve([]);
        return Promise.reject(new Error(`Unexpected command: ${cmd}`));
      });
      
      // Create a session
      await sessionStore.createSession('project-1', 'runtime-1');
      
      const wrapper = mount(ConversationView);
      await wrapper.vm.$nextTick();
      
      expect(wrapper.find('.message-input').exists()).toBe(true);
      expect(wrapper.find('.btn-send').exists()).toBe(true);
    });

    it('should display messages in conversation', async () => {
      const sessionStore = useSessionStore();
      const projectStore = useProjectStore();
      
      // Mock project
      projectStore.currentProject = {
        id: 'project-1',
        name: 'Test Project',
        path: '/test/path',
        lastOpened: Date.now(),
        aiToolsUsed: [],
      };
      
      mockInvoke.mockImplementation((cmd: string) => {
        if (cmd === 'init_database') return Promise.resolve();
        if (cmd === 'save_session') return Promise.resolve();
        if (cmd === 'save_message') return Promise.resolve();
        if (cmd === 'load_sessions') return Promise.resolve([]);
        return Promise.reject(new Error(`Unexpected command: ${cmd}`));
      });
      
      // Create a session and add messages
      const session = await sessionStore.createSession('project-1', 'runtime-1');
      await sessionStore.addMessage(session.id, {
        role: 'user',
        content: 'Hello AI',
      });
      await sessionStore.addMessage(session.id, {
        role: 'assistant',
        content: 'Hello! How can I help you?',
      });
      
      const wrapper = mount(ConversationView);
      await wrapper.vm.$nextTick();
      
      const messages = wrapper.findAll('.message');
      expect(messages.length).toBe(2);
      expect(messages[0].text()).toContain('Hello AI');
      expect(messages[1].text()).toContain('Hello! How can I help you?');
    });
  });

  describe('User Interactions', () => {
    it('should have new session button available', async () => {
      const projectStore = useProjectStore();
      
      // Mock project
      projectStore.currentProject = {
        id: 'project-1',
        name: 'Test Project',
        path: '/test/path',
        lastOpened: Date.now(),
        aiToolsUsed: [],
      };
      
      mockInvoke.mockImplementation((cmd: string) => {
        if (cmd === 'init_database') return Promise.resolve();
        if (cmd === 'save_session') return Promise.resolve();
        if (cmd === 'load_sessions') return Promise.resolve([]);
        return Promise.reject(new Error(`Unexpected command: ${cmd}`));
      });
      
      const wrapper = mount(ConversationView);
      await wrapper.vm.$nextTick();
      
      // Check that new session button exists
      const createButton = wrapper.find('.btn-create-session');
      expect(createButton.exists()).toBe(true);
    });

    it('should distinguish between user and AI messages', async () => {
      const sessionStore = useSessionStore();
      const projectStore = useProjectStore();
      
      // Mock project
      projectStore.currentProject = {
        id: 'project-1',
        name: 'Test Project',
        path: '/test/path',
        lastOpened: Date.now(),
        aiToolsUsed: [],
      };
      
      mockInvoke.mockImplementation((cmd: string) => {
        if (cmd === 'init_database') return Promise.resolve();
        if (cmd === 'save_session') return Promise.resolve();
        if (cmd === 'save_message') return Promise.resolve();
        if (cmd === 'load_sessions') return Promise.resolve([]);
        return Promise.reject(new Error(`Unexpected command: ${cmd}`));
      });
      
      // Create a session and add messages
      const session = await sessionStore.createSession('project-1', 'runtime-1');
      await sessionStore.addMessage(session.id, {
        role: 'user',
        content: 'User message',
      });
      await sessionStore.addMessage(session.id, {
        role: 'assistant',
        content: 'AI message',
      });
      
      const wrapper = mount(ConversationView);
      await wrapper.vm.$nextTick();
      
      const messages = wrapper.findAll('.message');
      expect(messages[0].classes()).toContain('message-user');
      expect(messages[1].classes()).toContain('message-assistant');
    });
  });

  describe('Message Input', () => {
    it('should have send button that can be disabled', async () => {
      const sessionStore = useSessionStore();
      const projectStore = useProjectStore();
      
      // Mock project
      projectStore.currentProject = {
        id: 'project-1',
        name: 'Test Project',
        path: '/test/path',
        lastOpened: Date.now(),
        aiToolsUsed: [],
      };
      
      mockInvoke.mockImplementation((cmd: string) => {
        if (cmd === 'init_database') return Promise.resolve();
        if (cmd === 'save_session') return Promise.resolve();
        if (cmd === 'save_message') return Promise.resolve();
        if (cmd === 'load_sessions') return Promise.resolve([]);
        return Promise.reject(new Error(`Unexpected command: ${cmd}`));
      });
      
      // Create a session
      await sessionStore.createSession('project-1', 'runtime-1');
      
      const wrapper = mount(ConversationView);
      await wrapper.vm.$nextTick();
      
      const input = wrapper.find('.message-input');
      const sendButton = wrapper.find('.btn-send');
      
      // Send button should be disabled when input is empty
      expect((sendButton.element as HTMLButtonElement).disabled).toBe(true);
      
      // Set input value
      await input.setValue('Test message');
      await wrapper.vm.$nextTick();
      
      // Send button should be enabled when input has text
      expect((sendButton.element as HTMLButtonElement).disabled).toBe(false);
    });
  });

  describe('Session Tab Navigation', () => {
    it('should switch between sessions when clicking tabs', async () => {
      const sessionStore = useSessionStore();
      const projectStore = useProjectStore();
      
      // Mock project
      projectStore.currentProject = {
        id: 'project-1',
        name: 'Test Project',
        path: '/test/path',
        lastOpened: Date.now(),
        aiToolsUsed: [],
      };
      
      mockInvoke.mockImplementation((cmd: string) => {
        if (cmd === 'init_database') return Promise.resolve();
        if (cmd === 'save_session') return Promise.resolve();
        if (cmd === 'load_sessions') return Promise.resolve([]);
        return Promise.reject(new Error(`Unexpected command: ${cmd}`));
      });
      
      // Create two sessions
      const session1 = await sessionStore.createSession('project-1', 'runtime-1');
      const session2 = await sessionStore.createSession('project-1', 'runtime-1');
      
      const wrapper = mount(ConversationView);
      await wrapper.vm.$nextTick();
      
      const tabs = wrapper.findAll('.tab');
      expect(tabs.length).toBe(2);
      
      // Click second tab
      await tabs[1].trigger('click');
      await wrapper.vm.$nextTick();
      
      expect(sessionStore.currentSessionId).toBe(session2.id);
      expect(tabs[1].classes()).toContain('active');
    });

    it('should show active tab with correct styling', async () => {
      const sessionStore = useSessionStore();
      const projectStore = useProjectStore();
      
      // Mock project
      projectStore.currentProject = {
        id: 'project-1',
        name: 'Test Project',
        path: '/test/path',
        lastOpened: Date.now(),
        aiToolsUsed: [],
      };
      
      mockInvoke.mockImplementation((cmd: string) => {
        if (cmd === 'init_database') return Promise.resolve();
        if (cmd === 'save_session') return Promise.resolve();
        if (cmd === 'load_sessions') return Promise.resolve([]);
        return Promise.reject(new Error(`Unexpected command: ${cmd}`));
      });
      
      // Create a session
      await sessionStore.createSession('project-1', 'runtime-1');
      
      const wrapper = mount(ConversationView);
      await wrapper.vm.$nextTick();
      
      const activeTab = wrapper.find('.tab.active');
      expect(activeTab.exists()).toBe(true);
    });
  });
});

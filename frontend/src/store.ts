import { create } from 'zustand';

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  action?: string;
  data?: any;
  timestamp: number;
  thoughtChain?: ThoughtStep[];
}

export interface ThoughtStep {
  step: string;
  status: 'loading' | 'success' | 'error';
  detail?: string;
}

export interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  sessionId: string | null;
  createdAt: number;
}

export interface Report {
  id: string;
  code: string;
  name: string;
  category: string;
  region: string;
  regionName: string;
  type: string;
  description: string;
}

export interface ReportContent {
  reportId: string;
  title: string;
  style: string;
  dateDisplay: string;
  dateRange: { start: string; end: string };
  sections: any[];
  subSections?: any[];
  focusSection?: any;
}

interface AppState {
  messages: Message[];
  sessionId: string | null;
  isLoading: boolean;
  currentReport: ReportContent | null;
  reportList: Report[];
  activeTab: 'chat' | 'library' | 'subscriptions' | 'test';
  conversations: Conversation[];
  currentConversationId: string | null;
  currentThoughtChain: ThoughtStep[];
  showThoughtChain: boolean;
  userPermissions: string[];
  workbenchItems: any[];

  addMessage: (msg: Message) => void;
  setMessages: (msgs: Message[]) => void;
  setSessionId: (id: string) => void;
  setLoading: (loading: boolean) => void;
  setCurrentReport: (report: ReportContent | null) => void;
  setReportList: (list: Report[]) => void;
  setActiveTab: (tab: 'chat' | 'library' | 'subscriptions' | 'test') => void;
  clearMessages: () => void;
  
  createConversation: () => string;
  switchConversation: (id: string) => void;
  deleteConversation: (id: string) => void;
  updateConversationTitle: (id: string, title: string) => void;
  ensureInitialConversation: () => void;
  
  setThoughtChain: (steps: ThoughtStep[]) => void;
  setShowThoughtChain: (show: boolean) => void;
  setUserPermissions: (perms: string[]) => void;
  loadFromStorage: () => void;
  saveToStorage: () => void;
  
  addWorkbenchItem: (item: any) => void;
  removeWorkbenchItem: (id: string) => void;
  loadWorkbenchFromStorage: () => void;
}

const STORAGE_KEY = 'intelligent_battle_report_conversations';
const PERMISSIONS_KEY = 'intelligent_battle_report_permissions';
const WORKBENCH_KEY = 'intelligent_battle_report_workbench';

export const useStore = create<AppState>((set, get) => ({
  messages: [],
  sessionId: null,
  isLoading: false,
  currentReport: null,
  reportList: [],
  activeTab: 'chat',
  conversations: [],
  currentConversationId: null,
  currentThoughtChain: [],
  showThoughtChain: true,
  userPermissions: ['GLOBAL'],
  workbenchItems: [],

  addMessage: (msg) => {
    set((state) => {
      const newMessages = [...state.messages, msg];
      const convs = state.conversations.map(c => {
        if (c.id === state.currentConversationId) {
          return { ...c, messages: newMessages, sessionId: state.sessionId };
        }
        return c;
      });
      const newState = { messages: newMessages, conversations: convs };
      setTimeout(() => {
        const currentState = get();
        localStorage.setItem(STORAGE_KEY, JSON.stringify(currentState.conversations));
      }, 0);
      return newState;
    });
  },

  setMessages: (msgs) => set({ messages: msgs }),
  setSessionId: (id) => set({ sessionId: id }),
  setLoading: (loading) => set({ isLoading: loading }),
  setCurrentReport: (report) => set({ currentReport: report }),
  setReportList: (list) => set({ reportList: list }),
  setActiveTab: (tab) => set({ activeTab: tab }),
  clearMessages: () => set({ messages: [], sessionId: null, currentReport: null }),
  
  createConversation: () => {
    const id = Date.now().toString();
    const conv: Conversation = {
      id,
      title: '新对话',
      messages: [],
      sessionId: null,
      createdAt: Date.now(),
    };
    set((state) => {
      const newConvs = [conv, ...state.conversations];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newConvs));
      return {
        conversations: newConvs,
        currentConversationId: id,
        messages: [],
        sessionId: null,
        currentReport: null,
      };
    });
    return id;
  },
  
  ensureInitialConversation: () => {
    const state = get();
    if (state.conversations.length === 0) {
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored) as Conversation[];
          if (parsed.length > 0) {
            set({
              conversations: parsed,
              currentConversationId: parsed[0].id,
              messages: parsed[0].messages,
              sessionId: parsed[0].sessionId,
            });
            return;
          }
        }
      } catch (e) {
        console.error('Failed to load conversations from localStorage:', e);
      }
    }
    if (state.conversations.length === 0) {
      const id = Date.now().toString();
      const welcomeMsg: Message = {
        id: 'welcome',
        role: 'assistant',
        content: '您好！我是战报智能助手 🤖\n\n我可以帮您：\n• 查找战报（如：帮我找一下墨西哥的战报）\n• 查看战报详情\n• 修改时间范围（如：时间改成 7.11-7.19）\n• 调整重点机型（如：重点机型换成 Mate XT）\n\n请问您需要什么帮助？',
        timestamp: Date.now(),
      };
      const conv: Conversation = {
        id,
        title: '新对话',
        messages: [welcomeMsg],
        sessionId: null,
        createdAt: Date.now(),
      };
      set({
        conversations: [conv],
        currentConversationId: id,
        messages: [welcomeMsg],
      });
      localStorage.setItem(STORAGE_KEY, JSON.stringify([conv]));
    }
  },
  
  switchConversation: (id) => {
    const conv = get().conversations.find(c => c.id === id);
    if (conv) {
      set({
        currentConversationId: id,
        messages: conv.messages,
        sessionId: conv.sessionId,
      });
    }
  },
  
  deleteConversation: (id) => {
    set((state) => {
      const newConvs = state.conversations.filter(c => c.id !== id);
      if (newConvs.length === 0) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify([]));
        return { conversations: [], currentConversationId: null, messages: [], sessionId: null };
      }
      const newCurrentId = newConvs[0].id;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newConvs));
      return {
        conversations: newConvs,
        currentConversationId: newCurrentId,
        messages: newConvs[0].messages,
        sessionId: newConvs[0].sessionId,
      };
    });
  },
  
  updateConversationTitle: (id, title) => {
    set((state) => {
      const newConvs = state.conversations.map(c =>
        c.id === id ? { ...c, title } : c
      );
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newConvs));
      return { conversations: newConvs };
    });
  },
  
  setThoughtChain: (steps) => set({ currentThoughtChain: steps }),
  setShowThoughtChain: (show) => set({ showThoughtChain: show }),
  
  setUserPermissions: (perms) => {
    set({ userPermissions: perms });
    localStorage.setItem(PERMISSIONS_KEY, JSON.stringify(perms));
  },
  
  loadFromStorage: () => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as Conversation[];
        if (parsed.length > 0) {
          set({
            conversations: parsed,
            currentConversationId: parsed[0].id,
            messages: parsed[0].messages,
            sessionId: parsed[0].sessionId,
          });
        }
      }
      const permsStored = localStorage.getItem(PERMISSIONS_KEY);
      if (permsStored) {
        set({ userPermissions: JSON.parse(permsStored) });
      }
      const wbStored = localStorage.getItem(WORKBENCH_KEY);
      if (wbStored) {
        set({ workbenchItems: JSON.parse(wbStored) });
      }
    } catch (e) {
      console.error('Failed to load from localStorage:', e);
    }
  },
  
  saveToStorage: () => {
    const state = get();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state.conversations));
    localStorage.setItem(WORKBENCH_KEY, JSON.stringify(state.workbenchItems));
  },
  
  addWorkbenchItem: (item) => {
    set((state) => {
      const newItems = [...state.workbenchItems, item];
      localStorage.setItem(WORKBENCH_KEY, JSON.stringify(newItems));
      return { workbenchItems: newItems };
    });
  },
  
  removeWorkbenchItem: (id) => {
    set((state) => {
      const newItems = state.workbenchItems.filter(item => item.id !== id);
      localStorage.setItem(WORKBENCH_KEY, JSON.stringify(newItems));
      return { workbenchItems: newItems };
    });
  },
  
  loadWorkbenchFromStorage: () => {
    try {
      const wbStored = localStorage.getItem(WORKBENCH_KEY);
      if (wbStored) {
        set({ workbenchItems: JSON.parse(wbStored) });
      }
    } catch (e) {
      console.error('Failed to load workbench from localStorage:', e);
    }
  },
}));

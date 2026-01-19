import { createRouter, createWebHistory } from 'vue-router';
import type { RouteRecordRaw } from 'vue-router';

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'home',
    component: () => import('@/views/HomeView.vue'),
  },
  {
    path: '/project',
    name: 'project',
    component: () => import('@/views/ProjectView.vue'),
  },
  {
    path: '/runtime',
    name: 'runtime',
    component: () => import('@/views/RuntimeManagerView.vue'),
  },
  {
    path: '/settings',
    name: 'settings',
    component: () => import('@/views/SettingsView.vue'),
  },
  {
    path: '/conversation',
    name: 'conversation',
    component: () => import('@/views/ConversationView.vue'),
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

export default router;

import { createApp } from 'vue';
import { createPinia } from 'pinia';
import router from './router';
import App from './App.vue';
import './styles/main.css';
import { initializeStores } from './utils/initStores';

const app = createApp(App);

app.use(createPinia());
app.use(router);

// Initialize stores from persistent storage
initializeStores().then(() => {
  console.log('Stores initialized');
}).catch((error) => {
  console.error('Failed to initialize stores:', error);
});

app.mount('#app');

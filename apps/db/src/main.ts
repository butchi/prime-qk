import { createApp } from 'vue'
import App from './App.vue'
import './style.css'

createApp(App, { url: window.location.href }).mount('#app')

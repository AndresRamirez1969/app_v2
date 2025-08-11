import { createApp } from 'vue';
import { plugin, defaultConfig } from '@formkit/vue';
import { createProPlugin, inputs } from '@formkit/pro';
import { createPinia } from 'pinia';
import App from './App.vue';
import router from './router'; // <-- Cambiado a default import
import vuetify from './plugins/vuetify';
import '@/scss/style.scss';
import { PerfectScrollbarPlugin } from 'vue3-perfect-scrollbar';
import VueTablerIcons from 'vue-tabler-icons';
import VueApexCharts from 'vue3-apexcharts';
import Antd from 'ant-design-vue';
import 'ant-design-vue/dist/reset.css';
import Toast from 'vue-toastification';
import 'vue-toastification/dist/index.css';
import '@formkit/themes/genesis';
import { registerLicense } from '@syncfusion/ej2-base';

// google-fonts
import '@fontsource/public-sans/400.css';
import '@fontsource/public-sans/500.css';
import '@fontsource/public-sans/600.css';
import '@fontsource/public-sans/700.css';

//Mock Api data
import { fakeBackend } from '@/utils/helpers/fake-backend';

const app = createApp(App);
const pro = createProPlugin('fk-748c917a9d', inputs);
fakeBackend();
app.use(
  plugin,
  defaultConfig({
    plugins: [pro],
    config: { root: 'formkit', theme: 'genesis' }
  })
);
registerLicense('Ngo9BigBOggjHTQxAR8/V1JEaF1cWWhBYVJ+WmFZfVtgdV9FZ1ZRQWY/P1ZhSXxWdk1iWH5dc3NVQ2BZVkJ9XEI=');
app.use(router);
app.use(PerfectScrollbarPlugin);
app.use(createPinia());
app.use(VueTablerIcons);
app.use(Antd);
app.use(VueApexCharts);
app.use(Toast, {
  position: 'top-right',
  timeout: 3000
});
app.use(vuetify).mount('#app');

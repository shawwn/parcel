import Vue from 'vue/dist/vue.esm.js';
// import Test from './test.vue';
// window.Vue = require('vue')
import basic from '../integration/vue/basic.vue';
import spin from '../integration/vue/Spinner.vue';
import ProgressBar from '../integration/vue/ProgressBar.vue';

// global progress bar
if (!window.$bar) {
  window.$bar = Vue.prototype.$bar = new Vue(ProgressBar).$mount();
  document.body.appendChild(window.$bar.$el);
}

// window.zz = new Vue(basic)
// zz.$mount()
// document.body.appendChild(zz.$el)
window.compA = Vue.component('comp-a', basic);
window.spinner = Vue.component('spinner', spin);
// register
// Vue.component('my-component', {
//   template: '<div>A custom component!</div>'
// })

// create a root instance
window.app = new Vue({
  el: '#example'
});

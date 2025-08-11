<template>
  <div>
    <div id="actionBtn" class="mb-3">
      <v-btn @click="saveSign" color="primary" variant="outlined" size="small" class="mr-2"> Guardar </v-btn>
      <v-btn @click="clearSign" color="secondary" variant="outlined" size="small"> Limpiar </v-btn>
    </div>
    <ejs-signature ref="signObj" :backgroundColor="bgColor" :strokeColor="customStrokeColor" width="500px" height="200px" />
  </div>
</template>

<script setup>
import { ref, getCurrentInstance } from 'vue';
import { SignatureComponent } from '@syncfusion/ej2-vue-inputs';

// Registrar el componente
const app = getCurrentInstance();
if (app) {
  app.appContext.app.component('ejs-signature', SignatureComponent);
}

const bgColor = ref('white');
const customStrokeColor = ref('#000000');
const signObj = ref(null);

const saveSign = () => {
  if (signObj.value?.ej2Instances) {
    try {
      // Usar save() que retorna un Blob directamente
      const signatureBlob = signObj.value.ej2Instances.saveAsBlob();

      if (signatureBlob instanceof Blob) {
        // Emitir el Blob directamente
        emit('signature-changed', signatureBlob);
        console.log('Firma guardada exitosamente como Blob');
      } else {
        console.error('El método save() no retornó un Blob válido');
      }
    } catch (error) {
      console.error('Error al guardar la firma:', error);
    }
  }
};

const clearSign = () => {
  if (signObj.value?.ej2Instances) {
    try {
      signObj.value.ej2Instances.clear();
      emit('signature-changed', null);
    } catch (error) {
      console.error('Error al limpiar la firma:', error);
    }
  }
};

// Método para obtener la firma desde el componente padre
const getSignature = () => {
  if (signObj.value?.ej2Instances) {
    try {
      // Usar save() que retorna Blob directamente
      return signObj.value.ej2Instances.getBlob();
    } catch (error) {
      console.error('Error al obtener la firma:', error);
      return null;
    }
  }
  return null;
};

// Exponer métodos
defineExpose({
  getSignature,
  clear: clearSign,
  save: saveSign
});

// Emitir eventos
const emit = defineEmits(['signature-changed']);
</script>

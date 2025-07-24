```vue
<template>
  <v-dialog v-model="isOpen" persistent max-width="800" transition="dialog-transition">
    <v-card class="pa-16" style="position: relative">
      <!-- Botón cerrar -->
      <v-btn icon variant="text" class="position-absolute" style="top: 8px; right: 8px; color: black" @click="closeModal">
        <v-icon :icon="mdiClose" />
      </v-btn>

      <v-row>
        <!-- Lado izquierdo: reglas -->
        <v-col cols="12" md="6">
          <h2 class="h3 font-weight-bold mb-4">Cambiar Contraseña</h2>
          <div class="text-subtitle-3 mb-2">La contraseña debe contener:</div>
          <v-list dense>
            <v-list-item v-for="(rule, index) in rules" :key="index" class="px-0 py-1" style="font-size: 0.85rem; min-height: 28px">
              <v-icon size="20" :color="rule.valid ? 'primary' : 'grey'" class="mr-2" :icon="mdiCheck" />
              <span
                :style="{
                  textDecoration: rule.valid ? 'line-through' : 'none',
                  textDecorationColor: rule.valid ? '#000000' : 'transparent',
                  textDecorationThickness: '1px'
                }"
              >
                {{ rule.label }}
              </span>
            </v-list-item>
          </v-list>
        </v-col>

        <!-- Lado derecho: campos y botones alineados -->
        <v-col cols="12" md="6">
          <v-text-field
            v-model="form.current_password"
            label="Contraseña Actual"
            type="password"
            class="mb-2"
            variant="outlined"
            density="compact"
          />
          <v-text-field
            v-model="form.new_password"
            label="Nueva Contraseña"
            type="password"
            class="mb-2"
            variant="outlined"
            density="compact"
          />
          <v-text-field
            v-model="form.new_password_confirmation"
            label="Confirmar Nueva Contraseña"
            type="password"
            class="mb-2"
            :color="passwordsMatch ? 'success' : undefined"
            variant="outlined"
            density="compact"
          >
            <template #append-inner>
              <v-icon v-if="passwordsMatch" :icon="mdiCheck" color="success" />
            </template>
          </v-text-field>

          <!-- Botones en columna, mismo ancho -->
          <div class="d-flex flex-column mt-2">
            <v-btn
              class="mb-2"
              style="background-color: #1677ff; color: white; font-weight: 500; font-size: 14px; width: 100%; text-transform: none"
              @click="submit"
            >
              Guardar Contraseña
            </v-btn>

            <v-btn
              variant="text"
              style="width: 100%; color: #555; font-weight: 500; font-size: 13px; text-transform: none"
              @click="closeModal"
            >
              Cancelar
            </v-btn>
          </div>
        </v-col>
      </v-row>
    </v-card>
  </v-dialog>
</template>

<script setup>
import { ref, computed } from 'vue';
import { mdiCheck, mdiClose } from '@mdi/js';
import axiosInstance from '@/utils/axios';
import { useToast } from 'vue-toastification';

const toast = useToast();

const props = defineProps({
  modelValue: Boolean
});
const emit = defineEmits(['update:modelValue']);

const isOpen = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val)
});

const form = ref({
  current_password: '',
  new_password: '',
  new_password_confirmation: ''
});

const rules = computed(() => [
  {
    label: 'Al menos 6 caracteres',
    valid: form.value.new_password.length >= 6
  },
  {
    label: 'Al menos una letra mayúscula (A-Z)',
    valid: /[A-Z]/.test(form.value.new_password)
  },
  {
    label: 'Al menos una letra minúscula (a-z)',
    valid: /[a-z]/.test(form.value.new_password)
  },
  {
    label: 'Al menos un número (0-9)',
    valid: /\d/.test(form.value.new_password)
  }
]);

const passwordsMatch = computed(() => form.value.new_password && form.value.new_password === form.value.new_password_confirmation);

function closeModal() {
  form.value.current_password = '';
  form.value.new_password = '';
  form.value.new_password_confirmation = '';
  emit('update:modelValue', false);
}

async function submit() {
  try {
    await axiosInstance.post('/change-password', form.value);
    toast.success('Contraseña actualizada con éxito');
    closeModal();
  } catch (error) {
    toast.error('Error al cambiar la contraseña');
    console.error(error);
  }
}
</script>
```

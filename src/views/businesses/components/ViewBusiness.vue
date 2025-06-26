<template>
    <div>
      <v-dialog
        :model-value="props.modal"
        @update:model-value="emit('update:modal', $event)"
        location="right"
        temporary
        width="800"
      >
        <v-card flat>
          <v-card-title class="d-flex align-center justify-space-between">
            Detalles del Negocio
            <v-spacer />
            <v-btn icon @click="emit('update:modal', false)">
                <v-icon :icon="mdiCancel" />
            </v-btn>
          </v-card-title>
          <v-divider />
  
          <v-card-text>
            <v-list dense>
              <v-list-item>
                <v-list-item-title class="font-weight-bold">Nombre Legal</v-list-item-title>
                <v-list-item-subtitle>{{ bus.legal_name }}</v-list-item-subtitle>
              </v-list-item>
  
              <v-list-item>
                <v-list-item-title class="font-weight-bold">Alias</v-list-item-title>
                <v-list-item-subtitle>{{ bus.alias }}</v-list-item-subtitle>
              </v-list-item>
  
              <v-list-item>
                <v-list-item-title class="font-weight-bold">Descripción</v-list-item-title>
                <v-list-item-subtitle>{{ bus.description }}</v-list-item-subtitle>
              </v-list-item>
  
              <v-list-item>
                <v-list-item-title class="font-weight-bold">Estado</v-list-item-title>
                <v-list-item-subtitle>{{ bus.status }}</v-list-item-subtitle>
              </v-list-item>

              <v-list-group value="true" no-action>
                <template #activator="{props}">
                  <v-list-item v-bind="props">
                    <v-list-item-title class="font-weight-bold">Direccion</v-list-item-title>
                  </v-list-item>
                </template>
                <v-list-item>
                  <div class="text-body-2">
                    {{ bus.address?.street }}, {{ bus.address?.outdoor_number }}<br>
                    {{ bus.address?.neighborhood }}, {{ bus.address?.city }}<br>
                    {{ bus.address?.state }}, {{ bus.address?.country }} - {{ bus.address?.postal_code }}
                  </div>
                </v-list-item>
              </v-list-group>

              <v-list-group value="true" no-action>
                <template #activator="{props}">
                  <v-list-item v-bind="props">
                    <v-list-item-title class="font-weight-bold">Unidades</v-list-item-title>
                  </v-list-item>
                </template>
                <v-list-item>
                  <div class="text-body-2">
                    {{ bus.address?.street }}, {{ bus.address?.outdoor_number }}<br>
                    {{ bus.address?.neighborhood }}, {{ bus.address?.city }}<br>
                    {{ bus.address?.state }}, {{ bus.address?.country }} - {{ bus.address?.postal_code }}
                  </div>
                </v-list-item>
              </v-list-group>

            </v-list>
          </v-card-text>
        </v-card>
      </v-dialog>
    </div>
  </template>
  
  <script setup>
  import { ref, watch} from 'vue'
  import axiosInstance from '@/utils/axios'
  import { mdiCancel } from '@mdi/js';
  
  const bus = ref({})
  
  const props = defineProps({
    modal: Boolean,
    businessId: Number,
  })

  const emit = defineEmits(['update:modal'])
  
  watch(
  () => [props.modal, props.businessId],
  async ([modalOpen, busId]) => {
    if (modalOpen && busId) {
      const res = await axiosInstance.get(`/businesses/${busId}`)
      bus.value = res.data
    }
  },
  { immediate: true }
)
</script>
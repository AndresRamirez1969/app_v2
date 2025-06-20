<script setup>
import axiosInstance from '@/utils/axios';
import { ref, watch, nextTick } from 'vue';

const props = defineProps({
    dialog: Boolean,
    organizationId: Number
})
const emit = defineEmits(['update:dialog']);

const snackbar = ref(false);
const showSuccess = () => {
    snackbar.value = true;
}

const form = ref({
    legal_name: '',
    alias: '',
    description: '',
})

const loadOrg = async (id) => {
    try {
        const res = await axiosInstance.get(`/organizations/${id}`)
        form.value = res.data
    } catch (err) {
        console.error(err);
    }
}

watch(
    () => props.organizationId,
    (newId) => {
        if (newId) {
            loadOrg(newId)
        }
    },
    {immediate: true}
)

const editOrg = async () => {
    try {
        await axiosInstance.put(`/organizations/${props.organizationId}`, form.value)
        closeDialog()

        await nextTick()

        showSuccess()
        emit('organization-updated');
    } catch (err) {
        console.log(err)
    }
}

const closeDialog = () => {
    emit('update:dialog', false)
}
</script>

<template>
    <v-dialog v-model="props.dialog" max-width="700px">
        <v-card>
      <v-card-title>Editar Organización</v-card-title>
      <v-card-text>
        <v-text-field
  label="Nombre Legal"
  v-model="form.legal_name"
  variant="outlined"
/>
<v-text-field
  label="Alias"
  v-model="form.alias"
  variant="outlined"
/>
<v-textarea
  label="Descripción"
  v-model="form.description"
  variant="outlined"
/>
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn text @click="closeDialog">Cancelar</v-btn>
        <v-btn color="primary" @click="editOrg">Actualizar</v-btn>
      </v-card-actions>
    </v-card>
    </v-dialog>

    <v-snackbar v-model="snackbar" color="success" timeout="5000">
      Organización actualizada.
    </v-snackbar>
</template>